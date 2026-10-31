import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, BrainCircuit, CheckCircle2, ClipboardList, Clock, EyeOff, FileText, Gauge, ListChecks, RotateCcw, Search, SearchX, Sparkles, Undo2 } from "lucide-react";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import SEO from "../components/SEO";
import { Button, EmptyState, PageHeader, Select, Skeleton } from "../components/ui";
import QuizDrawer from "../components/admin/QuizDrawer";

interface IndexLesson {
  id: number;
  title: string;
  course_id: number;
  course_title: string;
  course_slug: string;
  index_status: string;
  transcript_source: string | null;
  index_error: string | null;
  index_attempts: number;
  indexed_at: string | null;
  has_summary: boolean;
  summary_attempts: number;
  live_progress: number | null;
}

interface Usage { model: string; requests: number; quota_errors: number }

interface SearchGap {
  norm: string;
  query: string;
  searches: number;
  people: number;
  no_results: number;
  no_click: number;
  last_at: string;
  status: "pauta" | "ignorada" | null;
}

interface QuizDraftRow {
  quiz_id: string;
  lesson_id: number;
  lesson_title: string;
  course_id: number;
  course_title: string;
  generated_by: string | null;
  questions: number;
  updated_at: string;
}

type LessonState = "busca" | "texto" | "erro" | "fila" | "sem_resumo";

/** Uma aula pode estar "na busca" e ainda sem resumo; o filtro trata as duas coisas. */
const stateOf = (l: IndexLesson): LessonState => {
  if (l.index_status === "error") return "erro";
  if (l.index_status === "pending" || l.index_status === "processing") return "fila";
  if (l.transcript_source === "texto") return "texto";
  return "busca";
};

const STATE_BADGE: Record<LessonState, { label: string; tone: string }> = {
  busca: { label: "Na busca", tone: "success" },
  texto: { label: "Só pelo texto", tone: "warning" },
  erro: { label: "Erro", tone: "danger" },
  fila: { label: "Na fila", tone: "neutral" },
  sem_resumo: { label: "Sem resumo", tone: "warning" },
};

// Limites diários do plano grátis do Gemini (conferir no Google AI Studio se mudarem)
const dailyLimit = (model: string) => (model.includes("embedding") ? null : model.includes("lite") ? 1000 : 20);

/** A cota grátis zera à meia-noite do horário do Pacífico. */
const pacificToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());

const resetAt = () => {
  // Meia-noite do Pacífico de amanhã, mostrada no horário de quem está vendo
  const now = new Date();
  for (let h = 1; h <= 25; h++) {
    const t = new Date(now.getTime() + h * 3600_000);
    t.setMinutes(0, 0, 0);
    const hour = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hourCycle: "h23" }).format(t);
    if (Number(hour) === 0) return t.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  return "";
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

const FILTERS = [
  { value: "problemas", label: "Com pendência" },
  { value: "todas", label: "Todas as aulas" },
  { value: "erro", label: "Com erro" },
  { value: "texto", label: "Só pelo texto" },
  { value: "fila", label: "Na fila" },
  { value: "sem_resumo", label: "Sem resumo" },
];

const PERIODS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
];

const GAP_STATUS = [
  { value: "abertas", label: "Abertas" },
  { value: "pauta", label: "Viraram pauta" },
  { value: "ignorada", label: "Ignoradas" },
];

const BULK: Record<"erro" | "texto" | "resumo", { confirm: string; done: (n: number) => string }> = {
  erro: {
    confirm: "Colocar todas as aulas com erro na fila de novo? Cada uma gasta 1 transcrição da cota do dia; as que passarem do limite tentam de novo amanhã.",
    done: (n) => `${n} aula${n === 1 ? "" : "s"} com erro voltaram para a fila.`,
  },
  texto: {
    confirm: "Tentar transcrever o vídeo de todas as aulas que estão só pelo texto? Cada uma gasta 1 transcrição da cota do dia; as que passarem do limite tentam de novo amanhã.",
    done: (n) => `${n} aula${n === 1 ? "" : "s"} voltaram para a fila de transcrição.`,
  },
  resumo: {
    confirm: "Refazer o resumo de todas as aulas? A fila faz 5 por minuto e usa o modelo leve (não gasta transcrição).",
    done: (n) => `${n} resumo${n === 1 ? "" : "s"} serão refeitos nos próximos minutos.`,
  },
};

/**
 * Painel da busca da pandAI: estado da indexação de cada aula, uso do Gemini
 * no dia e as perguntas que os alunos fizeram sem achar a aula certa.
 */
export default function AdminSearchHealth() {
  const [tab, setTab] = useState<"aulas" | "quizzes" | "buscas">("aulas");
  const [lessons, setLessons] = useState<IndexLesson[]>([]);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [drafts, setDrafts] = useState<QuizDraftRow[]>([]);
  const [gaps, setGaps] = useState<SearchGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [gapsLoading, setGapsLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("problemas");
  const [term, setTerm] = useState("");
  const [period, setPeriod] = useState("30");
  const [gapStatus, setGapStatus] = useState("abertas");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: string; text: string } | null>(null);
  const [quizLesson, setQuizLesson] = useState<{ id: number; title: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    const [lessonRes, usageRes, draftRes] = await Promise.all([
      supabase.rpc("admin_index_lessons"),
      supabase.from("gemini_usage").select("model, requests, quota_errors").eq("day", pacificToday()).order("requests", { ascending: false }),
      supabase.rpc("admin_quiz_drafts"),
    ]);
    if (lessonRes.error) setError(lessonRes.error.message);
    setLessons((lessonRes.data as IndexLesson[]) || []);
    setUsage((usageRes.data as Usage[]) || []);
    setDrafts((draftRes.data as QuizDraftRow[]) || []);
    setLoading(false);
  };

  const loadGaps = async () => {
    setGapsLoading(true);
    const { data, error: gapError } = await supabase.rpc("admin_search_gaps", { p_days: Number(period), p_status: gapStatus });
    if (gapError) setNotice({ tone: "danger", text: gapError.message });
    setGaps((data as SearchGap[]) || []);
    setGapsLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === "buscas") loadGaps(); }, [tab, period, gapStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const bulk = async (target: keyof typeof BULK) => {
    if (!window.confirm(BULK[target].confirm)) return;
    setBusy(`bulk-${target}`);
    const { data, error: bulkError } = await supabase.rpc("admin_retry_index_bulk", { p_target: target });
    setBusy(null);
    if (bulkError) return setNotice({ tone: "danger", text: bulkError.message });
    setNotice({ tone: "success", text: BULK[target].done(Number(data) || 0) });
    load();
  };

  const setGap = async (gap: SearchGap, status: "pauta" | "ignorada" | null) => {
    setBusy(`gap-${gap.norm}`);
    const { error: gapError } = await supabase.rpc("admin_set_gap_status", { p_norm: gap.norm, p_status: status });
    setBusy(null);
    if (gapError) return setNotice({ tone: "danger", text: gapError.message });
    // Sai da lista atual: foi para outra situação
    setGaps((gs) => gs.filter((g) => g.norm !== gap.norm));
  };

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const counts = useMemo(() => {
    const c = { busca: 0, texto: 0, erro: 0, fila: 0, sem_resumo: 0 };
    for (const l of lessons) {
      c[stateOf(l)]++;
      if (l.index_status === "done" && !l.has_summary) c.sem_resumo++;
    }
    return c;
  }, [lessons]);

  const visible = useMemo(() => {
    const t = term.trim().toLowerCase();
    return lessons.filter((l) => {
      const s = stateOf(l);
      const noSummary = l.index_status === "done" && !l.has_summary;
      const match =
        filter === "todas" ? true
        : filter === "problemas" ? s !== "busca" || noSummary
        : filter === "sem_resumo" ? noSummary
        : s === filter;
      return match && (!t || l.title.toLowerCase().includes(t) || l.course_title.toLowerCase().includes(t));
    });
  }, [lessons, filter, term]);

  const retry = async (lesson: IndexLesson, mode: "full" | "summary") => {
    if (mode === "full" && !window.confirm(`Transcrever "${lesson.title}" de novo? Usa 1 transcrição da cota do dia (lives usam uma por parte de 30 min).`)) return;
    setBusy(`${lesson.id}-${mode}`);
    const { error: retryError } = await supabase.rpc("admin_retry_index", { p_lesson_id: lesson.id, p_mode: mode });
    setBusy(null);
    if (retryError) return setNotice({ tone: "danger", text: retryError.message });
    setNotice({ tone: "success", text: mode === "full" ? `"${lesson.title}" voltou para a fila. Começa em até 1 minuto.` : `O resumo de "${lesson.title}" será refeito em até 1 minuto.` });
    setLessons((ls) => ls.map((l) => (l.id !== lesson.id ? l
      : mode === "full" ? { ...l, index_status: "pending", index_error: null, index_attempts: 0 }
      : { ...l, has_summary: false, summary_attempts: 0 })));
  };

  const quotaHit = usage.some((u) => u.quota_errors > 0);

  return (
    <div className="ui-shell">
      <SEO title="Busca e indexação" description="Saúde da busca da pandAI" />
      <Sidebar />
      <main className="ui-main">
        <div className="ui-main__inner">
          <PageHeader
            eyebrow="Gestão"
            title="Busca e indexação"
            subtitle="Veja quais aulas já estão na busca da pandAI, o uso do Gemini hoje e o que os alunos procuraram sem achar."
            actions={<Button variant="secondary" onClick={() => { load(); if (tab === "buscas") loadGaps(); }} icon={<RotateCcw size={15} />}>Atualizar</Button>}
          />

          <div className="adm-stats">
            <Stat icon={<CheckCircle2 size={18} />} value={counts.busca} label="na busca" tone="success" />
            <Stat icon={<FileText size={18} />} value={counts.texto} label="só pelo texto" tone="warning" onClick={() => { setTab("aulas"); setFilter("texto"); }} />
            <Stat icon={<AlertTriangle size={18} />} value={counts.erro} label="com erro" tone="danger" onClick={() => { setTab("aulas"); setFilter("erro"); }} />
            <Stat icon={<Clock size={18} />} value={counts.fila} label="na fila" onClick={() => { setTab("aulas"); setFilter("fila"); }} />
            <Stat icon={<Sparkles size={18} />} value={counts.sem_resumo} label="sem resumo" tone="warning" onClick={() => { setTab("aulas"); setFilter("sem_resumo"); }} />
          </div>

          <section className="ui-card ui-card--padded sh-usage" aria-labelledby="sh-usage-title">
            <div className="sh-usage__head">
              <h2 id="sh-usage-title" className="ui-section__title"><Gauge size={18} /> Gemini hoje</h2>
              <span className="ui-hint">A cota grátis zera às {resetAt()} no seu horário.</span>
            </div>
            {loading ? <Skeleton height={48} /> : usage.length === 0 ? (
              <p className="ui-hint">Nenhuma chamada registrada hoje.</p>
            ) : (
              <ul className="sh-usage__list">
                {usage.map((u) => {
                  const limit = dailyLimit(u.model);
                  const pct = limit ? Math.min(100, Math.round((u.requests / limit) * 100)) : null;
                  return (
                    <li key={u.model}>
                      <div className="sh-usage__row">
                        <code>{u.model}</code>
                        <span>
                          <strong>{u.requests}</strong>{limit ? ` de ${limit}` : " chamadas"}
                          {u.quota_errors > 0 && <span className="ui-badge ui-badge--danger" style={{ marginLeft: 8 }}>{u.quota_errors} recusadas por cota</span>}
                        </span>
                      </div>
                      {pct !== null && (
                        <div className="ui-progress ui-progress--sm" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Uso de ${u.model}`}>
                          <div className={`ui-progress__fill ${pct >= 90 ? "sh-fill--danger" : pct >= 70 ? "sh-fill--warning" : ""}`} style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {quotaHit && (
              <p className="ui-hint" style={{ marginTop: 8 }}>A cota de algum modelo acabou hoje: as aulas pendentes voltam a ser transcritas sozinhas depois que ela zerar.</p>
            )}
          </section>

          <div className="ui-tabs" role="tablist" style={{ margin: "24px 0 16px" }}>
            <button role="tab" className="ui-tab" aria-selected={tab === "aulas"} onClick={() => setTab("aulas")}><BrainCircuit size={14} /> Aulas</button>
            <button role="tab" className="ui-tab" aria-selected={tab === "quizzes"} onClick={() => setTab("quizzes")}>
              <ListChecks size={14} /> Quizzes para revisar{drafts.length > 0 && <span className="ui-badge ui-badge--warning">{drafts.length}</span>}
            </button>
            <button role="tab" className="ui-tab" aria-selected={tab === "buscas"} onClick={() => setTab("buscas")}><SearchX size={14} /> Buscas sem resposta</button>
          </div>

          {notice && <div className={`ui-alert ui-alert--${notice.tone}`} role="status" style={{ marginBottom: 16 }}><span>{notice.text}</span></div>}
          {error && <div className="ui-alert ui-alert--danger" role="alert" style={{ marginBottom: 16 }}><span>{error}. A migração 2026-10-31_painel_busca.sql já foi rodada?</span></div>}

          {tab === "aulas" ? (
            <>
              <div className="adm-toolbar">
                <div className="ui-input-group">
                  <Search size={16} />
                  <input type="search" className="ui-input" placeholder="Buscar por aula ou curso" aria-label="Buscar aulas" value={term} onChange={(e) => setTerm(e.target.value)} />
                </div>
                <Select value={filter} onChange={setFilter} options={FILTERS} aria-label="Filtrar aulas" minWidth={190} />
                <span className="adm-filter-count">{visible.length} aula{visible.length === 1 ? "" : "s"}</span>
              </div>

              <div className="sh-bulk" role="group" aria-label="Ações em lote">
                <span className="ui-hint">Em lote:</span>
                <Button size="sm" variant="secondary" onClick={() => bulk("erro")} loading={busy === "bulk-erro"} disabled={!!busy || counts.erro === 0} icon={<RotateCcw size={14} />}>
                  Transcrever as com erro ({counts.erro})
                </Button>
                <Button size="sm" variant="secondary" onClick={() => bulk("texto")} loading={busy === "bulk-texto"} disabled={!!busy || counts.texto === 0} icon={<FileText size={14} />}>
                  Transcrever as só pelo texto ({counts.texto})
                </Button>
                <Button size="sm" variant="ghost" onClick={() => bulk("resumo")} loading={busy === "bulk-resumo"} disabled={!!busy} icon={<Sparkles size={14} />}>
                  Refazer todos os resumos
                </Button>
              </div>

              {loading ? (
                <div style={{ display: "grid", gap: 8 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={52} />)}</div>
              ) : visible.length === 0 ? (
                <EmptyState icon={<CheckCircle2 size={28} />} title={filter === "problemas" ? "Nenhuma pendência" : "Nenhuma aula aqui"} description={filter === "problemas" ? "Todas as aulas publicadas estão na busca com o vídeo transcrito e resumo." : "Troque o filtro para ver outras aulas."} />
              ) : (
                <div className="ui-card adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr><th>Aula</th><th>Estado</th><th>Detalhe</th><th>Indexada em</th><th style={{ textAlign: "right" }}>Ações</th></tr>
                    </thead>
                    <tbody>
                      {visible.map((l) => {
                        const s = stateOf(l);
                        const noSummary = l.index_status === "done" && !l.has_summary;
                        return (
                          <tr key={l.id}>
                            <td>
                              <div className="sh-lesson">
                                <Link to={`/admin/cursos/${l.course_id}`} className="sh-lesson__title">{l.title}</Link>
                                <span className="ui-hint">{l.course_title}</span>
                              </div>
                            </td>
                            <td>
                              <div className="adm-chips">
                                <span className={`ui-badge ui-badge--${STATE_BADGE[s].tone}`}>{STATE_BADGE[s].label}</span>
                                {noSummary && <span className="ui-badge ui-badge--warning">Sem resumo</span>}
                              </div>
                            </td>
                            <td className="sh-detail">
                              {l.live_progress != null && s === "fila" && <span>Live: {Math.round(l.live_progress / 60)} min transcritos. </span>}
                              {l.index_error ? <span title={l.index_error}>{l.index_error}</span> : <span className="ui-hint">{l.index_attempts > 0 ? `${l.index_attempts} tentativa${l.index_attempts === 1 ? "" : "s"}` : "—"}</span>}
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>{fmtDate(l.indexed_at)}</td>
                            <td>
                              <div className="adm-actions">
                                <Button size="sm" variant="ghost" onClick={() => retry(l, "full")} loading={busy === `${l.id}-full`} disabled={!!busy || s === "fila"} icon={<RotateCcw size={14} />}>
                                  Transcrever
                                </Button>
                                {l.index_status === "done" && (
                                  <Button size="sm" variant="ghost" onClick={() => retry(l, "summary")} loading={busy === `${l.id}-summary`} disabled={!!busy} icon={<Sparkles size={14} />}>
                                    Resumo
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : tab === "quizzes" ? (
            <>
              <p className="ui-hint" style={{ marginBottom: 12 }}>
                Toda aula com o vídeo transcrito e sem quiz ganha um rascunho gerado pela IA (1 a cada 2 minutos). Revise as perguntas e publique: o aluno só vê depois disso.
              </p>
              {loading ? (
                <div style={{ display: "grid", gap: 8 }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={44} />)}</div>
              ) : drafts.length === 0 ? (
                <EmptyState icon={<ClipboardList size={28} />} title="Nenhum quiz esperando revisão" description="Os rascunhos aparecem aqui conforme as aulas são transcritas." />
              ) : (
                <div className="ui-card adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr><th>Aula</th><th>Perguntas</th><th>Origem</th><th>Gerado em</th><th style={{ textAlign: "right" }}>Ação</th></tr>
                    </thead>
                    <tbody>
                      {drafts.map((d) => (
                        <tr key={d.quiz_id}>
                          <td>
                            <div className="sh-lesson">
                              <span className="sh-lesson__title">{d.lesson_title}</span>
                              <span className="ui-hint">{d.course_title}</span>
                            </div>
                          </td>
                          <td>{d.questions}</td>
                          <td>{d.generated_by === "ia-lote" ? "IA (automático)" : d.generated_by === "ia" ? "IA (no admin)" : "Manual"}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{fmtDate(d.updated_at)}</td>
                          <td>
                            <div className="adm-actions">
                              <Button size="sm" onClick={() => setQuizLesson({ id: d.lesson_id, title: d.lesson_title })} icon={<ListChecks size={14} />}>Revisar</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="adm-toolbar">
                <Select value={gapStatus} onChange={setGapStatus} options={GAP_STATUS} aria-label="Situação" minWidth={170} />
                <Select value={period} onChange={setPeriod} options={PERIODS} aria-label="Período" minWidth={180} />
                <span className="ui-hint">Perguntas em que nenhuma aula apareceu ou em que o aluno não clicou em nenhum resultado. Boas pautas para novas aulas.</span>
              </div>
              {gapsLoading ? (
                <div style={{ display: "grid", gap: 8 }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={44} />)}</div>
              ) : gaps.length === 0 ? (
                <EmptyState
                  icon={<SearchX size={28} />}
                  title={gapStatus === "abertas" ? "Nenhuma busca sem resposta" : "Nada nesta lista"}
                  description={gapStatus === "abertas" ? "Quando um aluno não achar a aula que procura, a pergunta aparece aqui." : "Troque a situação para ver as outras buscas."}
                />
              ) : (
                <div className="ui-card adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr><th>Pergunta</th><th>Buscas</th><th>Pessoas</th><th>Sem resultado</th><th>Sem clique</th><th>Última</th><th style={{ textAlign: "right" }}>Ações</th></tr>
                    </thead>
                    <tbody>
                      {gaps.map((g) => (
                        <tr key={g.norm}>
                          <td className="sh-query">{g.query}</td>
                          <td>{g.searches}</td>
                          <td>{g.people}</td>
                          <td>{g.no_results > 0 ? <span className="ui-badge ui-badge--danger">{g.no_results}</span> : "—"}</td>
                          <td>{g.no_click > 0 ? <span className="ui-badge ui-badge--warning">{g.no_click}</span> : "—"}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{fmtDate(g.last_at)}</td>
                          <td>
                            <div className="adm-actions">
                              {g.status ? (
                                <Button size="sm" variant="ghost" onClick={() => setGap(g, null)} loading={busy === `gap-${g.norm}`} disabled={!!busy} icon={<Undo2 size={14} />}>Reabrir</Button>
                              ) : (
                                <>
                                  <Button size="sm" variant="ghost" onClick={() => setGap(g, "pauta")} loading={busy === `gap-${g.norm}`} disabled={!!busy} icon={<ClipboardList size={14} />}>Virou pauta</Button>
                                  <Button size="sm" variant="ghost" onClick={() => setGap(g, "ignorada")} disabled={!!busy} icon={<EyeOff size={14} />}>Ignorar</Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <QuizDrawer
        lessonId={quizLesson?.id ?? null}
        lessonTitle={quizLesson?.title}
        onClose={() => setQuizLesson(null)}
        onChanged={(id, st) => {
          // Publicado ou excluído: sai da lista de revisão
          if (st !== "draft") setDrafts((ds) => ds.filter((d) => d.lesson_id !== id));
        }}
      />
    </div>
  );
}

function Stat({ icon, value, label, tone, onClick }: { icon: ReactNode; value: number; label: string; tone?: "success" | "warning" | "danger"; onClick?: () => void }) {
  const style = tone ? { background: `var(--color-${tone}-soft)`, color: `var(--color-${tone}-text)` } : undefined;
  const body = (
    <>
      <span className="adm-stat__icon" style={style}>{icon}</span>
      <div style={{ textAlign: "left" }}><strong>{value}</strong><span>{label}</span></div>
    </>
  );
  return onClick
    ? <button type="button" className="ui-card ui-card--interactive adm-stat" onClick={onClick}>{body}</button>
    : <div className="ui-card adm-stat">{body}</div>;
}
