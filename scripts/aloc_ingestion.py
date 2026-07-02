#!/usr/bin/env python3
"""
EduArena CBT Platform - Python ALOC Questions Ingestion Script
------------------------------------------------------------------------
This script functions as a production-ready Python tool to retrieve questions 
from the ALOC API, generate premium sentence vector embeddings on the compound 
text body, and upsert them atomically into your Supabase database.

Dependencies to install:
  pip install supabase requests python-dotenv

Usage:
  python scripts/aloc_ingestion.py --subject chemistry --count 5 --type utme
"""

import os
import sys
import json
import time
import argparse
from pathlib import Path
import requests
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
ALOC_TOKEN = os.getenv("ALOC_API_TOKEN", "ALOC-b77ef1b2396263a9ee7a")
OPENAI_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_KEY = os.getenv("GEMINI_API_KEY")

class ALOCKnowledgeHarvester:
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_KEY:
            print("\033[91m[ERROR] Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your env.\033[0m")
            sys.exit(1)
            
        print(f"[INIT] Initializing database connections to Supabase cloud: {SUPABASE_URL}")
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
    def generate_embedding(self, text_to_embed: str) -> list:
        """
        Creates multidimensional vector embeddings for the database questions.
        If OpenAI or Gemini keys are set, queries live inference. Otherwise, 
        generates normalized pseudo-random fallback embeddings for local developer runs.
        """
        clean_text = " ".join(text_to_embed.split()).strip()[:8000]
        
        # Scenario 1) OpenAI text-embedding-3-small
        if OPENAI_KEY:
            try:
                print(f"[EMBEDDING] Generating 1536-dim OpenAI embedding vector...")
                response = requests.post(
                    "https://api.openai.com/v1/embeddings",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {OPENAI_KEY}"
                    },
                    json={
                        "input": clean_text,
                        "model": "text-embedding-3-small"
                    },
                    timeout=15
                )
                if response.status_code == 200:
                    payload = response.json()
                    return payload["data"][0]["embedding"]
                else:
                    print(f"[WARNING] OpenAI API returned error: {response.text}")
            except Exception as ex:
                print(f"[WARNING] OpenAI connection error: {ex}")
                
        # Scenario 2) Google Gemini embedding using models/text-embedding-004
        if GEMINI_KEY:
            try:
                print(f"[EMBEDDING] Generating 768-dim Gemini text-embedding-004 vector...")
                url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={GEMINI_KEY}"
                response = requests.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json={
                        "model": "models/text-embedding-004",
                        "content": {"parts": [{"text": clean_text}]}
                    },
                    timeout=15
                )
                if response.status_code == 200:
                    raw_values = response.json()["embedding"]["values"]
                    # Scale or Zero-pad 768 to fit VECTOR(1536) in the database
                    if len(raw_values) == 768:
                        print("[EMBEDDING] Normalizing vectors to 1536 dimensions (Zero-padded)...")
                        zeros = [0.0] * 768
                        return raw_values + zeros
                    return raw_values
                else:
                    print(f"[WARNING] Gemini API returned error: {response.text}")
            except Exception as ex:
                print(f"[WARNING] Gemini embedding error: {ex}")
                
        # Scenario 3) Developer Mock Embedding Fallback (Ensures no cold crashes)
        print("[EMBEDDING ALERT] Credentials missing. Synthesizing deterministic 1536-dim mockup unit vector...")
        import math
        raw_mock = []
        for i in range(1536):
            char_factor = ord(clean_text[i % len(clean_text)]) if clean_text else 1
            raw_mock.append(math.sin(i + char_factor) * 0.1)
            
        magnitude = math.sqrt(sum(x * x for x in raw_mock))
        return [x / magnitude for x in raw_mock] if magnitude > 0 else [0.0] * 1536

    def fetch_questions(self, subject: str, count: int, exam_type: str) -> list:
        """
        Queries ALOC Past Questions API
        """
        print(f"[HARVESTER] Accessing ALOC service portal. Downloading {count} question(s) [{subject} | {exam_type}]...")
        questions = []
        
        for idx in range(count):
            url = f"https://questions.aloc.com.ng/api/v2/q/1?subject={subject}&type={exam_type}"
            headers = {
                "Accept": "application/json",
                "AccessToken": ALOC_TOKEN
            }
            try:
                print(f"  -> Pulling sample #{idx+1} of {count}...")
                response = requests.get(url, headers=headers, timeout=10)
                if response.status_code == 200:
                    payload = response.json()
                    if payload and "data" in payload and "id" in payload["data"]:
                        questions.append(payload["data"])
                else:
                    print(f"     [WARNING] ALOC server boundary returned status {response.status_code}")
                time.sleep(0.3)  # Respect rate thresholds
            except Exception as e:
                print(f"     [ERROR] Fetch network connection failed: {e}")
                
        return questions

    def ingest(self, subject: str, count: int, exam_type: str):
        """
        Runs complete ELT orchestration
        """
        print("\n" + "="*70)
        print("🚀 PY ALOC -> SUPABASE ELT ENGINE INITIALIZED")
        print("="*70)
        
        questions_loaded = self.fetch_questions(subject, count, exam_type)
        if not questions_loaded:
            print("\033[93m[INFO] No fresh dataset compiled from ALOC. exiting process safely.\033[0m")
            return
            
        print(f"\n[ORCHESTRATOR] Compilation finished: {len(questions_loaded)} records found. Syncing with Supabase...")
        
        inserted_count = 0
        skipped_count = 0
        
        for index, item in enumerate(questions_loaded):
            print("\n" + "-"*50)
            print(f"🎯 Processing question #{index + 1} | ALOC ID: {item['id']}")
            print(f"[PREVIEW] {item['question'][:80]}...")
            
            # Uniqueness check (prevents redundant embedding generation and duplicates)
            try:
                res = self.supabase.table("cbt_aloc_questions").select("id").eq("source_id", item["id"]).maybe_single().execute()
                if res.data:
                    print(f"\033[93m[REDUNDANT DUPLICATE] Source ID {item['id']} is already synced. Skipping.\033[0m")
                    skipped_count += 1
                    continue
            except Exception as e:
                print(f"[DB ERROR] Constraint screening failed on ID {item['id']}: {e}")
                continue
                
            # Formatting options array
            rebuilt_options = {
                "a": item.get("option", {}).get("a", ""),
                "b": item.get("option", {}).get("b", ""),
                "c": item.get("option", {}).get("c", ""),
                "d": item.get("option", {}).get("d", "")
            }
            if "e" in item.get("option", {}) and item["option"]["e"]:
                rebuilt_options["e"] = item["option"]["e"]
                
            # Assemble comprehensive payload context for premium semantic clustering
            compound_context = (
                f"Subject: {item.get('subject', subject)}\n"
                f"Topic: {item.get('section', 'General')}\n"
                f"Question: {item.get('question', '')}\n"
                f"Solution Steps: {item.get('solution', 'None provided')}"
            )
            
            # Generate the embedding representation
            embedding_vector = self.generate_embedding(compound_context)
            
            upsert_data = {
                "source_id": int(item["id"]),
                "subject": str(item.get("subject", subject)).lower(),
                "exam_type": str(item.get("examtype", exam_type)).lower(),
                "year": str(item.get("examyear", "unknown")),
                "question_text": item.get("question", ""),
                "options": rebuilt_options,
                "correct_answer": str(item.get("answer", "a")).lower(),
                "explanation": item.get("solution", ""),
                "topic": item.get("section", "General"),
                "embedding": embedding_vector
            }
            
            try:
                # Perform the atomic upsert
                db_res = self.supabase.table("cbt_aloc_questions").upsert(upsert_data, on_conflict="source_id").execute()
                if db_res.data:
                    print(f"\033[92m[SYNC COMPLETE] Question {item['id']} successfully inserted!\033[0m")
                    inserted_count += 1
                else:
                    print(f"\033[91m[SYNC ERROR] Unable to upsert record {item['id']}\033[0m")
            except Exception as ex:
                print(f"\033[91m[DB EXCEPTION] Supabase transaction failed: {ex}\033[0m")
                
        print("\n" + "="*50)
        print("📈 INGESTION REPORT SUMMARY:")
        print(f"   - Total fetched: {len(questions_loaded)}")
        print(f"   - Total synced:  {inserted_count}")
        print(f"   - Total skipped: {skipped_count}")
        print("="*50 + "\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ALOC Database Ingestion Orchestration Utility")
    parser.add_argument("--subject", type=str, default="physics", help="The target subject")
    parser.add_argument("--count", type=int, default=5, help="Number of questions to pull")
    parser.add_argument("--type", type=str, default="utme", help="Type of examination (utme, waec, neco)")
    
    parsed_args = parser.parse_args()
    
    harvester = ALOCKnowledgeHarvester()
    harvester.ingest(
        subject=parsed_args.subject,
        count=parsed_args.count,
        exam_type=parsed_args.type
    )
