#!/usr/bin/env python3
"""
EduArena CBT Platform - Google Colab RAG Data Scraper & Ingestion Orchestrator
------------------------------------------------------------------------
This script is structured to run seamlessly inside Google Colab.
It scrapes exam prep questions or curriculum syllabus content, generates high-yield
semantic embeddings using either Gemini or OpenAI, and pushes the compiled results 
directly into your Supabase database tables (`cbt_aloc_questions` or `knowledge_vault`).

How to open in Google Colab:
1. Go to https://colab.research.google.com
2. Create a new notebook.
3. Copy-paste this script into a code cell or upload this file.
4. Configure the form fields below and run the cells!
"""

# ==============================================================================
# CELL 1: Install Dependencies
# ==============================================================================
# !pip install supabase beautifulsoup4 requests google-genai lxml python-dotenv -q

import os
import re
import sys
import json
import time
import math
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client

# ==============================================================================
# CELL 2: Interactive Configurations (Google Colab Forms)
# ==============================================================================
# @markdown ### 🔑 API Keys & Database Credentials
# @markdown Enter your project settings below. Retrieve your Supabase URL/Key from your project settings or `.env` file.
SUPABASE_URL = "YOUR_SUPABASE_URL" #@param {type:"string"}
SUPABASE_SERVICE_ROLE_KEY = "YOUR_SUPABASE_SERVICE_ROLE_KEY" #@param {type:"string"}

# @markdown ### 🧠 AI Embedding Options
# @markdown Note: If using Gemini, embeddings are padded with zeros to fit the 1536-dimensional database vector table.
GEMINI_API_KEY = "YOUR_GEMINI_API_KEY" #@param {type:"string"}
OPENAI_API_KEY = "YOUR_OPENAI_API_KEY" #@param {type:"string"}

# @markdown ### 🌐 Scraper Configuration
TARGET_SUBJECT = "physics" #@param ["mathematics", "biology", "physics", "chemistry", "english", "government"]
EXAM_TYPE = "utme" #@param ["utme", "waec", "neco"]
EXAM_YEAR = "2024" #@param {type:"string"}
TOPIC_NAME = "Electromagnetism" #@param {type:"string"}

# @markdown ### ⚙️ Scraper Source Mode
# @markdown Select 'custom_url' to scrape a specific educational article/webpage, or 'mock_test_generator' to synthetically harvest mock questions.
SOURCE_MODE = "mock_test_generator" #@param ["custom_url", "mock_test_generator"]
SCRAPE_URL = "https://example.com/waec-physics-syllabus-notes" #@param {type:"string"}

class ColabRAGOrchestrator:
    def __init__(self):
        if not SUPABASE_URL or SUPABASE_URL == "YOUR_SUPABASE_URL" or not SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY == "YOUR_SUPABASE_SERVICE_ROLE_KEY":
            print("❌ [ERROR] Please provide valid SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY credentials.")
            return

        print(f"🔌 Connecting to Supabase at: {SUPABASE_URL}...")
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        print("✅ Connection established successfully!")

    def generate_embedding(self, text_to_embed: str) -> list:
        """
        Generates a 1536-dimensional vector embedding.
        If using Gemini's text-embedding-004 model, it returns a 768-dim vector,
        which is padded with 768 zeros to conform to the database's 1536-dim requirement.
        """
        clean_text = " ".join(text_to_embed.split()).strip()[:8000]
        
        # 1. OpenAI Embedding
        if OPENAI_API_KEY and OPENAI_API_KEY != "YOUR_OPENAI_API_KEY":
            try:
                response = requests.post(
                    "https://api.openai.com/v1/embeddings",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {OPENAI_API_KEY}"
                    },
                    json={
                        "input": clean_text,
                        "model": "text-embedding-3-small"
                    },
                    timeout=15
                )
                if response.status_code == 200:
                    return response.json()["data"][0]["embedding"]
                else:
                    print(f"⚠️ OpenAI API error: {response.text}")
            except Exception as ex:
                print(f"⚠️ OpenAI connection error: {ex}")

        # 2. Gemini Embedding (text-embedding-004)
        if GEMINI_API_KEY and GEMINI_API_KEY != "YOUR_GEMINI_API_KEY":
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={GEMINI_API_KEY}"
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
                    # Pad to 1536 dimensions
                    if len(raw_values) == 768:
                        return raw_values + ([0.0] * 768)
                    return raw_values
                else:
                    print(f"⚠️ Gemini API error: {response.text}")
            except Exception as ex:
                print(f"⚠️ Gemini embedding error: {ex}")

        # 3. Fallback Math Deterministic Mock Embedding
        print("⚠️ Credentials missing or inactive. Generating deterministic 1536-dim mock vector...")
        raw_mock = []
        for i in range(1536):
            char_factor = ord(clean_text[i % len(clean_text)]) if clean_text else 1
            raw_mock.append(math.sin(i + char_factor) * 0.1)
            
        magnitude = math.sqrt(sum(x * x for x in raw_mock))
        return [x / magnitude for x in raw_mock] if magnitude > 0 else [0.0] * 1536

    def scrape_url(self, url: str) -> list:
        """
        General web scraper to pull paragraphs or syllabus lines from a study webpage.
        """
        print(f"🕸️ Scraper active: Reading raw HTML from {url}...")
        try:
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            resp = requests.get(url, headers=headers, timeout=15)
            if resp.status_code != 200:
                print(f"❌ Scraper received status code: {resp.status_code}")
                return []
                
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            # Remove scripts and styling elements
            for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
                tag.decompose()
                
            # Grab all meaningful text structures (headings, paragraphs, list items)
            elements = soup.find_all(['p', 'h2', 'h3', 'li'])
            chunks = []
            
            current_chunk = ""
            for el in elements:
                text = el.get_text().strip()
                if len(text) < 30:
                    continue
                # Keep chunks around 100-250 words
                if len(current_chunk.split()) + len(text.split()) > 200:
                    chunks.append(current_chunk.strip())
                    current_chunk = text
                else:
                    current_chunk += " " + text
                    
            if current_chunk:
                chunks.append(current_chunk.strip())
                
            print(f"✅ Successfully compiled {len(chunks)} text chunks from page!")
            return chunks
        except Exception as e:
            print(f"❌ Scraping error: {e}")
            return []

    def get_mock_questions(self, count: int = 5) -> list:
        """
        Provides premium educational mock exam questions in the exact format
        expected by the `cbt_aloc_questions` table schema.
        """
        print(f"🤖 Generating high-yield mock curriculum question dataset (Count: {count})...")
        mocks = [
            {
                "id": 801001,
                "question": "A cell of e.m.f 2.0 V and internal resistance 1.2 ohms is connected in series with an ammeter and a resistor of 3.8 ohms. What is the reading on the ammeter?",
                "option": {"a": "0.4 A", "b": "0.5 A", "c": "1.0 A", "d": "1.6 A"},
                "answer": "a",
                "solution": "Using Ohm's law: I = E / (R + r). Substituting the given values: I = 2.0 / (3.8 + 1.2) = 2.0 / 5.0 = 0.4 A.",
                "section": "Current Electricity"
            },
            {
                "id": 801002,
                "question": "Which of the following electromagnetic waves has the shortest wavelength and highest frequency?",
                "option": {"a": "Radio waves", "b": "Infrared rays", "c": "Ultraviolet rays", "d": "Gamma rays"},
                "answer": "d",
                "solution": "Gamma rays lie at the extreme high-frequency end of the electromagnetic spectrum, meaning they possess the shortest wavelength and highest energy.",
                "section": "Electromagnetic Waves"
            },
            {
                "id": 801003,
                "question": "Calculate the velocity of a wave with a wavelength of 0.5 meters and a frequency of 660 Hz.",
                "option": {"a": "330 m/s", "b": "1320 m/s", "c": "660 m/s", "d": "150 m/s"},
                "answer": "a",
                "solution": "Wave velocity equation: v = f * lambda. Therefore, v = 660 * 0.5 = 330 m/s.",
                "section": "Waves"
            },
            {
                "id": 801004,
                "question": "An object is placed 15 cm in front of a convex lens of focal length 10 cm. Find the image distance.",
                "option": {"a": "30 cm", "b": "15 cm", "c": "10 cm", "d": "20 cm"},
                "answer": "a",
                "solution": "Using the lens formula: 1/f = 1/u + 1/v. 1/10 = 1/15 + 1/v. 1/v = 1/10 - 1/15 = 3/30 - 2/30 = 1/30. Thus, v = 30 cm.",
                "section": "Optical Instruments"
            },
            {
                "id": 801005,
                "question": "What is the unit of magnetic flux density?",
                "option": {"a": "Weber", "b": "Tesla", "c": "Henry", "d": "Farad"},
                "answer": "b",
                "solution": "Magnetic flux density is measured in Tesla (T). Weber is the unit of magnetic flux.",
                "section": "Electromagnetism"
            }
        ]
        return mocks[:count]

    def run_ingest(self):
        """
        Orchestrates full scrap -> embed -> insert pipeline
        """
        print("\n🚀 Starting Google Colab Ingestion Process...")
        
        # 1. Fetching Data
        if SOURCE_MODE == "custom_url":
            print(f"📂 Pipeline Selection: Scrape Web Content into RAG 'knowledge_vault'...")
            scraped_chunks = self.scrape_url(SCRAPE_URL)
            
            if not scraped_chunks:
                print("❌ Ingestion aborted: Scraper returned no context data.")
                return
                
            success_count = 0
            for index, chunk in enumerate(scraped_chunks):
                print(f"📝 Parsing chunk #{index+1}/{len(scraped_chunks)}...")
                
                # Format a rich contextual content text block for embedding
                context_block = f"Subject: {TARGET_SUBJECT.capitalize()} | Topic: {TOPIC_NAME}\n{chunk}"
                vector = self.generate_embedding(context_block)
                
                insert_payload = {
                    "content": chunk,
                    "embedding": vector,
                    "metadata": {
                        "source": SCRAPE_URL,
                        "subject": TARGET_SUBJECT.lower(),
                        "topic": TOPIC_NAME,
                        "type": "scraped_colab_chunk"
                    }
                }
                
                try:
                    # Ingest into 'knowledge_vault'
                    res = self.supabase.table("knowledge_vault").insert([insert_payload]).execute()
                    if res.data:
                        success_count += 1
                except Exception as e:
                    print(f"⚠️ Insertion error in chunk #{index+1}: {e}")
                    
            print(f"🎉 RAG Ingestion Completed! Successfully loaded {success_count}/{len(scraped_chunks)} study notes chunks into your database!")
            
        else:
            print(f"📂 Pipeline Selection: Scrape Mock Questions into RAG 'cbt_aloc_questions'...")
            questions = self.get_mock_questions(5)
            
            success_count = 0
            for index, q in enumerate(questions):
                print(f"\n🎯 Syncing Question #{index+1} | Source ID: {q['id']}")
                print(f"[PREVIEW] {q['question'][:80]}...")
                
                rebuilt_options = {
                    "a": q["option"].get("a", ""),
                    "b": q["option"].get("b", ""),
                    "c": q["option"].get("c", ""),
                    "d": q["option"].get("d", "")
                }
                
                compound_context = (
                    f"Subject: {TARGET_SUBJECT}\n"
                    f"Topic: {q.get('section', TOPIC_NAME)}\n"
                    f"Question: {q.get('question', '')}\n"
                    f"Solution Steps: {q.get('solution', '')}"
                )
                
                vector = self.generate_embedding(compound_context)
                
                upsert_payload = {
                    "source_id": int(q["id"] + int(time.time()) % 100000), # Ensure uniqueness
                    "subject": TARGET_SUBJECT.lower(),
                    "exam_type": EXAM_TYPE.lower(),
                    "year": EXAM_YEAR,
                    "question_text": q["question"],
                    "options": rebuilt_options,
                    "correct_answer": q["answer"],
                    "explanation": q["solution"],
                    "topic": q["section"],
                    "embedding": vector
                }
                
                try:
                    res = self.supabase.table("cbt_aloc_questions").upsert(upsert_payload, on_conflict="source_id").execute()
                    if res.data:
                        success_count += 1
                        print("✅ Success!")
                except Exception as e:
                    print(f"❌ Supabase error: {e}")
                    
            print(f"\n🎉 CBT Questions Sync Completed! Upserted {success_count}/{len(questions)} high-yield interactive prep questions!")

# ==============================================================================
# CELL 3: Triggering Ingestion Execution
# ==============================================================================
if __name__ == "__main__":
    orchestrator = ColabRAGOrchestrator()
    if hasattr(orchestrator, 'supabase'):
        orchestrator.run_ingest()
