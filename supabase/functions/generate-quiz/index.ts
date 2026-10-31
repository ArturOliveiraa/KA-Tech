// Gera o rascunho do quiz de uma aula a partir da transcrição (Gemini).
// Duas formas de chamar:
//   • pelo admin (login de admin/instrutor): devolve as perguntas sem gravar; a
//     equipe revisa e salva com a função save_lesson_quiz do banco;
//   • pela fila "rascunhar-quizzes" (cabeçalho x-index-secret, { save: true }):
//     usa um modelo leve e grava como rascunho, se a aula ainda não tem quiz.
// Publicar com: supabase functions deploy generate-quiz (verify_jwt = false no config.toml)

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { generateQuiz, QuizDraft } from "../_shared/gemini.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INDEX_SECRET = Deno.env.get("INDEX_LESSON_SECRET") ?? "";

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

const fromQueue = (req: Request) => {
  const secret = (req.headers.get("x-index-secret") || "").trim();
  return !!secret && !!INDEX_SECRET.trim() && secret === INDEX_SECRET.trim();
};

/** Texto base do quiz: a transcrição, com o texto da aula como complemento. */
async function loadSource(lessonId: number) {
  const { data: lesson, error } = await admin
    .from("lessons")
    .select("id, title, content, transcript")
    .eq("id", lessonId)
    .maybeSingle();
  if (error || !lesson) return null;
  const transcript = String(lesson.transcript || "").trim();
  const content = String(lesson.content || "").trim();
  const source = transcript.includes(content) ? transcript : [content, transcript].filter(Boolean).join("\n\n");
  return { lesson, text: source.slice(0, MAX_TRANSCRIPT_CHARS) };
}

/**
 * O minuto só vale se a transcrição tem marcações [mm:ss]; sem elas (aula só com texto)
 * a IA chuta 00:00. Com elas, o minuto vai para o começo do bloco em que cai.
 */
function fixMinutes(draft: QuizDraft, text: string) {
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
}

/** Fila: gera com o modelo leve e grava como rascunho. */
async function draftForQueue(lessonId: number) {
  try {
    const { data: existing } = await admin.from("quizzes").select("id").eq("lesson_id", lessonId).maybeSingle();
    if (existing) return; // a equipe criou um quiz enquanto a aula esperava

    const src = await loadSource(lessonId);
    if (!src) return;
    if (src.text.length < 200) throw new Error("transcrição curta demais para gerar o quiz");

    const draft = await generateQuiz(src.lesson.title, src.text, { questions: 5, options: 4, lite: true });
    fixMinutes(draft, src.text);

    // Confere de novo: gerar leva alguns segundos
    const { data: again } = await admin.from("quizzes").select("id").eq("lesson_id", lessonId).maybeSingle();
    if (again) return;

    const { error } = await admin.rpc("save_lesson_quiz", {
      p_lesson_id: lessonId,
      p_quiz: { ...draft, status: "draft", generated_by: "ia-lote" },
    });
    if (error) throw new Error(error.message);
    await admin.from("lessons").update({ quiz_draft_error: null }).eq("id", lessonId);
  } catch (e) {
    const message = String((e as Error)?.message || e).slice(0, 500);
    console.error("generate-quiz (fila)", lessonId, message);
    await admin.from("lessons").update({ quiz_draft_error: message }).eq("id", lessonId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const queue = fromQueue(req);
  if (!queue && !(await isStaff(req))) return json({ error: "Apenas a equipe pode gerar quizzes." }, 403);

  const body = await req.json().catch(() => ({}));
  const lessonId = Number(body?.lesson_id);
  if (!Number.isInteger(lessonId) || lessonId <= 0) return json({ error: "lesson_id inválido" }, 400);

  if (queue && body?.save === true) {
    // Responde na hora e gera em segundo plano (leva de segundos a um minuto)
    // @ts-ignore EdgeRuntime existe no ambiente do Supabase
    EdgeRuntime.waitUntil(draftForQueue(lessonId));
    return json({ ok: true, lesson_id: lessonId, status: "drafting" }, 202);
  }

  const questions = Math.min(Math.max(Number(body?.questions) || 5, 3), 15);
  const options = Math.min(Math.max(Number(body?.options) || 4, 2), 6);

  const src = await loadSource(lessonId);
  if (!src) return json({ error: "Aula não encontrada." }, 404);
  if (src.text.length < 200) {
    return json({
      error: "Esta aula ainda não tem transcrição suficiente para gerar o quiz. Espere ela entrar na busca ou cole o texto em \"Ver transcrição\".",
    }, 422);
  }

  try {
    const draft = await generateQuiz(src.lesson.title, src.text, { questions, options });
    fixMinutes(draft, src.text);
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
