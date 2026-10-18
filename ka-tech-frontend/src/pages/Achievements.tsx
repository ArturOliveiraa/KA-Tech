import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import SEO from "../components/SEO";
import { Button, EmptyState, PageHeader, ProgressBar, Skeleton } from "../components/ui";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Award, BookOpen, Calendar, CheckCircle2, Clock, Compass, Download, Hourglass, Lock, Play, Trophy, Zap } from "lucide-react";
import "./Achievements.css";

// Import da logo padrão como fallback
import defaultLogo from "../assets/ka-tech-logo.png";

type Filter = "all" | "earned" | "progress";

interface AchievementItem {
  key: string;
  status: "earned" | "progress";
  name: string;
  imageUrl: string | null;
  courseTitle?: string;
  courseSlug?: string;
  earnedAt?: string;
  progress: number;
  totalMinutes: number;
  lessonCount: number;
  teacherNames: string;
}

const hoursText = (minutes: number) => {
  if (!minutes) return "—";
  const h = minutes / 60;
  return h < 1 ? `${Math.round(minutes)} min` : `${h.toFixed(1).replace(".0", "").replace(".", ",")}h`;
};

export default function Achievements() {
  const [items, setItems] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [userName, setUserName] = useState("");
  const [totalLessons, setTotalLessons] = useState(0);
  const [certLogo, setCertLogo] = useState<string>("");
  const [filter, setFilter] = useState<Filter>("all");
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [profileRes, badgesRes, progressRes, settingsRes, dashboardRes] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", user.id).single(),
          supabase.from("user_badges").select(`
            earned_at,
            badges (
              id,
              name,
              image_url,
              course_id,
              courses (
                id,
                title,
                slug,
                total_duration,
                lessons:lessons(count),
                course_enrollments (
                  role,
                  profiles (full_name)
                )
              )
            )
          `).eq("user_id", user.id),
          supabase.from("user_progress").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_completed", true),
          supabase.from("platform_settings").select("value").eq("key", "certificate_logo").maybeSingle(),
          supabase.rpc("get_user_dashboard"),
        ]);

        if (badgesRes.error) throw badgesRes.error;
        if (profileRes.data) setUserName(profileRes.data.full_name || "");
        setCertLogo(settingsRes.data?.value || defaultLogo);
        setTotalLessons(progressRes.count || 0);

        const earned: AchievementItem[] = (badgesRes.data || []).map((row: any, index: number) => {
          const badge = row.badges;
          const course = Array.isArray(badge?.courses) ? badge.courses[0] : badge?.courses;
          const teacherList = course?.course_enrollments
            ?.filter((e: any) => e.role === "TEACHER")
            ?.map((e: any) => e.profiles?.full_name)
            .filter(Boolean);
          return {
            key: `earned-${badge?.id ?? index}`,
            status: "earned",
            name: badge?.name || "Conquista",
            imageUrl: badge?.image_url || null,
            courseTitle: course?.title,
            courseSlug: course?.slug,
            earnedAt: row.earned_at,
            progress: 100,
            totalMinutes: course?.total_duration || 0,
            lessonCount: course?.lessons?.[0]?.count || 0,
            teacherNames: teacherList && teacherList.length > 0 ? teacherList.join(", ") : "Equipe KA Academy",
          };
        });

        // Insígnias ainda não conquistadas dos cursos que o aluno já começou
        const earnedCourseIds = new Set((badgesRes.data || []).map((r: any) => r.badges?.course_id).filter(Boolean));
        const inProgressCourses = ((dashboardRes.data as any[]) || []).filter((c) => !earnedCourseIds.has(c.id));
        let pending: AchievementItem[] = [];
        if (inProgressCourses.length) {
          const { data: pendingBadges } = await supabase
            .from("badges")
            .select("id, name, image_url, course_id")
            .in("course_id", inProgressCourses.map((c) => c.id));
          pending = (pendingBadges || []).map((b: any): AchievementItem => {
            const course = inProgressCourses.find((c) => c.id === b.course_id);
            return {
              key: `progress-${b.id}`,
              status: "progress",
              name: b.name,
              imageUrl: b.image_url,
              courseTitle: course?.title,
              courseSlug: course?.slug,
              progress: Math.round(course?.progress || 0),
              totalMinutes: course?.totalDuration || 0,
              lessonCount: 0,
              teacherNames: "",
            };
          }).sort((a, b) => b.progress - a.progress);
        }

        const sortedEarned = earned.sort((a, b) => new Date(b.earnedAt || 0).getTime() - new Date(a.earnedAt || 0).getTime());
        setItems([...sortedEarned, ...pending]);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleGeneratePDF = async (badgeName: string, elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
      setGeneratingPdfId(elementId);
      element.style.display = "block";
      element.style.position = "fixed";
      element.style.left = "-9999px";

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: 1000,
        height: 650,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [1000, 650] });
      pdf.addImage(imgData, "PNG", 0, 0, 1000, 650);
      pdf.save(`Certificado-${badgeName}.pdf`);

      element.style.display = "none";
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      element.style.display = "none";
      alert("Ocorreu um erro ao gerar seu certificado. Tente novamente.");
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const earnedItems = items.filter((i) => i.status === "earned");
  const progressItems = items.filter((i) => i.status === "progress");
  const certifiedMinutes = earnedItems.reduce((s, i) => s + i.totalMinutes, 0);
  const visible = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.status === (filter === "earned" ? "earned" : "progress"))),
    [items, filter]
  );

  const FILTERS: { id: Filter; label: string; count: number; icon: React.ElementType }[] = [
    { id: "all", label: "Todas", count: items.length, icon: Award },
    { id: "earned", label: "Conquistadas", count: earnedItems.length, icon: CheckCircle2 },
    { id: "progress", label: "Em progresso", count: progressItems.length, icon: Hourglass },
  ];

  return (
    <div className="ui-shell">
      <SEO title="Conquistas" description="Suas insígnias e certificados na KA Tech." />
      <Sidebar />
      <main className="ui-main">
        <div className="ui-main__inner ach">
          <PageHeader
            eyebrow={<><Trophy size={14} /> Gamificação</>}
            title="Salão de Troféus"
            subtitle={<>O reflexo do seu esforço e dedicação{userName ? <>, <strong style={{ color: "var(--color-text)" }}>{userName.split(" ")[0]}</strong></> : ""}.</>}
          />

          <div className="ach-metrics">
            <div className="ui-card ach-metric ach-metric--gold">
              <span className="ach-metric__icon"><Trophy size={20} /></span>
              <div><strong>{loading ? "–" : earnedItems.length}</strong><span>conquistas</span></div>
            </div>
            <div className="ui-card ach-metric ach-metric--violet">
              <span className="ach-metric__icon"><Hourglass size={20} /></span>
              <div><strong>{loading ? "–" : progressItems.length}</strong><span>em progresso</span></div>
            </div>
            <div className="ui-card ach-metric ach-metric--green">
              <span className="ach-metric__icon"><Zap size={20} /></span>
              <div><strong>{loading ? "–" : totalLessons}</strong><span>aulas concluídas</span></div>
            </div>
            <div className="ui-card ach-metric ach-metric--blue">
              <span className="ach-metric__icon"><Clock size={20} /></span>
              <div><strong>{loading ? "–" : hoursText(certifiedMinutes)}</strong><span>certificadas</span></div>
            </div>
          </div>

          {!loading && items.length > 0 && (
            <div className="rk-tabs ach-filters" role="tablist" aria-label="Filtrar conquistas">
              {FILTERS.map(({ id, label, count, icon: Icon }) => (
                <button key={id} role="tab" aria-selected={filter === id} className="rk-tab" onClick={() => setFilter(id)}>
                  <Icon size={15} aria-hidden="true" /> {label} <span className="ach-count">{count}</span>
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="ach-grid" aria-busy="true">
              {[0, 1, 2].map((i) => <Skeleton key={i} height={380} radius={22} />)}
            </div>
          ) : loadError ? (
            <EmptyState tone="danger" icon={<Award size={30} />} title="Não foi possível carregar suas conquistas" description="Recarregue a página para tentar de novo." action={<Button onClick={() => window.location.reload()}>Recarregar</Button>} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Award size={30} />}
              title="Sua estante está pronta"
              description="Conclua um curso para ganhar a primeira insígnia e o certificado."
              action={<Link to="/cursos" className="ui-btn ui-btn--primary"><Compass size={16} /> Explorar trilhas</Link>}
            />
          ) : visible.length === 0 ? (
            <EmptyState icon={<Hourglass size={30} />} title={filter === "earned" ? "Nenhuma conquista ainda" : "Nada em progresso"} description={filter === "earned" ? "Conclua um curso em andamento para desbloquear." : "Comece um curso para acompanhar o progresso aqui."} />
          ) : (
            <div className="ach-grid">
              {visible.map((item, index) => {
                const earned = item.status === "earned";
                const uniqueId = `pdf-template-${item.key}`;
                const isGenerating = generatingPdfId === uniqueId;
                const durationText = hoursText(item.totalMinutes);
                const earnedDate = item.earnedAt ? new Date(item.earnedAt).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" }) : "";

                return (
                  <article key={item.key} className={`ach-card ${earned ? "is-earned" : "is-locked"}`} style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}>
                    {earned && (
                      /* TEMPLATE DO PDF (Oculto - Não alterar estrutura) */
                      <div id={uniqueId} style={{ display: "none", width: "1000px", height: "650px", backgroundColor: "#fff", position: "relative", fontFamily: "Inter, sans-serif", boxSizing: "border-box", color: "#0f172a" }}>
                        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "30px", backgroundColor: "#7c3aed" }}></div>
                        <div style={{ padding: "60px 80px 60px 110px" }}>
                          <div style={{ marginBottom: "50px", textAlign: "left" }}>
                            <img src={certLogo} alt="Logo" style={{ height: "55px", objectFit: "contain" }} />
                          </div>
                          <p style={{ color: "#7c3aed", textTransform: "uppercase", letterSpacing: "3px", fontWeight: 800, fontSize: "16px", margin: 0, textAlign: "left" }}>Certificado de Conclusão</p>
                          <h1 style={{ fontSize: "72px", fontWeight: 900, margin: "15px 0 30px 0", lineHeight: "1", textTransform: "uppercase", textAlign: "left" }}>{item.name}</h1>
                          <p style={{ fontSize: "24px", color: "#475569", maxWidth: "820px", lineHeight: "1.6", margin: 0, textAlign: "left" }}>
                            Certificamos que o aluno(a) <strong style={{ color: "#0f172a" }}>{userName}</strong> concluiu com êxito este treinamento online com carga horária total de <strong>{`${(item.totalMinutes / 60).toFixed(1).replace(".0", "")}h`}</strong>.
                          </p>
                          <div style={{ position: "absolute", bottom: "60px", left: "110px", right: "80px", borderTop: "2px solid #f1f5f9", paddingTop: "30px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                            <div style={{ width: "30%", textAlign: "left" }}>
                              <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>Emitido em</p>
                              <p style={{ margin: "5px 0 0 0", fontSize: "18px", fontWeight: 700 }}>{item.earnedAt ? new Date(item.earnedAt).toLocaleDateString("pt-BR") : ""}</p>
                            </div>
                            <div style={{ width: "40%", textAlign: "center" }}>
                              <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1.5px", margin: 0, color: "#94a3b8", fontWeight: 600 }}>EMITIDO POR KA ACADEMY</p>
                            </div>
                            <div style={{ width: "30%", textAlign: "right" }}>
                              <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>Professores:</p>
                              <p style={{ margin: "5px 0 0 0", fontSize: "18px", fontWeight: 700, lineHeight: "1.2" }}>{item.teacherNames}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="ach-card__showcase">
                      <span className={`ach-card__status ${earned ? "" : "is-locked"}`}>
                        {earned ? <><CheckCircle2 size={13} /> Conquistada</> : <><Lock size={12} /> {item.progress}%</>}
                      </span>
                      <div className="ach-card__art">
                        {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <Award size={64} />}
                        {!earned && <span className="ach-card__lock"><Lock size={18} /></span>}
                      </div>
                    </div>

                    <div className="ach-card__body">
                      <h3 className="ach-card__title" title={item.name}>{item.name}</h3>
                      {item.courseTitle && item.courseTitle !== item.name && <p className="ach-card__course">{item.courseTitle}</p>}

                      {earned ? (
                        <>
                          <div className="ach-card__meta">
                            <span><Calendar size={14} /> {earnedDate}</span>
                            <span><Clock size={14} /> {durationText}</span>
                            {item.lessonCount > 0 && <span><BookOpen size={14} /> {item.lessonCount} {item.lessonCount === 1 ? "aula" : "aulas"}</span>}
                          </div>
                          <Button block onClick={() => handleGeneratePDF(item.name, uniqueId)} loading={isGenerating} icon={!isGenerating ? <Download size={16} /> : undefined}>
                            {isGenerating ? "Gerando certificado..." : "Baixar certificado"}
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="ach-card__progress">
                            <div><span>Progresso do curso</span><strong>{item.progress}%</strong></div>
                            <ProgressBar value={item.progress} label={`Progresso para ${item.name}`} />
                          </div>
                          {item.courseSlug && (
                            <Link to={`/curso/${item.courseSlug}`} className="ui-btn ui-btn--secondary ui-btn--block">
                              <Play size={15} /> Continuar curso
                            </Link>
                          )}
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
