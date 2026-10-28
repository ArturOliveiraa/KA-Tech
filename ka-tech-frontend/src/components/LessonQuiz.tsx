import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, PlayCircle, RotateCcw, Trophy, X, XCircle } from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "../supabaseClient";
import { Button, ProgressBar } from "./ui";

interface QuizOption { id: string; content: string }
interface QuizQuestion { id: string; content: string; options: QuizOption[] }
interface LessonQuizData {
  id: string;
  title: string;
  description: string | null;
  min_score: number;
  questions: QuizQuestion[];
  last_attempt: { score: number; passed: boolean; created_at: string } | null;
  best_score: number | null;
}
interface ReviewItem {
  question_id: string;
  chosen_option_id: string | null;
  correct_option_id: string | null;
  is_correct: boolean;
  explanation: string | null;
  start_seconds: number | null;
}
interface QuizResult { score: number; passed: boolean; correct: number; total: number; min_score: number; review: ReviewItem[] }

interface LessonQuizProps {
  lessonId: number;
  onExit: () => void;
  /** Fecha o quiz e leva o vídeo ao segundo onde a resposta aparece */
  onSeek?: (seconds: number) => void;
}

const clock = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  const mmss = `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return h ? `${h}:${mmss}` : mmss;
};

const shuffle = <T,>(list: T[]) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Quiz da aula para o aluno. As perguntas chegam sem o gabarito; o banco
 * corrige no envio (submit_lesson_quiz) e devolve a explicação e o minuto
 * do vídeo de cada resposta.
 */
export default function LessonQuiz({ lessonId, onExit, onSeek }: LessonQuizProps) {
  const [quiz, setQuiz] = useState<LessonQuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState<QuizResult | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError("");
    const { data, error } = await supabase.rpc("get_lesson_quiz", { p_lesson_id: lessonId });
    if (error) setLoadError(error.message);
    const q = data as LessonQuizData | null;
    // Embaralha as alternativas a cada tentativa: decorar a posição não ajuda
    setQuiz(q ? { ...q, questions: q.questions.map((qq) => ({ ...qq, options: shuffle(qq.options) })) } : null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [lessonId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !submitting) onExit(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit, submitting]);

  const questions = quiz?.questions ?? [];
  const current = questions[index];
  const answeredCount = useMemo(() => questions.filter((q) => answers[q.id]).length, [questions, answers]);
  const isLast = index === questions.length - 1;

  const restart = async () => {
    setAnswers({});
    setIndex(0);
    setResult(null);
    setSubmitError("");
    setStarted(true);
    await load();
  };

  const submit = async () => {
    if (!quiz) return;
    setSubmitting(true);
    setSubmitError("");
    const { data, error } = await supabase.rpc("submit_lesson_quiz", { p_quiz_id: quiz.id, p_answers: answers });
    setSubmitting(false);
    if (error) return setSubmitError(error.message);
    const r = data as QuizResult;
    setResult(r);
    setQuiz((q) => (q ? { ...q, best_score: Math.max(q.best_score ?? 0, r.score) } : q));
    if (r.passed) confetti({ particleCount: 140, spread: 70, origin: { y: 0.4 } });
  };

  const header = (
    <header className="lq-head">
      <div>
        <span className="lq-eyebrow">Quiz da aula</span>
        <h1 className="lq-title">{quiz?.title || "Quiz"}</h1>
      </div>
      <button type="button" className="sb-icon-btn" onClick={onExit} aria-label="Fechar quiz" disabled={submitting}><X size={18} /></button>
    </header>
  );

  if (loading) {
    return <div className="lq"><div className="lq-card lq-center"><div className="ui-spinner" /></div></div>;
  }

  if (!quiz || !questions.length) {
    return (
      <div className="lq">
        <div className="lq-card lq-center">
          <BookOpen size={40} className="lq-icon" />
          <h2 className="lq-title">Quiz ainda não disponível</h2>
          <p className="lq-text">{loadError || "Esta aula ainda não tem quiz publicado. Volte mais tarde."}</p>
          <Button variant="secondary" onClick={onExit}>Voltar para a aula</Button>
        </div>
      </div>
    );
  }

  // Resultado com gabarito comentado
  if (result) {
    return (
      <div className="lq">
        <div className="lq-card">
          {header}
          <div className={`lq-result ${result.passed ? "is-passed" : ""}`}>
            <Trophy size={40} />
            <strong className="lq-result__score">{result.score}%</strong>
            <span>
              {result.correct} de {result.total} certas ·{" "}
              {result.passed ? "Aprovado!" : `Faltou pouco: a nota mínima é ${result.min_score}%.`}
            </span>
          </div>

          <ol className="lq-review">
            {questions.map((q, i) => {
              const r = result.review.find((x) => x.question_id === q.id);
              const chosen = q.options.find((o) => o.id === r?.chosen_option_id);
              const correct = q.options.find((o) => o.id === r?.correct_option_id);
              return (
                <li key={q.id} className={`lq-review__item ${r?.is_correct ? "is-correct" : "is-wrong"}`}>
                  <div className="lq-review__q">
                    {r?.is_correct ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                    <span><strong>{i + 1}.</strong> {q.content}</span>
                  </div>
                  {!r?.is_correct && (
                    <p className="lq-review__line">Sua resposta: {chosen ? chosen.content : <em>em branco</em>}</p>
                  )}
                  <p className="lq-review__line"><strong>Resposta certa:</strong> {correct?.content}</p>
                  {r?.explanation && <p className="lq-review__exp">{r.explanation}</p>}
                  {r?.start_seconds != null && onSeek && (
                    <button type="button" className="lq-seek" onClick={() => onSeek(r.start_seconds!)}>
                      <PlayCircle size={15} /> Rever no vídeo ({clock(r.start_seconds)})
                    </button>
                  )}
                </li>
              );
            })}
          </ol>

          <footer className="lq-foot">
            <Button variant="secondary" onClick={onExit}>Voltar para a aula</Button>
            <Button onClick={restart} icon={<RotateCcw size={15} />}>Refazer</Button>
          </footer>
        </div>
      </div>
    );
  }

  // Abertura
  if (!started) {
    return (
      <div className="lq">
        <div className="lq-card">
          {header}
          <div className="lq-intro">
            {quiz.description && <p className="lq-text">{quiz.description}</p>}
            <ul className="lq-facts">
              <li><strong>{questions.length}</strong> perguntas</li>
              <li>Nota mínima <strong>{quiz.min_score}%</strong></li>
              {quiz.best_score != null && <li>Sua melhor nota <strong>{quiz.best_score}%</strong></li>}
            </ul>
            <p className="lq-text lq-text--sm">Responda tudo e envie no fim. Você vê o que acertou, a explicação de cada resposta e o minuto do vídeo para rever. Pode refazer quantas vezes quiser.</p>
          </div>
          <footer className="lq-foot">
            <Button variant="secondary" onClick={onExit}>Agora não</Button>
            <Button onClick={() => setStarted(true)} icon={<ArrowRight size={15} />}>{quiz.last_attempt ? "Refazer quiz" : "Começar"}</Button>
          </footer>
        </div>
      </div>
    );
  }

  // Perguntas
  return (
    <div className="lq">
      <div className="lq-card">
        {header}
        <div className="lq-progress">
          <span>Pergunta {index + 1} de {questions.length}</span>
          <ProgressBar value={Math.round(((index + 1) / questions.length) * 100)} size="sm" label="Andamento do quiz" />
        </div>

        <h2 className="lq-question" id="lq-question">{current.content}</h2>
        <div className="lq-options" role="radiogroup" aria-labelledby="lq-question">
          {current.options.map((o, i) => {
            const selected = answers[current.id] === o.id;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`lq-option ${selected ? "is-selected" : ""}`}
                onClick={() => setAnswers((a) => ({ ...a, [current.id]: o.id }))}
              >
                <span className="lq-option__letter">{String.fromCharCode(65 + i)}</span>
                <span>{o.content}</span>
              </button>
            );
          })}
        </div>

        {submitError && <div className="ui-alert ui-alert--danger" role="alert"><span>{submitError}</span></div>}

        <footer className="lq-foot">
          <Button variant="ghost" onClick={() => setIndex((i) => i - 1)} disabled={index === 0 || submitting} icon={<ArrowLeft size={15} />}>Anterior</Button>
          {isLast ? (
            <Button onClick={submit} loading={submitting} disabled={answeredCount < questions.length} icon={<CheckCircle2 size={15} />}>
              {answeredCount < questions.length ? `Faltam ${questions.length - answeredCount}` : "Enviar respostas"}
            </Button>
          ) : (
            <Button onClick={() => setIndex((i) => i + 1)} disabled={!answers[current.id]} icon={<ArrowRight size={15} />}>Próxima</Button>
          )}
        </footer>
      </div>
    </div>
  );
}
