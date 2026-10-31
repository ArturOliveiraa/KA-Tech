import { FormEvent, useEffect, useState } from "react";
import { CalendarClock, History, Pencil, Radio, Square, X } from "lucide-react";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import SEO from "../components/SEO";
import { Button, EmptyState, PageHeader, useConfirm, useToast } from "../components/ui";

interface Live {
  id: string;
  title: string;
  video_id: string;
  scheduled_at: string;
  duration: string | null;
}

const youtubeId = (urlOrId: string) => {
  if (!urlOrId) return "";
  if (urlOrId.length === 11 && !urlOrId.includes("/")) return urlOrId;
  const match = urlOrId.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i);
  return match ? match[1] : urlOrId;
};

/** "2026-10-31T14:00" no horário de quem está usando (o input datetime-local não tem fuso). */
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Agenda lives, publica replays de lives antigas e encerra a transmissão em andamento. */
export default function LiveSetup() {
  const confirm = useConfirm();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [lives, setLives] = useState<Live[]>([]);
  const [title, setTitle] = useState("");
  const [videoId, setVideoId] = useState("");
  const [liveDate, setLiveDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isRetroactive, setIsRetroactive] = useState(false);
  const [manualDuration, setManualDuration] = useState("");

  const fetchUpcoming = async () => {
    // Sem duração = ainda não encerrada (inclui a que está no ar agora)
    const { data, error } = await supabase.from("lives").select("*").is("duration", null).order("scheduled_at", { ascending: true });
    if (error) toast.error("Não foi possível carregar as lives: " + error.message);
    setLives((data as Live[]) || []);
  };

  useEffect(() => { fetchUpcoming(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => {
    setTitle("");
    setVideoId("");
    setLiveDate("");
    setEditingId(null);
    setIsRetroactive(false);
    setManualDuration("");
  };

  const startEdit = (live: Live) => {
    setEditingId(live.id);
    setTitle(live.title);
    setVideoId(live.video_id);
    setLiveDate(toLocalInput(live.scheduled_at));
    setIsRetroactive(false);
    document.getElementById("ls-title")?.focus();
  };

  const finishLive = async (live: Live) => {
    const diff = Date.now() - new Date(live.scheduled_at).getTime();
    if (diff <= 0) return toast.warning("Esta live ainda não começou: o horário agendado não chegou.");
    if (!(await confirm({ title: `Encerrar "${live.title}"?`, message: "A live vira replay, com a duração contada desde o horário agendado.", tone: "danger", confirmLabel: "Encerrar live" }))) return;

    const hours = Math.floor(diff / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    const duration = `${hours > 0 ? `${hours}h ` : ""}${minutes}min`;
    const { error } = await supabase.from("lives").update({ duration }).eq("id", live.id);
    if (error) return toast.error("Não foi possível encerrar: " + error.message);
    toast.success(`Live encerrada. Duração: ${duration}.`);
    fetchUpcoming();
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Replay sem hora: meio-dia evita a data voltar um dia por causa do fuso
    const date = isRetroactive && !liveDate.includes("T") ? `${liveDate}T12:00:00` : liveDate;
    const payload = {
      title: title.trim(),
      video_id: youtubeId(videoId.trim()),
      scheduled_at: new Date(date).toISOString(),
      duration: isRetroactive ? (manualDuration.trim() || "1h 00min") : null,
    };
    const { error } = editingId
      ? await supabase.from("lives").update(payload).eq("id", editingId)
      : await supabase.from("lives").insert([payload]);
    setSaving(false);
    if (error) return toast.error("Não foi possível salvar: " + error.message);
    toast.success(editingId ? "Agendamento atualizado." : isRetroactive ? "Replay publicado." : "Live agendada.");
    resetForm();
    fetchUpcoming();
  };

  const now = Date.now();

  return (
    <div className="ui-shell">
      <SEO title="Agendar live" description="Agende lives e publique replays." />
      <Sidebar />
      <main className="ui-main">
        <div className="ui-main__inner">
          <PageHeader eyebrow={<><Radio size={14} /> Lives</>} title="Agendar live" subtitle="Marque as próximas transmissões, publique gravações antigas como replay e encerre a live quando ela acabar." />

          <div className="ls-grid">
            <section className="ui-card ui-card--padded" aria-labelledby="ls-form-title">
              <h2 id="ls-form-title" className="ui-section__title" style={{ marginBottom: 20 }}>
                {editingId ? <><Pencil size={18} /> Editar agendamento</> : <><CalendarClock size={18} /> Nova live</>}
              </h2>
              <form className="adm-form" onSubmit={save}>
                {!editingId && (
                  <label className="ls-toggle">
                    <input
                      type="checkbox"
                      checked={isRetroactive}
                      onChange={(e) => {
                        setIsRetroactive(e.target.checked);
                        if (e.target.checked && liveDate.includes("T")) setLiveDate(liveDate.split("T")[0]);
                      }}
                    />
                    <span>
                      <strong>Publicar como replay</strong>
                      <span className="ui-hint">A live já aconteceu: vai direto para a biblioteca de replays.</span>
                    </span>
                  </label>
                )}

                <div className="ui-field">
                  <label className="ui-label" htmlFor="ls-title">Título</label>
                  <input id="ls-title" className="ui-input" placeholder="Ex.: Faturamento no Softcomshop" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>

                <div className="ui-field">
                  <label className="ui-label" htmlFor="ls-video">Link ou ID do vídeo no YouTube</label>
                  <input id="ls-video" className="ui-input" placeholder="https://youtube.com/live/..." value={videoId} onChange={(e) => setVideoId(e.target.value)} required />
                </div>

                <div className="adm-row">
                  <div className="ui-field">
                    <label className="ui-label" htmlFor="ls-date">{isRetroactive ? "Data em que aconteceu" : "Data e hora de início"}</label>
                    <input id="ls-date" type={isRetroactive ? "date" : "datetime-local"} className="ui-input" value={liveDate} onChange={(e) => setLiveDate(e.target.value)} required />
                  </div>
                  {isRetroactive && (
                    <div className="ui-field">
                      <label className="ui-label" htmlFor="ls-duration">Duração</label>
                      <input id="ls-duration" className="ui-input" placeholder="Ex.: 1h 30min" value={manualDuration} onChange={(e) => setManualDuration(e.target.value)} />
                    </div>
                  )}
                </div>

                <div className="ls-actions">
                  {editingId && <Button variant="ghost" onClick={resetForm} icon={<X size={15} />}>Cancelar edição</Button>}
                  <Button type="submit" loading={saving} icon={isRetroactive ? <History size={15} /> : <CalendarClock size={15} />}>
                    {editingId ? "Salvar alterações" : isRetroactive ? "Publicar replay" : "Agendar live"}
                  </Button>
                </div>
              </form>
            </section>

            <section className="ui-card ui-card--padded" aria-labelledby="ls-list-title">
              <h2 id="ls-list-title" className="ui-section__title" style={{ marginBottom: 16 }}><Radio size={18} /> Agendadas e no ar</h2>
              {lives.length === 0 ? (
                <EmptyState icon={<CalendarClock size={26} />} title="Nenhuma live agendada" description="As lives marcadas aparecem aqui até serem encerradas." />
              ) : (
                <ul className="adm-plain-list ls-list">
                  {lives.map((live) => {
                    const onAir = new Date(live.scheduled_at).getTime() <= now;
                    return (
                      <li key={live.id} className={`ls-item ${onAir ? "is-on-air" : ""}`}>
                        <div className="adm-cell-text">
                          <strong>{live.title}</strong>
                          <span className="ui-hint">
                            {onAir && <span className="ui-badge ui-badge--danger" style={{ marginRight: 6 }}>No ar</span>}
                            {new Date(live.scheduled_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </div>
                        <div className="adm-actions">
                          <Button size="sm" variant="ghost" onClick={() => startEdit(live)} icon={<Pencil size={14} />}>Editar</Button>
                          <Button size="sm" variant={onAir ? "danger" : "ghost"} onClick={() => finishLive(live)} icon={<Square size={13} />}>Encerrar</Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
