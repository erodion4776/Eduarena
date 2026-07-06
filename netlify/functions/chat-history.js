// netlify/functions/chat-history.js
const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
  'Content-Type':                 'application/json',
};

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

exports.handler = async function(event, context) {
  console.log('[Netlify Function chat-history] Request received:', event.httpMethod, event.path);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (!supabaseUrl || !supabaseKey) {
    console.error('[Netlify Function chat-history] Supabase URL or Key is missing.');
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Configuration Error', message: 'Supabase is not configured on the backend.' })
    };
  }

  const sessionId = event.queryStringParameters?.session_id;
  if (!sessionId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Bad Request', message: 'Query parameter "session_id" is required.' })
    };
  }

  // ── GET: Load history ──────────────────────────────────────────────────
  if (event.httpMethod === 'GET') {
    const limit = event.queryStringParameters?.limit || '20';
    const url = `${supabaseUrl}/rest/v1/chat_messages?session_id=eq.${encodeURIComponent(sessionId)}&select=role,content,created_at,metadata&order=created_at.asc&limit=${limit}`;

    try {
      console.log(`[chat-history] Fetching history for session: ${sessionId}`);
      const response = await fetch(url, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });

      const rawText = await response.text();
      console.log(`[chat-history] Fetch status: ${response.status}`);

      if (!response.ok) {
        let errData;
        try { errData = JSON.parse(rawText); } catch(e) {}
        throw new Error(errData?.error?.message || errData?.message || `Supabase REST returned ${response.status}`);
      }

      const data = JSON.parse(rawText);
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ history: Array.isArray(data) ? data : [] })
      };
    } catch (err) {
      console.error('[chat-history] GET Error:', err.message);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Internal Server Error', message: err.message })
      };
    }
  }

  // ── DELETE: Clear history ──────────────────────────────────────────────
  if (event.httpMethod === 'DELETE') {
    const url = `${supabaseUrl}/rest/v1/chat_messages?session_id=eq.${encodeURIComponent(sessionId)}`;

    try {
      console.log(`[chat-history] Deleting history for session: ${sessionId}`);
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });

      console.log(`[chat-history] Delete status: ${response.status}`);

      if (!response.ok) {
        const rawText = await response.text();
        let errData;
        try { errData = JSON.parse(rawText); } catch(e) {}
        throw new Error(errData?.error?.message || errData?.message || `Supabase REST returned ${response.status}`);
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true })
      };
    } catch (err) {
      console.error('[chat-history] DELETE Error:', err.message);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Internal Server Error', message: err.message })
      };
    }
  }

  return {
    statusCode: 405,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: 'Method Not Allowed', message: 'Supported methods: GET, DELETE' })
  };
};
