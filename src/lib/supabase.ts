import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function admin(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase server credentials are missing.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
