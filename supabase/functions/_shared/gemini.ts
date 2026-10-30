// Chamadas ao Gemini usadas pelas funções de indexação e busca.
// Modelos configuráveis por variável de ambiente para trocar sem mexer no código.

const API = "https://generativelanguage.googleapis.com/v1beta";

export const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
export const TRANSCRIBE_MODEL = Deno.env.get("GEMINI_TRANSCRIBE_MODEL") ?? "gemini-3.6-flash";
export const EMBED_MODEL = Deno.env.get("GEMINI_EMBED_MODEL") ?? "gemini-embedding-2";
export const EMBED_DIMENSIONS = 768; // precisa bater com vector(768) em lesson_chunks

export interface Segment {
  start: number; // segundos
  text: string;
}

async function call(path: string, body: unknown): Promise<any> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada nas Edge Functions.");
  const res = await fetch(`${API}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Gemini: ${msg}`);
  }
  return data;
}

const mm = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Transcreve um vídeo público do YouTube em blocos com o segundo de início.
 * Vídeos privados ou não listados não são aceitos pelo Gemini.
 * Com `clip`, transcreve só esse trecho (lives longas são feitas em partes);
 * os segundos devolvidos são sempre contados do início do vídeo inteiro.
 */
export async function transcribeYouTube(
  watchUrl: string,
  lessonTitle: string,
  clip?: { start: number; end: number },
): Promise<Segment[]> {
  const prompt = [
    "Transcreva integralmente a fala deste vídeo em português do Brasil, sem resumir.",
    `O vídeo é a aula "${lessonTitle}" de um curso sobre sistemas da Softcom.`,
    clip ? `Transcreva só o trecho de ${mm(clip.start)} a ${mm(clip.end)} do vídeo.` : "",
    "Divida a transcrição em blocos de 30 a 60 segundos.",
    "Para cada bloco informe 'start' (segundo em que o bloco começa, número inteiro) e 'text' (a fala transcrita).",
    "Ignore música, silêncio e vinhetas. Não invente conteúdo que não foi falado.",
  ].filter(Boolean).join(" ");

  const video: Record<string, unknown> = { file_data: { file_uri: watchUrl } };
  if (clip) video.video_metadata = { start_offset: `${clip.start}s`, end_offset: `${clip.end}s` };

  const data = await call(`models/${TRANSCRIBE_MODEL}:generateContent`, {
    contents: [{
      parts: [
        video,
        { text: prompt },
      ],
    }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 65536,
      mediaResolution: "MEDIA_RESOLUTION_LOW", // só o áudio importa: menos tokens, vídeos mais longos
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: { start: { type: "NUMBER" }, text: { type: "STRING" } },
          required: ["start", "text"],
        },
      },
    },
  });

  const raw = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
  if (!raw) {
    const reason = data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason || "resposta vazia";
    throw new Error(`Gemini não devolveu a transcrição (${reason}).`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Gemini devolveu uma transcrição em formato inválido (talvez o vídeo seja longo demais).");
  }

  const segments = (Array.isArray(parsed) ? parsed : [])
    .map((s: any) => ({ start: Math.max(0, Math.floor(Number(s?.start) || 0)), text: String(s?.text || "").trim() }))
    .filter((s) => s.text.length > 0)
    .sort((a, b) => a.start - b.start);

  // Num trecho, o Gemini às vezes conta os segundos a partir do começo do trecho:
  // se todos ficaram antes do trecho, desloca para o tempo do vídeo inteiro
  if (clip && clip.start > 0 && segments.length && segments[segments.length - 1].start < clip.start) {
    for (const s of segments) s.start += clip.start;
  }
  return segments;
}

export const QUIZ_MODEL = Deno.env.get("GEMINI_QUIZ_MODEL") ?? TRANSCRIBE_MODEL;

export interface QuizDraft {
  title: string;
  questions: {
    content: string;
    options: { content: string; is_correct: boolean }[];
    explanation: string;
    start_seconds: number | null;
  }[];
}

/**
 * Cria perguntas de múltipla escolha a partir da transcrição da aula.
 * Linhas da transcrição com "[mm:ss]" permitem apontar o minuto da resposta.
 */
export async function generateQuiz(
  lessonTitle: string,
  transcript: string,
  opts: { questions: number; options: number },
): Promise<QuizDraft> {
  const prompt = [
    `Você cria quizzes para a aula "${lessonTitle}" de um curso sobre os sistemas da Softcom.`,
    `Com base SOMENTE na transcrição abaixo, crie ${opts.questions} perguntas de múltipla escolha em português do Brasil,`,
    `cada uma com exatamente ${opts.options} alternativas e só 1 correta.`,
    "Pergunte sobre o que a aula ensina de prático (onde fica cada menu, o que cada campo faz, a ordem dos passos, regras e cuidados),",
    "não sobre detalhes irrelevantes como o nome do apresentador ou frases de abertura.",
    "As alternativas erradas devem ser plausíveis, do mesmo tamanho e estilo da certa; evite \"todas as anteriores\" e \"nenhuma das anteriores\".",
    "Varie a posição da alternativa correta.",
    "Em 'explanation', explique em 1 ou 2 frases por que a resposta está certa, como a aula explica.",
    "Em 'start_seconds', informe o segundo do vídeo em que a resposta aparece, usando as marcações [mm:ss] ou [h:mm:ss] da transcrição; se não houver marcação, use null.",
    "Em 'correct_index', informe a posição (começando em 0) da alternativa correta.",
    "",
    "TRANSCRIÇÃO:",
    transcript,
  ].join("\n");

  const data = await call(`models/${QUIZ_MODEL}:generateContent`, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 16384,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          questions: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                question: { type: "STRING" },
                options: { type: "ARRAY", items: { type: "STRING" } },
                correct_index: { type: "INTEGER" },
                explanation: { type: "STRING" },
                start_seconds: { type: "INTEGER", nullable: true },
              },
              required: ["question", "options", "correct_index", "explanation"],
            },
          },
        },
        required: ["title", "questions"],
      },
    },
  });

  const raw = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const reason = data?.candidates?.[0]?.finishReason || "formato inválido";
    throw new Error(`Gemini não devolveu o quiz (${reason}). Tente gerar de novo.`);
  }

  const questions = (Array.isArray(parsed?.questions) ? parsed.questions : [])
    .map((q: any) => {
      const options = (Array.isArray(q?.options) ? q.options : []).map((o: any) => String(o || "").trim()).filter(Boolean);
      const correct = Number(q?.correct_index);
      if (!String(q?.question || "").trim() || options.length < 2 || !(correct >= 0 && correct < options.length)) return null;
      const start = Number(q?.start_seconds);
      return {
        content: String(q.question).trim(),
        options: options.map((content: string, i: number) => ({ content, is_correct: i === correct })),
        explanation: String(q?.explanation || "").trim(),
        start_seconds: Number.isFinite(start) && start >= 0 ? Math.floor(start) : null,
      };
    })
    .filter(Boolean);

  if (!questions.length) throw new Error("Gemini não gerou perguntas válidas. Tente gerar de novo.");
  return { title: String(parsed?.title || `Quiz: ${lessonTitle}`).trim(), questions };
}

// Modelos leves para reordenar a busca (uma chamada por pergunta, então precisa de cota diária alta).
// Tenta na ordem: o configurado, o apelido do Lite mais novo e o 2.5 Lite.
export const RERANK_MODELS = [
  Deno.env.get("GEMINI_RERANK_MODEL"),
  "gemini-flash-lite-latest",
  "gemini-2.5-flash-lite",
].filter((m): m is string => !!m);

/** Chama o primeiro modelo leve que responder. */
async function callLite(body: unknown): Promise<any> {
  let lastError: unknown;
  for (const model of RERANK_MODELS) {
    try {
      return await call(`models/${model}:generateContent`, body);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

/**
 * Resumo do assunto da aula, para o vetor da aula inteira na busca.
 * Diz o tema geral e, se houver, o caso específico (ex.: venda com PIX).
 */
export async function summarizeLesson(lessonTitle: string, courseTitle: string, text: string): Promise<string> {
  const prompt = [
    `Resuma em português do Brasil, em 2 a 4 frases, o assunto da aula "${lessonTitle}" do curso "${courseTitle}" (sistemas da Softcom).`,
    "Diga qual tarefa do sistema a aula ensina, em qual módulo ou tela, e se ela trata de um caso específico",
    "(por exemplo uma forma de pagamento, pré-venda, um tipo de nota) ou do assunto de forma geral.",
    "Use os termos que um aluno usaria para procurar essa aula. Não cite o apresentador nem saudações.",
    "",
    "CONTEÚDO DA AULA:",
    text.slice(0, 30_000),
  ].join("\n");

  const data = await callLite({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
  });
  const summary = (data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "").trim();
  if (!summary) throw new Error("Gemini não devolveu o resumo da aula.");
  return summary;
}

/**
 * Dá uma nota de 0 a 10 para cada aula candidata conforme ela responde a pergunta.
 * Devolve as notas na mesma ordem dos candidatos.
 */
export async function rerankLessons(
  query: string,
  candidates: { title: string; course: string; text: string }[],
): Promise<number[]> {
  const list = candidates
    .map((c, i) => `[${i}] Aula: ${c.title} | Curso: ${c.course}\nConteúdo: ${c.text.replace(/\s+/g, " ").slice(0, 900)}`)
    .join("\n\n");
  const prompt = [
    "Você ajuda alunos a achar a aula certa num catálogo de treinamentos dos sistemas da Softcom (Softcomshop, PDV, NF-e, NFC-e, MDF-e, estoque, financeiro etc.).",
    `Pergunta do aluno: "${query}"`,
    "Para cada aula abaixo, dê uma nota de 0 a 10 para o quanto ela ensina exatamente o que o aluno pediu.",
    "10 = a aula é sobre isso; 6 = ensina boa parte; 3 = só toca no assunto; 0 = outro assunto.",
    "Use o que você sabe dos sistemas: no PDV a venda ao consumidor gera NFC-e, então cancelar uma venda no PDV é cancelar a NFC-e;",
    "NF-e é a nota de venda fora do caixa. Não dê nota alta só porque a aula repete palavras da pergunta.",
    "Se a pergunta é geral, a aula que ensina o assunto de forma geral ganha a maior nota; aulas sobre um caso específico",
    "que o aluno não citou (uma forma de pagamento como PIX, pré-venda, um tipo de cliente) ficam pelo menos 2 pontos abaixo.",
    "Se o aluno citou o caso específico, a aula desse caso é a melhor.",
    "Não dê a mesma nota para duas aulas: desempate pela que responde mais diretamente.",
    "",
    list,
  ].join("\n");

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: { index: { type: "INTEGER" }, score: { type: "NUMBER" } },
          required: ["index", "score"],
        },
      },
    },
  };

  const data = await callLite(body);

  const raw = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
  const parsed = JSON.parse(raw);
  const scores = candidates.map(() => 0);
  for (const s of Array.isArray(parsed) ? parsed : []) {
    const i = Number(s?.index);
    if (Number.isInteger(i) && i >= 0 && i < scores.length) scores[i] = Math.min(10, Math.max(0, Number(s?.score) || 0));
  }
  return scores;
}

const isEmbedding2 = () => EMBED_MODEL.startsWith("gemini-embedding-2");

function normalize(v: number[]) {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
}

/** Vetores para trechos de aula (documentos). */
export async function embedDocuments(texts: string[], title: string): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 50) {
    const batch = texts.slice(i, i + 50);
    const data = await call(`models/${EMBED_MODEL}:batchEmbedContents`, {
      requests: batch.map((t) => ({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text: isEmbedding2() ? `title: ${title} | text: ${t}` : t }] },
        outputDimensionality: EMBED_DIMENSIONS,
        ...(isEmbedding2() ? {} : { taskType: "RETRIEVAL_DOCUMENT", title }),
      })),
    });
    for (const e of data?.embeddings ?? []) out.push(isEmbedding2() ? e.values : normalize(e.values));
  }
  if (out.length !== texts.length) throw new Error("Gemini devolveu menos vetores que trechos.");
  return out;
}

/** Vetor da pergunta do aluno. */
export async function embedQuery(query: string): Promise<number[]> {
  const data = await call(`models/${EMBED_MODEL}:embedContent`, {
    model: `models/${EMBED_MODEL}`,
    content: { parts: [{ text: isEmbedding2() ? `task: search result | query: ${query}` : query }] },
    outputDimensionality: EMBED_DIMENSIONS,
    ...(isEmbedding2() ? {} : { taskType: "RETRIEVAL_QUERY" }),
  });
  const values = data?.embedding?.values;
  if (!Array.isArray(values)) throw new Error("Gemini não devolveu o vetor da busca.");
  return isEmbedding2() ? values : normalize(values);
}
