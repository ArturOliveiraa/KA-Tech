// Gera o rascunho do quiz de uma aula a partir da transcrição (Gemini).
// Não grava nada: devolve as perguntas para a equipe revisar no admin, que salva
// com a função save_lesson_quiz do banco.
// Só admin/instrutor. Publicar com: supabase functions deploy generate-quiz

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { generateQuiz } from "../_shared/gemini.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

// Transcrição muito longa (lives) é cortada: o quiz não precisa de tudo e a cota agradece
const MAX_TRANSCRIPT_CHARS = 120_000;

async function isStaff(req: Request) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return false;
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return ["admin", "teacher", "professor"].includes(String(profile?.role || "").toLowerCase());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  if (!(await isStaff(req))) return json({ error: "Apenas a equipe pode gerar quizzes." }, 403);

  const body = await req.json().catch(() => ({}));
  const lessonId = Number(body?.lesson_id);
  if (!Number.isInteger(lessonId) || lessonId <= 0) return json({ error: "lesson_id inválido" }, 400);
  const questions = Math.min(Math.max(Number(body?.questions) || 5, 3), 15);
  const options = Math.min(Math.max(Number(body?.options) || 4, 2), 6);

  const { data: lesson, error } = await admin
    .from("lessons")
    .select("id, title, content, transcript")
    .eq("id", lessonId)
    .maybeSingle();
  if (error || !lesson) return json({ error: "Aula não encontrada." }, 404);

  // A transcrição (revisada ou da IA) é a base; o texto da aula entra como complemento
  const transcript = String(lesson.transcript || "").trim();
  const content = String(lesson.content || "").trim();
  const source = transcript.includes(content) ? transcript : [content, transcript].filter(Boolean).join("\n\n");
  if (source.length < 200) {
    return json({
      error: "Esta aula ainda não tem transcrição suficiente para gerar o quiz. Espere ela entrar na busca ou cole o texto em \"Ver transcrição\".",
    }, 422);
  }

  try {
    const text = source.slice(0, MAX_TRANSCRIPT_CHARS);
    const draft = await generateQuiz(lesson.title, text, { questions, options });

    // O minuto só vale se a transcrição tem marcações [mm:ss]; sem elas (aula só com texto)
    // a IA chuta 00:00. Com elas, o minuto vai para o começo do bloco em que cai.
    const marks = [...text.matchAll(/^\[(?:(\d+):)?(\d{1,2}):(\d{2})\]/gm)]
      .map((m) => Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]))
      .sort((a, b) => a - b);
    for (const q of draft.questions) {
      const s = q.start_seconds;
      if (s == null || !marks.length || s > marks[marks.length - 1] + 120) {
        q.start_seconds = null;
        continue;
      }
      q.start_seconds = marks.filter((m) => m <= s).pop() ?? marks[0];
    }
    return json({ quiz: draft });
  } catch (e) {
    const message = String((e as Error)?.message || e);
    console.error("generate-quiz", lessonId, message);
    const busy = /quota|exhausted|rate|demand|overloaded|unavailable|try again/i.test(message);
    return json({
      error: busy
        ? "O Gemini está sem cota ou sobrecarregado agora. Tente de novo mais tarde."
        : message,
    }, busy ? 503 : 500);
  }
});
