import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://sbsjiiquxesyjtskjuyw.supabase.co";

// A anon key é pública por design (RLS bloqueia tudo que importa).
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNic2ppaXF1eGVzeWp0c2tqdXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NjMxMDUsImV4cCI6MjEwMjMzOTEwNX0.n6cPyZBsuIh3vCWJTSbppFODJ8uXSBM-8XMklhgarA4";

let client: SupabaseClient | null = null;

/** Cliente único (browser). A sessão é persistida pelo próprio supabase-js. */
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

/** URL pública de um arquivo no bucket `conteudo`. */
export function publicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/conteudo/${path}`;
}
