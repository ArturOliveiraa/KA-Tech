import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import LessonView from "../components/LessonView";
import LessonSidebar from "../components/LessonSidebar";

export default function Player() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    const [course, setCourse] = useState<any>(null);
    const [realCourseId, setRealCourseId] = useState<number | null>(null);
    const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [lessonStartTime, setLessonStartTime] = useState(0);
    const [isTimeLoaded, setIsTimeLoaded] = useState(false); 

    const [stats, setStats] = useState({ completed: 0, total: 0, percent: 0 });
    const [showBadgeModal, setShowBadgeModal] = useState(false);
    const [unlockedBadge, setUnlockedBadge] = useState<any>(null);

    const [activeTab, setActiveTab] = useState<"content" | "notes">("content");
    const [notes, setNotes] = useState<any[]>([]);
    const [newNote, setNewNote] = useState("");
    const [currentVideoTime, setCurrentVideoTime] = useState(0); 
    const [seekTo, setSeekTo] = useState<number | null>(null); 

    // Estado para detectar mobile
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    };

    const fetchNotes = useCallback(async () => {
        if (!activeLessonId) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from("lesson_notes").select("*").eq("user_id", user.id).eq("lesson_id", activeLessonId).order("video_timestamp", { ascending: true });
        if (data) setNotes(data);
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

    const calculateProgress = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !realCourseId) return;

        const [lessonsRes, progressRes] = await Promise.all([
            supabase.from("lessons").select("id", { count: 'exact', head: true }).eq("course_id", realCourseId),
            supabase.from("user_progress").select("lesson_id", { count: 'exact', head: true }).eq("user_id", user.id).eq("course_id", realCourseId).eq("is_completed", true)
        ]);

        const total = lessonsRes.count || 0;
        const completed = progressRes.count || 0;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        if (percent === 100 && stats.percent < 100) {
            const { data: badge } = await supabase.from("badges").select("id, name, image_url").eq("course_id", realCourseId).maybeSingle();
            
            if (badge) {
                const { error: badgeError } = await supabase.from("user_badges").upsert({ 
                    user_id: user.id, 
                    badge_id: badge.id 
                }, { onConflict: 'user_id,badge_id' });

                if (!badgeError) {
                    setUnlockedBadge(badge);
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
            calculateProgress(); 
        }
    }, [activeLessonId, realCourseId, calculateProgress]);

    useEffect(() => {
        async function loadPlayerData() {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return navigate("/");
            
            const { data: courseData } = await supabase.from("courses").select("id, title").eq("slug", slug).single();
            if (!courseData) return navigate("/dashboard");
            setCourse(courseData);
            setRealCourseId(courseData.id);
            const { data: firstLesson } = await supabase.from("lessons").select("id").eq("course_id", courseData.id).order("order", { ascending: true }).limit(1).maybeSingle();
            if (firstLesson) setActiveLessonId(firstLesson.id);
            setLoading(false);
        }
        loadPlayerData();
    }, [slug, navigate]);

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

    if (loading) return <div style={{ color: '#8b5cf6', padding: '40px', fontFamily: 'Sora', fontWeight: 800 }}>Iniciando...</div>;

    return (
        <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#020617', fontFamily: "'Sora', sans-serif" }}>
            <Sidebar/>
            
            <main className="dashboard-content" style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                flex: 1, 
                padding: isMobile ? '15px' : '20px 40px', 
                marginLeft: isMobile ? '0' : '260px',
                width: '100%',
                overflowX: 'hidden'
            }}>
                <header style={{ marginBottom: '24px' }}>
                    <h2 style={{ color: '#fff', fontSize: isMobile ? '1.3rem' : '1.8rem', fontWeight: 800 }}>{course?.title}</h2>
                </header>

                <div className="player-layout" style={{ 
                    display: 'flex', 
                    flexDirection: isMobile ? 'column' : 'row', 
                    gap: isMobile ? '20px' : '30px', 
                    alignItems: 'flex-start' 
                }}>
                    <div className="video-section" style={{ flex: 1, minWidth: 0, width: '100%' }}>
                        {activeLessonId && isTimeLoaded && (
                            <LessonView
                                lessonId={activeLessonId}
                                initialTime={lessonStartTime}
                                onProgressUpdate={handleSaveProgress}
                                seekTo={seekTo}
                            />
                        )}
                        {!isTimeLoaded && (
                            <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
                                Sincronizando...
                            </div>
                        )}
                    </div>

                    <div className="sidebar-section" style={{ width: isMobile ? '100%' : '340px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', background: '#09090b', borderRadius: '12px', padding: '4px', marginBottom: '15px' }}>
                            <button onClick={() => setActiveTab('content')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeTab === 'content' ? '#1e1b4b' : 'transparent', color: activeTab === 'content' ? '#a78bfa' : '#64748b', fontWeight: 800, fontSize: '0.75rem' }}>AULAS</button>
                            <button onClick={() => setActiveTab('notes')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeTab === 'notes' ? '#1e1b4b' : 'transparent', color: activeTab === 'notes' ? '#a78bfa' : '#64748b', fontWeight: 800, fontSize: '0.75rem' }}>ANOTAÇÕES</button>
                        </div>
                        <div style={{ background: '#09090b', borderRadius: '20px', border: '1px solid rgba(139, 92, 246, 0.1)', padding: '20px', minHeight: isMobile ? '300px' : '500px', display: 'flex', flexDirection: 'column' }}>
                            {activeTab === 'content' ? (
                                realCourseId && <LessonSidebar course_id={realCourseId} currentLessonId={activeLessonId || 0} onSelectLesson={setActiveLessonId} />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
                                    <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', maxHeight: isMobile ? '300px' : 'none' }}>
                                        {notes.map(note => (
                                            <div key={note.id} style={{ background: '#020617', padding: '12px', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.1)', marginBottom: '12px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <button onClick={() => setSeekTo(note.video_timestamp)} style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>⏱️ {formatTime(note.video_timestamp)}</button>
                                                    <button onClick={() => handleDeleteNote(note.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem', opacity: 0.6 }}>🗑️</button>
                                                </div>
                                                <p style={{ color: '#fff', fontSize: '0.85rem', margin: 0 }}>{note.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Anotar..." style={{ width: '100%', background: '#020617', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '12px', padding: '12px', color: '#fff', fontSize: '0.8rem', resize: 'none', minHeight: '80px' }} />
                                        <button onClick={handleAddNote} style={{ position: 'absolute', bottom: '10px', right: '10px', background: '#8b5cf6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer' }}>SALVAR</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Modal de Insígnia Adaptado */}
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