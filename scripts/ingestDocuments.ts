import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

// Safe lazy loading of keys
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials are not configured in environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface RawDoc {
  title:   string;
  subject: string;
  content: string;
  source:  string;
}

// Simple chunking utility (chunks by paragraph or token limit)
function chunkText(text: string, size: number = 800): string[] {
  const paragraphs = text.split('\n\n');
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    if ((current + para).length > size) {
      if (current) chunks.push(current.trim());
      current = para;
    } else {
      current += '\n\n' + para;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

// Sample syllabus/textbook content for West African subjects
const textbookData: RawDoc[] = [
  {
    title:   'Law of Diminishing Marginal Utility',
    subject: 'Economics',
    source:  'Economics Simplified Vol 1, Page 45',
    content: `The Law of Diminishing Marginal Utility states that as a consumer increases the consumption of a good, the marginal utility (extra satisfaction) obtained from each additional unit decreases. 
For example, the first cup of water on a hot day in Lagos gives maximum utility, but the fourth cup yields far less satisfaction.

EXAM TIPS:
- Total Utility (TU) increases at a decreasing rate when Marginal Utility (MU) is falling.
- TU is at its maximum when MU is zero (Point of Satiety).
- Economists assume consumers are rational and seek to maximize TU.`
  },
  {
    title:   'Cell Theory and Organization of Life',
    subject: 'Biology',
    source:  'Modern Biology for WAEC, Page 12',
    content: `The cell is the basic structural and functional unit of life. Cell theory was formulated by Schleiden, Schwann, and Virchow.
The levels of organization in living organisms are:
1. Cells (e.g., amoeba, white blood cell)
2. Tissues (e.g., epidermal tissue, blood, bone)
3. Organs (e.g., heart, kidney, onion bulb)
4. Organ Systems (e.g., digestive, nervous system)
5. Organism (e.g., human, maize plant)`
  },
  {
    title:   'Law of Demand and Supply',
    subject: 'Economics',
    source:  'Comprehensive Economics for West Africa, Page 88',
    content: `The Law of Demand states that, all things being equal (ceteris paribus), the higher the price of a commodity, the lower the quantity demanded, and vice versa. It is represented by a downward-sloping demand curve.
The Law of Supply states that, ceteris paribus, the higher the price of a commodity, the higher the quantity supplied, and vice versa. It is represented by an upward-sloping supply curve.

EXAM TIPS:
- Demand and supply curves intersect at the equilibrium price, where Quantity Demanded = Quantity Supplied.
- Normal goods have a negative relationship with price, while Giffen/Veblen goods have a positive relationship.`
  },
  {
    title:   'Osmosis and Diffusion',
    subject: 'Biology',
    source:  'Senior Secondary Biology Course, Page 33',
    content: `Diffusion is the net movement of particles from a region of higher concentration to a region of lower concentration down a concentration gradient.
Osmosis is a special type of diffusion. It is the movement of water molecules from a region of higher water potential (dilute solution) to a region of lower water potential (concentrated solution) through a selectively permeable membrane.

EXAM TIPS:
- Osmosis only occurs in liquid media and requires a semi-permeable membrane.
- Red blood cells placed in pure water will swell and burst (haemolysis). Placed in concentrated salt water, they shrink (crenation).`
  }
];

async function ingest() {
  console.log('🚀 Starting ingestion process...');
  
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!openaiKey && !geminiKey) {
    console.error('❌ Error: Neither OPENAI_API_KEY nor GEMINI_API_KEY is available. Cannot generate embeddings.');
    process.exit(1);
  }

  const useOpenAI = !!openaiKey;
  console.log(`Using ${useOpenAI ? 'OpenAI (text-embedding-3-small)' : 'Gemini (gemini-embedding-2-preview)'} for generating embeddings...`);

  let openai: OpenAI | null = null;
  let geminiAI: GoogleGenAI | null = null;

  if (useOpenAI) {
    openai = new OpenAI({ apiKey: openaiKey });
  } else {
    geminiAI = new GoogleGenAI({ apiKey: geminiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
  }

  for (const doc of textbookData) {
    console.log(`\nProcessing doc: "${doc.title}" [Subject: ${doc.subject}]`);
    const chunks = chunkText(doc.content);

    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i];
      let embedding: number[] = [];

      try {
        if (useOpenAI && openai) {
          const res = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: content,
          });
          embedding = res.data[0].embedding;
        } else if (geminiAI) {
          const res = await geminiAI.models.embedContent({
            model: 'gemini-embedding-2-preview',
            contents: content,
          });
          embedding = res.embeddings?.[0]?.values || [];
        }
      } catch (err: any) {
        console.error(`❌ Failed to generate embedding for chunk ${i}:`, err.message);
        continue;
      }

      if (embedding.length === 0) {
        console.error(`❌ Received empty embedding for chunk ${i}`);
        continue;
      }

      // If we are using OpenAI (1536-dim), we target the 'documents' table
      // If we are using Gemini (768-dim), we can target 'document_chunks' table or 'documents' padded
      const tableName = useOpenAI ? 'documents' : 'document_chunks';
      
      console.log(`Inserting chunk ${i + 1}/${chunks.length} into table '${tableName}' (${embedding.length} dimensions)...`);

      let payload: any = {};
      if (tableName === 'documents') {
        payload = {
          title: doc.title,
          subject: doc.subject,
          content,
          source: doc.source,
          chunk_index: i,
          embedding,
          metadata: { ingested_at: new Date().toISOString(), model: useOpenAI ? 'openai' : 'gemini' }
        };
      } else {
        // 'document_chunks' schema mapping (document_id is nullable if PDF isn't linked, but let's check or mock a document)
        // First let's upsert/get a PDF Document reference if needed, or insert with a null/mock doc UUID
        // Since document_chunks references public.pdf_documents(id) in the schema, we must insert a pdf_document first!
        try {
          const { data: pdfDoc, error: pdfError } = await supabase
            .from('pdf_documents')
            .insert({
              title: doc.title,
              subject: doc.subject,
            })
            .select()
            .single();

          if (pdfError) {
            console.warn('⚠️ Could not insert pdf_document reference (expected if table has RLS/checks), skipping chunk:', pdfError.message);
            continue;
          }

          payload = {
            document_id: pdfDoc.id,
            subject: doc.subject,
            topic: doc.title,
            content,
            source: doc.source,
            embedding,
          };
        } catch (pdfEx: any) {
          console.error('❌ PDF document creation failed, cannot insert chunk:', pdfEx.message);
          continue;
        }
      }

      const { error } = await supabase
        .from(tableName)
        .insert(payload);

      if (error) {
        console.error(`❌ Error inserting chunk ${i} into '${tableName}':`, error.message);
      } else {
        console.log(`✅ Successfully ingested chunk ${i + 1}/${chunks.length}`);
      }
    }
  }

  console.log('\n🎉 Ingestion process complete!');
}

ingest().catch(err => {
  console.error('❌ Critical error during ingestion:', err);
});
