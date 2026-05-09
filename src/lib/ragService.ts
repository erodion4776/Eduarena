import { supabase } from './supabase';
import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenAI } from '@google/genai';
import { HfInference } from '@huggingface/inference';

// Define worker source for pdf.js using Vite's URL handling
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const hfKey = (import.meta as any).env.VITE_HF_API_KEY;

function chunkText(text: string, maxWords: number = 200): string[] {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(' '));
  }
  return chunks;
}

export const ragService = {
  /**
   * Generates embedding for a piece of text with fallback
   */
  async getEmbedding(text: string): Promise<number[]> {
    const geminiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.GEMINI_API_KEY;
    
    // 1. Try Gemini Embedding
    if (geminiKey) {
      try {
        const genAI = new GoogleGenAI({ apiKey: geminiKey });
        const response = await genAI.models.embedContent({
          model: "text-embedding-004",
          contents: text,
        });
        return response.embeddings[0].values;
      } catch (e) {
        console.warn("Gemini Embedding failed, falling back to HF...", e);
      }
    }

    // 2. Fallback to Hugging Face
    if (hfKey) {
      try {
        const hf = new HfInference(hfKey);
        const output = await hf.featureExtraction({
          model: 'sentence-transformers/all-MiniLM-L6-v2',
          inputs: text,
        }) as number[];
        return output;
      } catch (e) {
        console.error("Hugging Face Embedding failed:", e);
      }
    }

    throw new Error("No embedding provider available");
  },

  /**
   * Processes a PDF into knowledge chunks.
   */
  async processPDF(file: File, subject: string, topic: string, onProgress: (msg: string) => void): Promise<void> {
    if (!supabase) throw new Error("Supabase missing");

    try {
      onProgress('READING_PDF_METADATA...');
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + ' ';
      }

      const chunks = chunkText(fullText, 300);
      onProgress(`EXTRACTED_CHUNKS: ${chunks.length}`);

      for (let i = 0; i < chunks.length; i++) {
        onProgress(`NEURAL_INGESTION [${i+1}/${chunks.length}]`);
        const embedding = await this.getEmbedding(chunks[i]);
        
        const { error } = await supabase
          .from('knowledge_vault')
          .insert([{
            content: chunks[i],
            embedding,
            metadata: { 
              source: file.name, 
              subject, 
              topic,
              type: 'pdf_chunk'
            }
          }]);

        if (error) throw error;
      }
      onProgress('INGESTION_PROTOCOL_COMPLETE');
    } catch (e: any) {
      onProgress(`INGESTION_FAIL: ${e.message}`);
      throw e;
    }
  },

  /**
   * Processes JSON data into knowledge vectors.
   */
  async processJSON(data: any[], onProgress: (msg: string) => void): Promise<void> {
    if (!supabase) throw new Error("Supabase missing");

    try {
      onProgress(`NEURAL_LOADER: READYING ${data.length} OBJECTS`);
      
      for (let i = 0; i < data.length; i++) {
        const q = data[i];
        const textToEmbed = `${q.question_content || q.question} ${q.explanation || ''} ${q.correct_answer || ''}`;
        
        onProgress(`EMBEDDING_OBJECT [${i+1}/${data.length}]`);
        const embedding = await this.getEmbedding(textToEmbed);
        
        const { error } = await supabase
          .from('knowledge_vault')
          .insert([{
            content: textToEmbed,
            embedding,
            metadata: {
              ...q,
              type: 'json_data'
            }
          }]);

        if (error) throw error;
      }
      onProgress('DATA_VAULT_SYNCHRONIZED');
    } catch (e: any) {
      onProgress(`LOAD_ABORTED: ${e.message}`);
      throw e;
    }
  },

  /**
   * Legacy retrieval maintained for compat
   */
  async retrieveContext(query: string): Promise<string | null> {
    // We already have memoryManager for this, but let's point here if needed
    try {
      const embedding = await this.getEmbedding(query);
      const { data, error } = await supabase!.rpc('match_knowledge', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: 5
      });

      if (error || !data) return null;
      return data.map((d: any) => d.content).join('\n\n');
    } catch {
      return null;
    }
  }
};
