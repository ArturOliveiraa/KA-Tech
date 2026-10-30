import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock, Layers, Play, PlayCircle, Plus, RotateCcw } from "lucide-react";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import SEO from "../components/SEO";
import { Button, CourseThumb, EmptyState, ProgressBar, Skeleton } from "../components/ui";
import "./CategoryCourses.css";

interface Course {
  id: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  slug: string;
  lessons?: { id: number; duration: number }[];
}

interface Category {
  id: number;
  name: string;
  description: string;
}

type Status = "available" | "enrolled" | "progress" | "done";

const formatDuration = (minutes: number) => {
  const m = Math.round(minutes);
  if (!m) return "—";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}h ${rest}min` : `${h}h`;
};

const STATUS_LABEL: Record<Status, string> = {
  available: "Disponível",
  enrolled: "Inscrito",
  progress: "Em progresso",
  done: "Concluído",
};

export default function CategoryCourses() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [category, setCategory] = useState<Category | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<number[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate("/");

      const { data: catData, error: catError } = await supabase
        .from("categories")
        .select("id, name, description")
        .eq("slug", slug)
        .single();

      if (catError || !catData) return navigate("/cursos");
      setCategory(catData);

      const [coursesRes, enrollmentsRes, progressRes] = await Promise.all([
        supabase.from("courses").select("*, lessons(id, duration)").eq("category_id", catData.id).order("createdAt", { ascending: false }),
        supabase.from("course_enrollments").select("courseId").eq("userId", user.id),
        supabase.from("user_progress").select("lesson_id").eq("user_id", user.id).eq("is_completed", true),
      ]);

      setCourses(coursesRes.data || []);
      setEnrolledCourseIds(enrollmentsRes.data?.map((e) => e.courseId) || []);
      setCompletedLessonIds(new Set((progressRes.data || []).map((p) => p.lesson_id)));
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  }, [slug, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Progresso real: aulas concluídas / aulas do curso
  const stats = useMemo(() => {
    const map = new Map<number, { lessons: number; minutes: number; done: number; percent: number; status: Status }>();
    courses.forEach((c) => {
      const lessons = c.lessons || [];
      const done = lessons.filter((l) => completedLessonIds.has(l.id)).length;
      const percent = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
      const enrolled = enrolledCourseIds.includes(c.id);
      const status: Status = lessons.length > 0 && done === lessons.length ? "done" : done > 0 ? "progress" : enrolled ? "enrolled" : "available";
      map.set(c.id, {
        lessons: lessons.length,
        minutes: lessons.reduce((acc, l) => acc + (l.duration || 0), 0),
        done,
        percent,
        status,
      });
    });
    return map;
  }, [courses, enrolledCourseIds, completedLessonIds]);

  const totals = useMemo(() => {
    let minutes = 0, lessons = 0, done = 0, enrolled = 0;
    stats.forEach((s) => {
      minutes += s.minutes;
      lessons += s.lessons;
      if (s.status === "done") done += 1;
      if (s.status !== "available") enrolled += 1;
    });
    return { minutes, lessons, done, enrolled };
  }, [stats]);

  const handleCourseAction = async (course: Course) => {
    setActionError(null);
    if (!enrolledCourseIds.includes(course.id)) {
      setEnrollingId(course.id);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.from("course_enrollments").insert([{ userId: user.id, courseId: course.id }]);
        if (error) {
          console.error("Erro técnico na inscrição:", error.message);
          setActionError("Não foi possível confirmar sua inscrição. Tente novamente.");
          setEnrollingId(null);
          return;
        }
        setEnrolledCourseIds((prev) => [...prev, course.id]);
      }
      setEnrollingId(null);
    }
    navigate(`/curso/${course.slug}`);
  };

  const actionFor = (status: Status, course: Course) => {
    const busy = enrollingId === course.id;
    if (status === "available") {
      return <Button block onClick={() => handleCourseAction(course)} loading={busy} icon={!busy ? <Plus size={16} /> : undefined}>{busy ? "Inscrevendo..." : "Inscrever-se"}</Button>;
    }
    if (status === "done") {
      return <Button block variant="secondary" onClick={() => handleCourseAction(course)} icon={<RotateCcw size={15} />}>Revisar conteúdo</Button>;
    }
    return (
      <Button block onClick={() => handleCourseAction(course)} icon={<Play size={15} fill="currentColor" />}>
        {status === "progress" ? "Continuar" : "Começar curso"}
      </Button>
    );
  };

  return (
    <div className="ui-shell">
      <SEO title={category?.name || "Trilha"} description={category?.description} />
      <Sidebar />
      <main className="ui-main">
        <div className="ui-main__inner">
          <Link to="/cursos" className="cc-back"><ArrowLeft size={16} /> Voltar para trilhas</Link>

          {loading ? (
            <>
              <Skeleton height={190} radius={22} />
              <div className="cc-grid" style={{ marginTop: 28 }}>
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={360} radius={16} />)}
              </div>
            </>
          ) : (
            <>
              <header className="cc-hero ui-fade-up">
                <div className="cc-hero__text">
                  <span className="ui-page-header__eyebrow"><Layers size={14} /> Trilha</span>
                  <h1 className="cc-hero__title">{category?.name}</h1>
                  <p className="cc-hero__desc">{category?.description || "Cursos selecionados para você dominar este tema passo a passo."}</p>
                </div>
                <dl className="cc-hero__stats">
                  <div><dt><BookOpen size={15} /> Cursos</dt><dd>{courses.length}</dd></div>
                  <div><dt><PlayCircle size={15} /> Aulas</dt><dd>{totals.lessons}</dd></div>
                  <div><dt><Clock size={15} /> Duração total</dt><dd>{formatDuration(totals.minutes)}</dd></div>
                  <div><dt><CheckCircle2 size={15} /> Concluídos</dt><dd>{totals.done}/{courses.length}</dd></div>
                </dl>
              </header>

              {actionError && <div className="ui-alert ui-alert--danger" role="alert" style={{ marginBottom: 16 }}>{actionError}</div>}

              {courses.length === 0 ? (
                <EmptyState
                  icon={<BookOpen size={30} />}
                  title="Nenhum curso nesta trilha ainda"
                  description="Os cursos desta trilha estão sendo preparados. Enquanto isso, explore outras trilhas."
                  action={<Button variant="secondary" onClick={() => navigate("/cursos")} icon={<ArrowLeft size={16} />}>Ver outras trilhas</Button>}
                />
              ) : (
                <section className="cc-grid" aria-label={`Cursos de ${category?.name}`}>
                  {courses.map((course, index) => {
                    const s = stats.get(course.id)!;
                    return (
                      <article key={course.id} className={`ui-card cc-card cc-card--${s.status} ui-fade-up`} style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
                        <div className="cc-card__thumb">
                          <CourseThumb src={course.thumbnailUrl} title={course.title} category={category?.name} />
                          <span className={`cc-status cc-status--${s.status}`}>
                            {s.status === "done" && <CheckCircle2 size={12} />}
                            {STATUS_LABEL[s.status]}
                          </span>
                        </div>

                        <div className="cc-card__body">
                          <h2 className="cc-card__title" title={course.title}>{course.title}</h2>
                          <div className="cc-card__meta">
                            <span><PlayCircle size={14} /> {s.lessons} {s.lessons === 1 ? "aula" : "aulas"}</span>
                            <span><Clock size={14} /> {formatDuration(s.minutes)}</span>
                          </div>
                          {course.description && <p className="cc-card__desc">{course.description}</p>}

                          <div className="cc-card__footer">
                            {s.status !== "available" && (
                              <div className="cc-card__progress">
                                <div><span>{s.done} de {s.lessons} aulas</span><strong>{s.percent}%</strong></div>
                                <ProgressBar value={s.percent} size="sm" label={`Progresso em ${course.title}`} />
                              </div>
                            )}
                            {actionFor(s.status, course)}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </section>
              )}

              {courses.length > 0 && totals.enrolled === 0 && (
                <p className="cc-tip"><ArrowRight size={14} /> Inscreva-se em um curso para acompanhar seu progresso aqui e no seu dashboard.</p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
