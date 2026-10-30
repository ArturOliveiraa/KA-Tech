// Busca semântica de aulas para a tela de Trilhas (pandAI).
// Gera o vetor da pergunta no Gemini e consulta search_lesson_chunks com o
// login do próprio aluno, então ele só vê aulas que já poderia ver.
// Publicar com: supabase functions deploy search-lessons

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { embedQuery, rerankLessons } from "../_shared/gemini.ts";

// A busca do banco traz candidatos; a IA reordena e só as melhores aparecem
const CANDIDATES = 12;
const MAX_RESULTS = 3;
const MIN_SCORE = 6; // nota da IA (0 a 10) para a aula aparecer
const RERANK_TIMEOUT_MS = 9000;
// Sem a IA: só ficam as aulas quase tão parecidas quanto a primeira
const FALLBACK_SIM_GAP = 0.04;

const withTimeout = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);

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
      match_count: CANDIDATES,
    });
    if (error) throw error;
    const candidates = (data ?? []) as any[];
    if (!candidates.length) return json({ results: [] });

    try {
      const scores = await withTimeout(
        rerankLessons(query, candidates.map((c) => ({ title: c.lesson_title, course: c.course_title, text: c.lesson_summary ? `Resumo da aula: ${c.lesson_summary} Trecho: ${c.content}` : c.content }))),
        RERANK_TIMEOUT_MS,
      );
      const results = candidates
        .map((c, i) => ({ ...c, score: scores[i] }))
        .filter((c) => c.score >= MIN_SCORE)
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_RESULTS);
      return json({ results, ranked_by: "ia" });
    } catch (e) {
      // Sem a IA (cota, demora): fica a ordem do banco
      console.error("search-lessons rerank", String((e as Error)?.message || e));
      const top = Math.max(...candidates.map((c) => Number(c.similarity) || 0));
      const results = candidates
        .filter((c) => (Number(c.similarity) || 0) >= top - FALLBACK_SIM_GAP)
        .slice(0, MAX_RESULTS);
      return json({ results, ranked_by: "banco", rerank_error: String((e as Error)?.message || e).slice(0, 200) });
    }
  } catch (e) {
    console.error("search-lessons", e);
    return json({ error: "Não foi possível buscar agora. Tente novamente em instantes." }, 500);
  }
});
