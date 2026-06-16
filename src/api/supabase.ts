import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey && supabaseUrl !== 'https://placeholder-project.supabase.co';
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
