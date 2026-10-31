import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BookOpen, CheckCircle2, FileDown, FileSpreadsheet, Layers, LineChart, Radio, Tag as TagIcon, Users } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import SEO from "../components/SEO";
import Avatar from "../components/Avatar";
import { useTheme } from "../components/ThemeContext";
import { Button, EmptyState, PageHeader, Select, Skeleton, useToast } from "../components/ui";

interface PlatformStats { totalStudents: number; totalCourses: number; totalLessonsFinished: number }
interface TagData { name: string; alunos: number }
interface Course { id: number; title: string }
interface Live { id: string; title: string; scheduled_at: string }
interface Tag { id: string; name: string }

interface Student {
  userId: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  /** Curso: aulas concluídas / aulas publicadas */
  done_lessons?: number;
  is_completed?: boolean;
  /** Live: minutos assistidos e último sinal */
  minutes_watched?: number;
  last_seen_at?: string;
}

type ReportType = "COURSE" | "LIVE";

const ROLE_LABEL: Record<string, string> = { admin: "Admin", teacher: "Instrutor", professor: "Instrutor", student: "Aluno", aluno: "Aluno" };
const roleLabel = (r: string) => ROLE_LABEL[(r || "").toLowerCase()] ?? (r || "Aluno");

const formatWatchTime = (minutes: number) => {
  if (!minutes) return "0 min";
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h > 0 ? `${h}h ${m}min` : `${m} min`;
};

/** Cor de um token do tema (os gráficos do Recharts não leem var() do CSS). */
const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";

const getBase64ImageFromUrl = async (imageUrl: string): Promise<string | null> => {
  try {
    const blob = await (await fetch(imageUrl)).blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

/** Progresso dos alunos por curso e presença nas lives, com exportação. */
export default function Reports() {
  const toast = useToast();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<ReportType>("COURSE");
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const [platformStats, setPlatformStats] = useState<PlatformStats>({ totalStudents: 0, totalCourses: 0, totalLessonsFinished: 0 });
  const [tagPopularity, setTagPopularity] = useState<TagData[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lives, setLives] = useState<Live[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedLiveId, setSelectedLiveId] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [courseLessons, setCourseLessons] = useState(0);

  const [tableData, setTableData] = useState<Student[]>([]);
  const [absentTags, setAbsentTags] = useState<string[]>([]);
  const [loadingFilter, setLoadingFilter] = useState(false);

  // Cores dos gráficos, relidas quando o tema muda
  const colors = useMemo(() => ({
    primary: cssVar("--color-primary"),
    success: cssVar("--color-success"),
    muted: cssVar("--color-text-muted"),
    track: cssVar("--color-surface-3"),
    grid: cssVar("--color-border"),
  }), [theme]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    (async () => {
      try {
        const [profilesRes, coursesRes, progressRes, listCoursesRes, listLivesRes, listTagsRes, tagPopRes] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("courses").select("id", { count: "exact", head: true }),
          supabase.from("user_progress").select("id", { count: "exact", head: true }).eq("is_completed", true),
          supabase.from("courses").select("id, title").order("title"),
          supabase.from("lives").select("id, title, scheduled_at").order("scheduled_at", { ascending: false }),
          supabase.from("tags").select("id, name").order("name"),
          supabase.from("tag_popularity_report").select("*").limit(6),
        ]);
        setPlatformStats({
          totalStudents: profilesRes.count || 0,
          totalCourses: coursesRes.count || 0,
          totalLessonsFinished: progressRes.count || 0,
        });
        setCourses(listCoursesRes.data || []);
        setLives(listLivesRes.data || []);
        setTags(listTagsRes.data || []);
        setTagPopularity((tagPopRes.data || []).map((t: any) => ({ name: t.tag_name, alunos: t.total_enrollments })));
      } catch (e) {
        console.error("Relatórios", e);
        toast.error("Não foi possível carregar os relatórios.");
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  /** Setores sem nenhum aluno no recorte atual. */
  const calculateAbsentTags = async (userIds: string[]) => {
    if (!userIds.length) return setAbsentTags(tags.map((t) => t.name));
    const { data } = await supabase.from("profile_tags").select("tag_id").in("profile_id", userIds);
    const present = new Set((data || []).map((t: any) => t.tag_id));
    setAbsentTags(tags.filter((t) => !present.has(t.id)).map((t) => t.name));
  };

  const applyCourse = async (courseId: string) => {
    setSelectedCourseId(courseId);
    setTableData([]);
    setAbsentTags([]);
    if (!courseId) return;
    setLoadingFilter(true);
    const id = Number(courseId);
    const [enrollRes, progressRes, lessonsRes] = await Promise.all([
      supabase.from("course_enrollments").select("userId, profiles:userId (full_name, role, avatar_url)").eq("courseId", id),
      supabase.from("user_progress").select("user_id, lesson_id, is_completed").eq("course_id", id).eq("is_completed", true),
      supabase.from("lessons").select("id", { count: "exact", head: true }).eq("course_id", id).eq("status", "published"),
    ]);
    const total = lessonsRes.count || 0;
    setCourseLessons(total);
    // Aulas concluídas por aluno (antes valia só a última linha de progresso de cada um)
    const done = new Map<string, Set<number>>();
    for (const p of progressRes.data || []) {
      if (!done.has(p.user_id)) done.set(p.user_id, new Set());
      done.get(p.user_id)!.add(p.lesson_id);
    }
    const students: Student[] = (enrollRes.data || [])
      .filter((item: any) => item.profiles)
      .map((item: any) => {
        const n = done.get(item.userId)?.size || 0;
        return {
          userId: item.userId,
          full_name: item.profiles.full_name,
          role: item.profiles.role,
          avatar_url: item.profiles.avatar_url,
          done_lessons: n,
          is_completed: total > 0 && n >= total,
        };
      })
      .sort((a, b) => (b.done_lessons || 0) - (a.done_lessons || 0));
    setTableData(students);
    await calculateAbsentTags(students.map((s) => s.userId));
    setLoadingFilter(false);
  };

  const applyLive = async (liveId: string, tagId = "") => {
    setSelectedLiveId(liveId);
    setSelectedTag(tagId);
    setTableData([]);
    setAbsentTags([]);
    if (!liveId) return;
    setLoadingFilter(true);

    let query = supabase.from("live_attendance").select("minutes_watched, last_seen_at, user_id, profiles:user_id (full_name, role, avatar_url)").eq("live_id", liveId);
    if (tagId) {
      const { data: tagged } = await supabase.from("profile_tags").select("profile_id").eq("tag_id", tagId);
      const ids = (tagged || []).map((u: any) => u.profile_id);
      if (!ids.length) {
        setAbsentTags(tags.map((t) => t.name));
        setLoadingFilter(false);
        return;
      }
      query = query.in("user_id", ids);
    }
    const { data } = await query;
    const students: Student[] = (data || [])
      .filter((item: any) => item.profiles)
      .map((item: any) => ({
        userId: item.user_id,
        full_name: item.profiles.full_name,
        role: item.profiles.role,
        avatar_url: item.profiles.avatar_url,
        minutes_watched: item.minutes_watched,
        last_seen_at: item.last_seen_at,
      }))
      .sort((a, b) => (b.minutes_watched || 0) - (a.minutes_watched || 0));
    setTableData(students);
    await calculateAbsentTags(students.map((s) => s.userId));
    setLoadingFilter(false);
  };

  const switchType = (type: ReportType) => {
    setReportType(type);
    setTableData([]);
    setAbsentTags([]);
  };

  const isLive = reportType === "LIVE";
  const totalStudents = tableData.length;
  const totalMinutes = useMemo(() => tableData.reduce((acc, s) => acc + (s.minutes_watched || 0), 0), [tableData]);
  const avgMinutes = totalStudents ? Math.floor(totalMinutes / totalStudents) : 0;
  const completed = tableData.filter((s) => s.is_completed).length;
  const completionRate = totalStudents ? Math.round((completed / totalStudents) * 100) : 0;

  const contextTitle = isLive
    ? lives.find((l) => l.id === selectedLiveId)?.title || "Relatório da live"
    : courses.find((c) => c.id === Number(selectedCourseId))?.title || "Relatório do curso";
  const contextFilter = isLive ? `Setor: ${tags.find((t) => t.id === selectedTag)?.name || "todos"}` : "Progresso no curso";

  const generateExcel = () => {
    const header = [
      ["RELATÓRIO - KA ACADEMY"],
      ["Gerado em:", new Date().toLocaleString("pt-BR")],
      ["Contexto:", contextTitle],
      ["Filtro:", contextFilter],
      [""],
      [isLive ? "Espectadores:" : "Alunos matriculados:", totalStudents],
      ...(isLive ? [["Tempo total:", formatWatchTime(totalMinutes)], ["Tempo médio por aluno:", formatWatchTime(avgMinutes)]] : [["Concluíram o curso:", `${completed} (${completionRate}%)`]]),
      [""],
      ["Setores sem ninguém:", absentTags.join(", ") || "Nenhum"],
      [""],
    ];
    const body = isLive
      ? [["Aluno", "Perfil", "Minutos", "Tempo", "Último sinal"], ...tableData.map((s) => [s.full_name, roleLabel(s.role), s.minutes_watched || 0, formatWatchTime(s.minutes_watched || 0), s.last_seen_at ? new Date(s.last_seen_at).toLocaleString("pt-BR") : "-"])]
      : [["Aluno", "Perfil", "Aulas concluídas", "Situação"], ...tableData.map((s) => [s.full_name, roleLabel(s.role), `${s.done_lessons || 0} de ${courseLessons}`, s.is_completed ? "Concluído" : "Cursando"])];
    const sheet = XLSX.utils.aoa_to_sheet([...header, ...body]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Dados");
    XLSX.writeFile(book, `KA_${contextTitle.replace(/\s+/g, "_")}.xlsx`);
  };

  const generatePdf = async () => {
    setGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      const avatars: Record<number, string> = {};
      await Promise.all(tableData.map(async (s, i) => {
        if (s.avatar_url) {
          const img = await getBase64ImageFromUrl(s.avatar_url);
          if (img) avatars[i] = img;
        }
      }));

      doc.setFillColor(24, 24, 27); doc.rect(0, 0, 210, 50, "F");
      doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.text("KA ACADEMY", 14, 20);
      doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(isLive ? "PRESENÇA NA LIVE" : "PROGRESSO NO CURSO", 14, 27);
      doc.setTextColor(163, 163, 171); doc.text(new Date().toLocaleDateString("pt-BR"), 195, 20, { align: "right" });
      doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(167, 139, 250); doc.text(contextTitle.toUpperCase(), 14, 40);
      doc.setFontSize(10); doc.setTextColor(163, 163, 171); doc.text(contextFilter, 14, 46);

      doc.setFillColor(244, 244, 245); doc.roundedRect(14, 52, 182, 18, 2, 2, "F");
      doc.setFont("helvetica", "bold"); doc.setTextColor(24, 24, 27); doc.setFontSize(10);
      doc.text(`${isLive ? "Espectadores" : "Alunos"}: ${totalStudents}`, 20, 63);
      if (isLive) {
        doc.text(`Tempo total: ${formatWatchTime(totalMinutes)}`, 80, 63);
        doc.text(`Média por aluno: ${formatWatchTime(avgMinutes)}`, 145, 63);
      } else {
        doc.text(`Concluíram: ${completed} (${completionRate}%)`, 120, 63);
      }

      let startY = 80;
      if (absentTags.length) {
        doc.setFontSize(9); doc.setTextColor(200, 30, 30); doc.text("SETORES SEM NINGUÉM:", 14, 76);
        doc.setFont("helvetica", "normal"); doc.setTextColor(85, 85, 95);
        const lines = doc.splitTextToSize(absentTags.join(", "), 180);
        doc.text(lines, 14, 82);
        startY = 85 + lines.length * 4;
      }

      autoTable(doc, {
        startY,
        head: isLive ? [["Foto", "Aluno", "Perfil", "Tempo", "Último sinal"]] : [["Foto", "Aluno", "Perfil", "Aulas", "Situação"]],
        body: tableData.map((s) => isLive
          ? ["", s.full_name, roleLabel(s.role), formatWatchTime(s.minutes_watched || 0), s.last_seen_at ? new Date(s.last_seen_at).toLocaleTimeString("pt-BR").slice(0, 5) : "-"]
          : ["", s.full_name, roleLabel(s.role), `${s.done_lessons || 0}/${courseLessons}`, s.is_completed ? "Concluído" : "Cursando"]),
        headStyles: { fillColor: [24, 24, 27], textColor: [255, 255, 255], fontStyle: "bold" },
        bodyStyles: { minCellHeight: 15, valign: "middle", fontSize: 9 },
        columnStyles: { 0: { cellWidth: 15 } },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 0 && avatars[data.row.index]) {
            doc.addImage(avatars[data.row.index], "JPEG", data.cell.x + 2, data.cell.y + 2, 10, 10);
          }
        },
      });
      doc.save(`KA_${contextTitle.replace(/\s+/g, "_")}.pdf`);
    } catch (e) {
      console.error("PDF", e);
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const pieData = [
    { name: "Concluíram", value: completed },
    { name: "Cursando", value: Math.max(0, totalStudents - completed) },
  ];
  const tooltipStyle = { backgroundColor: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-text)" };
  const hasSelection = isLive ? !!selectedLiveId : !!selectedCourseId;

  return (
    <div className="ui-shell">
      <SEO title="Progresso e presença" description="Relatórios de progresso nos cursos e presença nas lives." />
      <Sidebar />
      <main className="ui-main">
        <div className="ui-main__inner">
          <PageHeader
            eyebrow="Gestão"
            title="Progresso e presença"
            subtitle="Escolha um curso para ver quem concluiu, ou uma live para ver quem assistiu e por quanto tempo."
            actions={
              <>
                <Button variant="secondary" onClick={generatePdf} loading={generatingPdf} disabled={!tableData.length} icon={<FileDown size={15} />}>PDF</Button>
                <Button variant="secondary" onClick={generateExcel} disabled={!tableData.length} icon={<FileSpreadsheet size={15} />}>Excel</Button>
              </>
            }
          />

          <div className="adm-stats">
            {loading ? [0, 1, 2].map((i) => <Skeleton key={i} height={76} radius={16} />) : (
              <>
                <div className="ui-card adm-stat"><span className="adm-stat__icon"><Users size={18} /></span><div><strong>{platformStats.totalStudents.toLocaleString("pt-BR")}</strong><span>pessoas cadastradas</span></div></div>
                <div className="ui-card adm-stat"><span className="adm-stat__icon"><Layers size={18} /></span><div><strong>{platformStats.totalCourses}</strong><span>cursos</span></div></div>
                <div className="ui-card adm-stat"><span className="adm-stat__icon" style={{ background: "var(--color-success-soft)", color: "var(--color-success-text)" }}><CheckCircle2 size={18} /></span><div><strong>{platformStats.totalLessonsFinished.toLocaleString("pt-BR")}</strong><span>aulas concluídas</span></div></div>
              </>
            )}
          </div>

          <div className="rp-grid">
            <section className="ui-card ui-card--padded rp-main" aria-labelledby="rp-title">
              <div className="rp-main__head">
                <h2 id="rp-title" className="ui-section__title"><LineChart size={18} /> Relatório</h2>
                <div className="ui-tabs" role="tablist">
                  <button role="tab" className="ui-tab" aria-selected={!isLive} onClick={() => switchType("COURSE")}><BookOpen size={14} /> Progresso no curso</button>
                  <button role="tab" className="ui-tab" aria-selected={isLive} onClick={() => switchType("LIVE")}><Radio size={14} /> Presença na live</button>
                </div>
              </div>

              <div className="adm-toolbar">
                {!isLive ? (
                  <Select
                    aria-label="Curso"
                    value={selectedCourseId}
                    onChange={applyCourse}
                    placeholder="Escolha um curso"
                    minWidth={280}
                    disabled={loadingFilter}
                    options={courses.map((c) => ({ value: String(c.id), label: c.title }))}
                  />
                ) : (
                  <>
                    <Select
                      aria-label="Live"
                      value={selectedLiveId}
                      onChange={(v) => applyLive(v, selectedTag)}
                      placeholder="Escolha uma live"
                      minWidth={280}
                      disabled={loadingFilter}
                      options={lives.map((l) => ({ value: l.id, label: `${new Date(l.scheduled_at).toLocaleDateString("pt-BR")} · ${l.title}`, text: l.title }))}
                    />
                    <Select
                      aria-label="Setor"
                      value={selectedTag}
                      onChange={(v) => applyLive(selectedLiveId, v)}
                      minWidth={200}
                      disabled={loadingFilter || !selectedLiveId}
                      options={[{ value: "", label: "Todos os setores" }, ...tags.map((t) => ({ value: t.id, label: t.name }))]}
                    />
                  </>
                )}
              </div>

              {tableData.length > 0 && (
                <div className="rp-totals">
                  <div><span>{isLive ? "Espectadores" : "Matriculados"}</span><strong>{totalStudents}</strong></div>
                  {isLive ? (
                    <>
                      <div><span>Tempo total</span><strong>{formatWatchTime(totalMinutes)}</strong></div>
                      <div><span>Média por aluno</span><strong className="is-highlight">{formatWatchTime(avgMinutes)}</strong></div>
                    </>
                  ) : (
                    <>
                      <div><span>Aulas no curso</span><strong>{courseLessons}</strong></div>
                      <div><span>Concluíram</span><strong className="is-highlight">{completed} ({completionRate}%)</strong></div>
                    </>
                  )}
                </div>
              )}

              {absentTags.length > 0 && hasSelection && (
                <div className="ui-alert" role="status" style={{ marginBottom: 16, alignItems: "flex-start" }}>
                  <AlertTriangle size={18} />
                  <div>
                    <strong>Setores sem ninguém neste recorte</strong>
                    <div className="adm-chips" style={{ maxWidth: "none", marginTop: 8 }}>
                      {absentTags.map((t) => <span key={t} className="ui-badge ui-badge--neutral">{t}</span>)}
                    </div>
                  </div>
                </div>
              )}

              {loadingFilter ? (
                <div style={{ display: "grid", gap: 8 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={52} />)}</div>
              ) : tableData.length === 0 ? (
                <EmptyState
                  icon={isLive ? <Radio size={28} /> : <BookOpen size={28} />}
                  title={hasSelection ? "Ninguém neste recorte" : isLive ? "Escolha uma live" : "Escolha um curso"}
                  description={hasSelection ? "Troque o filtro para ver outros alunos." : "O relatório aparece aqui, pronto para exportar."}
                />
              ) : (
                <div className="adm-table-wrap rp-table">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Aluno</th><th>Perfil</th>
                        {isLive ? <><th>Tempo assistido</th><th>Último sinal</th></> : <><th>Aulas</th><th>Situação</th></>}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((s) => (
                        <tr key={s.userId}>
                          <td>
                            <div className="adm-cell-main">
                              <Avatar src={s.avatar_url ?? null} name={s.full_name} size={32} />
                              <strong>{s.full_name}</strong>
                            </div>
                          </td>
                          <td data-label="Perfil"><span className="ui-badge ui-badge--neutral">{roleLabel(s.role)}</span></td>
                          {isLive ? (
                            <>
                              <td data-label="Tempo"><strong>{formatWatchTime(s.minutes_watched || 0)}</strong></td>
                              <td data-label="Último sinal">{s.last_seen_at ? new Date(s.last_seen_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                            </>
                          ) : (
                            <>
                              <td data-label="Aulas">{s.done_lessons || 0} de {courseLessons}</td>
                              <td data-label="Situação">
                                <span className={`ui-badge ui-badge--${s.is_completed ? "success" : "warning"}`}>{s.is_completed ? "Concluído" : "Cursando"}</span>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <aside className="rp-side">
              <section className="ui-card ui-card--padded" aria-labelledby="rp-tags">
                <h2 id="rp-tags" className="ui-section__title" style={{ marginBottom: 12 }}><TagIcon size={18} /> Matrículas por setor</h2>
                {tagPopularity.length === 0 ? <p className="ui-hint">Sem dados ainda.</p> : (
                  <div style={{ width: "100%", height: 220 }}>
                    <ResponsiveContainer>
                      <BarChart data={tagPopularity} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={colors.grid} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fill: colors.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                        <RechartsTooltip contentStyle={tooltipStyle} cursor={{ fill: colors.track, opacity: 0.4 }} formatter={(v) => [v, "matrículas"]} />
                        <Bar dataKey="alunos" fill={colors.primary} radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              {!isLive && (
                <section className="ui-card ui-card--padded" aria-labelledby="rp-done">
                  <h2 id="rp-done" className="ui-section__title" style={{ marginBottom: 12 }}><CheckCircle2 size={18} /> Conclusão do curso</h2>
                  {totalStudents === 0 ? <p className="ui-hint">Escolha um curso para ver a conclusão.</p> : (
                    <div className="rp-donut">
                      <div style={{ width: "100%", height: 180 }}>
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie data={pieData} innerRadius={58} outerRadius={78} paddingAngle={3} dataKey="value" stroke="none">
                              <Cell fill={colors.success} />
                              <Cell fill={colors.track} />
                            </Pie>
                            <RechartsTooltip contentStyle={tooltipStyle} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <span className="rp-donut__value" aria-label={`${completionRate}% concluíram`}>{completionRate}%</span>
                    </div>
                  )}
                </section>
              )}
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
