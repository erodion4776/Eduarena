import { supabase } from './supabase';
import { GoogleGenAI } from '@google/genai';

/**
 * Memory Manager for Edu Arena
 * Handles RAG (Retrieval Augmented Generation) by searching the Supabase knowledge_vault.
 */

const geminiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.GEMINI_API_KEY;

export async function getRelevantContext(userQuery: string): Promise<string> {
  if (!supabase || !geminiKey) {
    console.warn("RAG: Supabase or Gemini Key missing");
    return "";
  }

  try {
    // 1. Generate Embedding for the query using Gemini
    const genAI = new GoogleGenAI({ apiKey: geminiKey });
    const response = await genAI.models.embedContent({
      model: "text-embedding-004",
      contents: userQuery,
    });
    const embedding = response.embeddings[0].values;

    // 2. Vector Search in Supabase knowledge_vault
    // Note: We assume a 'match_knowledge' RPC exists or we use a direct query if the setup allows it.
    // The user mentioned "Match Threshold: 0.5".
    const { data: matches, error } = await supabase.rpc('match_knowledge', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 3,
    });

    if (error) {
      console.error("Supabase RPC match_knowledge failed:", error);
      return "";
    }

    if (!matches || matches.length === 0) {
      return "";
    }

    // 3. Construct a clean string of retrieved knowledge
    const context = matches
      .map((m: any) => `[Source: ${m.metadata?.source || 'Unknown'}] ${m.content}`)
      .join("\n\n");

    return context;
  } catch (err) {
    console.error("Memory Manager Error:", err);
    return "";
  }
}
