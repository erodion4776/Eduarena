import express from 'express';
import { runRAGPipeline } from '../services/ragService';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

let supabaseInstance: any = null;
function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase environment variables (SUPABASE_URL and SUPABASE_SERVICE_KEY) are not configured.');
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(url, key);
  }
  return supabaseInstance;
}

// ── 1. Post Chat Message (Tutor Endpoint) ──────────────────────────────────
router.post('/tutor', async (req, res) => {
  try {
    const { message, history, subject, session_id, user_id } = req.body;

    // ── BUG FIX: Validate required fields early ──────────────────────
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        error:   'Bad Request',
        message: 'The "message" field is required and must be a non-empty string.',
      });
    }

    if (!session_id) {
      return res.status(400).json({ error: 'Missing session_id' });
    }

    // ── BUG FIX: Log what we received ─────────────────────────
    console.log('[AI Tutor] Incoming request:', {
      message:    message.substring(0, 100),
      historyLen: Array.isArray(history) ? history.length : 0,
      subject,
      session_id,
      user_id,
    });

    const result = await runRAGPipeline(
      message,
      history || [],
      session_id,
      subject,
      user_id
    );

    // ── BUG FIX: Validate LLM output before sending ──────────────────
    if (!result || !result.response || typeof result.response !== 'string' || !result.response.trim()) {
      console.error('[AI Tutor] RAG pipeline returned empty/null response:', result);
      return res.status(500).json({
        error:   'Empty LLM Response',
        message: 'The AI model returned an empty response. Please try again.',
      });
    }

    // ── BUG FIX: Always return `response` field ──────────────────────
    return res.json(result);

  } catch (error: any) {
    console.error('[AI Tutor] Unhandled error:', error);

    // ── BUG FIX: Never let Express send an empty body on error ───────
    return res.status(500).json({
      error:   'Internal Server Error',
      message: error?.message || 'Something went wrong. Please try again.',
    });
  }
});

// ── 2. Get Chat History ──────────────────────────────────────────────────
router.get('/chat/history', async (req, res) => {
  const { session_id, limit = '20' } = req.query;

  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  try {
    const supabase = getSupabase();
    
    // Attempt standard RAG chat_messages table
    let { data, error } = await supabase
      .from('chat_messages')
      .select('role, content, metadata, created_at')
      .eq('session_id', session_id)
      .order('created_at', { ascending: true })
      .limit(Number(limit));

    if (error) {
      console.warn('⚠️ chat_messages query failed, trying fallback chat_sessions table:', error.message);
      
      // Fallback: Query the original chat_sessions table
      const fallbackResult = await supabase
        .from('chat_sessions')
        .select('role, content, metadata, created_at')
        .eq('session_id', session_id)
        .order('created_at', { ascending: true })
        .limit(Number(limit));
        
      if (fallbackResult.error) {
        throw fallbackResult.error;
      }
      data = fallbackResult.data;
    }

    const formattedHistory = (data || []).map((msg: any) => ({
      role: msg.role === 'assistant' || msg.role === 'ai' ? 'ai' : 'user',
      content: msg.content,
      created_at: msg.created_at,
      metadata: msg.metadata,
    }));

    res.json({ history: formattedHistory });
  } catch (error: any) {
    console.error('Get History Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch chat history' });
  }
});

// ── 3. Clear Chat History ────────────────────────────────────────────────
router.delete('/chat/history', async (req, res) => {
  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  try {
    const supabase = getSupabase();
    
    // Delete from chat_messages table
    const { error: msgError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('session_id', session_id);

    if (msgError) {
      console.warn('⚠️ Failed to delete from chat_messages, trying fallback table chat_sessions:', msgError.message);
      
      // Fallback: Delete from original chat_sessions table
      const { error: fbError } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('session_id', session_id);
        
      if (fbError) throw fbError;
    } else {
      // Also optionally delete the session record from chat_sessions
      await supabase
        .from('chat_sessions')
        .delete()
        .eq('session_id', session_id);
    }

    res.json({ success: true, message: 'Chat history cleared' });
  } catch (error: any) {
    console.error('Clear History Error:', error);
    res.status(500).json({ error: error.message || 'Failed to clear chat history' });
  }
});

export default router;
