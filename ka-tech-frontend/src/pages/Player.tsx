import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import LessonView from "../components/LessonView";
import LessonSidebar from "../components/LessonSidebar";
import SEO from "../components/SEO"; 

import { Course, Lesson, LessonNote, Badge, UserProgress } from "../types";

// Ícones
const IconExpand = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>;
const IconCompress = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>;
const IconPrev = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
const IconNext = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>;

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

    if (loading) return <div style={{ color: '#8b5cf6', padding: '40px', fontFamily: 'Sora', fontWeight: 800 }}>Carregando Player...</div>;

    const currentLessonTitle = lessons.find(l => l.id === activeLessonId)?.title || "Aula";

    // Tamanho do Container do Teatro (70% da tela)
    const theaterMaxWidth = '70vw'; 

    return (
        <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#020617', fontFamily: "'Sora', sans-serif" }}>
            <SEO title={currentLessonTitle} description={`Assistindo ${course?.title}`} />
            
            {/* Esconde Sidebar no Teatro, mas mantém no Mobile */}
            {!theaterMode && <Sidebar />}

            <main className="dashboard-content" style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                // AQUI ESTÁ A CORREÇÃO DO MOBILE: 140px de padding embaixo
                padding: isMobile ? '15px 15px 140px 15px' : (theaterMode ? '20px' : '20px 40px'),
                marginLeft: (isMobile || theaterMode) ? '0' : '260px',
                width: '100%',
                overflowX: 'hidden',
                transition: 'all 0.3s ease',
                // Centraliza o conteúdo se estiver em modo teatro
                alignItems: theaterMode ? 'center' : 'stretch'
            }}>
                {/* Header (com largura controlada no modo teatro) */}
                <header style={{ 
                    marginBottom: '20px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    width: '100%',
                    maxWidth: theaterMode ? theaterMaxWidth : '100%' // Limita largura
                }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                            {course?.title}
                        </span>
                        <h2 style={{ color: '#fff', fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: 800, marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {currentLessonTitle}
                        </h2>
                    </div>

                    {!isMobile && (
                        <button 
                            onClick={() => setTheaterMode(!theaterMode)}
                            style={{ 
                                background: theaterMode ? '#8b5cf6' : 'rgba(255,255,255,0.05)', 
                                color: '#fff', 
                                border: 'none', 
                                padding: '10px 16px', 
                                borderRadius: '8px', 
                                cursor: 'pointer', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                fontWeight: 600, 
                                fontSize: '0.9rem', 
                                transition: 'all 0.2s', 
                                marginLeft: '15px', 
                                whiteSpace: 'nowrap' 
                            }}
                        >
                            {theaterMode ? <IconCompress /> : <IconExpand />}
                            {theaterMode ? "Modo Normal" : "Modo Teatro"}
                        </button>
                    )}
                </header>

                <div className="player-layout" style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? '20px' : '30px',
                    alignItems: 'flex-start',
                    width: '100%',
                    justifyContent: theaterMode ? 'center' : 'flex-start' 
                }}>
                    {/* ÁREA DO VÍDEO (Esquerda) */}
                    <div className="video-section" style={{ 
                        flex: theaterMode ? `0 1 ${theaterMaxWidth}` : '1', // Usa 70vw no teatro
                        minWidth: 0, 
                        width: '100%' 
                    }}>
                        <div style={{ 
                            position: 'relative', 
                            borderRadius: '16px', 
                            overflow: 'hidden', 
                            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            {activeLessonId && isTimeLoaded && (
                                <LessonView
                                    lessonId={activeLessonId}
                                    initialTime={lessonStartTime}
                                    onProgressUpdate={handleSaveProgress}
                                    seekTo={seekTo}
                                />
                            )}
                            {!isTimeLoaded && (
                                <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
                                    <div className="spinner"></div> 
                                </div>
                            )}
                        </div>

                        {/* CONTROLES DE NAVEGAÇÃO */}
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            marginTop: '20px', 
                            background: '#09090b', 
                            padding: '15px', 
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <button 
                                onClick={handlePrevLesson}
                                disabled={lessons.findIndex(l => l.id === activeLessonId) <= 0}
                                style={{ 
                                    background: 'transparent', 
                                    color: '#fff', 
                                    border: '1px solid rgba(255,255,255,0.1)', 
                                    padding: '10px 20px', 
                                    borderRadius: '8px', 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    opacity: lessons.findIndex(l => l.id === activeLessonId) <= 0 ? 0.5 : 1
                                }}
                            >
                                <IconPrev /> Anterior
                            </button>

                            <button 
                                onClick={handleNextLesson}
                                disabled={lessons.findIndex(l => l.id === activeLessonId) >= lessons.length - 1}
                                style={{ 
                                    background: '#8b5cf6', 
                                    color: '#fff', 
                                    border: 'none', 
                                    padding: '10px 20px', 
                                    borderRadius: '8px', 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    fontWeight: 700,
                                    opacity: lessons.findIndex(l => l.id === activeLessonId) >= lessons.length - 1 ? 0.5 : 1
                                }}
                            >
                                Próxima Aula <IconNext />
                            </button>
                        </div>
                    </div>

                    {/* SIDEBAR (Direita) - Some no Teatro */}
                    {(!theaterMode || isMobile) && (
                        <div className="sidebar-section" style={{ width: isMobile ? '100%' : '380px', flexShrink: 0 }}>
                            <div style={{ display: 'flex', background: '#09090b', borderRadius: '12px', padding: '4px', marginBottom: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <button onClick={() => setActiveTab('content')} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeTab === 'content' ? '#1e1b4b' : 'transparent', color: activeTab === 'content' ? '#a78bfa' : '#64748b', fontWeight: 800, fontSize: '0.8rem', transition: 'all 0.2s' }}>AULAS</button>
                                <button onClick={() => setActiveTab('notes')} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeTab === 'notes' ? '#1e1b4b' : 'transparent', color: activeTab === 'notes' ? '#a78bfa' : '#64748b', fontWeight: 800, fontSize: '0.8rem', transition: 'all 0.2s' }}>ANOTAÇÕES</button>
                            </div>
                            
                            <div style={{ background: '#09090b', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '20px', height: isMobile ? 'auto' : '600px', display: 'flex', flexDirection: 'column' }}>
                                {activeTab === 'content' ? (
                                    realCourseId && <LessonSidebar course_id={realCourseId} currentLessonId={activeLessonId || 0} onSelectLesson={setActiveLessonId} />
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
                                        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', maxHeight: isMobile ? 'none' : 'none', paddingRight: '5px' }}>
                                            {notes.length === 0 && (
                                                <div style={{ textAlign: 'center', color: '#64748b', marginTop: '40px' }}>
                                                    Nenhuma anotação nesta aula ainda.
                                                </div>
                                            )}
                                            {notes.map(note => (
                                                <div key={note.id} style={{ background: '#020617', padding: '15px', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.1)', marginBottom: '12px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                        <button onClick={() => setSeekTo(note.video_timestamp)} style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                            ▶ {formatTime(note.video_timestamp)}
                                                        </button>
                                                        <button onClick={() => handleDeleteNote(note.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem', opacity: 0.6 }}>✕</button>
                                                    </div>
                                                    <p style={{ color: '#e2e8f0', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>{note.content}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <textarea 
                                                value={newNote} 
                                                onChange={(e) => setNewNote(e.target.value)} 
                                                placeholder="Digite sua anotação..." 
                                                style={{ width: '100%', background: '#020617', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '12px', padding: '15px', paddingBottom: '45px', color: '#fff', fontSize: '0.9rem', resize: 'none', minHeight: '100px', fontFamily: 'inherit' }} 
                                            />
                                            <button onClick={handleAddNote} style={{ position: 'absolute', bottom: '12px', right: '12px', background: '#8b5cf6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>SALVAR NOTA</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal de Conquista */}
            {showBadgeModal && unlockedBadge && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(8px)', padding: '20px' }}>
                    <div style={{ background: '#09090b', padding: isMobile ? '25px' : '40px', borderRadius: '24px', border: '1px solid #8b5cf6', textAlign: 'center', maxWidth: '400px', width: '100%', boxShadow: '0 0 50px rgba(139, 92, 246, 0.3)' }}>
                        <div style={{ fontSize: isMobile ? '3rem' : '4rem', marginBottom: '15px' }}>🎊</div>
                        <h2 style={{ color: '#fff', fontSize: isMobile ? '1.5rem' : '1.8rem', fontWeight: 900, marginBottom: '10px' }}>Parabéns!</h2>
                        <p style={{ color: '#9ca3af', marginBottom: '25px', fontSize: '0.9rem' }}>Você concluiu o curso e desbloqueou uma nova insígnia:</p>

                        <div style={{ marginBottom: '30px' }}>
                            <img src={unlockedBadge.image_url} alt={unlockedBadge.name} style={{ width: isMobile ? '100px' : '120px', height: isMobile ? '100px' : '120px', objectFit: 'contain', filter: 'drop-shadow(0 0 15px #8b5cf6)' }} />
                            <h3 style={{ color: '#8b5cf6', marginTop: '15px', fontWeight: 800 }}>{unlockedBadge.name}</h3>
                        </div>

                        <button onClick={() => navigate('/conquistas')} style={{ background: '#8b5cf6', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', width: '100%', marginBottom: '10px' }}>Ver Minhas Conquistas</button>
                        <button onClick={() => setShowBadgeModal(false)} style={{ background: 'transparent', color: '#64748b', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>Continuar aqui</button>
                    </div>
                </div>
            )}
        </div>
    );
}