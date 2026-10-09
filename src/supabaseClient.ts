import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.REACT_APP_SUPABASE_URL) ||
  'https://wwfhqrzrbdbjvixjytzt.supabase.co';

const supabaseAnonKey: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.REACT_APP_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZmhxcnpyYmRianZpeGp5dHp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NzY3MTIsImV4cCI6MjA5OTU1MjcxMn0.cZyN4Kdmhaec41eq5dvqgmWsDC2cItDi86H-JH1tTVg';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project')
);
