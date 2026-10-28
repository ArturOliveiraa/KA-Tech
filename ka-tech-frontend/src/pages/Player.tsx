import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import LessonView from "../components/LessonView";
import LessonSidebar from "../components/LessonSidebar";
import LessonMaterials from "../components/LessonMaterials";
import { listAttachments } from "../utils/attachments";
import SEO from "../components/SEO"; 
import QuizPlayer from "../components/QuizPlayer";
import { Course, Lesson, LessonNote, Badge, UserProgress } from "../types";
import { Button, LoadingScreen, ProgressBar } from "../components/ui";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Maximize, Minimize,
  BrainCircuit, FileText, GraduationCap, ListVideo, Paperclip, Trash2, PlayCircle, Trophy
} from "lucide-react";
import "./Player.css";

export default function Player() {
    const { slug } = useParams<{ slug: string }>();
    // Vindo da busca da pandAI: ?aula=<id>&t=<segundos> abre a aula já no minuto certo
    const [searchParams] = useSearchParams();
    const requestedRef = useRef<{ lessonId: number; time: number } | null>(
        searchParams.get("aula") ? { lessonId: Number(searchParams.get("aula")), time: Math.max(0, Number(searchParams.get("t")) || 0) } : null
    );
    const navigate = useNavigate();

    // Estados de Dados
    const [course, setCourse] = useState<Course | null>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [realCourseId, setRealCourseId] = useState<number | null>(null);
    const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
    
    // Estados de UI/Player
    const [loading, setLoading] = useState(true);
    const [lessonStartTime, setLessonStartTime] = useState(0);
    const [isTimeLoaded, setIsTimeLoaded] = useState(false);
    const [theaterMode, setTheaterMode] = useState(false); 
    
    // Estados do Quiz
    const [showQuiz, setShowQuiz] = useState(false);
    const [showLessonQuiz, setShowLessonQuiz] = useState(false); 

    // Gamificação/Notas
    const [stats, setStats] = useState({ completed: 0, total: 0, percent: 0 });
    const [showBadgeModal, setShowBadgeModal] = useState(false);
    const [unlockedBadge, setUnlockedBadge] = useState<Badge | null>(null);
    const badgeAnnouncedRef = useRef(false);
    const [activeTab, setActiveTab] = useState<"content" | "materials" | "notes">("content");
    const [materialsCount, setMaterialsCount] = useState(0);
    const [notes, setNotes] = useState<LessonNote[]>([]);
    const [newNote, setNewNote] = useState("");
    const [currentVideoTime, setCurrentVideoTime] = useState(0);
    const [seekTo, setSeekTo] = useState<number | null>(null);

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- NAVEGAÇÃO ---
    const handleNextLesson = useCallback(() => {
        if (!activeLessonId || lessons.length === 0) return;
        const currentIndex = lessons.findIndex(l => l.id === activeLessonId);
        if (currentIndex !== -1 && currentIndex < lessons.length - 1) {
            setActiveLessonId(lessons[currentIndex + 1].id);
        }
    }, [activeLessonId, lessons]);

    const handlePrevLesson = useCallback(() => {
        if (!activeLessonId || lessons.length === 0) return;
        const currentIndex = lessons.findIndex(l => l.id === activeLessonId);
        if (currentIndex > 0) {
            setActiveLessonId(lessons[currentIndex - 1].id);
        }
    }, [activeLessonId, lessons]);

    // --- DATA FETCHING ---
    useEffect(() => {
        async function loadPlayerData() {
            try {
                setLoading(true);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return navigate("/");

                const { data: courseData } = await supabase
                    .from("courses")
                    .select("id, title, slug")
                    .eq("slug", slug)
                    .single();
                
                if (!courseData) return navigate("/dashboard");
                
                setCourse(courseData as Course);
                setRealCourseId(courseData.id);

                const [lessonsRes, progressRes] = await Promise.all([
                    supabase.from("lessons").select("id, order, title").eq("course_id", courseData.id).order("order", { ascending: true }),
                    supabase.from("user_progress").select("lesson_id, is_completed").eq("user_id", user.id).eq("course_id", courseData.id)
                ]);

                const allLessons = (lessonsRes.data || []) as Lesson[];
                setLessons(allLessons);
                
                const userProgress = (progressRes.data || []) as UserProgress[];

                if (allLessons.length > 0) {
                    const nextLesson = allLessons.find(lesson => {
                        const prog = userProgress.find(p => p.lesson_id === lesson.id);
                        return !prog?.is_completed;
                    });
                    const requested = requestedRef.current && allLessons.find(l => l.id === requestedRef.current!.lessonId);
                    setActiveLessonId(requested ? requested.id : nextLesson ? nextLesson.id : allLessons[0].id);
                    if (!requested) requestedRef.current = null;
                }

            } catch (error) {
                console.error("Erro ao carregar dados do player:", error);
            } finally {
                setLoading(false);
            }
        }
        loadPlayerData();
    }, [slug, navigate]);

    // --- PROGRESSO ---
    const calculateProgress = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !realCourseId) return;

        const [lessonsRes, progressRes] = await Promise.all([
            supabase.from("lessons").select("id", { count: 'exact', head: true }).eq("course_id", realCourseId),
            supabase.from("user_progress").select("lesson_id", { count: "exact", head: true }).eq("user_id", user.id).eq("course_id", realCourseId).eq("is_completed", true)
        ]);

        const total = lessonsRes.count || 0;
        const completed = Math.min(progressRes.count || 0, total);
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        // A insígnia é concedida pelo banco (check_course_completion). Aqui só
        // mostramos o aviso quando ela acabou de ser ganha nesta sessão.
        if (percent === 100 && !badgeAnnouncedRef.current) {
            const { data: badge } = await supabase
                .from("badges")
                .select("id, name, image_url, course_id")
                .eq("course_id", realCourseId)
                .maybeSingle();

            if (badge) {
                const { data: earned } = await supabase
                    .from("user_badges")
                    .select("earned_at")
                    .eq("user_id", user.id)
                    .eq("badge_id", badge.id)
                    .maybeSingle();

                const justEarned = earned?.earned_at && Date.now() - new Date(earned.earned_at).getTime() < 5 * 60 * 1000;
                if (justEarned) {
                    setUnlockedBadge(badge as Badge);
                    setShowBadgeModal(true);
                }
                if (earned) badgeAnnouncedRef.current = true;
            }
        }
        setStats({ completed, total, percent });
    }, [realCourseId]);

    const handleSaveProgress = useCallback(async (time: number, completed: boolean = false) => {
        setCurrentVideoTime(time);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !activeLessonId || !realCourseId) return;

        await supabase.from("user_progress").upsert({
            user_id: user.id,
            course_id: realCourseId,
            lesson_id: activeLessonId,
            last_time: Math.floor(time),
            is_completed: completed,
            completed_at: completed ? new Date() : null
        }, { onConflict: 'user_id,lesson_id' });

        if (completed) {
            window.dispatchEvent(new Event("progressUpdated"));
            await calculateProgress();
            setTimeout(() => {
                handleNextLesson();
            }, 1500);
        }
    }, [activeLessonId, realCourseId, calculateProgress, handleNextLesson]);

    useEffect(() => {
        if (realCourseId) {
            calculateProgress();
            window.addEventListener("progressUpdated", calculateProgress);
            return () => window.removeEventListener("progressUpdated", calculateProgress);
        }
    }, [realCourseId, calculateProgress]);

    useEffect(() => {
        async function fetchSavedTime() {
            if (!activeLessonId) return;
            setIsTimeLoaded(false);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase.from("user_progress").select("last_time").eq("user_id", user.id).eq("lesson_id", activeLessonId).maybeSingle();
            const requested = requestedRef.current;
            if (requested && requested.lessonId === activeLessonId) {
                setLessonStartTime(requested.time);
                requestedRef.current = null; // vale só para a primeira abertura
            } else {
                setLessonStartTime(data?.last_time || 0);
            }
            setIsTimeLoaded(true);
        }
        fetchSavedTime();
    }, [activeLessonId]);


    // --- NOTES ---
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    };

    const fetchNotes = useCallback(async () => {
        if (!activeLessonId) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data } = await supabase
            .from("lesson_notes")
            .select("*")
            .eq("user_id", user.id)
            .eq("lesson_id", activeLessonId)
            .order("video_timestamp", { ascending: true });
            
        if (data) setNotes(data as LessonNote[]); 
    }, [activeLessonId]);

    useEffect(() => { fetchNotes(); }, [fetchNotes]);

    // Contagem de materiais da aula atual (mostrada na aba antes de abrir)
    useEffect(() => {
        if (!activeLessonId) return;
        let alive = true;
        setMaterialsCount(0);
        listAttachments(activeLessonId).then((d) => alive && setMaterialsCount(d.length)).catch(() => undefined);
        return () => { alive = false; };
    }, [activeLessonId]);

    const handleAddNote = async () => {
        if (!newNote.trim() || !activeLessonId || !realCourseId) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from("lesson_notes").insert({
            user_id: user.id,
            course_id: realCourseId,
            lesson_id: activeLessonId,
            content: newNote,
            video_timestamp: Math.floor(currentVideoTime)
        });

        if (!error) {
            setNewNote("");
            fetchNotes();
        }
    };

    const handleDeleteNote = async (id: string) => {
        if (!window.confirm("Deseja excluir esta anotação?")) return;
        const { error } = await supabase.from("lesson_notes").delete().eq("id", id);
        if (!error) setNotes(prev => prev.filter(note => note.id !== id));
    };

    if (loading) return <LoadingScreen label="Preparando a aula..." />;

    const currentIndex = lessons.findIndex(l => l.id === activeLessonId);
    const currentLessonTitle = lessons[currentIndex]?.title || "Aula";
    const isFirstLesson = currentIndex <= 0;
    const isLastLesson = currentIndex >= lessons.length - 1;

    return (
        <div className="ui-shell">
            <SEO title={currentLessonTitle} description={`Assistindo ${course?.title}`} />

            {!theaterMode && <Sidebar />}

            <main className={`ply ${theaterMode ? "is-theater" : ""}`}>
                <header className="ply-header">
                    <div className="ply-header__titles">
                        <Link to="/dashboard" className="ply-back">
                            <ArrowLeft size={14} /> {course?.title}
                        </Link>
                        <h1 className="ply-title">{currentLessonTitle}</h1>
                        <div className="ply-meta">
                            {lessons.length > 0 && <span>Aula {currentIndex + 1} de {lessons.length}</span>}
                            <span className="ply-meta__progress">
                                <ProgressBar value={stats.percent} size="sm" label="Progresso do curso" />
                                {stats.percent}%
                            </span>
                        </div>
                    </div>

                    <div className="ply-toolbar" role="toolbar" aria-label="Ações da aula">
                        <button className="ply-toolbar__btn" onClick={() => setShowLessonQuiz(true)}>
                            <BrainCircuit size={16} aria-hidden="true" /> Quiz da aula
                        </button>
                        <button className="ply-toolbar__btn" onClick={() => setShowQuiz(true)}>
                            <GraduationCap size={16} aria-hidden="true" /> Prova do módulo
                        </button>
                        {!isMobile && (
                            <button
                                className="ply-toolbar__btn ply-toolbar__btn--icon"
                                onClick={() => setTheaterMode(!theaterMode)}
                                aria-pressed={theaterMode}
                                aria-label={theaterMode ? "Sair do modo teatro" : "Modo teatro"}
                                title={theaterMode ? "Sair do modo teatro" : "Modo teatro"}
                            >
                                {theaterMode ? <Minimize size={16} /> : <Maximize size={16} />}
                            </button>
                        )}
                    </div>
                </header>

                <div className="ply-body">
                    <div className="ply-video-col">
                        <div className="ply-video">
                            {activeLessonId && isTimeLoaded ? (
                                <LessonView
                                    lessonId={activeLessonId}
                                    initialTime={lessonStartTime}
                                    onProgressUpdate={handleSaveProgress}
                                    seekTo={seekTo}
                                />
                            ) : (
                                <div className="ply-video__placeholder"><div className="ui-spinner" /></div>
                            )}
                        </div>

                        <nav className="ply-nav" aria-label="Navegação entre aulas">
                            <button className="ply-nav__btn" onClick={handlePrevLesson} disabled={isFirstLesson}>
                                <ChevronLeft size={18} aria-hidden="true" />
                                <span className="ply-nav__text">
                                    <small>Anterior</small>
                                    <strong>{isFirstLesson ? "Você está na primeira aula" : lessons[currentIndex - 1]?.title}</strong>
                                </span>
                            </button>
                            <span className="ply-nav__pos" aria-live="polite">
                                {lessons.length > 0 && <>{currentIndex + 1}<span>/{lessons.length}</span></>}
                            </span>
                            <button className="ply-nav__btn ply-nav__btn--next" onClick={handleNextLesson} disabled={isLastLesson}>
                                <span className="ply-nav__text">
                                    <small>{isLastLesson ? "Fim do curso" : "Próxima aula"}</small>
                                    <strong>{isLastLesson ? "Faça a prova do módulo" : lessons[currentIndex + 1]?.title}</strong>
                                </span>
                                <ChevronRight size={18} aria-hidden="true" />
                            </button>
                        </nav>
                    </div>

                    {(!theaterMode || isMobile) && (
                        <aside className="ply-side ui-card">
                            <div className="ui-tabs ply-tabs" role="tablist" aria-label="Painel da aula">
                                <button role="tab" className="ui-tab" aria-selected={activeTab === "content"} onClick={() => setActiveTab("content")}>
                                    <ListVideo size={15} /> Conteúdo
                                </button>
                                <button role="tab" className="ui-tab" aria-selected={activeTab === "materials"} onClick={() => setActiveTab("materials")}>
                                    <Paperclip size={15} /> Materiais {materialsCount > 0 && <span className="ply-count">{materialsCount}</span>}
                                </button>
                                <button role="tab" className="ui-tab" aria-selected={activeTab === "notes"} onClick={() => setActiveTab("notes")}>
                                    <FileText size={15} /> Notas {notes.length > 0 && <span className="ply-count">{notes.length}</span>}
                                </button>
                            </div>

                            <div className="ply-side__body">
                                {activeTab === "content" ? (
                                    realCourseId && (
                                        <LessonSidebar course_id={realCourseId} currentLessonId={activeLessonId || 0} onSelectLesson={setActiveLessonId} />
                                    )
                                ) : activeTab === "materials" ? (
                                    activeLessonId ? <LessonMaterials lessonId={activeLessonId} onCount={setMaterialsCount} /> : null
                                ) : (
                                    <div className="ply-notes">
                                        <div className="ply-notes__list">
                                            {notes.length === 0 ? (
                                                <div className="ply-notes__empty">
                                                    <FileText size={28} />
                                                    <p>Nenhuma anotação nesta aula.</p>
                                                    <span>Cada nota guarda o minuto do vídeo para você voltar depois.</span>
                                                </div>
                                            ) : (
                                                notes.map(note => (
                                                    <div key={note.id} className="ply-note">
                                                        <div className="ply-note__head">
                                                            <button className="ui-badge ply-note__time" onClick={() => setSeekTo(note.video_timestamp)} title="Ir para este momento">
                                                                <PlayCircle size={12} /> {formatTime(note.video_timestamp)}
                                                            </button>
                                                            <button className="sb-icon-btn sb-logout" style={{ width: 30, height: 30 }} onClick={() => handleDeleteNote(note.id)} aria-label="Excluir anotação">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                        <p className="ply-note__text">{note.content}</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <form className="ply-notes__form" onSubmit={(e) => { e.preventDefault(); handleAddNote(); }}>
                                            <textarea
                                                value={newNote}
                                                onChange={(e) => setNewNote(e.target.value)}
                                                placeholder={`Anotar em ${formatTime(currentVideoTime)}...`}
                                                aria-label="Nova anotação"
                                                className="ui-input"
                                                rows={3}
                                            />
                                            <Button type="submit" block disabled={!newNote.trim()}>Salvar anotação</Button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </aside>
                    )}
                </div>
            </main>

            {showQuiz && realCourseId && (
                <div className="ply-quiz-overlay">
                    <QuizPlayer courseId={realCourseId} onExit={() => setShowQuiz(false)} />
                </div>
            )}

            {showLessonQuiz && activeLessonId && (
                <div className="ply-quiz-overlay">
                    <QuizPlayer lessonId={activeLessonId} onExit={() => setShowLessonQuiz(false)} />
                </div>
            )}

            {showBadgeModal && unlockedBadge && (
                <div className="ui-modal-backdrop">
                    <div className="ui-modal ply-badge" role="dialog" aria-modal="true" aria-labelledby="badge-title">
                        <span className="ui-badge ui-badge--success"><Trophy size={13} /> Curso concluído</span>
                        <h2 id="badge-title" className="ply-badge__title">Nova conquista desbloqueada!</h2>
                        <p className="ply-badge__text">Seu esforço rendeu frutos. Você ganhou a insígnia:</p>
                        <div className="ply-badge__display">
                            <img src={unlockedBadge.image_url} alt="" />
                            <strong>{unlockedBadge.name}</strong>
                        </div>
                        <div className="ply-badge__actions">
                            <Button block onClick={() => navigate("/conquistas")}>Ver minhas conquistas</Button>
                            <Button block variant="ghost" onClick={() => setShowBadgeModal(false)}>Continuar assistindo</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
