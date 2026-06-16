import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey && supabaseUrl.includes('.supabase.co');
};

// We still initialize the client even if URL is empty to prevent top-level reference errors.
// But we use a valid URL format as a fallback so createClient doesn't throw.
const clientUrl = isSupabaseConfigured() ? supabaseUrl : 'https://placeholder-project.supabase.co';
const clientKey = isSupabaseConfigured() ? supabaseAnonKey : 'placeholder-key';

export const supabase = createClient(clientUrl, clientKey);
