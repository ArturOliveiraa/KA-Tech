import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Plus, Sparkles, Trash2, X } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { Button, Select } from "../ui";
import Drawer from "./Drawer";

export type QuizStatus = "draft" | "published";

interface QuizDrawerProps {
  lessonId: number | null;
  lessonTitle?: string;
  onClose: () => void;
  /** Avisa a lista da situação do quiz da aula (null = sem quiz) */
  onChanged?: (lessonId: number, status: QuizStatus | null) => void;
}

interface EditOption { content: string; is_correct: boolean }
interface EditQuestion { key: string; content: string; explanation: string; time: string; options: EditOption[] }

let keySeq = 0;
const newKey = () => `q${++keySeq}`;

const toClock = (s: number | null | undefined) => {
  if (s === null || s === undefined || !Number.isFinite(s)) return "";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  const mmss = `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return h ? `${h}:${mmss}` : mmss;
};

/** "03:12" ou "1:02:10" → segundos; vazio ou inválido → null */
const fromClock = (t: string) => {
  const m = t.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
};

const blankQuestion = (options = 4): EditQuestion => ({
  key: newKey(),
  content: "",
  explanation: "",
  time: "",
  options: Array.from({ length: options }, (_, i) => ({ content: "", is_correct: i === 0 })),
});

/** Mensagem de erro devolvida pela Edge Function (o SDK só diz "non-2xx") */
async function functionError(error: any) {
  try {
    const body = await error?.context?.json();
    if (body?.error) return String(body.error);
  } catch { /* sem corpo */ }
  return error?.message || "Erro desconhecido";
}

/**
 * Quiz da aula: gera pela IA a partir da transcrição, a equipe revisa e publica.
 * O aluno só vê o quiz publicado, sem o gabarito; a nota é calculada no banco.
 */
export default function QuizDrawer({ lessonId, lessonTitle, onClose, onChanged }: QuizDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [exists, setExists] = useState(false);
  const [status, setStatus] = useState<QuizStatus>("draft");
  const [title, setTitle] = useState("");
  const [minScore, setMinScore] = useState(70);
  const [generatedBy, setGeneratedBy] = useState<string | null>(null);
  const [questions, setQuestions] = useState<EditQuestion[]>([]);
  const [dirty, setDirty] = useState(false);
  const [genCount, setGenCount] = useState("5");
  const [genOptions, setGenOptions] = useState("4");
  const [busy, setBusy] = useState<"generate" | "draft" | "published" | "delete" | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  useEffect(() => {
    if (!lessonId) return;
    let alive = true;
    setLoading(true);
    setNotice(null);
    setDirty(false);
    supabase
      .from("quizzes")
      .select("id, title, min_score, status, generated_by, questions(id, content, explanation, start_seconds, position, options(id, content, is_correct, position))")
      .eq("lesson_id", lessonId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setNotice({ tone: "danger", text: "Não foi possível carregar o quiz. A migração do quiz já foi aplicada?" });
        setExists(!!data);
        setStatus((data?.status as QuizStatus) || "draft");
        setTitle(data?.title || (lessonTitle ? `Quiz: ${lessonTitle}` : ""));
        setMinScore(data?.min_score ?? 70);
        setGeneratedBy(data?.generated_by ?? null);
        setQuestions(
          [...((data?.questions as any[]) || [])]
            .sort((a, b) => a.position - b.position)
            .map((q) => ({
              key: newKey(),
              content: q.content,
              explanation: q.explanation || "",
              time: toClock(q.start_seconds),
              options: [...(q.options || [])].sort((a: any, b: any) => a.position - b.position).map((o: any) => ({ content: o.content, is_correct: !!o.is_correct })),
            })),
        );
        setLoading(false);
      });
    return () => { alive = false; };
  }, [lessonId, lessonTitle]);

  const edit = (fn: (qs: EditQuestion[]) => EditQuestion[]) => {
    setQuestions((qs) => fn(qs.map((q) => ({ ...q, options: q.options.map((o) => ({ ...o })) }))));
    setDirty(true);
  };

  const generate = async () => {
    if (!lessonId) return;
    if (questions.length && !window.confirm("Gerar de novo substitui as perguntas atuais (inclusive as que você editou). Continuar?")) return;
    setBusy("generate");
    setNotice(null);
    const { data, error } = await supabase.functions.invoke("generate-quiz", {
      body: { lesson_id: lessonId, questions: Number(genCount), options: Number(genOptions) },
    });
    setBusy(null);
    if (error) return setNotice({ tone: "danger", text: await functionError(error) });
    const draft = data?.quiz;
    setQuestions((draft?.questions || []).map((q: any) => ({
      key: newKey(),
      content: q.content,
      explanation: q.explanation || "",
      time: toClock(q.start_seconds),
      options: q.options,
    })));
    if (!exists || !title.trim()) setTitle(draft?.title || title);
    setGeneratedBy("ia");
    setDirty(true);
    setNotice({ tone: "success", text: "Perguntas geradas. Revise as respostas certas e os minutos antes de publicar." });
  };

  // Mesmas regras que o banco confere em save_lesson_quiz, com a mensagem antes de enviar
  const problem = (() => {
    if (!questions.length) return "Gere ou adicione pelo menos uma pergunta.";
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.content.trim()) return `A pergunta ${i + 1} está sem texto.`;
      if (q.options.length < 2) return `A pergunta ${i + 1} precisa de pelo menos 2 alternativas.`;
      if (q.options.some((o) => !o.content.trim())) return `A pergunta ${i + 1} tem uma alternativa vazia.`;
      if (q.options.filter((o) => o.is_correct).length !== 1) return `Marque a alternativa certa da pergunta ${i + 1}.`;
      if (q.time.trim() && fromClock(q.time) === null) return `O minuto da pergunta ${i + 1} deve estar no formato mm:ss.`;
    }
    return null;
  })();

  const save = async (nextStatus: QuizStatus) => {
    if (!lessonId || problem) return;
    setBusy(nextStatus);
    setNotice(null);
    const { error } = await supabase.rpc("save_lesson_quiz", {
      p_lesson_id: lessonId,
      p_quiz: {
        title: title.trim(),
        min_score: minScore,
        status: nextStatus,
        generated_by: generatedBy,
        questions: questions.map((q) => ({
          content: q.content.trim(),
          explanation: q.explanation.trim(),
          start_seconds: fromClock(q.time),
          options: q.options.map((o) => ({ content: o.content.trim(), is_correct: o.is_correct })),
        })),
      },
    });
    setBusy(null);
    if (error) return setNotice({ tone: "danger", text: "Não foi possível salvar: " + error.message });
    setExists(true);
    setStatus(nextStatus);
    setDirty(false);
    onChanged?.(lessonId, nextStatus);
    setNotice({
      tone: "success",
      text: nextStatus === "published" ? "Quiz publicado. Os alunos já veem o botão \"Quiz da aula\"." : "Rascunho salvo. Só a equipe vê.",
    });
  };

  const remove = async () => {
    if (!lessonId || !window.confirm("Excluir o quiz desta aula? As notas dos alunos neste quiz também serão apagadas.")) return;
    setBusy("delete");
    const { error } = await supabase.from("quizzes").delete().eq("lesson_id", lessonId);
    setBusy(null);
    if (error) return setNotice({ tone: "danger", text: "Não foi possível excluir: " + error.message });
    onChanged?.(lessonId, null);
    onClose();
  };

  const close = () => {
    if (busy) return;
    if (dirty && !window.confirm("Há alterações não salvas no quiz. Fechar mesmo assim?")) return;
    onClose();
  };

  return (
    <Drawer
      open={lessonId !== null}
      onClose={close}
      title="Quiz da aula"
      subtitle={lessonTitle}
      width={760}
      footer={
        <>
          {exists && (
            <Button variant="ghost" onClick={remove} loading={busy === "delete"} disabled={!!busy} icon={<Trash2 size={15} />}>
              Excluir
            </Button>
          )}
          <Button variant="secondary" onClick={() => save("draft")} loading={busy === "draft"} disabled={!!busy || !!problem}>
            {status === "published" && exists ? "Voltar para rascunho" : "Salvar rascunho"}
          </Button>
          <Button onClick={() => save("published")} loading={busy === "published"} disabled={!!busy || !!problem} icon={<CheckCircle2 size={15} />}>
            {status === "published" && exists ? "Salvar publicado" : "Publicar"}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="ui-loading-inline"><div className="ui-spinner" /> Carregando quiz...</div>
      ) : (
        <div className="adm-form">
          <div className="tr-meta">
            {exists ? (
              status === "published"
                ? <span className="ui-badge ui-badge--success"><CheckCircle2 size={12} /> Publicado</span>
                : <span className="ui-badge ui-badge--neutral">Rascunho: só a equipe vê</span>
            ) : (
              <span className="ui-badge ui-badge--neutral">Ainda sem quiz</span>
            )}
            {generatedBy === "ia" && <span className="ui-badge"><Sparkles size={12} /> Gerado pela IA</span>}
            {dirty && <span className="ui-hint">Alterações não salvas</span>}
          </div>

          <div className="qz-gen">
            <div className="qz-gen__fields">
              <label className="ui-label" htmlFor="qz-count">Perguntas</label>
              <Select id="qz-count" value={genCount} onChange={setGenCount} minWidth={84}
                options={["3", "5", "8", "10"].map((v) => ({ value: v, label: v }))} />
              <label className="ui-label" htmlFor="qz-opts">Alternativas</label>
              <Select id="qz-opts" value={genOptions} onChange={setGenOptions} minWidth={84}
                options={["3", "4", "5"].map((v) => ({ value: v, label: v }))} />
            </div>
            <Button variant={questions.length ? "secondary" : "primary"} onClick={generate} loading={busy === "generate"} disabled={!!busy} icon={<Sparkles size={15} />}>
              {busy === "generate" ? "Gerando pela transcrição..." : questions.length ? "Gerar de novo" : "Gerar com IA"}
            </Button>
          </div>
          <span className="ui-hint">A IA usa a transcrição da aula (painel "Ver transcrição"). Cada geração gasta 1 chamada da cota diária do Gemini.</span>

          {notice && <div className={`ui-alert ui-alert--${notice.tone}`} role="status">{notice.tone === "danger" && <AlertTriangle size={16} />}<span>{notice.text}</span></div>}

          {(questions.length > 0 || exists) && (
            <div className="qz-meta">
              <div className="ui-field">
                <label className="ui-label" htmlFor="qz-title">Título</label>
                <input id="qz-title" className="ui-input" value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} placeholder={`Quiz: ${lessonTitle || ""}`} />
              </div>
              <div className="ui-field qz-meta__score">
                <label className="ui-label" htmlFor="qz-min">Nota mínima (%)</label>
                <input id="qz-min" className="ui-input" type="number" min={0} max={100} step={10} value={minScore}
                  onChange={(e) => { setMinScore(Math.max(0, Math.min(100, Number(e.target.value) || 0))); setDirty(true); }} />
              </div>
            </div>
          )}

          <ol className="qz-list">
            {questions.map((q, qi) => (
              <li key={q.key} className="qz-card">
                <div className="qz-card__head">
                  <span className="qz-card__num">Pergunta {qi + 1}</span>
                  <button type="button" className="sb-icon-btn sb-logout" onClick={() => edit((qs) => qs.filter((_, i) => i !== qi))} aria-label={`Excluir pergunta ${qi + 1}`}><Trash2 size={15} /></button>
                </div>
                <textarea className="ui-input" rows={2} value={q.content} placeholder="Texto da pergunta"
                  aria-label={`Texto da pergunta ${qi + 1}`}
                  onChange={(e) => edit((qs) => { qs[qi].content = e.target.value; return qs; })} />

                <div className="qz-options" role="radiogroup" aria-label={`Alternativas da pergunta ${qi + 1}`}>
                  {q.options.map((o, oi) => (
                    <div key={oi} className={`qz-option ${o.is_correct ? "is-correct" : ""}`}>
                      <button type="button" role="radio" aria-checked={o.is_correct} className="qz-option__radio"
                        title={o.is_correct ? "Resposta certa" : "Marcar como resposta certa"}
                        onClick={() => edit((qs) => { qs[qi].options.forEach((x, i) => { x.is_correct = i === oi; }); return qs; })}>
                        {o.is_correct ? <CheckCircle2 size={16} /> : <span className="qz-option__dot" />}
                      </button>
                      <input className="ui-input" value={o.content} placeholder={`Alternativa ${String.fromCharCode(65 + oi)}`}
                        aria-label={`Alternativa ${String.fromCharCode(65 + oi)} da pergunta ${qi + 1}`}
                        onChange={(e) => edit((qs) => { qs[qi].options[oi].content = e.target.value; return qs; })} />
                      {q.options.length > 2 && (
                        <button type="button" className="sb-icon-btn" aria-label="Remover alternativa"
                          onClick={() => edit((qs) => {
                            const wasCorrect = qs[qi].options[oi].is_correct;
                            qs[qi].options.splice(oi, 1);
                            if (wasCorrect) qs[qi].options[0].is_correct = true;
                            return qs;
                          })}><X size={14} /></button>
                      )}
                    </div>
                  ))}
                  {q.options.length < 6 && (
                    <button type="button" className="qz-add-option" onClick={() => edit((qs) => { qs[qi].options.push({ content: "", is_correct: false }); return qs; })}>
                      <Plus size={14} /> Alternativa
                    </button>
                  )}
                </div>

                <div className="qz-card__foot">
                  <div className="ui-field">
                    <label className="ui-label" htmlFor={`qz-exp-${q.key}`}>Explicação (aparece depois de responder)</label>
                    <textarea id={`qz-exp-${q.key}`} className="ui-input" rows={2} value={q.explanation}
                      onChange={(e) => edit((qs) => { qs[qi].explanation = e.target.value; return qs; })} />
                  </div>
                  <div className="ui-field qz-card__time">
                    <label className="ui-label" htmlFor={`qz-time-${q.key}`}><Clock size={12} /> Minuto no vídeo</label>
                    <input id={`qz-time-${q.key}`} className="ui-input" value={q.time} placeholder="03:12" inputMode="numeric"
                      onChange={(e) => edit((qs) => { qs[qi].time = e.target.value; return qs; })} />
                  </div>
                </div>
              </li>
            ))}
          </ol>

          {(questions.length > 0 || exists) && (
            <Button variant="secondary" onClick={() => edit((qs) => [...qs, blankQuestion(Number(genOptions))])} icon={<Plus size={15} />}>
              Adicionar pergunta
            </Button>
          )}

          {problem && questions.length > 0 && <span className="ui-hint qz-problem"><AlertTriangle size={13} /> {problem}</span>}
        </div>
      )}
    </Drawer>
  );
}
