import { createClient, type SupabaseClient, type Session, type User } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anon && !url.includes('YOUR_PROJECT') && !anon.includes('YOUR_SUPABASE'));
export const supabase: SupabaseClient | null = supabaseConfigured ? createClient(url!, anon!, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null;

export type AuthSnapshot = { session: Session | null; user: User | null };
