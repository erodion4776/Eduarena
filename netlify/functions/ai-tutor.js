// netlify/functions/ai-tutor.js
// ES MODULE VERSION — works with "type": "module" in package.json

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type':                 'application/json',
};

function respond(statusCode, data) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body:    JSON.stringify(data),
  };
}

function buildSystemPrompt(ragContext, subject) {
  let prompt = [
    'You are Tutor Chuks, a friendly and expert AI tutor',
    'helping West African students prepare for WAEC, JAMB,',
    'and NECO examinations.',
    'Use clear simple English with relatable Nigerian examples.',
    'For math or science problems show every step clearly.',
    'Keep answers to 2 to 4 paragraphs unless more is needed.',
    'Always end with a short encouraging line.',
    'If unsure about something say so honestly.',
  ].join(' ');

  if (subject) {
    prompt += `\n\nThe student is currently studying: ${subject}.`;
  }
  if (ragContext) {
    prompt += `\n\nUse this reference material:\n---\n${ragContext}\n---`;
  }
  return prompt;
}

async function getRAGContext(query, subject) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
           || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('[RAG] Supabase env vars missing');
    return { context: '', source: null };
  }

  try {
    const endpoint = `${url}/rest/v1/questions_bank`
      + `?select=question_content,explanation`
      + `&limit=3`
      + `&order=difficulty_score.asc`;

    const res = await fetch(endpoint, {
      headers: {
        'apikey':        key,
        'Authorization': `Bearer ${key}`,
      },
    });

    const raw = await res.text();
    if (!res.ok) {
      console.warn('[RAG] Failed:', res.status);
      return { context: '', source: null };
    }

    const data = JSON.parse(raw);
    if (!Array.isArray(data) || data.length === 0) {
      return { context: '', source: null };
    }

    const context = data
      .filter(q => q.question_content)
      .map((q, i) => {
        let chunk = `[Question ${i + 1}]: ${q.question_content}`;
        if (q.explanation) chunk += `\nExplanation: ${q.explanation}`;
        return chunk;
      })
      .join('\n\n');

    console.log('[RAG] Got context length:', context.length);
    return { context, source: 'Questions Bank' };

  } catch (err) {
    console.warn('[RAG] Error:', err.message);
    return { context: '', source: null };
  }
}

async function saveChat(sessionId, userId, userMessage, aiResponse, subject, provider) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
           || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) return;

  try {
    const res = await fetch(`${url}/rest/v1/chat_messages`, {
      method: 'POST',
      headers: {
        'apikey':        key,
        'Authorization': `Bearer ${key}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify([
        {
          session_id: sessionId,
          user_id:    userId || null,
          role:       'user',
          content:    userMessage,
          metadata:   { subject },
        },
        {
          session_id: sessionId,
          user_id:    userId || null,
          role:       'assistant',
          content:    aiResponse,
          metadata:   { subject, provider },
        },
      ]),
    });
    console.log('[Supabase] Save status:', res.status);
  } catch (err) {
    console.warn('[Supabase] Save failed:', err.message);
  }
}

async function callGemini(chatMessages, systemPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const contents = chatMessages.map(m => ({
    role:  m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          maxOutputTokens: 1024,
          temperature:     0.4,
        },
      }),
    }
  );

  const raw = await res.text();
  console.log('[Gemini] Status:', res.status);
  console.log('[Gemini] Preview:', raw.substring(0, 200));

  if (!raw.trim()) throw new Error(`Gemini empty body HTTP ${res.status}`);

  const data = JSON.parse(raw);
  if (!res.ok) throw new Error(`Gemini: ${data?.error?.message || res.status}`);

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text?.trim()) {
    throw new Error(`Gemini no content. finishReason=${data?.candidates?.[0]?.finishReason}`);
  }

  console.log('[Gemini] ✅ Success');
  return text.trim();
}

async function callGroq(chatMessages, systemPrompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatMessages,
  ];

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      messages,
      max_tokens:  1024,
      temperature: 0.4,
      stream:      false,
    }),
  });

  const raw = await res.text();
  console.log('[Groq] Status:', res.status);
  console.log('[Groq] Preview:', raw.substring(0, 200));

  if (!raw.trim()) throw new Error(`Groq empty body HTTP ${res.status}`);

  const data = JSON.parse(raw);
  if (!res.ok) throw new Error(`Groq: ${data?.error?.message || res.status}`);

  const text = data?.choices?.[0]?.message?.content;
  if (!text?.trim()) {
    throw new Error(`Groq no content. finish_reason=${data?.choices?.[0]?.finish_reason}`);
  }

  console.log('[Groq] ✅ Success');
  return text.trim();
}

async function callHuggingFace(chatMessages, systemPrompt) {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) throw new Error('HF_API_KEY not set');

  const prompt = `System: ${systemPrompt}\n\n`
    + chatMessages
        .map(m => m.role === 'user' ? `Student: ${m.content}` : `Tutor: ${m.content}`)
        .join('\n')
    + '\nTutor:';

  const res = await fetch(
    'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
    {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens:   600,
          temperature:      0.4,
          return_full_text: false,
          do_sample:        true,
        },
      }),
    }
  );

  const raw = await res.text();
  console.log('[HuggingFace] Status:', res.status);
  console.log('[HuggingFace] Preview:', raw.substring(0, 200));

  if (!raw.trim()) throw new Error(`HuggingFace empty body HTTP ${res.status}`);

  const data = JSON.parse(raw);
  if (!res.ok) {
    if (data?.error?.includes?.('loading')) {
      throw new Error('HuggingFace model loading — retry in 20s');
    }
    throw new Error(`HuggingFace: ${data?.error || res.status}`);
  }

  const text = data?.[0]?.generated_text
            || data?.generated_text
            || (typeof data === 'string' ? data : null);

  if (!text?.trim()) throw new Error('HuggingFace no generated text');

  console.log('[HuggingFace] ✅ Success');
  return text.trim();
}

// ─────────────────────────────────────────────
// MAIN HANDLER — ES MODULE export
// ─────────────────────────────────────────────
export const handler = async function (event) {

  console.log('[ai-tutor] Hit!', event.httpMethod);
  console.log('[ai-tutor] ENV:', {
    GEMINI: !!process.env.GEMINI_API_KEY,
    GROQ:   !!process.env.GROQ_API_KEY,
    HF:     !!process.env.HF_API_KEY,
    SB:     !!process.env.SUPABASE_URL,
  });

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method Not Allowed' });
  }

  let body;
  try {
    if (!event.body) throw new Error('Empty request body');
    body = JSON.parse(event.body);
  } catch (err) {
    return respond(400, { error: 'Bad Request', message: err.message });
  }

  const {
    message,
    history    = [],
    subject    = null,
    session_id = null,
    user_id    = null,
  } = body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return respond(400, { error: 'Bad Request', message: '"message" is required' });
  }

  const sessionId = session_id
    || `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  try {
    // 1. RAG
    const { context: ragContext, source } = await getRAGContext(message, subject);

    // 2. System prompt — defined before providers
    const systemPrompt = buildSystemPrompt(ragContext, subject);

    // 3. Chat messages
    const chatMessages = [
      ...history
        .filter(h => h?.text?.trim())
        .map(h => ({
          role:    h.sender === 'student' ? 'user' : 'assistant',
          content: h.text,
        })),
      { role: 'user', content: message.trim() },
    ];

    // 4. Try providers — defined after systemPrompt
    const providers = [
      { name: 'Gemini',      fn: () => callGemini(chatMessages, systemPrompt)      },
      { name: 'Groq',        fn: () => callGroq(chatMessages, systemPrompt)        },
      { name: 'HuggingFace', fn: () => callHuggingFace(chatMessages, systemPrompt) },
    ];

    let aiResponse   = null;
    let usedProvider = null;
    const errors     = [];

    for (const p of providers) {
      try {
        console.log(`[ai-tutor] Trying ${p.name}...`);
        aiResponse   = await p.fn();
        usedProvider = p.name;
        console.log(`[ai-tutor] ✅ ${p.name} succeeded`);
        break;
      } catch (err) {
        console.warn(`[ai-tutor] ❌ ${p.name}:`, err.message);
        errors.push(`${p.name}: ${err.message}`);
      }
    }

    if (!aiResponse) {
      return respond(500, {
        error:   'All AI providers failed',
        message: errors.join(' | '),
      });
    }

    // 5. Save
    await saveChat(sessionId, user_id, message, aiResponse, subject, usedProvider);

    // 6. Return — always has `response` field
    return respond(200, {
      response:   aiResponse,
      source:     source || null,
      provider:   usedProvider,
      session_id: sessionId,
    });

  } catch (err) {
    console.error('[ai-tutor] Fatal:', err.message);
    return respond(500, {
      error:   'Internal Server Error',
      message: err.message,
    });
  }
};
