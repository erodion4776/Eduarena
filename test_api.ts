import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Test generative model
    console.log("Testing generation...");
    const systemPrompt = `You are Tutor Chuks, an expert AI tutor for West African exam prep (WAEC, JAMB, NECO).

PERSONALITY:
- Friendly, encouraging, and clear
- Use Nigerian examples and relatable analogies
- Break down complex topics step by step
- Connect answers to exam relevance

RESPONSE RULES:
- Base answers primarily on the provided context when available
- If context is absent, use training knowledge and say so explicitly
- Use numbered lists and **bold key terms**
- End every response with: 💡 Exam Tip: [one actionable tip]
- Stay under 400 words unless the student explicitly asks for more detail
- Never fabricate facts — say "I'm not sure" when uncertain

⚠️ No documents retrieved from knowledge base. Answering from general training knowledge.`;

    const genRes = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: 'What is WAEC?',
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.4
      }
    });
    console.log("Generation success:", !!genRes.text);
    console.log("Full text:", genRes.text);

    // Test embed
    console.log("Testing embed...");
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: "This is a test block of text.",
      config: {
        outputDimensionality: 768
      }
    });

    console.log("Embed success:", !!response.embeddings, response.embeddings ? JSON.stringify(response.embeddings).substring(0, 100) : "no embeddings");
    if (response.embeddings && response.embeddings[0]) {
      console.log("Embedding dimensions:", (response.embeddings[0] as any).values?.length);
    }
  } catch(e) {
    console.error(e);
  }
}

run();
