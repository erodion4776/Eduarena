import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;
const PRIMARY_MODEL = "gemini-1.5-flash";
const FALLBACK_MODEL = "gemini-1.5-pro"; // Assuming pro is available as a higher tier fallback

function getAI() {
  if (!aiInstance) {
    const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'undefined') {
      console.warn('GEMINI_API_KEY is not defined. AI features will be disabled.');
      return null;
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

async function callWithRetry(prompt: string, config: any, retries = 2): Promise<any> {
    const ai = getAI();
    if (!ai) throw new Error("AI services unavailable");

    for (let i = 0; i <= retries; i++) {
        const modelName = i === 0 ? PRIMARY_MODEL : FALLBACK_MODEL;
        try {
            const model = ai.getGenerativeModel({ model: modelName, generationConfig: config });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return {
                text: response.text()
            };
        } catch (error) {
            console.error(`Attempt ${i+1} failed with ${modelName}:`, error);
            if (i === retries) throw error;
        }
    }
}

export async function generateTutorial(topic: string, subject: string, pastQuestions: any[]) {
  const ai = getAI();
  if (!ai) return "AI services are currently unavailable. Please check your configuration.";
  
  const prompt = `
    You are an expert academic tutor for JAMB/WAEC/NECO exams.
    Topic: ${topic}
    Subject: ${subject}
    Past Questions Context: ${JSON.stringify(pastQuestions)}

    Generate a detailed tutorial for this topic. 
    Focus on:
    1. "The Essence": A 3-bullet summary of the topic's core concepts.
    2. "How they test this": A section analyzing how this topic appeared in exams historically (e.g., comparing 1995 vs 2020 patterns). 
    3. Common traps and pitfalls to avoid.
    4. "Mastery Strategy": How to tackle frequent question types.

    Format the output in Markdown with clear, bold headings for "The Essence" and "How they test this".
  `;
  
  try {
      const response = await callWithRetry(prompt, {
        systemInstruction: "You are the 'Exam Oracle' AI Tutor. Your writing style is encouraging but rigorous, focusing strictly on exam success.",
      });
      return response.text;
  } catch (error) {
      return "AI service failed after retries. Please try again.";
  }
}

export async function generateMockQuestions(topic: string, subject: string, count: number = 5) {
  const prompt = `
    Generate ${count} highly realistic mock exam questions for the topic: ${topic} in ${subject}.
    Include a mix of actual past-paper-style logic and "predicted" questions for the 2025 exams.

    Return the result as a JSON array of objects with the following schema:
    [
      {
        "question": "string",
        "options": ["string", "string", "string", "string"],
        "correct_answer": "string",
        "explanation": "string",
        "difficulty": "Easy" | "Medium" | "Hard",
        "is_predicted_2025": boolean
      }
    ]
  `;

  try {
    const response = await callWithRetry(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correct_answer: { type: Type.STRING },
            explanation: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            is_predicted_2025: { type: Type.BOOLEAN }
          },
          required: ["question", "options", "correct_answer", "explanation", "difficulty", "is_predicted_2025"]
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse AI mock questions", e);
    return [];
  }
}

export async function generatePredictionInsight(subject: string, results: any[]) {
  const prompt = `
    Based on the following student performance results: ${JSON.stringify(results)}
    And historical data for ${subject} exams (JAMB/WAEC/NECO).

    Provide a 2025 prediction insight for this student. 
    Which topics are they likely to see? Where are their gaps?
    Provide 3 high-probability predicted topics and a 30-second "Correction Breakdown" for their recent failures.

    Format as JSON:
    {
      "predicted_topics": ["string", "string", "string"],
      "correction_breakdown": "string",
      "confidence_score": number
    }
  `;

  try {
    const response = await callWithRetry(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          predicted_topics: { type: Type.ARRAY, items: { type: Type.STRING } },
          correction_breakdown: { type: Type.STRING },
          confidence_score: { type: Type.NUMBER }
        },
        required: ["predicted_topics", "correction_breakdown", "confidence_score"]
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse AI prediction insight", e);
    return null;
  }
}
