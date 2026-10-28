// Busca semântica de aulas para a tela de Trilhas (pandAI).
// Gera o vetor da pergunta no Gemini e consulta search_lesson_chunks com o
// login do próprio aluno, então ele só vê aulas que já poderia ver.
// Publicar com: supabase functions deploy search-lessons

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { embedQuery } from "../_shared/gemini.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader) return json({ error: "Entre na sua conta para buscar." }, 401);

  // Cliente com o token do aluno: as regras de acesso (RLS) valem na consulta
  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Sessão expirada. Entre novamente." }, 401);

  const body = await req.json().catch(() => ({}));
  const query = String(body?.query || "").trim().slice(0, 300);
  if (query.length < 3) return json({ results: [] });

  try {
    const vector = await embedQuery(query);
    const { data, error } = await supabase.rpc("search_lesson_chunks", {
      query_embedding: JSON.stringify(vector),
      query_text: query,
      match_count: Math.min(Number(body?.limit) || 8, 20),
    });
    if (error) throw error;
    return json({ results: data ?? [] });
  } catch (e) {
    console.error("search-lessons", e);
    return json({ error: "Não foi possível buscar agora. Tente novamente em instantes." }, 500);
  }
});
