import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowDown, ArrowUp, BrainCircuit, Check, ChevronDown, Clock, Eye, EyeOff, FileText, FolderPlus, GripVertical, Layers, Pencil, Plus, RefreshCw, Sparkles, Trash2, Video, X,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { Button, EmptyState, Select } from "../ui";
import Drawer from "./Drawer";
import LessonAttachments from "./LessonAttachments";
import TranscriptDrawer from "./TranscriptDrawer";
import QuizDrawer, { type QuizStatus } from "./QuizDrawer";
import { fetchVideoDuration, parseVideoUrl, videoThumbSync } from "../../utils/video";

type LessonStatus = "draft" | "published";
type IndexStatus = "pending" | "processing" | "done" | "error" | "skipped";

interface Lesson {
  id: number;
  title: string;
  videoUrl: string | null;
  content: string | null;
  order: number;
  duration?: number;
  module_id: number | null;
  status: LessonStatus;
  index_status?: IndexStatus;
  index_error?: string | null;
  transcript_source?: string | null;
}

interface Module {
  id: number;
  title: string;
  order: number;
}

interface LessonManagerProps {
  courseId: number;
  onCountChange?: (count: number) => void;
}

const NO_MODULE = "none";
const NEW_MODULE = "__new";

const formatMinutes = (min?: number) => {
  if (!min) return "—";
  const total = Math.round(min);
  return total >= 60 ? `${Math.floor(total / 60)}h ${total % 60}min` : `${total} min`;
};

/** Situação da aula na busca da pandAI. */
function IndexBadge({ lesson }: { lesson: Lesson }) {
  const st = lesson.index_status || "pending";
  if (st === "done") {
    return (
      <span className={`lm-index lm-index--done`} title={lesson.index_error || (lesson.transcript_source?.includes("gemini") ? "Transcrita pela IA e indexada" : "Indexada pelo texto da aula")}>
        <Sparkles size={11} /> Na busca{lesson.index_error ? " (só texto)" : ""}
      </span>
    );
  }
  if (st === "processing") return <span className="lm-index lm-index--processing"><span className="ui-spinner ui-spinner--sm" /> Transcrevendo...</span>;
  if (st === "error") return <span className="lm-index lm-index--error" title={lesson.index_error || ""}><AlertTriangle size={11} /> Erro na busca</span>;
  return <span className="lm-index">Fora da busca</span>;
}

/** Miniatura do vídeo do YouTube. */
function VideoThumb({ url }: { url: string | null }) {
  const src = videoThumbSync(url);
  return src ? <img className="lm-thumb" src={src} alt="" loading="lazy" /> : <span className="lm-thumb lm-thumb--empty"><Video size={16} /></span>;
}

/**
 * Grade do curso: módulos, aulas, rascunho/publicado e materiais.
 * A ordem global (lessons."order") segue módulo → aula, então o player
 * continua só ordenando por "order".
 */
export default function LessonManager({ courseId, onCountChange }: LessonManagerProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [addingModule, setAddingModule] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<number | null>(null);
  const [moduleTitleDraft, setModuleTitleDraft] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [content, setContent] = useState("");
  const [durationInput, setDurationInput] = useState("");
  const [moduleChoice, setModuleChoice] = useState<string>(NO_MODULE);
  const [inlineModuleTitle, setInlineModuleTitle] = useState("");
  const [statusChoice, setStatusChoice] = useState<LessonStatus>("draft");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewThumb, setPreviewThumb] = useState<string | null>(null);
  const [quizStatus, setQuizStatus] = useState<Record<number, QuizStatus>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [lessonsRes, modulesRes] = await Promise.all([
      supabase.from("lessons").select("*").eq("course_id", courseId).order("order", { ascending: true }),
      supabase.from("course_modules").select("id, title, order").eq("course_id", courseId).order("order", { ascending: true }),
    ]);
    if (lessonsRes.error) console.error("Erro ao buscar aulas:", lessonsRes.error);
    if (modulesRes.error) console.error("Erro ao buscar módulos:", modulesRes.error);
    setLessons((lessonsRes.data || []).map((l: any) => ({ ...l, status: l.status || "published", module_id: l.module_id ?? null })));
    setModules(modulesRes.data || []);
    setLoading(false);

    // Situação do quiz de cada aula (falha em silêncio se a migração do quiz não rodou)
    const ids = (lessonsRes.data || []).map((l: any) => l.id);
    if (ids.length) {
      const { data: quizzes } = await supabase.from("quizzes").select("lesson_id, status").in("lesson_id", ids);
      setQuizStatus(Object.fromEntries((quizzes || []).map((q: any) => [q.lesson_id, q.status as QuizStatus])));
    }
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  // ---------- Indexação para a busca (pandAI) ----------
  const [bulkIndexing, setBulkIndexing] = useState(false);
  const [transcriptLesson, setTranscriptLesson] = useState<{ id: number; title: string } | null>(null);
  const [quizLesson, setQuizLesson] = useState<{ id: number; title: string } | null>(null);

  const requestIndex = async (lessonId: number) => {
    setLessons((prev) => prev.map((l) => (l.id === lessonId ? { ...l, index_status: "processing", index_error: null } : l)));
    const { error: fnError } = await supabase.functions.invoke("index-lesson", { body: { lesson_id: lessonId } });
    if (fnError) {
      setLessons((prev) => prev.map((l) => (l.id === lessonId ? { ...l, index_status: "error", index_error: "Não foi possível chamar a indexação. A função index-lesson está publicada?" } : l)));
    }
  };

  const reindex = (lesson: Lesson) => requestIndex(lesson.id);

  const indexPending = async () => {
    setBulkIndexing(true);
    // Uma por vez, com pausa, para não estourar o limite da API do Gemini
    for (const l of lessons.filter((x) => x.status === "published" && (x.index_status === "pending" || x.index_status === "error"))) {
      await requestIndex(l.id);
      await new Promise((r) => setTimeout(r, 1500));
    }
    setBulkIndexing(false);
  };

  // Enquanto alguma aula estiver sendo processada, atualiza o status a cada 6 s
  const anyProcessing = lessons.some((l) => l.index_status === "processing");
  useEffect(() => {
    if (!anyProcessing) return;
    const timer = setInterval(async () => {
      const { data } = await supabase.from("lessons").select("id, index_status, index_error, transcript_source").eq("course_id", courseId);
      if (data) setLessons((prev) => prev.map((l) => {
        const fresh = data.find((d: any) => d.id === l.id);
        return fresh ? { ...l, ...fresh } : l;
      }));
    }, 6000);
    return () => clearInterval(timer);
  }, [anyProcessing, courseId]);
  useEffect(() => { onCountChange?.(lessons.filter((l) => l.status === "published").length); }, [lessons, onCountChange]);

  // Grupos na ordem de exibição: "Sem módulo" primeiro (se houver aula sem módulo ou nenhum módulo)
  const groups = useMemo(() => {
    const sortedModules = [...modules].sort((a, b) => a.order - b.order);
    const byModule = (mid: number | null) => lessons.filter((l) => l.module_id === mid).sort((a, b) => a.order - b.order);
    const result: { key: string; module: Module | null; lessons: Lesson[] }[] = [];
    const loose = byModule(null);
    if (loose.length || sortedModules.length === 0) result.push({ key: NO_MODULE, module: null, lessons: loose });
    sortedModules.forEach((m) => result.push({ key: String(m.id), module: m, lessons: byModule(m.id) }));
    return result;
  }, [lessons, modules]);

  // ---------- Persistência da ordem ----------
  const persistArrangement = async (arranged: { module_id: number | null; lessons: Lesson[] }[]) => {
    const prev = lessons;
    let n = 0;
    const next: Lesson[] = [];
    arranged.forEach((g) => g.lessons.forEach((l) => { n += 1; next.push({ ...l, module_id: g.module_id, order: n }); }));
    setLessons(next);

    const changed = next.filter((l) => {
      const old = prev.find((p) => p.id === l.id);
      return !old || old.order !== l.order || old.module_id !== l.module_id;
    });
    if (!changed.length) return;
    setSavingOrder(true);
    try {
      const results = await Promise.all(changed.map((l) => supabase.from("lessons").update({ order: l.order, module_id: l.module_id }).eq("id", l.id)));
      const failed = results.find((r) => r.error);
      if (failed) throw failed.error;
    } catch (err) {
      console.error("Erro ao salvar ordem:", err);
      alert("Não foi possível salvar a nova ordem. Recarregando a grade.");
      load();
    } finally {
      setSavingOrder(false);
    }
  };

  const currentArrangement = () => groups.map((g) => ({ module_id: g.module ? g.module.id : null, lessons: [...g.lessons] }));

  const moveLesson = (groupIndex: number, index: number, delta: number) => {
    const arr = currentArrangement();
    const list = arr[groupIndex].lessons;
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    const [item] = list.splice(index, 1);
    list.splice(target, 0, item);
    persistArrangement(arr);
  };

  /** Solta a aula arrastada antes de outra aula, ou no fim de um módulo (beforeId = null) */
  const dropLesson = (groupKey: string, beforeId: number | null) => {
    if (dragId === null) return;
    const arr = currentArrangement();
    let dragged: Lesson | undefined;
    arr.forEach((g) => {
      const i = g.lessons.findIndex((l) => l.id === dragId);
      if (i >= 0) dragged = g.lessons.splice(i, 1)[0];
    });
    const target = arr[groups.findIndex((g) => g.key === groupKey)];
    if (!dragged || !target) return;
    const at = beforeId === null ? target.lessons.length : target.lessons.findIndex((l) => l.id === beforeId);
    target.lessons.splice(at < 0 ? target.lessons.length : at, 0, dragged);
    setDragId(null);
    setOverKey(null);
    persistArrangement(arr);
  };

  // ---------- Módulos ----------
  const addModule = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // o gerenciador fica dentro do formulário do curso: não salvar o curso junto
    if (!newModuleTitle.trim()) return;
    setAddingModule(true);
    const nextOrder = modules.length ? Math.max(...modules.map((m) => m.order)) + 1 : 1;
    const { data, error: dbError } = await supabase.from("course_modules").insert([{ course_id: courseId, title: newModuleTitle.trim(), order: nextOrder }]).select("id, title, order").single();
    setAddingModule(false);
    if (dbError || !data) return alert("Não foi possível criar o módulo: " + (dbError?.message || ""));
    setModules((prev) => [...prev, data]);
    setNewModuleTitle("");
  };

  const renameModule = async (module: Module) => {
    const t = moduleTitleDraft.trim();
    setEditingModuleId(null);
    if (!t || t === module.title) return;
    setModules((prev) => prev.map((m) => (m.id === module.id ? { ...m, title: t } : m)));
    const { error: dbError } = await supabase.from("course_modules").update({ title: t }).eq("id", module.id);
    if (dbError) { alert("Não foi possível renomear o módulo."); load(); }
  };

  const deleteModule = async (module: Module, count: number) => {
    const msg = count
      ? `Excluir o módulo "${module.title}"? As ${count} aula(s) dele não serão apagadas: vão para "Sem módulo".`
      : `Excluir o módulo "${module.title}"?`;
    if (!window.confirm(msg)) return;
    const { error: dbError } = await supabase.from("course_modules").delete().eq("id", module.id);
    if (dbError) return alert("Não foi possível excluir o módulo.");
    load();
  };

  const moveModule = async (module: Module, delta: number) => {
    const sorted = [...modules].sort((a, b) => a.order - b.order);
    const i = sorted.findIndex((m) => m.id === module.id);
    const j = i + delta;
    if (j < 0 || j >= sorted.length) return;
    [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    const renumbered = sorted.map((m, idx) => ({ ...m, order: idx + 1 }));
    setModules(renumbered);
    const results = await Promise.all(renumbered.map((m) => supabase.from("course_modules").update({ order: m.order }).eq("id", m.id)));
    if (results.some((r) => r.error)) { alert("Não foi possível mover o módulo."); load(); return; }
    // Reaplica a ordem global das aulas seguindo a nova ordem dos módulos
    const loose = lessons.filter((l) => l.module_id === null).sort((a, b) => a.order - b.order);
    const arr = [
      ...(loose.length ? [{ module_id: null, lessons: loose }] : []),
      ...renumbered.map((m) => ({ module_id: m.id as number | null, lessons: lessons.filter((l) => l.module_id === m.id).sort((a, b) => a.order - b.order) })),
    ];
    persistArrangement(arr);
  };

  // ---------- Publicação ----------
  const setStatus = async (lesson: Lesson, status: LessonStatus) => {
    // Ao publicar, o banco já dispara a transcrição/indexação para a busca
    setLessons((prev) => prev.map((l) => (l.id === lesson.id ? { ...l, status, index_status: status === "published" ? "processing" : "skipped" } : l)));
    const payload: any = { status };
    if (status === "published") payload.published_at = new Date().toISOString();
    const { error: dbError } = await supabase.from("lessons").update(payload).eq("id", lesson.id);
    if (dbError) { alert("Não foi possível mudar o status: " + dbError.message); load(); }
  };

  // ---------- Formulário ----------
  const openNew = (moduleKey: string = groups[groups.length - 1]?.key || NO_MODULE) => {
    setEditing(null);
    setTitle(""); setVideoUrl(""); setContent(""); setDurationInput(""); setError(null);
    setModuleChoice(moduleKey); setStatusChoice("draft");
    setDrawerOpen(true);
  };

  const openEdit = (lesson: Lesson) => {
    setEditing(lesson);
    setTitle(lesson.title); setVideoUrl(lesson.videoUrl || ""); setContent(lesson.content || "");
    setDurationInput(lesson.duration ? String(Math.round(lesson.duration)) : "");
    setModuleChoice(lesson.module_id ? String(lesson.module_id) : NO_MODULE);
    setStatusChoice(lesson.status);
    setError(null);
    setDrawerOpen(true);
  };

  // Prévia da capa do vídeo enquanto digita o link
  useEffect(() => { setPreviewThumb(videoThumbSync(videoUrl)); }, [videoUrl]);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!title.trim()) return setError("Dê um título para a aula.");
    if (moduleChoice === NEW_MODULE) return setError("Crie o módulo (botão Criar) ou escolha outro.");
    if (!videoUrl.trim()) return setError("Cole o link do vídeo no YouTube.");
    if (!parseVideoUrl(videoUrl.trim())) return setError("Esse link não parece ser de um vídeo do YouTube.");

    setSaving(true);
    setError(null);
    try {
      // Duração digitada tem prioridade; vazia = busca automática
      const manual = Number(durationInput.replace(",", "."));
      const urlChanged = !editing || (editing.videoUrl || "") !== videoUrl.trim();
      const duration = manual > 0 ? manual : urlChanged || !editing?.duration ? await fetchVideoDuration(videoUrl.trim()) : editing.duration;
      const module_id = moduleChoice === NO_MODULE ? null : Number(moduleChoice);

      if (editing) {
        const payload: any = {
          title: title.trim(), videoUrl: videoUrl.trim(), content: content.trim() || null, duration, module_id, status: statusChoice,
        };
        if (statusChoice === "published" && editing.status !== "published") payload.published_at = new Date().toISOString();
        const { error: dbError } = await supabase.from("lessons").update(payload).eq("id", editing.id);
        if (dbError) throw dbError;

        const updated: Lesson = { ...editing, ...payload };
        const arr = currentArrangement();
        if (editing.module_id !== module_id) {
          // Mudou de módulo: vai para o fim do novo módulo e a ordem global é refeita
          arr.forEach((g) => { g.lessons = g.lessons.filter((l) => l.id !== editing.id); });
          let target = arr.find((g) => g.module_id === module_id);
          if (!target) { target = { module_id, lessons: [] }; arr.unshift(target); }
          target.lessons.push(updated);
        } else {
          arr.forEach((g) => { g.lessons = g.lessons.map((l) => (l.id === editing.id ? updated : l)); });
        }
        await persistArrangement(arr);
        setDrawerOpen(false);
      } else {
        // Nova aula entra no fim do módulo escolhido; a ordem global é refeita em seguida
        const { data, error: dbError } = await supabase.from("lessons").insert([{
          title: title.trim(),
          videoUrl: videoUrl.trim(),
          content: content.trim() || null,
          duration: duration > 0 ? duration : 3,
          order: lessons.length + 1,
          course_id: courseId,
          module_id,
          status: statusChoice,
          published_at: statusChoice === "published" ? new Date().toISOString() : null,
        }]).select("*").single();
        if (dbError) throw dbError;
        const created: Lesson = { ...data, status: data.status || statusChoice, module_id: data.module_id ?? module_id };
        const arr = currentArrangement();
        let target = arr.find((g) => g.module_id === module_id);
        if (!target) { target = { module_id, lessons: [] }; arr.unshift(target); }
        target.lessons.push(created);
        setLessons((prev) => [...prev, created]);
        await persistArrangement(arr);
        // Continua no painel, agora editando, para anexar materiais
        setEditing(created);
      }
    } catch (err: any) {
      setError("Não foi possível salvar: " + (err?.message || "erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (lesson: Lesson) => {
    if (!window.confirm(`Excluir a aula "${lesson.title}"? O progresso dos alunos nela será perdido.`)) return;
    const { error: dbError } = await supabase.from("lessons").delete().eq("id", lesson.id);
    if (dbError) return alert("Não foi possível excluir a aula.");
    setLessons((prev) => prev.filter((l) => l.id !== lesson.id));
  };

  const toggleCollapse = (key: string) => setCollapsed((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const publishedCount = lessons.filter((l) => l.status === "published").length;
  const pendingIndex = lessons.filter((l) => l.status === "published" && (l.index_status === "pending" || l.index_status === "error"));
  const draftCount = lessons.length - publishedCount;
  const totalMinutes = lessons.filter((l) => l.status === "published").reduce((s, l) => s + (l.duration || 0), 0);
  const sortedModules = [...modules].sort((a, b) => a.order - b.order);

  const moduleOptions = [
    { value: NO_MODULE, label: "Sem módulo" },
    ...sortedModules.map((m) => ({ value: String(m.id), label: m.title })),
    { value: NEW_MODULE, label: "+ Criar novo módulo", icon: <FolderPlus size={15} /> },
  ];

  // Cria o módulo direto do painel da aula e já seleciona
  const createModuleInline = async () => {
    const t = inlineModuleTitle.trim();
    if (!t) return;
    setAddingModule(true);
    const nextOrder = modules.length ? Math.max(...modules.map((m) => m.order)) + 1 : 1;
    const { data, error: dbError } = await supabase.from("course_modules").insert([{ course_id: courseId, title: t, order: nextOrder }]).select("id, title, order").single();
    setAddingModule(false);
    if (dbError || !data) return setError("Não foi possível criar o módulo: " + (dbError?.message || ""));
    setModules((prev) => [...prev, data]);
    setModuleChoice(String(data.id));
    setInlineModuleTitle("");
  };

  return (
    <div className="lm">
      <div className="lm-head">
        <div className="lm-summary">
          <span><Video size={14} /> {publishedCount} publicada(s)</span>
          {draftCount > 0 && <span className="lm-draft-count"><EyeOff size={14} /> {draftCount} rascunho(s)</span>}
          <span><Layers size={14} /> {modules.length} módulo(s)</span>
          <span><Clock size={14} /> {formatMinutes(totalMinutes)}</span>
          {savingOrder && <span className="lm-saving"><span className="ui-spinner ui-spinner--sm" /> Salvando ordem...</span>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            variant="secondary"
            onClick={() => { const el = document.getElementById("new-module-input"); el?.scrollIntoView({ behavior: "smooth", block: "center" }); el?.focus(); }}
            icon={<FolderPlus size={16} />}
          >
            Novo módulo
          </Button>
          {pendingIndex.length > 0 && (
            <Button variant="secondary" onClick={indexPending} loading={bulkIndexing} icon={<Sparkles size={16} />} title="Transcreve e indexa para a busca da pandAI">
              Indexar {pendingIndex.length} pendente(s)
            </Button>
          )}
          <Button onClick={() => openNew()} icon={<Plus size={16} />}>Nova aula</Button>
        </div>
      </div>

      {loading ? (
        <div className="ui-loading-inline"><div className="ui-spinner" /> Carregando grade...</div>
      ) : lessons.length === 0 && modules.length === 0 ? (
        <EmptyState
          icon={<Video size={28} />}
          title="Nenhuma aula ainda"
          description="Crie módulos para organizar o curso ou comece direto pela primeira aula. A duração vem do YouTube."
          action={<Button onClick={() => openNew()} icon={<Plus size={16} />}>Adicionar primeira aula</Button>}
        />
      ) : (
        <>
          <p className="ui-hint lm-tip">Arraste pela alça ⋮⋮ (inclusive entre módulos) ou use as setas. Rascunhos ficam invisíveis para os alunos.</p>

          <div className="lm-groups">
            {groups.map((group, gi) => {
              const isCollapsed = collapsed.has(group.key);
              const minutes = group.lessons.filter((l) => l.status === "published").reduce((s, l) => s + (l.duration || 0), 0);
              const moduleIndex = group.module ? sortedModules.findIndex((m) => m.id === group.module!.id) : -1;
              return (
                <section
                  key={group.key}
                  className={`lm-group ${overKey === `g-${group.key}` ? "is-over" : ""}`}
                  onDragOver={(e) => { if (dragId !== null) { e.preventDefault(); setOverKey(`g-${group.key}`); } }}
                  onDrop={(e) => { e.preventDefault(); dropLesson(group.key, null); }}
                >
                  <header className="lm-group__head">
                    <button type="button" className="sb-icon-btn lm-group__toggle" onClick={() => toggleCollapse(group.key)} aria-expanded={!isCollapsed} aria-label={isCollapsed ? "Expandir módulo" : "Recolher módulo"}>
                      <ChevronDown size={16} style={{ transform: isCollapsed ? "rotate(-90deg)" : "none" }} />
                    </button>
                    {group.module && editingModuleId === group.module.id ? (
                      <form className="lm-group__rename" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); renameModule(group.module!); }}>
                        <input className="ui-input" value={moduleTitleDraft} onChange={(e) => setModuleTitleDraft(e.target.value)} autoFocus onBlur={() => renameModule(group.module!)} aria-label="Nome do módulo" />
                        <button type="submit" className="sb-icon-btn" aria-label="Salvar nome"><Check size={15} /></button>
                      </form>
                    ) : (
                      <div className="lm-group__title">
                        <strong>{group.module ? `${moduleIndex + 1}. ${group.module.title}` : "Sem módulo"}</strong>
                        <span>{group.lessons.length} aula(s) · {formatMinutes(minutes)}</span>
                      </div>
                    )}
                    <div className="lm-actions">
                      <button type="button" className="sb-icon-btn" onClick={() => openNew(group.key)} aria-label="Nova aula neste módulo" title="Nova aula neste módulo"><Plus size={15} /></button>
                      {group.module && (
                        <>
                          <button type="button" className="sb-icon-btn" onClick={() => moveModule(group.module!, -1)} disabled={moduleIndex <= 0} aria-label="Subir módulo"><ArrowUp size={15} /></button>
                          <button type="button" className="sb-icon-btn" onClick={() => moveModule(group.module!, 1)} disabled={moduleIndex >= sortedModules.length - 1} aria-label="Descer módulo"><ArrowDown size={15} /></button>
                          <button type="button" className="sb-icon-btn" onClick={() => { setEditingModuleId(group.module!.id); setModuleTitleDraft(group.module!.title); }} aria-label="Renomear módulo"><Pencil size={15} /></button>
                          <button type="button" className="sb-icon-btn sb-logout" onClick={() => deleteModule(group.module!, group.lessons.length)} aria-label="Excluir módulo"><Trash2 size={15} /></button>
                        </>
                      )}
                    </div>
                  </header>

                  {!isCollapsed && (
                    group.lessons.length === 0 ? (
                      <div className="lm-group__empty">Arraste aulas para cá ou <button type="button" className="auth-link" onClick={() => openNew(group.key)}>crie uma aula</button>.</div>
                    ) : (
                      <ol className="lm-list">
                        {group.lessons.map((lesson, index) => (
                          <li
                            key={lesson.id}
                            className={`lm-item ${lesson.status === "draft" ? "is-draft" : ""} ${dragId === lesson.id ? "is-dragging" : ""} ${overKey === `l-${lesson.id}` && dragId !== lesson.id ? "is-over" : ""}`}
                            draggable
                            onDragStart={(e) => { setDragId(lesson.id); e.dataTransfer.effectAllowed = "move"; }}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setOverKey(`l-${lesson.id}`); }}
                            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); dropLesson(group.key, lesson.id); }}
                            onDragEnd={() => { setDragId(null); setOverKey(null); }}
                          >
                            <span className="lm-grip" aria-hidden="true"><GripVertical size={16} /></span>
                            <span className="lm-num">{index + 1}</span>
                            <VideoThumb url={lesson.videoUrl} />
                            <div className="lm-info">
                              <strong>{lesson.title}</strong>
                              <span>
                                {formatMinutes(lesson.duration)}
                                {lesson.content ? " · com texto" : ""}
                              </span>
                              <span className="lm-badges">
                                {lesson.status === "published" && <IndexBadge lesson={lesson} />}
                                {quizStatus[lesson.id] && (
                                  <span className={`lm-index ${quizStatus[lesson.id] === "published" ? "lm-index--done" : ""}`}>
                                    <BrainCircuit size={11} /> {quizStatus[lesson.id] === "published" ? "Quiz publicado" : "Quiz em rascunho"}
                                  </span>
                                )}
                              </span>
                            </div>
                            <button
                              type="button"
                              className={`lm-status ${lesson.status === "published" ? "is-on" : ""}`}
                              role="switch"
                              aria-checked={lesson.status === "published"}
                              onClick={() => setStatus(lesson, lesson.status === "published" ? "draft" : "published")}
                              title={lesson.status === "published" ? "Publicada: visível para os alunos" : "Rascunho: só a equipe vê"}
                            >
                              <span className="lm-status__track"><span className="lm-status__thumb" /></span>
                              {lesson.status === "published" ? "Publicada" : "Rascunho"}
                            </button>
                            <div className="lm-actions">
                              <button type="button" className="sb-icon-btn" onClick={() => moveLesson(gi, index, -1)} disabled={index === 0} aria-label={`Subir ${lesson.title}`}><ArrowUp size={15} /></button>
                              <button type="button" className="sb-icon-btn" onClick={() => moveLesson(gi, index, 1)} disabled={index === group.lessons.length - 1} aria-label={`Descer ${lesson.title}`}><ArrowDown size={15} /></button>
                              {lesson.status === "published" && (
                                <button type="button" className="sb-icon-btn" onClick={() => reindex(lesson)} disabled={lesson.index_status === "processing"} aria-label={`Reindexar ${lesson.title} para a busca`} title="Transcrever e indexar de novo para a busca"><RefreshCw size={15} /></button>
                              )}
                              <button type="button" className="sb-icon-btn" onClick={() => setTranscriptLesson({ id: lesson.id, title: lesson.title })} aria-label={`Ver transcrição de ${lesson.title}`} title="Ver e corrigir a transcrição"><FileText size={15} /></button>
                              <button type="button" className="sb-icon-btn" onClick={() => setQuizLesson({ id: lesson.id, title: lesson.title })} aria-label={`Quiz de ${lesson.title}`} title="Gerar e revisar o quiz da aula"><BrainCircuit size={15} /></button>
                              <button type="button" className="sb-icon-btn" onClick={() => openEdit(lesson)} aria-label={`Editar ${lesson.title}`}><Pencil size={15} /></button>
                              <button type="button" className="sb-icon-btn sb-logout" onClick={() => handleDelete(lesson)} aria-label={`Excluir ${lesson.title}`}><Trash2 size={15} /></button>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}

      <form className="lm-add-module" onSubmit={addModule}>
        <FolderPlus size={16} aria-hidden="true" />
        <input id="new-module-input" className="ui-input" placeholder="Novo módulo (ex.: Módulo 1 · Primeiros passos)" value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} aria-label="Nome do novo módulo" />
        <Button type="submit" variant="secondary" loading={addingModule} disabled={!newModuleTitle.trim()}>Criar módulo</Button>
      </form>

      <TranscriptDrawer
        lessonId={transcriptLesson?.id ?? null}
        lessonTitle={transcriptLesson?.title}
        onClose={() => setTranscriptLesson(null)}
        onReindexRequested={(id) => setLessons((prev) => prev.map((l) => (l.id === id ? { ...l, index_status: "processing", index_error: null } : l)))}
      />

      <QuizDrawer
        lessonId={quizLesson?.id ?? null}
        lessonTitle={quizLesson?.title}
        onClose={() => setQuizLesson(null)}
        onChanged={(id, st) => setQuizStatus((prev) => {
          const next = { ...prev };
          if (st) next[id] = st; else delete next[id];
          return next;
        })}
      />

      <Drawer
        open={drawerOpen}
        onClose={() => !saving && setDrawerOpen(false)}
        title={editing ? "Editar aula" : "Nova aula"}
        subtitle={editing ? editing.title : "A duração vem do YouTube automaticamente."}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDrawerOpen(false)} disabled={saving} icon={<X size={15} />}>Fechar</Button>
            <Button onClick={() => handleSave()} loading={saving}>{editing ? "Salvar alterações" : "Criar aula"}</Button>
          </>
        }
      >
        <form className="adm-form" onSubmit={handleSave}>
          <div className="ui-field">
            <label className="ui-label" htmlFor="lesson-title">Título da aula *</label>
            <input id="lesson-title" className="ui-input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div className="ui-field">
            <label className="ui-label" htmlFor="lesson-url">Link do vídeo (YouTube) *</label>
            <input id="lesson-url" type="url" className="ui-input" placeholder="https://youtube.com/watch?v=..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
            {previewThumb && <img src={previewThumb} alt="Prévia do vídeo" className="lm-video-preview" />}
          </div>
          <div className="adm-row">
            <div className="ui-field">
              <label className="ui-label" htmlFor="lesson-module">Módulo</label>
              <Select id="lesson-module" value={moduleChoice} onChange={setModuleChoice} options={moduleOptions} />
              {moduleChoice !== NEW_MODULE && modules.length === 0 && (
                <span className="ui-hint">Módulos são capítulos do curso (opcional).</span>
              )}
            </div>
            <div className="ui-field">
              <label className="ui-label" htmlFor="lesson-duration">Duração (minutos)</label>
              <input id="lesson-duration" className="ui-input" inputMode="decimal" value={durationInput} onChange={(e) => setDurationInput(e.target.value.replace(/[^\d.,]/g, ""))} placeholder="Automática" />
            </div>
          </div>
          {moduleChoice === NEW_MODULE && (
            <div className="ui-field lm-inline-module">
              <label className="ui-label" htmlFor="inline-module">Nome do novo módulo</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  id="inline-module"
                  className="ui-input"
                  placeholder="Ex.: Módulo 1 · Primeiros passos"
                  value={inlineModuleTitle}
                  onChange={(e) => setInlineModuleTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); createModuleInline(); } }}
                  autoFocus
                />
                <Button variant="secondary" onClick={createModuleInline} loading={addingModule} disabled={!inlineModuleTitle.trim()}>Criar</Button>
              </div>
              <span className="ui-hint">O módulo é criado agora e a aula entra nele ao salvar.</span>
            </div>
          )}
          <div className="ui-field">
            <span className="ui-label">Visibilidade</span>
            <div className="ui-tabs" role="radiogroup" aria-label="Visibilidade" style={{ display: "flex" }}>
              <button type="button" role="radio" className="ui-tab" style={{ flex: 1, justifyContent: "center" }} aria-checked={statusChoice === "draft"} onClick={() => setStatusChoice("draft")}><EyeOff size={14} /> Rascunho</button>
              <button type="button" role="radio" className="ui-tab" style={{ flex: 1, justifyContent: "center" }} aria-checked={statusChoice === "published"} onClick={() => setStatusChoice("published")}><Eye size={14} /> Publicada</button>
            </div>
            <span className="ui-hint">{statusChoice === "draft" ? "Só a equipe vê. Não conta para progresso nem insígnia." : "Visível para os alunos com acesso ao curso."}</span>
          </div>
          <div className="ui-field">
            <label className="ui-label" htmlFor="lesson-content">Transcrição ou resumo</label>
            <textarea id="lesson-content" className="ui-input" rows={6} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Usado pela busca da pandAI e para gerar quizzes." />
          </div>

          {editing ? (
            <LessonAttachments lessonId={editing.id} courseId={courseId} />
          ) : (
            <div className="ui-alert"><Video size={16} /> Crie a aula para poder anexar materiais de apoio.</div>
          )}

          {error && <div className="ui-alert ui-alert--danger" role="alert">{error}</div>}
          <button type="submit" hidden />
        </form>
      </Drawer>
    </div>
  );
}
