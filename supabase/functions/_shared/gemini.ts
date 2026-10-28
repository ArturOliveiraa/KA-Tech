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

/**
 * Transcreve um vídeo público do YouTube em blocos com o segundo de início.
 * Vídeos privados ou não listados não são aceitos pelo Gemini.
 */
export async function transcribeYouTube(watchUrl: string, lessonTitle: string): Promise<Segment[]> {
  const prompt = [
    "Transcreva integralmente a fala deste vídeo em português do Brasil, sem resumir.",
    `O vídeo é a aula "${lessonTitle}" de um curso sobre sistemas da Softcom.`,
    "Divida a transcrição em blocos de 30 a 60 segundos.",
    "Para cada bloco informe 'start' (segundo em que o bloco começa, número inteiro) e 'text' (a fala transcrita).",
    "Ignore música, silêncio e vinhetas. Não invente conteúdo que não foi falado.",
  ].join(" ");

  const data = await call(`models/${TRANSCRIBE_MODEL}:generateContent`, {
    contents: [{
      parts: [
        { file_data: { file_uri: watchUrl } },
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

  return (Array.isArray(parsed) ? parsed : [])
    .map((s: any) => ({ start: Math.max(0, Math.floor(Number(s?.start) || 0)), text: String(s?.text || "").trim() }))
    .filter((s) => s.text.length > 0)
    .sort((a, b) => a.start - b.start);
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
