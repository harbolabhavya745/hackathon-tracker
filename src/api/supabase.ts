import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('supabase_url') || 'https://ausayxftqpvsdfwgunvc.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('supabase_anon_key') || '';

export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey && supabaseUrl.includes('.supabase.co');
};

const clientUrl = isSupabaseConfigured() ? supabaseUrl : 'https://placeholder-project.supabase.co';
const clientKey = isSupabaseConfigured() ? supabaseAnonKey : 'placeholder-key';

export const supabase = createClient(clientUrl, clientKey);
