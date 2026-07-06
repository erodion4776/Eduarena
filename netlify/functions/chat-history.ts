// netlify/functions/chat-history.ts
import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
  'Content-Type':                 'application/json',
};

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      statusCode: 500,
      headers:    CORS_HEADERS,
      body:       JSON.stringify({ error: 'Supabase not configured.' }),
    };
  }

  const supabase  = createClient(supabaseUrl, supabaseKey);
  const sessionId = event.queryStringParameters?.session_id;

  if (!sessionId) {
    return {
      statusCode: 400,
      headers:    CORS_HEADERS,
      body:       JSON.stringify({ error: 'session_id is required.' }),
    };
  }

  // ── GET: Load history ──────────────────────────────────────────────────
  if (event.httpMethod === 'GET') {
    const limit = parseInt(event.queryStringParameters?.limit ?? '20', 10);

    const { data, error } = await supabase
      .from('chat_messages')
      .select('role, content, created_at, metadata')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      return {
        statusCode: 500,
        headers:    CORS_HEADERS,
        body:       JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      headers:    CORS_HEADERS,
      body:       JSON.stringify({ history: data ?? [] }),
    };
  }

  // ── DELETE: Clear history ──────────────────────────────────────────────
  if (event.httpMethod === 'DELETE') {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('session_id', sessionId);

    if (error) {
      return {
        statusCode: 500,
        headers:    CORS_HEADERS,
        body:       JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      headers:    CORS_HEADERS,
      body:       JSON.stringify({ success: true }),
    };
  }

  return {
    statusCode: 405,
    headers:    CORS_HEADERS,
    body:       JSON.stringify({ error: 'Method not allowed.' }),
  };
};

export { handler };
