import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** `undefined` si l'app n'a pas été configurée avec un projet Supabase : le partage reste alors désactivé, le reste de l'app fonctionne normalement en local. */
export const supabase: SupabaseClient | undefined = url && anonKey ? createClient(url, anonKey) : undefined;
