import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (!supabase) {
  console.error("❌ Supabase Initialization Failed: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.");
} else {
  console.log("📡 Supabase initialized successfully. Connection bridge active.");
}

