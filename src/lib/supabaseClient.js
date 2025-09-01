// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  // Nicht hart failen – wir erlauben Fallback auf lokale Daten
  console.warn(
    "[Supabase] VITE_SUPABASE_URL oder VITE_SUPABASE_ANON_KEY fehlt – nutze lokale Fallback-Daten."
  );
}

export const supabase = createClient(url || "http://localhost", key || "anon", {
  auth: { persistSession: true, autoRefreshToken: true },
});
