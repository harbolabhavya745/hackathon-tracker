import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Use a placeholder if missing to prevent createClient from throwing during the 'import' phase.
// This ensures the main app bundle can still run and show the Auth/Config screen.
const safeUrl = supabaseUrl || 'https://placeholder-project.supabase.co';
const safeKey = supabaseAnonKey || 'placeholder-key';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Supabase credentials missing! Check your environment variables.');
}

export const supabase = createClient(safeUrl, safeKey);
