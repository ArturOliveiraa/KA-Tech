import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Eye, FileText, Image as ImageIcon, Layers, Lock, Save, Shield, Trophy, Video } from "lucide-react";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import SEO from "../components/SEO";
import { Button, CourseCover, LoadingScreen, PageHeader, Select, isGenericCover, ownCoverUrl } from "../components/ui";
import TagPicker, { TagOption } from "../components/admin/TagPicker";
import ImageUpload from "../components/admin/ImageUpload";
import LessonManager from "../components/admin/LessonManager";
import Drawer from "../components/admin/Drawer";

interface Category { id: number; name: string; slug: string; }

const generateSlug = (text: string) =>
  text.toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-").replace(/[^\w-]+/g, "").replace(/--+/g, "-").replace(/^-+/, "").replace(/-+$/, "");

const SECTIONS = [
  { id: "info", label: "Informações", icon: FileText },
  { id: "capa", label: "Capa", icon: ImageIcon },
  { id: "organizacao", label: "Trilha e XP", icon: Layers },
  { id: "aulas", label: "Aulas", icon: Video },
];

/** Criação e edição de curso: conteúdo à esquerda, configurações e resumo à direita. */
export default function AdminCourseEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === "novo";
  const courseId = isNew ? null : Number(id);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [activeSection, setActiveSection] = useState("info");

  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [xpWeight, setXpWeight] = useState(1);
  const [slug, setSlug] = useState("");
  const [lessonCount, setLessonCount] = useState(0);

  // Setores ficam num painel próprio e são salvos na hora (fora do botão Salvar)
  const [sectorsOpen, setSectorsOpen] = useState(false);
  const [sectorDraft, setSectorDraft] = useState<string[]>([]);
  const [savingSectors, setSavingSectors] = useState(false);
  const [sectorsError, setSectorsError] = useState<string | null>(null);

  const touch = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setDirty(true); };

  useEffect(() => {
    async function load() {
      const [catRes, tagRes] = await Promise.all([
        supabase.from("categories").select("*").order("name", { ascending: true }),
        supabase.from("tags").select("id, name, type").order("name", { ascending: true }),
      ]);
      setCategories(catRes.data || []);
      setTags(tagRes.data || []);

      if (courseId) {
        const [{ data: course, error: courseError }, { data: cTags }] = await Promise.all([
          supabase.from("courses").select("*").eq("id", courseId).maybeSingle(),
          supabase.from("course_tags").select("tag_id").eq("course_id", courseId),
        ]);
        if (courseError || !course) {
          setError("Curso não encontrado.");
        } else {
          setTitle(course.title || "");
          setDescription(course.description || "");
          setThumbnail(course.thumbnailUrl || "");
          setCategoryId(course.category_id ? String(course.category_id) : "");
          setXpWeight(course.xp_weight || 1);
          setSlug(course.slug || "");
          setTagIds((cTags || []).map((t) => t.tag_id));
        }
        setLoading(false);
      }
    }
    load();
  }, [courseId]);

  // Avisa antes de sair com alterações não salvas
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Destaca a seção visível nas etapas do topo
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-25% 0px -55% 0px" }
    );
    SECTIONS.forEach((s) => { const el = document.getElementById(s.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [loading]);

  useEffect(() => {
    if (!loading && window.location.hash) {
      setTimeout(() => document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ behavior: "smooth" }), 150);
    }
  }, [loading]);

  const createTag = useCallback(async (name: string): Promise<TagOption | null> => {
    const { data, error: tagError } = await supabase.from("tags").insert([{ name: name.toUpperCase() }]).select("id, name, type").single();
    if (tagError || !data) { setSectorsError("Não foi possível criar o setor: " + (tagError?.message || "")); return null; }
    setTags((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) { setError("Informe o título do curso."); document.getElementById("info")?.scrollIntoView({ behavior: "smooth" }); return; }
    if (!description.trim()) { setError("Escreva uma descrição curta do curso."); document.getElementById("info")?.scrollIntoView({ behavior: "smooth" }); return; }

    setSaving(true);
    setError(null);
    const newSlug = generateSlug(title);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      thumbnailUrl: thumbnail.trim() || null,
      category_id: categoryId ? Number(categoryId) : null,
      xp_weight: Number(xpWeight) || 1,
      slug: newSlug,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (courseId) {
        const { error: upError } = await supabase.from("courses").update(payload).eq("id", courseId);
        if (upError) throw upError;
      } else {
        const { data, error: insError } = await supabase.from("courses").insert([payload]).select().single();
        if (insError) throw insError;
        navigate(`/admin/cursos/${data.id}#aulas`, { replace: true });
      }
      setSlug(newSlug);
      setDirty(false);
      setSavedAt(new Date());
    } catch (err: any) {
      setError("Não foi possível salvar o curso: " + (err?.message || "erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  const openSectors = () => {
    setSectorDraft(tagIds);
    setSectorsError(null);
    setSectorsOpen(true);
  };

  const saveSectors = async () => {
    if (!courseId) return;
    setSavingSectors(true);
    setSectorsError(null);
    try {
      const { error: delError } = await supabase.from("course_tags").delete().eq("course_id", courseId);
      if (delError) throw delError;
      if (sectorDraft.length) {
        const { error: insError } = await supabase.from("course_tags").insert(sectorDraft.map((tag_id) => ({ course_id: courseId, tag_id })));
        if (insError) throw insError;
      }
      setTagIds(sectorDraft);
      setSectorsOpen(false);
    } catch (e: any) {
      setSectorsError("Não foi possível salvar os setores: " + (e?.message || ""));
    } finally {
      setSavingSectors(false);
    }
  };

  const goTo = (sectionId: string) => document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (loading) return <LoadingScreen label="Carregando curso..." />;

  const done: Record<string, boolean> = {
    info: !!title.trim() && !!description.trim(),
    capa: true, // sem capa própria o site gera uma automática
    organizacao: !!categoryId,
    aulas: lessonCount > 0,
  };
  const selectedTagNames = tagIds.map((tid) => tags.find((t) => t.id === tid)?.name).filter(Boolean) as string[];
  const categoryName = categories.find((c) => String(c.id) === categoryId)?.name;

  return (
    <div className="ui-shell">
      <SEO title={isNew ? "Novo curso" : `Editar: ${title}`} />
      <Sidebar />
      <main className="ui-main">
        <div className="ui-main__inner">
          <Link to="/admin/cursos" className="ply-back"><ArrowLeft size={14} /> Cursos e trilhas</Link>
          <PageHeader
            title={isNew ? "Novo curso" : title || "Editar curso"}
            subtitle={isNew ? "Preencha as informações básicas e salve para adicionar as aulas." : "Aulas e setores são salvos na hora. O restante, pelo botão Salvar."}
            actions={!isNew && slug ? (
              <Button variant="secondary" onClick={() => window.open(`/curso/${slug}`, "_blank")} icon={<Eye size={16} />}>Ver como aluno</Button>
            ) : undefined}
          />

          <nav className="ce-steps" aria-label="Etapas do curso">
            {SECTIONS.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={activeSection === s.id ? "is-active" : ""}
                onClick={(e) => { e.preventDefault(); goTo(s.id); }}
              >
                <span className={`ce-step ${done[s.id] ? "is-done" : ""}`}>{done[s.id] ? "✓" : i + 1}</span>
                {s.label}
              </a>
            ))}
          </nav>

          <form className="ce2" onSubmit={handleSave}>
            <div className="ce2-main">
              <section id="info" className="ui-card ce-section">
                <div className="ce-section__head">
                  <h2>Informações</h2>
                  <p>O que o aluno vê no catálogo.</p>
                </div>
                <div className="adm-form">
                  <div className="ui-field">
                    <label className="ui-label" htmlFor="c-title">Título *</label>
                    <input id="c-title" className="ui-input" value={title} onChange={(e) => touch(setTitle)(e.target.value)} placeholder="Ex.: Implantação do PDV para restaurantes" maxLength={120} />
                    {title && <span className="ui-hint">Endereço: /curso/{generateSlug(title)}</span>}
                  </div>
                  <div className="ui-field">
                    <label className="ui-label" htmlFor="c-desc">Descrição *</label>
                    <textarea id="c-desc" className="ui-input" rows={3} value={description} onChange={(e) => touch(setDescription)(e.target.value)} placeholder="Em uma ou duas frases: o que a pessoa aprende neste curso?" maxLength={600} />
                    <span className="ui-hint">{description.length}/600</span>
                  </div>
                </div>
              </section>

              <section id="capa" className="ui-card ce-section">
                <div className="ce-section__head">
                  <h2>Capa</h2>
                  <p>Aparece no catálogo, no dashboard e no relatório.</p>
                </div>
                <ImageUpload value={thumbnail} onChange={touch(setThumbnail)} bucket="course-thumbs" />
                {!ownCoverUrl(thumbnail) && (
                  <div className="ce-autocover">
                    <CourseCover title={title || "Curso"} category={categoryName} className="ce-autocover__img" />
                    <p className="ui-hint">
                      {isGenericCover(thumbnail)
                        ? "A imagem acima é a capa genérica antiga e não aparece para os alunos. Eles veem esta capa automática, com o ícone do assunto do curso. Remova a imagem ou envie uma capa própria."
                        : "Sem capa própria, os alunos veem esta capa automática, com o ícone do assunto do curso."}
                    </p>
                  </div>
                )}
              </section>

              <section id="aulas" className="ui-card ce-section">
                <div className="ce-section__head">
                  <h2>Aulas</h2>
                  <p>Organize módulos e a sequência que o aluno vai seguir.</p>
                </div>
                {courseId ? (
                  <LessonManager courseId={courseId} onCountChange={setLessonCount} />
                ) : (
                  <div className="ce-locked"><Lock size={16} /> Salve o curso primeiro para adicionar aulas.</div>
                )}
              </section>
            </div>

            <aside className="ce2-aside">
              <section id="organizacao" className="ui-card ce-section ce-side">
                <h2 className="ce-side__title"><Trophy size={16} /> Trilha e gamificação</h2>
                <div className="adm-form">
                  <div className="ui-field">
                    <label className="ui-label" htmlFor="c-cat">Trilha</label>
                    <Select
                      id="c-cat"
                      value={categoryId}
                      onChange={touch(setCategoryId)}
                      options={[{ value: "", label: "Sem trilha" }, ...categories.map((cat) => ({ value: String(cat.id), label: cat.name }))]}
                    />
                  </div>
                  <div className="ui-field">
                    <label className="ui-label" htmlFor="c-xp">Peso de XP</label>
                    <div className="ce-xp">
                      <input id="c-xp" type="range" min={1} max={10} value={xpWeight} onChange={(e) => touch(setXpWeight)(Number(e.target.value))} />
                      <output htmlFor="c-xp">{xpWeight}x</output>
                    </div>
                    <span className="ui-hint">Multiplica o XP ao concluir.</span>
                  </div>
                </div>
              </section>

              <section className="ui-card ce-section ce-side">
                <h2 className="ce-side__title"><Shield size={16} /> Acesso</h2>
                {courseId ? (
                  <>
                    {tagIds.length ? (
                      <div className="ce-side__tags">
                        <strong>{tagIds.length} {tagIds.length === 1 ? "setor" : "setores"}</strong>
                        <span>{selectedTagNames.slice(0, 3).join(", ")}{tagIds.length > 3 ? ` e mais ${tagIds.length - 3}` : ""}</span>
                      </div>
                    ) : (
                      <div className="ui-alert ui-alert--danger" style={{ fontSize: "var(--text-xs)" }}>Sem setores: o curso não aparece para os alunos.</div>
                    )}
                    <Button block variant="secondary" onClick={openSectors} icon={<Shield size={15} />}>Gerenciar setores</Button>
                  </>
                ) : (
                  <p className="ui-hint" style={{ margin: 0 }}>Salve o curso para definir quem tem acesso.</p>
                )}
              </section>

              <section className="ui-card ce-section ce-side">
                <h2 className="ce-side__title"><Layers size={16} /> Resumo</h2>
                <dl className="ce-summary">
                  <div><dt>Trilha</dt><dd>{categoryName || "—"}</dd></div>
                  <div><dt>Aulas publicadas</dt><dd>{lessonCount}</dd></div>
                  <div><dt>Setores</dt><dd>{tagIds.length}</dd></div>
                  <div><dt>Peso de XP</dt><dd>{xpWeight}x</dd></div>
                  <div><dt>Capa</dt><dd>{ownCoverUrl(thumbnail) ? "Própria" : "Automática"}</dd></div>
                </dl>
              </section>
            </aside>

            <div className="ce-footer ce2-footer">
              {error && <div className="ui-alert ui-alert--danger" role="alert" style={{ flexBasis: "100%" }}>{error}</div>}
              <span className="ce-footer__status">
                {saving ? "Salvando..." : dirty ? "Alterações não salvas" : savedAt ? `Salvo às ${savedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : isNew ? "Rascunho" : "Tudo salvo"}
              </span>
              <div className="ce-footer__actions">
                <Button variant="ghost" onClick={() => navigate("/admin/cursos")}>Voltar</Button>
                <Button type="submit" loading={saving} icon={<Save size={16} />} disabled={!dirty && !isNew}>
                  {isNew ? "Criar curso" : "Salvar"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </main>

      <Drawer
        open={sectorsOpen}
        onClose={() => !savingSectors && setSectorsOpen(false)}
        title="Setores e acesso"
        subtitle={title}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSectorsOpen(false)} disabled={savingSectors}>Cancelar</Button>
            <Button onClick={saveSectors} loading={savingSectors}>Salvar setores</Button>
          </>
        }
      >
        <div className="adm-form">
          <TagPicker id="editor-sectors" label="Setores com acesso" options={tags} value={sectorDraft} onChange={setSectorDraft} onCreate={createTag} placeholder="Buscar ou criar setor" inline listHeight="calc(100vh - 380px)" />
          {sectorDraft.length === 0 && <div className="ui-alert">Sem setores, o curso não aparece para os alunos.</div>}
          {sectorsError && <div className="ui-alert ui-alert--danger" role="alert">{sectorsError}</div>}
        </div>
      </Drawer>
    </div>
  );
}
