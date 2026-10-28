// Indexa uma aula para a busca semântica:
// transcreve o vídeo (Gemini) → divide em trechos com o minuto → gera vetores → grava em lesson_chunks.
//
// Chamada de duas formas:
//   • pelo gatilho do banco (pg_net), com o cabeçalho x-index-secret;
//   • pelo admin ("Reindexar"), com o login de um admin/instrutor.
// Publicar com: supabase functions deploy index-lesson --no-verify-jwt

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { embedDocuments, Segment, transcribeYouTube } from "../_shared/gemini.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INDEX_SECRET = Deno.env.get("INDEX_LESSON_SECRET") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const CHUNK_MAX_CHARS = 1200;
const CHUNK_MAX_SECONDS = 120;
// Vídeos acima disso (lives) são transcritos em partes, cada uma numa execução,
// para não passar do limite de tempo da Edge Function
const LONG_VIDEO_SECONDS = 35 * 60;
const PART_SECONDS = 30 * 60;

const youtubeId = (url: string | null) => {
  if (!url) return null;
  if (url.length === 11 && !url.includes("/")) return url;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([^&?/\s]{11})/);
  return m ? m[1] : null;
};

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/** Junta os blocos da transcrição em trechos de até ~2 minutos / 1200 caracteres. */
function toChunks(segments: Segment[]) {
  const chunks: { start: number; end: number; text: string }[] = [];
  let cur: { start: number; end: number; parts: string[]; size: number } | null = null;
  for (const seg of segments) {
    if (!cur) cur = { start: seg.start, end: seg.start, parts: [], size: 0 };
    const tooLong = cur.size + seg.text.length > CHUNK_MAX_CHARS || seg.start - cur.start > CHUNK_MAX_SECONDS;
    if (cur.parts.length && tooLong) {
      chunks.push({ start: cur.start, end: seg.start, text: cur.parts.join(" ") });
      cur = { start: seg.start, end: seg.start, parts: [], size: 0 };
    }
    cur.parts.push(seg.text);
    cur.size += seg.text.length + 1;
    cur.end = seg.start;
  }
  if (cur?.parts.length) chunks.push({ start: cur.start, end: cur.end, text: cur.parts.join(" ") });
  return chunks;
}

/** Lê a transcrição salva ("[mm:ss] texto" por linha); linhas sem minuto herdam o anterior. */
function parseTranscript(text: string): Segment[] {
  let last = 0;
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^\[(?:(\d+):)?(\d{1,2}):(\d{2})\]\s*(.*)$/);
      if (m) {
        last = (Number(m[1] || 0) * 3600) + Number(m[2]) * 60 + Number(m[3]);
        return { start: last, text: m[4].trim() };
      }
      return { start: last, text: line };
    })
    .filter((s) => s.text.length > 0);
}

/** Texto escrito pelo admin vira trechos sem minuto (começo da aula). */
function textToSegments(text: string): Segment[] {
  return text
    .split(/\n{2,}|(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => ({ start: 0, text: t }));
}

async function setStatus(lessonId: number, fields: Record<string, unknown>) {
  await admin.from("lessons").update(fields).eq("id", lessonId);
}

/** Chama a própria função para a próxima parte de uma live (responde 202 na hora). */
async function continueLater(lessonId: number) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/index-lesson`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-index-secret": INDEX_SECRET.trim() },
      body: JSON.stringify({ lesson_id: lessonId }),
    });
  } catch (e) {
    // A fila do banco retoma a aula parada em "processing" depois de 15 min, da parte em que estava
    console.error("index-lesson: não consegui pedir a próxima parte", lessonId, e);
  }
}

async function processLesson(lessonId: number) {
  const { data: lesson, error } = await admin
    .from("lessons")
    .select("*") // tolera colunas novas ainda não criadas (ex.: transcript_edited)
    .eq("id", lessonId)
    .maybeSingle();
  if (error || !lesson) return;

  if (lesson.status !== "published") {
    await admin.from("lesson_chunks").delete().eq("lesson_id", lessonId);
    await setStatus(lessonId, { index_status: "skipped", index_error: null });
    return;
  }

  // A hora do pedido evita que a fila do banco (index_lessons_queue) chame esta aula de novo
  await setStatus(lessonId, { index_status: "processing", index_error: null, index_requested_at: new Date().toISOString() });

  try {
    let segments: Segment[] = [];
    let source = "";
    let transcribeError = "";
    let finishedParts = false;

    // Transcrição revisada pela equipe no admin: é a fonte oficial, não chama a IA de novo
    const edited = lesson.transcript_edited === true && String(lesson.transcript || "").trim().length > 0;
    if (edited) {
      segments = parseTranscript(lesson.transcript);
      source = "editada";
    }

    const vid = edited ? null : youtubeId(lesson.videoUrl);
    const total = Math.ceil(Number(lesson.duration || 0) * 60);
    if (vid && total > LONG_VIDEO_SECONDS) {
      // Live: uma parte por execução; o progresso fica salvo e sobrevive a erro de cota
      const saved = lesson.transcript_progress;
      const prog: { video: string; next: number; segments: Segment[] } =
        saved?.video === vid ? saved : { video: vid, next: 0, segments: [] };
      try {
        let end = prog.next + PART_SECONDS;
        const last = end >= total;
        if (last) end = total + 60; // a duração cadastrada pode ser um pouco menor que a do vídeo
        const part = await transcribeYouTube(`https://www.youtube.com/watch?v=${vid}`, lesson.title, { start: prog.next, end });
        const all = [...prog.segments, ...part.filter((s) => s.start >= prog.next)];
        if (!last) {
          // Sem o progresso salvo, a próxima execução repetiria esta parte para sempre
          const { error: progError } = await admin
            .from("lessons")
            .update({ transcript_progress: { video: vid, next: end, segments: all } })
            .eq("id", lessonId);
          if (progError) throw new Error(`não foi possível salvar o andamento (${progError.message}); a migração 2026-10-28d já foi aplicada?`);
          await continueLater(lessonId);
          return;
        }
        segments = all;
        source = "gemini";
        finishedParts = true;
      } catch (e) {
        const done = Math.round(prog.next / 60), mins = Math.round(total / 60);
        // O andamento vai na frente: a mensagem é cortada em 500 caracteres
        transcribeError = `live com ${done} de ${mins} min transcritos; ${(e as Error).message}`;
      }
    } else if (vid) {
      try {
        segments = await transcribeYouTube(`https://www.youtube.com/watch?v=${vid}`, lesson.title);
        source = "gemini";
      } catch (e) {
        transcribeError = (e as Error).message;
      }
    }

    // Texto do admin complementa (ou substitui, se o vídeo não pôde ser transcrito)
    const manual = edited ? "" : (lesson.content || "").trim();
    if (manual.length >= 40) {
      segments = [...textToSegments(manual), ...segments];
      source = source ? `${source}+texto` : "texto";
    }

    if (!segments.length) {
      const why = transcribeError
        ? `Não foi possível transcrever o vídeo (${transcribeError}). Vídeos privados ou não listados não são aceitos; nesse caso, cole a transcrição no campo "Transcrição ou resumo".`
        : "A aula não tem vídeo do YouTube nem texto para indexar.";
      await admin.from("lesson_chunks").delete().eq("lesson_id", lessonId);
      await setStatus(lessonId, { index_status: "error", index_error: why.slice(0, 500) });
      return;
    }

    const chunks = toChunks(segments);
    const vectors = await embedDocuments(chunks.map((c) => c.text), lesson.title);

    const rows = chunks.map((c, i) => ({
      lesson_id: lesson.id,
      course_id: lesson.course_id,
      chunk_index: i,
      start_seconds: c.start,
      end_seconds: c.end,
      content: c.text,
      embedding: JSON.stringify(vectors[i]),
    }));

    const { error: delError } = await admin.from("lesson_chunks").delete().eq("lesson_id", lessonId);
    if (delError) throw delError;
    for (let i = 0; i < rows.length; i += 100) {
      const { error: insError } = await admin.from("lesson_chunks").insert(rows.slice(i, i + 100));
      if (insError) throw insError;
    }

    const transcript = segments
      .map((s) => (s.start > 0 ? `[${mmss(s.start)}] ${s.text}` : s.text))
      .join("\n");

    await setStatus(lessonId, {
      ...(edited ? {} : { transcript, transcript_source: source }),
      ...(finishedParts ? { transcript_progress: null } : {}),
      index_status: "done",
      index_error: transcribeError && source === "texto" ? `Vídeo não transcrito; indexado só pelo texto (${transcribeError})`.slice(0, 500) : null,
      indexed_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("index-lesson", lessonId, e);
    await setStatus(lessonId, { index_status: "error", index_error: String((e as Error)?.message || e).slice(0, 500) });
  }
}

/** Aceita o segredo do gatilho ou um admin/instrutor logado. */
async function authorized(req: Request) {
  // Espaços ou quebra de linha copiados junto com o segredo não devem barrar a chamada
  const secret = (req.headers.get("x-index-secret") || "").trim();
  const expected = INDEX_SECRET.trim();
  if (secret) {
    if (expected && secret === expected) return true;
    // Só os tamanhos vão para o log, nunca o valor do segredo
    console.warn(`index-lesson: segredo recusado (recebido ${secret.length} caracteres, configurado ${expected.length})`);
    return false;
  }

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

  if (!(await authorized(req))) return json({ error: "Não autorizado" }, 401);

  const body = await req.json().catch(() => ({}));
  const lessonId = Number(body?.lesson_id);
  if (!Number.isInteger(lessonId) || lessonId <= 0) return json({ error: "lesson_id inválido" }, 400);

  // Responde na hora e continua em segundo plano (transcrever leva de segundos a minutos)
  // @ts-ignore EdgeRuntime existe no ambiente do Supabase
  EdgeRuntime.waitUntil(processLesson(lessonId));
  return json({ ok: true, lesson_id: lessonId, status: "processing" }, 202);
});
