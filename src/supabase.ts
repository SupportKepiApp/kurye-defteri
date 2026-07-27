import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // detectSessionInUrl MUTLAKA true olmalı — Google OAuth sonrası URL'deki
    // ?code= veya #access_token= parametrelerini bu ayar işler.
    // false yaparsak OAuth callback asla işlenmez (hem web hem Capacitor bozulur).
    detectSessionInUrl: true,
  },
});
