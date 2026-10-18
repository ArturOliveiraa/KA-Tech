import React, { useState, useEffect, useMemo, useCallback } from "react";
import { BookOpen, Download, Eye, GraduationCap, KeyRound, Search, Shield, ShieldCheck, UserCog, Users } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import SEO from "../components/SEO";
import { Button, EmptyState, PageHeader, Select, Skeleton } from "../components/ui";
import TagPicker, { TagOption } from "../components/admin/TagPicker";
import Drawer from "../components/admin/Drawer";

interface Profile {
  id: string;
  full_name: string;
  email?: string;
  role: string;
  avatar_url: string;
  created_at: string;
  total_xp: number;
  level: number;
  patent: string;
  equipe?: string | null;
  profile_tags?: { tags: { id: string; name: string; type: string } }[];
}

interface StudentHistory {
  enrolledCoursesCount: number;
  completedCoursesCount: number;
  lessonsWatchedCount: number;
  totalMinutesWatched: string;
  livesAttendedCount: number;
  enrolledList: string[];
  completedList: string[];
}

interface CourseAccess { id: number; title: string; course_tags: { tag_id: string }[]; }

const ROLES = [
  { value: "student", label: "Aluno", icon: GraduationCap },
  { value: "teacher", label: "Professor", icon: Shield },
  { value: "admin", label: "Administrador", icon: ShieldCheck },
];

const normalizeRole = (role?: string) => {
  const r = (role || "student").toLowerCase().trim();
  if (r === "aluno") return "student";
  if (r === "professor") return "teacher";
  return r;
};
const roleLabel = (role?: string) => ROLES.find((r) => r.value === normalizeRole(role))?.label || "Aluno";

const formatDate = (dateString: string) =>
  dateString ? new Date(dateString).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [courses, setCourses] = useState<CourseAccess[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [noSectorOnly, setNoSectorOnly] = useState(false);

  // Edição de acesso
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("student");
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Ficha do aluno
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<Profile | null>(null);
  const [studentHistory, setStudentHistory] = useState<StudentHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [profilesRes, profileTagsRes, tagsRes, coursesRes] = await Promise.all([
        supabase.from("admin_users_view").select("*").order("created_at", { ascending: false }),
        supabase.from("profile_tags").select("profile_id, tags(id, name, type)"),
        supabase.from("tags").select("id, name, type").order("name", { ascending: true }),
        supabase.from("courses").select("id, title, course_tags (tag_id)").order("title", { ascending: true }),
      ]);
      if (profilesRes.error) throw profilesRes.error;

      const usersWithTags = (profilesRes.data || []).map((user: any) => ({
        ...user,
        profile_tags: profileTagsRes.data?.filter((pt: any) => pt.profile_id === user.id) || [],
      }));
      setUsers(usersWithTags as unknown as Profile[]);
      setTags(tagsRes.data || []);
      setCourses((coursesRes.data as CourseAccess[]) || []);
    } catch (error) {
      console.error("Erro ao buscar dados do Supabase:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const userTagIds = (user: Profile) => (user.profile_tags || []).map((pt) => pt.tags?.id).filter(Boolean) as string[];

  const openEdit = (user: Profile) => {
    setEditingUser(user);
    setEditName(user.full_name || "");
    setEditRole(normalizeRole(user.role));
    setEditTagIds(userTagIds(user));
    setSaveError(null);
  };

  const handleSaveChanges = async () => {
    if (!editingUser) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const { error } = await supabase.from("profiles").update({ full_name: editName, role: editRole }).eq("id", editingUser.id);
      if (error) throw error;

      const current = userTagIds(editingUser);
      const toAdd = editTagIds.filter((t) => !current.includes(t));
      const toRemove = current.filter((t) => !editTagIds.includes(t));
      if (toRemove.length) {
        const { error: delError } = await supabase.from("profile_tags").delete().eq("profile_id", editingUser.id).in("tag_id", toRemove);
        if (delError) throw delError;
      }
      if (toAdd.length) {
        const { error: insError } = await supabase.from("profile_tags").insert(toAdd.map((tag_id) => ({ profile_id: editingUser.id, tag_id })));
        if (insError) throw insError;
      }

      const newProfileTags = editTagIds
        .map((tid) => tags.find((t) => t.id === tid))
        .filter(Boolean)
        .map((t) => ({ tags: { id: t!.id, name: t!.name, type: t!.type || "" } }));
      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? { ...u, full_name: editName, role: editRole, profile_tags: newProfileTags } : u)));
      setEditingUser(null);
      setNotice({ tone: "success", text: "Acesso atualizado." });
    } catch (error: any) {
      console.error("Erro ao salvar usuário:", error);
      setSaveError("Não foi possível salvar: " + (error?.message || "verifique suas permissões."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async (user: Profile) => {
    if (!user.email) return setNotice({ tone: "danger", text: "Esse usuário não tem e-mail cadastrado." });
    if (!window.confirm(`Enviar um link de redefinição de senha para ${user.email}?`)) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: window.location.origin + "/update-password" });
    setNotice(error
      ? { tone: "danger", text: "Não foi possível enviar o e-mail: " + error.message }
      : { tone: "success", text: `Link de redefinição enviado para ${user.email}.` });
  };

  const handleOpenHistory = async (user: Profile) => {
    setSelectedUserForHistory(user);
    setStudentHistory(null);
    setLoadingHistory(true);

    try {
      const { data: enrollments } = await supabase.from("course_enrollments").select("courseId").eq("userId", user.id);
      const courseIds = enrollments?.map((e: any) => e.courseId).filter(Boolean) || [];

      const { data: progressList } = await supabase.from("user_progress").select("course_id, lesson_id, last_time").eq("user_id", user.id);

      const completedCourseIds: number[] = [];
      if (courseIds.length > 0) {
        const { data: lessonsData } = await supabase.from("lessons").select("id, course_id").in("course_id", courseIds);

        const totalLessonsPerCourse: { [key: number]: number } = {};
        lessonsData?.forEach((l: any) => { totalLessonsPerCourse[l.course_id] = (totalLessonsPerCourse[l.course_id] || 0) + 1; });

        const watchedLessonsPerCourse: { [key: number]: Set<number> } = {};
        progressList?.forEach((p: any) => {
          if (p.course_id && p.lesson_id) {
            if (!watchedLessonsPerCourse[p.course_id]) watchedLessonsPerCourse[p.course_id] = new Set();
            watchedLessonsPerCourse[p.course_id].add(p.lesson_id);
          }
        });

        courseIds.forEach((courseId: number) => {
          const total = totalLessonsPerCourse[courseId] || 0;
          const watched = watchedLessonsPerCourse[courseId]?.size || 0;
          if (total > 0 && watched >= total) completedCourseIds.push(courseId);
        });
      }

      const activeCourseIds = courseIds.filter((id: number) => !completedCourseIds.includes(id));
      const titlesFor = async (ids: number[]) => {
        if (!ids.length) return [] as string[];
        const { data } = await supabase.from("courses").select("title").in("id", ids);
        return data?.map((c: any) => c.title) || [];
      };
      const [enrolledList, completedList] = await Promise.all([titlesFor(activeCourseIds), titlesFor(completedCourseIds)]);

      const lessonsProgress = progressList?.filter((p: any) => p.lesson_id !== null && p.lesson_id !== undefined) || [];
      const totalSeconds = lessonsProgress.reduce((acc: number, curr: any) => acc + (curr.last_time || 0), 0);

      const { data: livesData } = await supabase.from("live_attendance").select("id").eq("user_id", user.id);

      setStudentHistory({
        enrolledCoursesCount: enrolledList.length,
        completedCoursesCount: completedList.length,
        lessonsWatchedCount: lessonsProgress.length,
        totalMinutesWatched: (totalSeconds / 60).toFixed(1),
        livesAttendedCount: livesData?.length || 0,
        enrolledList,
        completedList,
      });
    } catch (error) {
      console.error("Erro ao buscar histórico do aluno:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const exportStudentPDF = () => {
    if (!selectedUserForHistory || !studentHistory) return;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text(`Ficha Acadêmica - ${selectedUserForHistory.full_name || "Aluno"}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`E-mail: ${selectedUserForHistory.email || "Não informado"}`, 14, 22);
    doc.text(`Patente: ${selectedUserForHistory.patent || "N/A"} | Nível: ${selectedUserForHistory.level || 1} | XP Total: ${(selectedUserForHistory.total_xp || 0).toLocaleString("pt-BR")}`, 14, 28);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 34);

    doc.setFontSize(12);
    doc.text("Resumo de Atividades:", 14, 44);

    autoTable(doc, {
      startY: 48,
      head: [["Métrica", "Resultado"]],
      body: [
        ["Cursos Matriculados", studentHistory.enrolledCoursesCount.toString()],
        ["Cursos Concluídos", studentHistory.completedCoursesCount.toString()],
        ["Aulas Assistidas", studentHistory.lessonsWatchedCount.toString()],
        ["Tempo Total Assistido", `${studentHistory.totalMinutesWatched} min`],
        ["Lives Assistidas", studentHistory.livesAttendedCount.toString()],
      ],
      theme: "grid",
      headStyles: { fillColor: [109, 40, 217] },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text("Cursos Matriculados:", 14, finalY);
    autoTable(doc, {
      startY: finalY + 4,
      head: [["Título do Curso"]],
      body: studentHistory.enrolledList.length > 0 ? studentHistory.enrolledList.map((c) => [c]) : [["Nenhum curso matriculado"]],
      theme: "grid",
      headStyles: { fillColor: [55, 65, 81] },
    });

    doc.save(`Ficha_${selectedUserForHistory.full_name || "Aluno"}.pdf`);
  };

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !term || user.full_name?.toLowerCase().includes(term) || user.email?.toLowerCase().includes(term);
      const matchesRole = roleFilter === "all" || normalizeRole(user.role) === roleFilter;
      const ids = userTagIds(user);
      const matchesTag = !tagFilter.length || ids.includes(tagFilter[0]);
      const matchesNoSector = !noSectorOnly || ids.length === 0;
      return matchesSearch && matchesRole && matchesTag && matchesNoSector;
    });
  }, [users, searchTerm, roleFilter, tagFilter, noSectorOnly]);

  const counts = useMemo(() => ({
    total: users.length,
    students: users.filter((u) => normalizeRole(u.role) === "student").length,
    staff: users.filter((u) => ["teacher", "admin"].includes(normalizeRole(u.role))).length,
    noSector: users.filter((u) => userTagIds(u).length === 0).length,
  }), [users]);

  // Cursos que os setores escolhidos liberam (prévia do acesso)
  const accessibleCourses = useMemo(
    () => courses.filter((c) => c.course_tags?.some((ct) => editTagIds.includes(ct.tag_id))),
    [courses, editTagIds]
  );

  const clearFilters = () => { setSearchTerm(""); setRoleFilter("all"); setTagFilter([]); setNoSectorOnly(false); };

  return (
    <div className="ui-shell">
      <SEO title="Usuários" />
      <Sidebar />
      <main className="ui-main">
        <div className="ui-main__inner">
          <PageHeader eyebrow="Gestão" title="Usuários" subtitle="Encontre pessoas, ajuste cargos e defina a quais setores cada uma tem acesso." />

          <div className="adm-stats">
            <div className="ui-card adm-stat"><span className="adm-stat__icon"><Users size={18} /></span><div><strong>{counts.total}</strong><span>usuários</span></div></div>
            <div className="ui-card adm-stat"><span className="adm-stat__icon"><GraduationCap size={18} /></span><div><strong>{counts.students}</strong><span>alunos</span></div></div>
            <div className="ui-card adm-stat"><span className="adm-stat__icon"><ShieldCheck size={18} /></span><div><strong>{counts.staff}</strong><span>professores e admins</span></div></div>
            <button type="button" className="ui-card ui-card--interactive adm-stat" onClick={() => setNoSectorOnly((v) => !v)} aria-pressed={noSectorOnly} title="Mostrar só quem está sem setor">
              <span className="adm-stat__icon" style={{ background: "var(--color-warning-soft)", color: "var(--color-warning-text)" }}><UserCog size={18} /></span>
              <div style={{ textAlign: "left" }}><strong>{counts.noSector}</strong><span>{noSectorOnly ? "filtrando sem setor" : "sem setor"}</span></div>
            </button>
          </div>

          {notice && <div className={`ui-alert ui-alert--${notice.tone}`} role="status" style={{ marginBottom: 16 }}>{notice.text}</div>}

          <div className="adm-toolbar">
            <div className="ui-input-group">
              <Search size={16} />
              <input type="search" className="ui-input" placeholder="Buscar por nome ou e-mail" aria-label="Buscar usuários" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select
              aria-label="Filtrar por cargo"
              value={roleFilter}
              onChange={setRoleFilter}
              minWidth={190}
              options={[{ value: "all", label: "Todos os cargos", icon: <Users size={15} /> }, ...ROLES.map(({ value, label, icon: Icon }) => ({ value, label, icon: <Icon size={15} /> }))]}
            />
            <TagPicker id="users-tag-filter" options={tags} value={tagFilter} onChange={setTagFilter} single placeholder="Filtrar por setor" />
            {(searchTerm || roleFilter !== "all" || tagFilter.length > 0 || noSectorOnly) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar filtros</Button>
            )}
          </div>

          <div className="ui-card adm-table-wrap">
            {loading ? (
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={44} />)}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ padding: 16 }}>
                <EmptyState icon={<Users size={28} />} title="Nenhum usuário encontrado" description="Ajuste a busca ou os filtros." action={<Button variant="secondary" onClick={clearFilters}>Limpar filtros</Button>} />
              </div>
            ) : (
              <table className="adm-table">
                <thead>
                  <tr><th>Usuário</th><th>Cargo</th><th>Setores</th><th>Nível</th><th>XP</th><th>Cadastro</th><th style={{ textAlign: "right" }}>Ações</th></tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const role = normalizeRole(user.role);
                    const pts = user.profile_tags || [];
                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="adm-cell-main">
                            {user.avatar_url
                              ? <img src={user.avatar_url} alt="" className="us-avatar" />
                              : <span className="us-avatar" aria-hidden="true">{user.full_name ? user.full_name.charAt(0).toUpperCase() : "?"}</span>}
                            <div style={{ minWidth: 0 }}>
                              <strong>{user.full_name || "Sem nome"}</strong>
                              {user.email && <small>{user.email}</small>}
                            </div>
                          </div>
                        </td>
                        <td data-label="Cargo">
                          <span className={`ui-badge ${role === "admin" ? "" : role === "teacher" ? "ui-badge--success" : "ui-badge--neutral"}`}>{roleLabel(role)}</span>
                        </td>
                        <td data-label="Setores">
                          {pts.length ? (
                            <div className="adm-chips">
                              {pts.slice(0, 2).map((pt, idx) => <span key={idx} className="ui-badge ui-badge--neutral">{pt.tags?.name}</span>)}
                              {pts.length > 2 && <span className="ui-badge ui-badge--neutral" title={pts.slice(2).map((p) => p.tags?.name).join(", ")}>+{pts.length - 2}</span>}
                            </div>
                          ) : <span className="ui-badge ui-badge--warning">Sem setor</span>}
                        </td>
                        <td data-label="Nível">
                          <span style={{ color: "var(--color-text)", fontWeight: 600 }}>{user.patent || "—"}</span>
                          <span className="ui-hint" style={{ display: "block" }}>Nível {user.level || 1}</span>
                        </td>
                        <td data-label="XP" style={{ fontVariantNumeric: "tabular-nums" }}>{(user.total_xp || 0).toLocaleString("pt-BR")}</td>
                        <td data-label="Cadastro">{formatDate(user.created_at)}</td>
                        <td>
                          <div className="adm-actions">
                            <button className="sb-icon-btn" onClick={() => handleOpenHistory(user)} title="Ficha do aluno" aria-label={`Ficha de ${user.full_name}`}><Eye size={16} /></button>
                            <button className="sb-icon-btn" onClick={() => openEdit(user)} title="Cargo e acesso" aria-label={`Editar acesso de ${user.full_name}`}><UserCog size={16} /></button>
                            <button className="sb-icon-btn" onClick={() => handleResetPassword(user)} title="Enviar redefinição de senha" aria-label={`Redefinir senha de ${user.full_name}`}><KeyRound size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          {!loading && <p className="ui-hint" style={{ marginTop: 10 }}>Mostrando {filteredUsers.length} de {users.length} usuários.</p>}
        </div>
      </main>

      {/* Cargo e acesso */}
      <Drawer
        open={!!editingUser}
        onClose={() => !isSaving && setEditingUser(null)}
        title="Cargo e acesso"
        subtitle={editingUser?.email || editingUser?.full_name}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingUser(null)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSaveChanges} loading={isSaving}>Salvar alterações</Button>
          </>
        }
      >
        <div className="adm-form">
          <div className="ui-field">
            <label className="ui-label" htmlFor="u-name">Nome completo</label>
            <input id="u-name" className="ui-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>

          <div className="ui-field">
            <span className="ui-label">Cargo</span>
            <div className="ui-tabs" role="radiogroup" aria-label="Cargo" style={{ display: "flex" }}>
              {ROLES.map(({ value, label, icon: Icon }) => (
                <button key={value} type="button" role="radio" className="ui-tab" style={{ flex: 1, justifyContent: "center" }} aria-checked={editRole === value} onClick={() => setEditRole(value)}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
            <span className="ui-hint">
              {editRole === "admin" ? "Acesso total à gestão, inclusive usuários." : editRole === "teacher" ? "Gerencia cursos, aulas e lives." : "Assiste aos cursos dos setores abaixo."}
            </span>
          </div>

          <div className="ui-field">
            <TagPicker id="u-tags" label="Setores" options={tags} value={editTagIds} onChange={setEditTagIds} placeholder="Buscar setor ou região" inline listHeight={280} />
          </div>

          <div className="us-access-preview">
            <span className="ui-label" style={{ display: "flex", alignItems: "center", gap: 6 }}><BookOpen size={14} /> Cursos liberados por esses setores: {accessibleCourses.length}</span>
            {accessibleCourses.length ? (
              <ul>{accessibleCourses.map((c) => <li key={c.id}>{c.title}</li>)}</ul>
            ) : (
              <span className="ui-hint">Nenhum curso está ligado aos setores escolhidos.</span>
            )}
          </div>

          {saveError && <div className="ui-alert ui-alert--danger" role="alert">{saveError}</div>}
        </div>
      </Drawer>

      {/* Ficha do aluno */}
      <Drawer
        open={!!selectedUserForHistory}
        onClose={() => setSelectedUserForHistory(null)}
        title="Ficha do aluno"
        subtitle={selectedUserForHistory?.full_name}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelectedUserForHistory(null)}>Fechar</Button>
            <Button variant="secondary" onClick={exportStudentPDF} disabled={loadingHistory || !studentHistory} icon={<Download size={16} />}>Exportar PDF</Button>
          </>
        }
      >
        {loadingHistory ? (
          <div className="ui-loading-inline"><div className="ui-spinner" /> Carregando ficha...</div>
        ) : studentHistory ? (
          <div className="adm-form">
            <div className="us-history-grid">
              <div className="ui-card"><strong>{studentHistory.enrolledCoursesCount}</strong><span>em andamento</span></div>
              <div className="ui-card"><strong style={{ color: "var(--color-success-text)" }}>{studentHistory.completedCoursesCount}</strong><span>concluídos</span></div>
              <div className="ui-card"><strong>{studentHistory.lessonsWatchedCount}</strong><span>aulas assistidas</span></div>
              <div className="ui-card"><strong>{studentHistory.totalMinutesWatched}</strong><span>minutos assistidos</span></div>
              <div className="ui-card" style={{ gridColumn: "span 2" }}><strong>{studentHistory.livesAttendedCount}</strong><span>lives assistidas</span></div>
            </div>
            <div>
              <p className="adm-section-label">Em andamento</p>
              {studentHistory.enrolledList.length ? <ul className="us-list">{studentHistory.enrolledList.map((c, i) => <li key={i}>{c}</li>)}</ul> : <span className="ui-hint">Nenhum curso em andamento.</span>}
            </div>
            <div>
              <p className="adm-section-label">Concluídos</p>
              {studentHistory.completedList.length ? <ul className="us-list">{studentHistory.completedList.map((c, i) => <li key={i}>{c}</li>)}</ul> : <span className="ui-hint">Nenhum curso concluído ainda.</span>}
            </div>
          </div>
        ) : (
          <div className="ui-alert ui-alert--danger">Não foi possível carregar a ficha.</div>
        )}
      </Drawer>
    </div>
  );
};

export default AdminUsers;
