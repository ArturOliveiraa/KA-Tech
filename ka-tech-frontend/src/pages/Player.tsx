import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import LessonView from "../components/LessonView";
import LessonSidebar from "../components/LessonSidebar";
import SEO from "../components/SEO";
import QuizPlayer from "../components/QuizPlayer";
import { Course, Lesson, LessonNote, Badge, UserProgress } from "../types";
import {
    ChevronLeft, ChevronRight, Maximize, Minimize,
    BrainCircuit, FileText, ListVideo, Trash2, PlayCircle, Loader2
} from "lucide-react";

export default function Player() {
    const { slug } = useParams<{ slug: string }>();
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
    const [activeTab, setActiveTab] = useState<"content" | "notes">("content");
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

                // 1. Buscamos o curso incluindo a thumbnail corrigida
                const { data: courseData } = await supabase
                    .from("courses")
                    .select("id, title, slug, thumbnail_url")
                    .eq("slug", slug)
                    .single();

                if (!courseData) return navigate("/dashboard");

                // Mapeamos para o tipo Course (camelCase)
                setCourse({
                    ...courseData,
                    thumbnailUrl: courseData.thumbnail_url
                } as Course);
                setRealCourseId(courseData.id);

                // 2. Buscamos as lições incluindo course_id e content para satisfazer a tipagem
                const [lessonsRes, progressRes] = await Promise.all([
                    supabase
                        .from("lessons")
                        .select("id, order, title, video_url, course_id, content") // Adicionado course_id e content
                        .eq("course_id", courseData.id)
                        .order("order", { ascending: true }),
                    supabase
                        .from("user_progress")
                        .select("lesson_id, is_completed")
                        .eq("user_id", user.id)
                        .eq("course_id", courseData.id)
                ]);

                // Mapeamos as lições garantindo que todas as propriedades existam
                const allLessons = (lessonsRes.data || []).map(l => ({
                    ...l,
                    videoUrl: l.video_url || "",
                    content: l.content || "" // Evita que o campo content seja nulo
                })) as unknown as Lesson[]; // Conversão dupla para evitar erro de overlap do TS

                setLessons(allLessons);
                const userProgress = (progressRes.data || []) as UserProgress[];

                if (allLessons.length > 0) {
                    const nextLesson = allLessons.find(lesson => {
                        const prog = userProgress.find(p => p.lesson_id === lesson.id);
                        return !prog?.is_completed;
                    });
                    setActiveLessonId(nextLesson ? nextLesson.id : allLessons[0].id);
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
            supabase.from("user_progress").select("lesson_id, is_completed").eq("user_id", user.id).eq("course_id", realCourseId).eq("is_completed", true)
        ]);

        const total = lessonsRes.count || 0;
        const completed = progressRes.count || 0;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        if (percent === 100 && stats.percent < 100) {
            const { data: badge } = await supabase
                .from("badges")
                .select("id, name, image_url, course_id")
                .eq("course_id", realCourseId)
                .maybeSingle();

            if (badge) {
                const { error: badgeError } = await supabase.from("user_badges").upsert({
                    user_id: user.id,
                    badge_id: badge.id
                }, { onConflict: 'user_id,badge_id' });

                if (!badgeError) {
                    setUnlockedBadge(badge as Badge);
                    setShowBadgeModal(true);
                }
            }
        }
        setStats({ completed, total, percent });
    }, [realCourseId, stats.percent]);

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
            setLessonStartTime(data?.last_time || 0);
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

    if (loading) return (
        <div className="player-loading-screen">
            <Loader2 size={40} className="animate-spin text-primary" />
            <p>Carregando Player...</p>
        </div>
    );

    const currentLessonTitle = lessons.find(l => l.id === activeLessonId)?.title || "Aula";
    const theaterMaxWidth = '75vw';
    const isFirstLesson = lessons.findIndex(l => l.id === activeLessonId) <= 0;
    const isLastLesson = lessons.findIndex(l => l.id === activeLessonId) >= lessons.length - 1;

    return (
        <div className="dashboard-wrapper">
            <SEO title={currentLessonTitle} description={`Assistindo ${course?.title}`} />

            {!theaterMode && <Sidebar />}

            <main className={`player-main-content ${theaterMode ? 'theater-active' : ''} ${isMobile ? 'mobile-active' : ''}`}>

                {/* CABEÇALHO DO PLAYER */}
                <header className="player-header">
                    <div className="header-titles">
                        <span className="course-subtitle">{course?.title}</span>
                        <h1 className="lesson-title">{currentLessonTitle}</h1>
                    </div>

                    {!isMobile && (
                        <div className="header-actions">
                            <button onClick={() => setShowLessonQuiz(true)} className="btn-action-glow blue-glow" title="Testar conhecimento da aula">
                                <BrainCircuit size={18} /> Quiz da Aula
                            </button>

                            <button onClick={() => setShowQuiz(true)} className="btn-action-glow green-glow" title="Prova final do módulo">
                                <BrainCircuit size={18} /> Prova do Módulo
                            </button>

                            <button onClick={() => setTheaterMode(!theaterMode)} className="btn-theater-mode" title="Expandir/Reduzir">
                                {theaterMode ? <><Minimize size={18} /> Normal</> : <><Maximize size={18} /> Teatro</>}
                            </button>
                        </div>
                    )}
                </header>

                <div className="player-body">

                    {/* ÁREA DO VÍDEO E CONTROLES */}
                    <div className="video-column" style={{ flex: theaterMode ? `0 1 ${theaterMaxWidth}` : '1' }}>

                        <div className="video-wrapper glass-panel">
                            {activeLessonId && isTimeLoaded ? (
                                <LessonView
                                    lessonId={activeLessonId}
                                    initialTime={lessonStartTime}
                                    onProgressUpdate={handleSaveProgress}
                                    seekTo={seekTo}
                                />
                            ) : (
                                <div className="video-placeholder">
                                    <Loader2 size={30} className="animate-spin text-primary" />
                                </div>
                            )}
                        </div>

                        {/* CONTROLES MULTIMÍDIA */}
                        <div className="media-controls glass-panel">
                            <button onClick={handlePrevLesson} disabled={isFirstLesson} className="btn-nav">
                                <ChevronLeft size={20} /> Anterior
                            </button>

                            {/* Botões do Mobile inseridos no meio dos controles de navegação */}
                            {isMobile && (
                                <div className="mobile-quiz-group">
                                    <button onClick={() => setShowLessonQuiz(true)} className="btn-icon-round blue" title="Quiz Aula">
                                        <BrainCircuit size={18} /> Aula
                                    </button>
                                    <button onClick={() => setShowQuiz(true)} className="btn-icon-round green" title="Prova Módulo">
                                        <BrainCircuit size={18} /> Módulo
                                    </button>
                                </div>
                            )}

                            <button onClick={handleNextLesson} disabled={isLastLesson} className="btn-nav primary-nav">
                                Próxima <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>

                    {/* SIDEBAR DO PLAYER (Aulas e Notas) */}
                    {(!theaterMode || isMobile) && (
                        <aside className="content-sidebar">

                            {/* Tabs Style Apple */}
                            <div className="sidebar-tabs-container glass-panel">
                                <button
                                    className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('content')}
                                >
                                    <ListVideo size={16} /> Conteúdo
                                </button>
                                <button
                                    className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('notes')}
                                >
                                    <FileText size={16} /> Anotações
                                </button>
                            </div>

                            <div className="sidebar-content-area glass-panel">
                                {activeTab === 'content' ? (
                                    realCourseId && <LessonSidebar course_id={realCourseId} currentLessonId={activeLessonId || 0} onSelectLesson={setActiveLessonId} />
                                ) : (
                                    <div className="notes-container">
                                        <div className="notes-list">
                                            {notes.length === 0 ? (
                                                <div className="empty-notes">
                                                    <FileText size={32} opacity={0.3} style={{ marginBottom: '10px' }} />
                                                    <p>Nenhuma anotação nesta aula.</p>
                                                    <span>Suas notas aparecerão aqui.</span>
                                                </div>
                                            ) : (
                                                notes.map(note => (
                                                    <div key={note.id} className="note-card">
                                                        <div className="note-header">
                                                            <button className="note-time-btn" onClick={() => setSeekTo(note.video_timestamp)}>
                                                                <PlayCircle size={12} /> {formatTime(note.video_timestamp)}
                                                            </button>
                                                            <button className="note-delete-btn" onClick={() => handleDeleteNote(note.id)}>
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                        <p className="note-text">{note.content}</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <div className="note-input-area">
                                            <textarea
                                                value={newNote}
                                                onChange={(e) => setNewNote(e.target.value)}
                                                placeholder="Adicione uma anotação..."
                                                className="note-textarea"
                                            />
                                            <button onClick={handleAddNote} className="note-save-btn" disabled={!newNote.trim()}>
                                                Salvar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </aside>
                    )}
                </div>
            </main>

            {/* MODAIS DE QUIZ (Sobreposição Total) */}
            {showQuiz && realCourseId && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <QuizPlayer courseId={realCourseId} onExit={() => setShowQuiz(false)} />
                    </div>
                </div>
            )}

            {showLessonQuiz && activeLessonId && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <QuizPlayer lessonId={activeLessonId} onExit={() => setShowLessonQuiz(false)} />
                    </div>
                </div>
            )}

            {/* MODAL DE CONQUISTA (GAMIFICAÇÃO) */}
            {showBadgeModal && unlockedBadge && (
                <div className="badge-overlay">
                    <div className="badge-modal glass-panel">
                        <div className="badge-emoji-header">🎊</div>
                        <h2 className="badge-title">Novo Marco Alcançado!</h2>
                        <p className="badge-desc">Seu esforço rendeu frutos. Você desbloqueou uma nova insígnia de conhecimento:</p>

                        <div className="badge-display">
                            <div className="badge-glow"></div>
                            <img src={unlockedBadge.image_url} alt={unlockedBadge.name} className="badge-img" />
                            <h3 className="badge-name">{unlockedBadge.name}</h3>
                        </div>

                        <button onClick={() => navigate('/conquistas')} className="btn-badge-primary">Ver Salão de Troféus</button>
                        <button onClick={() => setShowBadgeModal(false)} className="btn-badge-secondary">Continuar assistindo</button>
                    </div>
                </div>
            )}

            <style>{`
                :root { 
                    --primary: #8b5cf6; --primary-hover: #7c3aed;
                    --bg-dark: #020617; 
                    --bg-panel: rgba(15, 23, 42, 0.4); 
                    --border-color: rgba(255, 255, 255, 0.08);
                    --text-main: #f8fafc; --text-muted: #94a3b8;
                }
                
                * { box-sizing: border-box; }

                /* UTILIDADES */
                .text-primary { color: var(--primary); }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }

                .dashboard-wrapper { display: flex; width: 100%; min-height: 100vh; background: var(--bg-dark); font-family: 'Inter', system-ui, sans-serif; color: var(--text-main); overflow-x: hidden; }
                
                /* LOADING SCREEN */
                .player-loading-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; width: 100%; background: var(--bg-dark); gap: 15px; color: var(--text-muted); font-weight: 600;}

                /* COMPONENTE DE VIDRO */
                .glass-panel {
                    background: var(--bg-panel); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                    border: 1px solid var(--border-color); border-top-color: rgba(255,255,255,0.1);
                }

                /* MAIN LAYOUT */
                .player-main-content {
                    display: flex; flex-direction: column; flex: 1; padding: 40px 50px;
                    margin-left: 260px; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .player-main-content.theater-active { margin-left: 0; padding: 30px; align-items: center; }
                .player-main-content.mobile-active { margin-left: 0; padding: 20px 15px 100px 15px; }

                /* HEADER DO PLAYER */
                .player-header {
                    display: flex; justify-content: space-between; align-items: center; gap: 20px;
                    margin-bottom: 30px; width: 100%;
                }
                .theater-active .player-header { max-width: 75vw; }

                .header-titles { flex: 1; min-width: 0; }
                .course-subtitle { color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; display: block; margin-bottom: 4px; }
                .lesson-title { font-size: 1.8rem; font-weight: 900; margin: 0; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.5px;}

                /* AÇÕES DO HEADER (Quiz / Teatro) */
                .header-actions { display: flex; gap: 12px; align-items: center; }
                
                .btn-action-glow {
                    display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px;
                    font-weight: 700; font-size: 0.9rem; border: 1px solid transparent; cursor: pointer; transition: all 0.3s;
                    color: #fff;
                }
                .btn-action-glow.blue-glow { background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.2); color: #60a5fa; }
                .btn-action-glow.blue-glow:hover { background: rgba(59, 130, 246, 0.2); border-color: rgba(59, 130, 246, 0.4); color: #fff; box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);}
                
                .btn-action-glow.green-glow { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2); color: #34d399; }
                .btn-action-glow.green-glow:hover { background: rgba(16, 185, 129, 0.2); border-color: rgba(16, 185, 129, 0.4); color: #fff; box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);}

                .btn-theater-mode {
                    display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px;
                    background: rgba(255,255,255,0.05); color: #cbd5e1; border: 1px solid var(--border-color);
                    font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: 0.3s;
                }
                .btn-theater-mode:hover { background: rgba(255,255,255,0.1); color: #fff; }
                .theater-active .btn-theater-mode { background: var(--primary); border-color: var(--primary); color: #fff;}

                /* BODY DO PLAYER (Divisão Vídeo / Sidebar) */
                .player-body {
                    display: flex; gap: 30px; width: 100%; align-items: flex-start;
                }
                .theater-active .player-body { justify-content: center; }
                .mobile-active .player-body { flex-direction: column; gap: 20px; }

                /* COLUNA DE VÍDEO */
                .video-column { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
                
                .video-wrapper {
                    border-radius: 20px; overflow: hidden; position: relative; width: 100%;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
                }
                .video-placeholder { width: 100%; aspect-ratio: 16/9; background: #000; display: flex; align-items: center; justify-content: center; }

                /* CONTROLES MULTIMÍDIA */
                .media-controls {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 16px 24px; border-radius: 20px; flex-wrap: wrap; gap: 15px;
                }
                .btn-nav {
                    display: flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 14px;
                    background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); color: var(--text-muted);
                    font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: 0.3s;
                }
                .btn-nav:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: #fff; }
                .btn-nav:disabled { opacity: 0.4; cursor: not-allowed; }
                
                .primary-nav { background: rgba(139, 92, 246, 0.1); border-color: rgba(139, 92, 246, 0.3); color: #c4b5fd; }
                .primary-nav:hover:not(:disabled) { background: var(--primary); color: #fff; border-color: var(--primary); box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);}

                /* MOBILE QUIZ BUTTONS NO MEDIA CONTROL */
                .mobile-quiz-group { display: flex; gap: 10px; }
                .btn-icon-round {
                    display: flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: 12px;
                    font-weight: 700; font-size: 0.85rem; border: none; color: #fff;
                }
                .btn-icon-round.blue { background: #3b82f6; }
                .btn-icon-round.green { background: #10b981; }

                /* SIDEBAR LATERAL (CONTEÚDO/NOTAS) */
                .content-sidebar { width: 360px; flex-shrink: 0; display: flex; flex-direction: column; gap: 15px; }
                .mobile-active .content-sidebar { width: 100%; }

                .sidebar-tabs-container {
                    display: flex; padding: 6px; border-radius: 16px; gap: 6px;
                }
                .tab-btn {
                    flex: 1; padding: 12px; border-radius: 12px; border: none; background: transparent; color: var(--text-muted);
                    font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: 0.3s; display: flex; align-items: center; justify-content: center; gap: 8px;
                }
                .tab-btn:hover { color: #e2e8f0; }
                .tab-btn.active { background: rgba(255,255,255,0.08); color: #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }

                .sidebar-content-area {
                    height: calc(100vh - 200px); max-height: 650px; border-radius: 20px; padding: 20px;
                    display: flex; flex-direction: column; overflow: hidden;
                }
                .mobile-active .sidebar-content-area { height: auto; min-height: 400px; max-height: none;}

                /* AREA DE NOTAS */
                .notes-container { display: flex; flex-direction: column; height: 100%; }
                .notes-list { flex: 1; overflow-y: auto; padding-right: 5px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px;}
                .notes-list::-webkit-scrollbar { width: 4px; }
                .notes-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

                .empty-notes { text-align: center; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; opacity: 0.7;}
                .empty-notes p { margin: 0; font-weight: 600; font-size: 0.95rem; }
                .empty-notes span { font-size: 0.8rem; }

                .note-card { background: rgba(0,0,0,0.3); padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.04); }
                .note-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
                
                .note-time-btn {
                    background: rgba(139, 92, 246, 0.1); color: #c4b5fd; border: 1px solid rgba(139, 92, 246, 0.2);
                    padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 800; cursor: pointer; 
                    display: flex; align-items: center; gap: 6px; transition: 0.2s;
                }
                .note-time-btn:hover { background: rgba(139, 92, 246, 0.2); color: #fff; }
                
                .note-delete-btn { background: none; border: none; color: #ef4444; opacity: 0.5; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; padding: 4px;}
                .note-delete-btn:hover { opacity: 1; background: rgba(239, 68, 68, 0.1); border-radius: 6px; }

                .note-text { color: #e2e8f0; font-size: 0.9rem; line-height: 1.6; margin: 0; }

                .note-input-area { position: relative; background: rgba(0,0,0,0.3); border-radius: 16px; border: 1px solid var(--border-color); padding: 2px;}
                .note-input-area:focus-within { border-color: var(--primary); }
                .note-textarea {
                    width: 100%; background: transparent; border: none; padding: 16px; color: #fff; font-size: 0.95rem;
                    resize: none; min-height: 100px; outline: none; font-family: inherit; line-height: 1.5;
                }
                .note-textarea::placeholder { color: #475569; }
                .note-save-btn {
                    position: absolute; bottom: 12px; right: 12px; background: var(--primary); color: #fff; border: none;
                    padding: 8px 16px; border-radius: 10px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: 0.2s;
                }
                .note-save-btn:disabled { background: #334155; color: #94a3b8; cursor: not-allowed; }
                .note-save-btn:hover:not(:disabled) { filter: brightness(1.1); }

                /* MODAIS DE QUIZ */
                .modal-overlay {
                    position: fixed; inset: 0; z-index: 3000; background: rgba(2, 6, 23, 0.95); backdrop-filter: blur(12px);
                    display: flex; alignItems: center; justify-content: center; padding: 20px; overflow-y: auto;
                }
                .modal-content { width: 100%; max-width: 900px; }

                /* MODAL DE BADGE (CONQUISTA) */
                .badge-overlay {
                    position: fixed; inset: 0; background: rgba(2, 6, 23, 0.85); backdrop-filter: blur(10px);
                    display: flex; align-items: center; justify-content: center; z-index: 4000; padding: 20px;
                }
                .badge-modal {
                    padding: 40px; border-radius: 32px; text-align: center; max-width: 450px; width: 100%;
                    border-color: rgba(139, 92, 246, 0.4); box-shadow: 0 0 60px rgba(139, 92, 246, 0.2);
                    display: flex; flex-direction: column; align-items: center;
                }
                .badge-emoji-header { font-size: 3.5rem; margin-bottom: 10px; animation: fadeUp 0.5s ease;}
                .badge-title { color: #fff; font-size: 1.8rem; font-weight: 900; margin: 0 0 10px 0; letter-spacing: -0.5px;}
                .badge-desc { color: var(--text-muted); margin: 0 0 30px 0; font-size: 0.95rem; line-height: 1.5;}
                
                .badge-display { position: relative; margin-bottom: 40px; }
                .badge-glow { position: absolute; inset: -20px; background: var(--primary); filter: blur(40px); opacity: 0.3; border-radius: 50%; z-index: 0; animation: pulse 2s infinite;}
                .badge-img { width: 120px; height: 120px; object-fit: contain; position: relative; z-index: 1; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.5));}
                .badge-name { color: #c4b5fd; margin: 15px 0 0 0; font-weight: 800; font-size: 1.2rem; position: relative; z-index: 1;}

                .btn-badge-primary {
                    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
                    color: #fff; border: none; padding: 16px 24px; border-radius: 16px; font-weight: 800;
                    cursor: pointer; width: 100%; margin-bottom: 12px; font-size: 1rem; transition: 0.2s;
                }
                .btn-badge-primary:hover { box-shadow: 0 10px 25px rgba(139, 92, 246, 0.4); transform: translateY(-2px); }
                .btn-badge-secondary {
                    background: transparent; color: var(--text-muted); border: none; cursor: pointer;
                    font-weight: 600; font-size: 0.9rem; padding: 10px; transition: 0.2s;
                }
                .btn-badge-secondary:hover { color: #fff; }

                /* RESPONSIVIDADE ADICIONAL */
                @media (max-width: 600px) {
                    .lesson-title { font-size: 1.4rem; white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
                    .media-controls { justify-content: center; padding: 20px 15px; }
                    .btn-nav { flex: 1; justify-content: center;}
                }
            `}</style>
        </div>
    );
}