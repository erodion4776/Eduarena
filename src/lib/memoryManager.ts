import { supabase } from './supabase';
import { GoogleGenAI } from '@google/genai';
import { ragDatabase } from './ragDatabase';
import { STATIC_QUESTIONS } from '../data/staticData';
import { syllabusData } from '../data/syllabus';

/**
 * Memory Manager for Edu Arena
 * Handles RAG (Retrieval Augmented Generation) by searching the Supabase knowledge_vault with a strong local search fallback.
 */

const geminiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.GEMINI_API_KEY;

/**
 * Perform a local text keyword search over high-yield curriculum files as a rich RAG fallback.
 */
function getLocalContextMatches(userQuery: string): string {
  const queryWords = userQuery.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !['the', 'and', 'for', 'you', 'what', 'how', 'are', 'can', 'with', 'this', 'who', 'its', 'from', 'then', 'them'].includes(word));

  if (queryWords.length === 0) return "";

  const scoredMatches: { content: string; source: string; score: number }[] = [];

  // 1. Search ragDatabase (Highest match weighting)
  for (const item of ragDatabase) {
    let score = 0;
    const itemText = `${item.subject} ${item.topic} ${item.content}`.toLowerCase();
    for (const word of queryWords) {
      if (itemText.includes(word)) {
        score += 3; 
      }
    }
    if (score > 0) {
      scoredMatches.push({
        content: item.content,
        source: item.source || `Study Guide: ${item.subject} (${item.topic})`,
        score
      });
    }
  }

  // 2. Search syllabusData
  if (syllabusData) {
    for (const [subjectName, topics] of Object.entries(syllabusData)) {
      for (const topicItem of topics) {
        let score = 0;
        const topicText = `${subjectName} ${topicItem.topic} ${(topicItem.objectives || []).join(' ')}`.toLowerCase();
        for (const word of queryWords) {
          if (topicText.includes(word)) {
            score += 2;
          }
        }
        if (score > 0) {
          const objectivesStr = (topicItem.objectives || []).slice(0, 3).map(o => `- ${o}`).join('\n');
          scoredMatches.push({
            content: `Syllabus Topic: ${topicItem.topic}\nLearning Objectives:\n${objectivesStr}`,
            source: `${topicItem.examType || 'WAEC'} Official Syllabus - ${subjectName}`,
            score
          });
        }
      }
    }
  }

  // 3. Search STATIC_QUESTIONS
  if (STATIC_QUESTIONS) {
    for (const q of STATIC_QUESTIONS) {
      let score = 0;
      const questionText = `${q.subject || ''} ${q.question || ''} ${q.solution || ''}`.toLowerCase();
      for (const word of queryWords) {
        if (questionText.includes(word)) {
          score += 1.5;
        }
      }
      if (score > 0) {
        const optionsStr = Object.entries(q.option || {})
          .filter(([_, v]) => v && String(v).trim())
          .map(([k, v]) => `   ${k.toUpperCase()}. ${v}`)
          .join('\n');
        const cleanQuestion = (q.question || '').replace(/<[^>]*>/g, '');
        const explanationClean = (q.solution || '').replace(/<[^>]*>/g, '');
        let content = `Past Questions Reference:\nQ: ${cleanQuestion}\n${optionsStr}\nCorrect Option: ${String(q.answer || 'A').toUpperCase()}`;
        if (explanationClean) {
          content += `\nExplanation: ${explanationClean}`;
        }
        scoredMatches.push({
          content,
          source: `${String(q.examtype || 'UTME').toUpperCase()} ${q.examyear || '2024'} - Question No. ${q.questionNub || q.id}`,
          score
        });
      }
    }
  }

  // Sort logically by descending relevance score & retrieve the top slice
  scoredMatches.sort((a, b) => b.score - a.score);
  const topMatches = scoredMatches.slice(0, 3);

  if (topMatches.length === 0) {
    return "";
  }

  return topMatches
    .map(match => `[Source: ${match.source}] ${match.content}`)
    .join("\n\n");
}

export async function getRelevantContext(userQuery: string): Promise<string> {
  // If we lack cloud infra components, immediately fallback to comprehensive local RAG
  if (!supabase || !geminiKey || geminiKey === 'undefined') {
    return getLocalContextMatches(userQuery);
  }

  try {
    // 1. Generate Embedding for the query using Gemini
    const genAI = new GoogleGenAI({ apiKey: geminiKey });
    const response = await genAI.models.embedContent({
      model: "text-embedding-004",
      contents: userQuery,
    });
    
    if (response && response.embeddings && response.embeddings[0]) {
      const embedding = response.embeddings[0].values;

      // 2. Vector Search in Supabase knowledge_vault
      const { data: matches, error } = await supabase.rpc('match_knowledge', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: 3,
      });

      if (!error && matches && matches.length > 0) {
        // Construct a clean string of retrieved knowledge from cloud
        return matches
          .map((m: any) => `[Source: ${m.metadata?.source || 'Knowledge Vault'}] ${m.content}`)
          .join("\n\n");
      }
    }
    
    // Fall back to local searching if Supabase matches are void or failed
    return getLocalContextMatches(userQuery);
  } catch (err) {
    console.warn("Cloud Vector Search failed. Defaulting to local RAG fallback:", err);
    return getLocalContextMatches(userQuery);
  }
}

