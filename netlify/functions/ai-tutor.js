// netlify/functions/ai-tutor.js

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type':                 'application/json',
};

// ─────────────────────────────────────────────
// Helper — always returns valid JSON response
// ─────────────────────────────────────────────
function respond(statusCode, data) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body:    JSON.stringify(data),
  };
}

// ─────────────────────────────────────────────
// System Prompt
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// RAG — get context from Supabase questions_bank
// Uses actual schema
// ─────────────────────────────────────────────
async function getRAGContext(query, subject) {
  const url  = process.env.SUPABASE_URL;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY
            || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('[RAG] Supabase env vars missing — skipping RAG');
    return { context: '', source: null };
  }

  try {
    // Search questions_bank using actual table
    let endpoint = `${url}/rest/v1/questions_bank`
      + `?select=question_content,explanation,topic_id,subject_id`
      + `&limit=3`
      + `&order=difficulty_score.asc`;

    console.log('[RAG] Querying questions_bank...');

    const res = await fetch(endpoint, {
      headers: {
        'apikey':        key,
        'Authorization': `Bearer ${key}`,
      },
    });

    const raw = await res.text();

    if (!res.ok) {
      console.warn('[RAG] Failed:', res.status, raw.substring(0, 100));
      return { context: '', source: null };
    }

    const data = JSON.parse(raw);

    if (!Array.isArray(data) || data.length === 0) {
      console.log('[RAG] No questions found');
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

    console.log('[RAG] Got context, length:', context.length);
    return { context, source: 'Questions Bank' };

  } catch (err) {
    console.warn('[RAG] Error (non-fatal):', err.message);
    return { context: '', source: null };
  }
}

// ─────────────────────────────────────────────
// Save to Supabase chat_messages
// ─────────────────────────────────────────────
async function saveChat(sessionId, userId, userMessage, aiResponse, subject, provider) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
           || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('[Supabase] Missing env vars — skipping save');
    return;
  }

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
    console.warn('[Supabase] Save failed (non-fatal):', err.message);
  }
}

// ─────────────────────────────────────────────
// Gemini
// ─────────────────────────────────────────────
async function callGemini(messages, systemPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in Netlify env vars');

  const contents = messages.map(m => ({
    role:  m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  const body = {
    contents,
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      maxOutputTokens: 1024,
      temperature:     0.4,
    },
  };

  console.log('[Gemini] Calling API...');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    }
  );

  const raw = await res.text();
  console.log('[Gemini] Status:', res.status);
  console.log('[Gemini] Body preview:', raw.substring(0, 200));

  if (!raw.trim()) {
    throw new Error(`Gemini empty body HTTP ${res.status}`);
  }

  const data = JSON.parse(raw);

  if (!res.ok) {
    throw new Error(`Gemini error: ${data?.error?.message || res.status}`);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || !text.trim()) {
    const reason = data?.candidates?.[0]?.finishReason || 'unknown';
    throw new Error(`Gemini no content. finishReason=${reason}`);
  }

  console.log('[Gemini] ✅ Success, length:', text.length);
  return text.trim();
}

// ─────────────────────────────────────────────
// Groq
// ─────────────────────────────────────────────
async function callGroq(messages, systemPrompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set in Netlify env vars');

  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  console.log('[Groq] Calling API...');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      messages:    fullMessages,
      max_tokens:  1024,
      temperature: 0.4,
      stream:      false,
    }),
  });

  const raw = await res.text();
  console.log('[Groq] Status:', res.status);
  console.log('[Groq] Body preview:', raw.substring(0, 200));

  if (!raw.trim()) {
    throw new Error(`Groq empty body HTTP ${res.status}`);
  }

  const data = JSON.parse(raw);

  if (!res.ok) {
    throw new Error(`Groq error: ${data?.error?.message || res.status}`);
  }

  const text = data?.choices?.[0]?.message?.content;
  if (!text || !text.trim()) {
    throw new Error(`Groq no content. finish_reason=${data?.choices?.[0]?.finish_reason}`);
  }

  console.log('[Groq] ✅ Success, length:', text.length);
  return text.trim();
}

// ─────────────────────────────────────────────
// HuggingFace
// ─────────────────────────────────────────────
async function callHuggingFace(messages, systemPrompt) {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) throw new Error('HF_API_KEY not set in Netlify env vars');

  const prompt = `System: ${systemPrompt}\n\n`
    + messages
        .map(m => m.role === 'user' ? `Student: ${m.content}` : `Tutor: ${m.content}`)
        .join('\n')
    + '\nTutor:';

  console.log('[HuggingFace] Calling API...');

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
  console.log('[HuggingFace] Body preview:', raw.substring(0, 200));

  if (!raw.trim()) {
    throw new Error(`HuggingFace empty body HTTP ${res.status}`);
  }

  const data = JSON.parse(raw);

  if (!res.ok) {
    if (data?.error?.includes?.('loading')) {
      throw new Error('HuggingFace model loading — retry in 20 seconds');
    }
    throw new Error(`HuggingFace error: ${data?.error || res.status}`);
  }

  const text = data?.[0]?.generated_text
            || data?.generated_text
            || (typeof data === 'string' ? data : null);

  if (!text || !text.trim()) {
    throw new Error('HuggingFace no generated text');
  }

  console.log('[HuggingFace] ✅ Success, length:', text.length);
  return text.trim();
}

// ─────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────
exports.handler = async function (event) {

  console.log('[ai-tutor] Hit!', event.httpMethod);
  console.log('[ai-tutor] ENV check:', {
    GEMINI: !!process.env.GEMINI_API_KEY,
    GROQ:   !!process.env.GROQ_API_KEY,
    HF:     !!process.env.HF_API_KEY,
    SB_URL: !!process.env.SUPABASE_URL,
    SB_KEY: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY),
  });

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method Not Allowed' });
  }

  let body;
  try {
    if (!event.body) throw new Error('Request body is empty');
    body = JSON.parse(event.body);
  } catch (err) {
    console.error('[ai-tutor] Body parse error:', err.message);
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

  console.log('[ai-tutor] Message:', message.substring(0, 80));
  console.log('[ai-tutor] Subject:', subject);
  console.log('[ai-tutor] History length:', history.length);

  const sessionId = session_id
    || `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  try {
    const { context: ragContext, source } = await getRAGContext(message, subject);
    const systemPrompt = buildSystemPrompt(ragContext, subject);

    const chatMessages = history
      .filter(h => h?.text?.trim())
      .map(h => ({
        role:    h.sender === 'student' ? 'user' : 'assistant',
        content: h.text,
      }));

    chatMessages.push({ role: 'user', content: message.trim() });

    const providers = [
      { name: 'Gemini',      fn: () => callGemini(chatMessages, systemPrompt)      },
      { name: 'Groq',        fn: () => callGroq(chatMessages, systemPrompt)        },
      { name: 'HuggingFace', fn: () => callHuggingFace(chatMessages, systemPrompt) },
    ];

    let aiResponse       = null;
    let usedProvider     = null;
    const providerErrors = [];

    for (const p of providers) {
      try {
        console.log(`[ai-tutor] Trying ${p.name}...`);
        aiResponse   = await p.fn();
        usedProvider = p.name;
        console.log(`[ai-tutor] ✅ ${p.name} worked!`);
        break;
      } catch (err) {
        console.warn(`[ai-tutor] ❌ ${p.name} failed:`, err.message);
        providerErrors.push(`${p.name}: ${err.message}`);
      }
    }

    if (!aiResponse) {
      console.error('[ai-tutor] All providers failed:', providerErrors);
      return respond(500, {
        error:   'All AI providers failed',
        message: providerErrors.join(' | '),
      });
    }

    await saveChat(sessionId, user_id, message, aiResponse, subject, usedProvider);

    console.log('[ai-tutor] ✅ Returning response from', usedProvider);

    return respond(200, {
      response:   aiResponse,
      source:     source || null,
      provider:   usedProvider,
      session_id: sessionId,
    });

  } catch (err) {
    console.error('[ai-tutor] Unexpected error:', err.message);
    return respond(500, {
      error:   'Internal Server Error',
      message: err.message,
    });
  }
};
