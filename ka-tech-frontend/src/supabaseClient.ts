import { createClient } from "@supabase/supabase-js";

// Para React comum, usamos o prefixo REACT_APP_
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY as string;

// Log para conferir no console (F12)
console.log("URL carregada:", SUPABASE_URL);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);