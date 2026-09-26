import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente do Supabase self-hosted para o NAVEGADOR.
 * Usa apenas a chave pública (anon). Todo acesso a dados passa por RLS.
 * A service_role NUNCA deve ser usada aqui.
 */
const url = import.meta.env['VITE_SUPABASE_URL'] as string | undefined;
const anonKey = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}
