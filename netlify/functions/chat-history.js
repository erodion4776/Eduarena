// netlify/functions/chat-history.js
// ES MODULE VERSION

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
  'Content-Type':                 'application/json',
};

function respond(statusCode, data) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body:    JSON.stringify(data),
  };
}

export const handler = async function (event) {

  console.log('[chat-history] Hit!', event.httpMethod);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
           || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return respond(500, { error: 'Supabase not configured' });
  }

  const sessionId = event.queryStringParameters?.session_id;
  if (!sessionId) {
    return respond(400, { error: 'session_id is required' });
  }

  // GET
  if (event.httpMethod === 'GET') {
    const limit = event.queryStringParameters?.limit || '20';
    try {
      const res = await fetch(
        `${url}/rest/v1/chat_messages`
        + `?session_id=eq.${encodeURIComponent(sessionId)}`
        + `&select=role,content,created_at,metadata`
        + `&order=created_at.asc`
        + `&limit=${limit}`,
        {
          headers: {
            'apikey':        key,
            'Authorization': `Bearer ${key}`,
          },
        }
      );
      const raw  = await res.text();
      const data = JSON.parse(raw);
      return respond(200, { history: Array.isArray(data) ? data : [] });
    } catch (err) {
      return respond(500, { error: err.message });
    }
  }

  // DELETE
  if (event.httpMethod === 'DELETE') {
    try {
      const res = await fetch(
        `${url}/rest/v1/chat_messages`
        + `?session_id=eq.${encodeURIComponent(sessionId)}`,
        {
          method:  'DELETE',
          headers: {
            'apikey':        key,
            'Authorization': `Bearer ${key}`,
          },
        }
      );
      console.log('[chat-history] Delete status:', res.status);
      return respond(200, { success: true });
    } catch (err) {
      return respond(500, { error: err.message });
    }
  }

  return respond(405, { error: 'Method Not Allowed' });
};
