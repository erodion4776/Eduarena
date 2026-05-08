import { supabase } from './supabase';
import * as pdfjsLib from 'pdfjs-dist';

// Define worker source for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

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
   * Processes a PDF: chunking text and syncing to Supabase pgvector.
   */
  async processPDFToVectors(file: File, subject: string, topic: string, onProgress: (msg: string) => void): Promise<void> {
    if (!supabase) {
      throw new Error("Supabase is not configured. Please check your .env file.");
    }

    try {
      onProgress('Initiating file reader...');
      const arrayBuffer = await file.arrayBuffer();
      
      onProgress('Extracting text content from PDF...');
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }

      onProgress(`Chunking text (${fullText.length} characters)...`);
      const chunks = chunkText(fullText, 250); // 250 words per chunk

      onProgress('Saving document record to Supabase...');
      // 1. Insert into pdf_documents
      const { data: docData, error: docError } = await supabase
        .from('pdf_documents')
        .insert([{ title: file.name, subject }])
        .select()
        .single();

      if (docError) {
         console.warn("Supabase insertion error. Ensure you have RLS INSERT policies set!", docError);
         throw new Error(`Failed to save document. Did you enable RLS INSERT? Details: ${docError.message}`);
      }

      const documentId = docData.id;

      onProgress('Generating Embeddings and Syncing vectors to Supabase...');
      // 2. Embed and Insert chunks
      for (let i = 0; i < chunks.length; i++) {
        const chunkTextValue = chunks[i];
        if (!chunkTextValue.trim()) continue;

        onProgress(`Processing chunk ${i + 1} of ${chunks.length}...`);
        
        // Call backend for embedding
        const embedRes = await fetch('/api/oracle/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: chunkTextValue })
        });
        
        if (!embedRes.ok) {
           throw new Error(`Failed to generate embedding for chunk ${i+1}`);
        }
        
        const embedData = await embedRes.json();
        const embedding = embedData.embedding;

        // Insert into document_chunks
        const { error: chunkError } = await supabase
          .from('document_chunks')
          .insert([{
            document_id: documentId,
            subject,
            topic,
            content: chunkTextValue,
            source: `Page chunks starting near part ${i + 1}`,
            embedding
          }]);

        if (chunkError) {
          throw new Error('Failed to insert chunk into Supabase: ' + chunkError.message);
        }
      }

      onProgress('COMPLETE: Neural ingestion successful.');
    } catch (e: any) {
      console.error(e);
      onProgress(`ERROR: ${e.message || 'Processing failed'}. Check console for details.`);
      throw e;
    }
  },

  /**
   * Retrieving context from the actual Supabase Vector database
   */
  async retrieveContext(question: string, subjectFilter?: string): Promise<string | null> {
    if (!supabase) return "Supabase not configured.";

    try {
      // 1. Get embedding for the question
      const embedRes = await fetch('/api/oracle/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: question })
      });
      
      if (!embedRes.ok) return null;
      const embedData = await embedRes.json();
      const queryEmbedding = embedData.embedding;

      // 2. Call the match_document_chunks RPC in Supabase
      const { data, error } = await supabase.rpc('match_document_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: 0.70, // Adjust this higher for stricter matches
        match_count: 3,
        filter_subject: subjectFilter || null
      });

      if (error) {
        console.error("Vector search error:", error);
        return null;
      }

      if (data && data.length > 0) {
        return data.map((d: any) => `[From ${d.topic}]: ${d.content}`).join('\n\n');
      }

      return null;
    } catch (e) {
      console.error("Failed to retrieve context", e);
      return null;
    }
  }
};
