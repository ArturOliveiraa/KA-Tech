import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Copy, Eye, LayoutGrid, Layers, List, Pencil, Plus, Search, Shield, Tag as TagIcon, Trash2, Video, X } from "lucide-react";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import SEO from "../components/SEO";
import { Button, CourseThumb, EmptyState, PageHeader, Select, Skeleton } from "../components/ui";
import TagPicker, { TagOption } from "../components/admin/TagPicker";
import ActionMenu, { ActionItem } from "../components/admin/ActionMenu";
import CourseWizard from "../components/admin/CourseWizard";
import Drawer from "../components/admin/Drawer";

const VIEW_KEY = "ka-admin-courses-view";

interface Category { id: number; name: string; slug: string; }

interface Course {
  id: number;
  title: string;
  description: string;
  slug: string;
  thumbnailUrl?: string;
  category_id?: number;
  xp_weight: number;
  categories?: { name: string };
  course_tags?: { tag_id: string; tags: { name: string } }[];
  lessons?: { count: number }[];
}

const generateSlug = (text: string) =>
  text.toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-").replace(/[^\w-]+/g, "").replace(/--+/g, "-").replace(/^-+/, "").replace(/-+$/, "");

const AdminCourses: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"cursos" | "catalogo">("cursos");
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const [view, setView] = useState<"table" | "grid">(() => {
    try { return localStorage.getItem(VIEW_KEY) === "grid" ? "grid" : "table"; } catch { return "table"; }
  });
  const [wizardOpen, setWizardOpen] = useState(false);
  const [sectorsCourse, setSectorsCourse] = useState<Course | null>(null);
  const [sectorIds, setSectorIds] = useState<string[]>([]);
  const [savingSectors, setSavingSectors] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    try { localStorage.setItem(VIEW_KEY, view); } catch { /* navegação privada */ }
  }, [view]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, tagRes, courseRes] = await Promise.all([
        supabase.from("categories").select("*").order("name", { ascending: true }),
        supabase.from("tags").select("id, name, type").order("name", { ascending: true }),
        supabase
          .from("courses")
          .select(`*, categories:category_id (name), course_tags (tag_id, tags (name)), lessons (count)`)
          .order("createdAt", { ascending: false }),
      ]);
      let courseData = courseRes.data as Course[] | null;
      if (courseRes.error) {
        // Sem relação lessons -> courses exposta: busca sem a contagem de aulas
        const retry = await supabase
          .from("courses")
          .select(`*, categories:category_id (name), course_tags (tag_id, tags (name))`)
          .order("createdAt", { ascending: false });
        if (retry.error) throw retry.error;
        courseData = retry.data as Course[];
      }
      setCategories(catRes.data || []);
      setTags(tagRes.data || []);
      setCourses(courseData || []);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setBusy("category");
    const { data, error } = await supabase.from("categories").insert([{ name: newCategoryName.trim(), slug: generateSlug(newCategoryName) }]).select().single();
    setBusy(null);
    if (error) return alert("Erro ao adicionar trilha: " + error.message);
    setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewCategoryName("");
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setBusy("tag");
    const { data, error } = await supabase.from("tags").insert([{ name: newTagName.trim().toUpperCase() }]).select("id, name, type").single();
    setBusy(null);
    if (error) return alert("Erro ao adicionar setor: " + error.message);
    setTags((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewTagName("");
  };

  const handleDeleteCourse = async (course: Course) => {
    if (!window.confirm(`Excluir o curso "${course.title}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await supabase.from("course_tags").delete().eq("course_id", course.id);
      const { error } = await supabase.from("courses").delete().eq("id", course.id);
      if (error) throw error;
      setCourses((prev) => prev.filter((c) => c.id !== course.id));
    } catch {
      alert("Erro ao excluir curso. Verifique se ele ainda tem aulas ou matrículas.");
    }
  };

  const createTag = async (name: string): Promise<TagOption | null> => {
    const { data, error } = await supabase.from("tags").insert([{ name: name.toUpperCase() }]).select("id, name, type").single();
    if (error || !data) { setNotice({ tone: "danger", text: "Não foi possível criar o setor." }); return null; }
    setTags((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  };

  const openSectors = (course: Course) => {
    setSectorsCourse(course);
    setSectorIds((course.course_tags || []).map((ct) => ct.tag_id));
  };

  const saveSectors = async () => {
    if (!sectorsCourse) return;
    setSavingSectors(true);
    try {
      const { error: delError } = await supabase.from("course_tags").delete().eq("course_id", sectorsCourse.id);
      if (delError) throw delError;
      if (sectorIds.length) {
        const { error: insError } = await supabase.from("course_tags").insert(sectorIds.map((tag_id) => ({ course_id: sectorsCourse.id, tag_id })));
        if (insError) throw insError;
      }
      const newTags = sectorIds.map((id) => ({ tag_id: id, tags: { name: tags.find((t) => t.id === id)?.name || "" } }));
      setCourses((prev) => prev.map((c) => (c.id === sectorsCourse.id ? { ...c, course_tags: newTags } : c)));
      setNotice({ tone: "success", text: `Setores de "${sectorsCourse.title}" atualizados.` });
      setSectorsCourse(null);
    } catch (e: any) {
      setNotice({ tone: "danger", text: "Não foi possível salvar os setores: " + (e?.message || "") });
    } finally {
      setSavingSectors(false);
    }
  };

  // Duplica curso, setores e aulas (sem progresso dos alunos)
  const duplicateCourse = async (course: Course) => {
    if (!window.confirm(`Criar uma cópia de "${course.title}" com as mesmas aulas e setores?`)) return;
    setBusy(`dup-${course.id}`);
    try {
      const { data: full, error: fullError } = await supabase.from("courses").select("*").eq("id", course.id).single();
      if (fullError) throw fullError;
      const { id: _id, createdAt: _c, updatedAt: _u, slug: _s, ...rest } = full as any;
      const title = `${course.title} (cópia)`;
      const { data: copy, error: copyError } = await supabase
        .from("courses")
        .insert([{ ...rest, title, slug: `${generateSlug(title)}-${Date.now().toString(36)}`, updatedAt: new Date().toISOString() }])
        .select()
        .single();
      if (copyError) throw copyError;

      const tagIds = (course.course_tags || []).map((ct) => ct.tag_id);
      if (tagIds.length) await supabase.from("course_tags").insert(tagIds.map((tag_id) => ({ course_id: copy.id, tag_id })));

      const { data: lessons } = await supabase.from("lessons").select("title, videoUrl, content, duration, order").eq("course_id", course.id);
      if (lessons?.length) {
        const { error: lessonsError } = await supabase.from("lessons").insert(lessons.map((l) => ({ ...l, course_id: copy.id })));
        if (lessonsError) throw lessonsError;
      }
      setNotice({ tone: "success", text: `Cópia criada: "${title}".` });
      await fetchData();
    } catch (e: any) {
      setNotice({ tone: "danger", text: "Não foi possível duplicar: " + (e?.message || "") });
    } finally {
      setBusy(null);
    }
  };

  const actionsFor = (course: Course): ActionItem[] => [
    { label: "Editar curso", icon: <Pencil size={15} />, onSelect: () => navigate(`/admin/cursos/${course.id}`) },
    { label: "Setores e acesso", icon: <Shield size={15} />, onSelect: () => openSectors(course) },
    { label: busy === `dup-${course.id}` ? "Duplicando..." : "Duplicar", icon: <Copy size={15} />, onSelect: () => duplicateCourse(course), disabled: !!busy },
    { label: "Ver como aluno", icon: <Eye size={15} />, onSelect: () => window.open(`/curso/${course.slug}`, "_blank") },
    { label: "Excluir", icon: <Trash2 size={15} />, onSelect: () => handleDeleteCourse(course), danger: true },
  ];

  const renderSectors = (course: Course) => {
    const courseTags = course.course_tags || [];
    if (!courseTags.length) return <span className="ui-badge ui-badge--warning">Sem setor</span>;
    return (
      <div className="adm-chips">
        {courseTags.slice(0, 2).map((ct) => <span key={ct.tag_id} className="ui-badge ui-badge--neutral">{ct.tags?.name}</span>)}
        {courseTags.length > 2 && (
          <button type="button" className="ui-badge ui-badge--neutral" style={{ cursor: "pointer" }} title={courseTags.slice(2).map((ct) => ct.tags?.name).join(", ")} onClick={(e) => { e.stopPropagation(); openSectors(course); }}>
            +{courseTags.length - 2}
          </button>
        )}
      </div>
    );
  };

  const hasFilters = !!searchTerm || categoryFilter !== "all" || tagFilter.length > 0;
  const clearFilters = () => { setSearchTerm(""); setCategoryFilter("all"); setTagFilter([]); };

  const filteredCourses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return courses.filter((c) => {
      const matchesSearch = !term || c.title?.toLowerCase().includes(term) || c.description?.toLowerCase().includes(term);
      const matchesCategory = categoryFilter === "all" || (categoryFilter === "none" ? !c.category_id : c.category_id?.toString() === categoryFilter);
      const matchesTag = !tagFilter.length || c.course_tags?.some((ct) => ct.tag_id === tagFilter[0]);
      return matchesSearch && matchesCategory && matchesTag;
    });
  }, [courses, searchTerm, categoryFilter, tagFilter]);

  const coursesPerCategory = (catId: number) => courses.filter((c) => c.category_id === catId).length;
  const filteredTags = tags.filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase()));
  const totalLessons = courses.reduce((s, c) => s + (c.lessons?.[0]?.count || 0), 0);

  return (
    <div className="ui-shell">
      <SEO title="Cursos e trilhas" />
      <Sidebar />
      <main className="ui-main">
        <div className="ui-main__inner">
          <PageHeader
            eyebrow="Gestão"
            title="Cursos e trilhas"
            subtitle="Crie cursos, organize as aulas e defina quais setores têm acesso."
            actions={<Button onClick={() => setWizardOpen(true)} icon={<Plus size={16} />}>Novo curso</Button>}
          />

          <div className="adm-stats">
            <div className="ui-card adm-stat"><span className="adm-stat__icon"><BookOpen size={18} /></span><div><strong>{courses.length}</strong><span>cursos</span></div></div>
            <div className="ui-card adm-stat"><span className="adm-stat__icon"><Video size={18} /></span><div><strong>{totalLessons}</strong><span>aulas</span></div></div>
            <div className="ui-card adm-stat"><span className="adm-stat__icon"><Layers size={18} /></span><div><strong>{categories.length}</strong><span>trilhas</span></div></div>
            <div className="ui-card adm-stat"><span className="adm-stat__icon"><TagIcon size={18} /></span><div><strong>{tags.length}</strong><span>setores</span></div></div>
          </div>

          <div className="ui-tabs" role="tablist" style={{ marginBottom: 20 }}>
            <button role="tab" className="ui-tab" aria-selected={tab === "cursos"} onClick={() => setTab("cursos")}><BookOpen size={14} /> Cursos</button>
            <button role="tab" className="ui-tab" aria-selected={tab === "catalogo"} onClick={() => setTab("catalogo")}><Layers size={14} /> Trilhas e setores</button>
          </div>

          {notice && <div className={`ui-alert ui-alert--${notice.tone}`} role="status" style={{ marginBottom: 16 }}>{notice.text}</div>}

          {tab === "cursos" ? (
            <>
              <div className="adm-toolbar">
                <div className="ui-input-group">
                  <Search size={16} />
                  <input type="search" className="ui-input" placeholder="Buscar por título ou descrição" aria-label="Buscar cursos" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <Select
                  aria-label="Filtrar por trilha"
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  minWidth={190}
                  options={[
                    { value: "all", label: "Todas as trilhas", icon: <Layers size={15} /> },
                    { value: "none", label: "Sem trilha" },
                    ...categories.map((cat) => ({ value: String(cat.id), label: cat.name })),
                  ]}
                />
                <TagPicker id="filter-tag" options={tags} value={tagFilter} onChange={setTagFilter} single placeholder="Filtrar por setor" />
                {hasFilters && (
                  <>
                    <span className="adm-filter-count">{filteredCourses.length} de {courses.length}</span>
                    <Button variant="ghost" size="sm" onClick={clearFilters} icon={<X size={14} />}>Limpar</Button>
                  </>
                )}
                <div className="ui-tabs adm-view-toggle" role="radiogroup" aria-label="Visualização" style={{ marginLeft: "auto" }}>
                  <button type="button" role="radio" className="ui-tab" aria-checked={view === "table"} onClick={() => setView("table")} title="Tabela"><List size={15} /><span className="sr-only">Tabela</span></button>
                  <button type="button" role="radio" className="ui-tab" aria-checked={view === "grid"} onClick={() => setView("grid")} title="Cartões"><LayoutGrid size={15} /><span className="sr-only">Cartões</span></button>
                </div>
              </div>

              {!loading && filteredCourses.length > 0 && view === "grid" ? (
                <div className="ac-grid">
                  {filteredCourses.map((course) => {
                    const lessonCount = course.lessons?.[0]?.count || 0;
                    return (
                      <article key={course.id} className="ui-card ac-card">
                        <div className="ac-card__thumb">
                          <CourseThumb src={course.thumbnailUrl} title={course.title} category={course.categories?.name} />
                          <div className="ac-card__menu"><ActionMenu items={actionsFor(course)} label={`Mais ações para ${course.title}`} /></div>
                        </div>
                        <div className="ac-card__body">
                          <h3 className="ac-card__title" title={course.title}>{course.title}</h3>
                          <div className="ac-card__meta">
                            <span><Layers size={13} /> {course.categories?.name || "Sem trilha"}</span>
                            <span><Video size={13} /> {lessonCount} aulas</span>
                            <span>XP {course.xp_weight || 1}x</span>
                          </div>
                          {renderSectors(course)}
                          <div className="ac-card__foot">
                            <Button block size="sm" variant="secondary" onClick={() => navigate(`/admin/cursos/${course.id}#aulas`)} icon={<Video size={14} />}>Gerenciar aulas</Button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
              <div className="ui-card adm-table-wrap">
                {loading ? (
                  <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                    {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={48} />)}
                  </div>
                ) : filteredCourses.length === 0 ? (
                  <div style={{ padding: 16 }}>
                    <EmptyState
                      icon={<BookOpen size={28} />}
                      title={courses.length ? "Nenhum curso encontrado" : "Nenhum curso cadastrado"}
                      description={courses.length ? "Ajuste a busca ou os filtros." : "Crie o primeiro curso para começar."}
                      action={courses.length
                        ? <Button variant="secondary" onClick={clearFilters}>Limpar filtros</Button>
                        : <Button onClick={() => setWizardOpen(true)} icon={<Plus size={16} />}>Novo curso</Button>}
                    />
                  </div>
                ) : (
                  <table className="adm-table">
                    <thead>
                      <tr><th>Curso</th><th>Trilha</th><th>Setores</th><th>Aulas</th><th>XP</th><th style={{ textAlign: "right" }}>Ações</th></tr>
                    </thead>
                    <tbody>
                      {filteredCourses.map((course) => {
                        const lessonCount = course.lessons?.[0]?.count || 0;
                        return (
                          <tr key={course.id} className="is-clickable" onClick={() => navigate(`/admin/cursos/${course.id}`)}>
                            <td>
                              <div className="adm-cell-main">
                                <CourseThumb src={course.thumbnailUrl} title={course.title} category={course.categories?.name} className="adm-thumb" />
                                <div style={{ minWidth: 0 }}>
                                  <strong>{course.title}</strong>
                                  <small>{course.description}</small>
                                </div>
                              </div>
                            </td>
                            <td data-label="Trilha">{course.categories?.name || <span className="ui-hint">Sem trilha</span>}</td>
                            <td data-label="Setores">{renderSectors(course)}</td>
                            <td data-label="Aulas">{lessonCount ? lessonCount : <span className="ui-badge ui-badge--warning">0</span>}</td>
                            <td data-label="XP">{course.xp_weight || 1}x</td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <div className="adm-actions" style={{ alignItems: "center", gap: 6 }}>
                                <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/cursos/${course.id}#aulas`)} icon={<Video size={14} />}>Gerenciar aulas</Button>
                                <ActionMenu items={actionsFor(course)} label={`Mais ações para ${course.title}`} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              )}
            </>
          ) : (
            <div className="ui-grid" style={{ ["--ui-grid-min" as any]: "340px", alignItems: "start" }}>
              <section className="ui-card ui-card--padded">
                <h2 className="ui-section__title" style={{ marginBottom: 4 }}><Layers size={18} /> Trilhas</h2>
                <p className="ui-hint" style={{ margin: "0 0 16px" }}>Agrupam os cursos no catálogo do aluno.</p>
                <form className="adm-toolbar" onSubmit={handleAddCategory}>
                  <input className="ui-input" style={{ flex: 1 }} placeholder="Nova trilha (ex.: Vendas)" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} aria-label="Nome da nova trilha" />
                  <Button type="submit" loading={busy === "category"} disabled={!newCategoryName.trim()} icon={<Plus size={16} />}>Adicionar</Button>
                </form>
                <ul className="adm-plain-list">
                  {categories.map((cat) => (
                    <li key={cat.id}>
                      <span>{cat.name}</span>
                      <span className="ui-hint">{coursesPerCategory(cat.id)} curso(s)</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="ui-card ui-card--padded">
                <h2 className="ui-section__title" style={{ marginBottom: 4 }}><TagIcon size={18} /> Setores</h2>
                <p className="ui-hint" style={{ margin: "0 0 16px" }}>Definem quem vê cada curso. O aluno acessa os cursos dos setores dele.</p>
                <form className="adm-toolbar" onSubmit={handleAddTag}>
                  <input className="ui-input" style={{ flex: 1 }} placeholder="Novo setor (ex.: COMERCIAL)" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} aria-label="Nome do novo setor" />
                  <Button type="submit" loading={busy === "tag"} disabled={!newTagName.trim()} icon={<Plus size={16} />}>Adicionar</Button>
                </form>
                <div className="ui-input-group" style={{ marginBottom: 12 }}>
                  <Search size={16} />
                  <input type="search" className="ui-input" placeholder={`Filtrar ${tags.length} setores`} value={tagSearch} onChange={(e) => setTagSearch(e.target.value)} aria-label="Filtrar setores" />
                </div>
                <div className="adm-chips" style={{ maxWidth: "none", maxHeight: 320, overflowY: "auto" }}>
                  {filteredTags.length ? filteredTags.map((t) => (
                    <span key={t.id} className="ui-badge ui-badge--neutral" title={t.type || undefined}>{t.name}</span>
                  )) : <span className="ui-hint">Nenhum setor encontrado.</span>}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      <CourseWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        categories={categories}
        tags={tags}
        onCreateTag={createTag}
        onCreated={(id) => { setWizardOpen(false); navigate(`/admin/cursos/${id}#aulas`); }}
      />

      <Drawer
        open={!!sectorsCourse}
        onClose={() => !savingSectors && setSectorsCourse(null)}
        title="Setores e acesso"
        subtitle={sectorsCourse?.title}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSectorsCourse(null)} disabled={savingSectors}>Cancelar</Button>
            <Button onClick={saveSectors} loading={savingSectors}>Salvar setores</Button>
          </>
        }
      >
        <div className="adm-form">
          <TagPicker id="quick-sectors" label="Setores com acesso" options={tags} value={sectorIds} onChange={setSectorIds} onCreate={createTag} placeholder="Buscar ou criar setor" inline listHeight="calc(100vh - 380px)" />
          {sectorIds.length === 0 && <div className="ui-alert">Sem setores, o curso não aparece para os alunos.</div>}
        </div>
      </Drawer>
    </div>
  );
};

export default AdminCourses;
