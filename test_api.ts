import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Test generative model
    console.log("Testing generation...");
    const genRes = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Hello',
    });
    console.log("Generation success:", !!genRes.text);

    // Test embed
    console.log("Testing embed...");
    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: "This is a test block of text.",
    });

    console.log("Embed success:", !!response.embeddings);
  } catch(e) {
    console.error(e);
  }
}

run();
