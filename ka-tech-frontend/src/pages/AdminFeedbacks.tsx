import { ReactNode, useEffect, useMemo, useState } from "react";
import { Bug, CheckCircle2, Clock, HelpCircle, Inbox, Lightbulb, MessageSquare, Star, Trash2 } from "lucide-react";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import SEO from "../components/SEO";
import { Button, EmptyState, PageHeader, Select, Skeleton, useConfirm, useToast } from "../components/ui";

interface Feedback {
  id: string;
  user_name: string;
  contact_info: string;
  type: string;
  message: string;
  status: string | null;
  created_at: string;
}

const TYPES: Record<string, { label: string; icon: typeof Bug }> = {
  bug: { label: "Problema", icon: Bug },
  melhoria: { label: "Sugestão", icon: Lightbulb },
  elogio: { label: "Elogio", icon: Star },
};
const typeOf = (t: string) => TYPES[t] ?? { label: "Dúvida", icon: HelpCircle };

const STATUS: Record<string, { label: string; tone: string }> = {
  pendente: { label: "Pendente", tone: "neutral" },
  em_analise: { label: "Em análise", tone: "warning" },
  resolvido: { label: "Resolvido", tone: "success" },
};

const FILTERS = [
  { value: "abertos", label: "Abertos" },
  { value: "pendente", label: "Pendentes" },
  { value: "em_analise", label: "Em análise" },
  { value: "resolvido", label: "Resolvidos" },
  { value: "todos", label: "Todos" },
];

const statusOf = (f: Feedback) => f.status || "pendente";

/** Caixa de feedbacks enviados pelos alunos (botão "Deixar feedback" da barra lateral). */
export default function AdminFeedbacks() {
  const confirm = useConfirm();
  const toast = useToast();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("abertos");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("feedbacks").select("*").order("created_at", { ascending: false });
      if (error) toast.error("Não foi possível carregar os feedbacks.");
      setFeedbacks((data as Feedback[]) || []);
      setLoading(false);
    })();
  }, [toast]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { pendente: 0, em_analise: 0, resolvido: 0 };
    for (const f of feedbacks) c[statusOf(f)] = (c[statusOf(f)] || 0) + 1;
    return c;
  }, [feedbacks]);

  const visible = feedbacks.filter((f) =>
    filter === "todos" ? true : filter === "abertos" ? statusOf(f) !== "resolvido" : statusOf(f) === filter,
  );

  const updateStatus = async (fb: Feedback, status: string) => {
    setBusy(fb.id);
    const { error } = await supabase.from("feedbacks").update({ status }).eq("id", fb.id);
    setBusy(null);
    if (error) return toast.error("Não foi possível mudar a situação. Verifique as permissões do banco.");
    setFeedbacks((prev) => prev.map((f) => (f.id === fb.id ? { ...f, status } : f)));
    toast.success(status === "resolvido" ? "Feedback marcado como resolvido." : "Feedback marcado como em análise.");
  };

  const remove = async (fb: Feedback) => {
    if (!(await confirm({ title: "Excluir este feedback?", message: "A mensagem é apagada de vez.", tone: "danger", confirmLabel: "Excluir" }))) return;
    setBusy(fb.id);
    const { error } = await supabase.from("feedbacks").delete().eq("id", fb.id);
    setBusy(null);
    if (error) return toast.error("Não foi possível excluir. Verifique as permissões do banco.");
    setFeedbacks((prev) => prev.filter((f) => f.id !== fb.id));
  };

  const statCard = (key: string, label: string, icon: ReactNode, tone?: string) => (
    <button type="button" className="ui-card ui-card--interactive adm-stat" onClick={() => setFilter(key)} aria-pressed={filter === key}>
      <span className="adm-stat__icon" style={tone ? { background: `var(--color-${tone}-soft)`, color: `var(--color-${tone}-text)` } : undefined}>{icon}</span>
      <div style={{ textAlign: "left" }}><strong>{counts[key]}</strong><span>{label}</span></div>
    </button>
  );

  return (
    <div className="ui-shell">
      <SEO title="Feedbacks" description="Feedbacks enviados pelos alunos" />
      <Sidebar />
      <main className="ui-main">
        <div className="ui-main__inner">
          <PageHeader eyebrow="Gestão" title="Feedbacks" subtitle="Problemas, sugestões e elogios enviados pelos alunos pelo botão “Deixar feedback”." />

          <div className="adm-stats">
            {statCard("pendente", "pendentes", <Inbox size={18} />)}
            {statCard("em_analise", "em análise", <Clock size={18} />, "warning")}
            {statCard("resolvido", "resolvidos", <CheckCircle2 size={18} />, "success")}
          </div>

          <div className="adm-toolbar">
            <Select value={filter} onChange={setFilter} options={FILTERS} aria-label="Filtrar por situação" minWidth={180} />
            <span className="adm-filter-count">{visible.length} feedback{visible.length === 1 ? "" : "s"}</span>
          </div>

          {loading ? (
            <div style={{ display: "grid", gap: 12 }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={110} radius={16} />)}</div>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={<MessageSquare size={28} />}
              title={filter === "abertos" ? "Nenhum feedback em aberto" : "Nada nesta lista"}
              description={filter === "abertos" ? "Tudo respondido por aqui." : "Troque o filtro para ver outros feedbacks."}
            />
          ) : (
            <ul className="fb-list">
              {visible.map((fb) => {
                const t = typeOf(fb.type);
                const st = STATUS[statusOf(fb)] ?? STATUS.pendente;
                const Icon = t.icon;
                return (
                  <li key={fb.id} className="ui-card fb-item">
                    <div className="fb-item__head">
                      <span className={`fb-item__type fb-item__type--${fb.type in TYPES ? fb.type : "duvida"}`}><Icon size={15} /> {t.label}</span>
                      <span className={`ui-badge ui-badge--${st.tone}`}>{st.label}</span>
                      <time className="ui-hint fb-item__date" dateTime={fb.created_at}>
                        {new Date(fb.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </time>
                    </div>
                    <p className="fb-item__message">{fb.message}</p>
                    <div className="fb-item__foot">
                      <div className="adm-cell-text">
                        <strong>{fb.user_name || "Sem nome"}</strong>
                        {fb.contact_info && <span className="ui-hint">{fb.contact_info}</span>}
                      </div>
                      <div className="adm-actions">
                        {statusOf(fb) === "pendente" && (
                          <Button size="sm" variant="ghost" onClick={() => updateStatus(fb, "em_analise")} disabled={busy === fb.id} icon={<Clock size={14} />}>Em análise</Button>
                        )}
                        {statusOf(fb) !== "resolvido" && (
                          <Button size="sm" variant="secondary" onClick={() => updateStatus(fb, "resolvido")} disabled={busy === fb.id} icon={<CheckCircle2 size={14} />}>Resolvido</Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => remove(fb)} disabled={busy === fb.id} icon={<Trash2 size={14} />}>Excluir</Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
