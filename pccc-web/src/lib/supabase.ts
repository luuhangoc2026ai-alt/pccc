import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://froplvkhamfjxktpwbjp.supabase.co';
const defaultAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyb3BsdmtoYW1manhrdHB3YmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1OTMzOTQsImV4cCI6MjEwNDE2OTM5NH0.N_jtmmtC6dxTGJGFEJeP2kpjMi--A6zPpu9zD8TWE5A';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultAnonKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder')
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);