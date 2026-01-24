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
    const [userRole, setUserRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ completed: 0, total: 0, percent: 0 });
    const [lessonStartTime, setLessonStartTime] = useState(0);

    // --- NOVOS ESTADOS PARA O MODAL DE CONQUISTA ---
    const [showBadgeModal, setShowBadgeModal] = useState(false);
    const [unlockedBadge, setUnlockedBadge] = useState<any>(null);

    const calculateProgress = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !realCourseId) return;

        const [lessonsRes, progressRes] = await Promise.all([
            supabase.from("lessons").select("id", { count: 'exact', head: true }).eq("course_id", realCourseId),
            supabase.from("user_progress").select("lesson_id", { count: 'exact', head: true }).eq("user_id", user.id).eq("course_id", realCourseId).eq("is_completed", true)
        ]);

        if (lessonsRes.error || progressRes.error) return;

        const total = lessonsRes.count || 0;
        const completed = progressRes.count || 0;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        if (percent === 100 && stats.percent < 100) {
            // Busca os detalhes da insígnia (incluindo a imagem)
            const { data: badge } = await supabase
                .from("badges")
                .select("id, name, image_url")
                .eq("course_id", realCourseId)
                .maybeSingle();

            if (badge) {
                const { error: badgeError } = await supabase.from("user_badges").upsert({
                    user_id: user.id,
                    badge_id: badge.id
                }, { onConflict: 'user_id,badge_id' });

                if (!badgeError) {
                    // --- ATIVA O MODAL EM VEZ DO ALERT ---
                    setUnlockedBadge(badge);
                    setShowBadgeModal(true);
                }
            }
        }

        setStats({ completed, total, percent });
    }, [realCourseId, stats.percent]);

    const handleSaveProgress = useCallback(async (time: number, completed: boolean = false) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !activeLessonId || !realCourseId) return;

        const { error } = await supabase.from("user_progress").upsert({
            user_id: user.id,
            course_id: realCourseId,
            lesson_id: activeLessonId,
            last_time: time,
            is_completed: completed,
            completed_at: completed ? new Date() : null
        }, { onConflict: 'user_id,lesson_id' });

        if (!error && completed) window.dispatchEvent(new Event("progressUpdated"));
    }, [activeLessonId, realCourseId]);

    const getRank = (p: number) => {
        if (p >= 100) return { label: "GOD", color: "#ff00ff", glow: "0 0 25px rgba(255, 0, 255, 0.5)", image: "https://zvgchncgvadzpkffhfbr.supabase.co/storage/v1/object/public/RANKS/GOD.png" };
        if (p >= 75) return { label: "HACKER", color: "#00e5ff", glow: "0 0 20px rgba(0, 229, 255, 0.5)", image: "https://zvgchncgvadzpkffhfbr.supabase.co/storage/v1/object/public/RANKS/HACKER.png" };
        if (p >= 50) return { label: "PRO PLAYER", color: "#8b5cf6", glow: "0 0 20px rgba(139, 92, 246, 0.5)", image: "https://zvgchncgvadzpkffhfbr.supabase.co/storage/v1/object/public/RANKS/PRO%20PLAYER.png" };
        if (p >= 25) return { label: "NEW PLAYER", color: "#00ff88", glow: "0 0 15px rgba(0, 255, 136, 0.4)", image: "https://zvgchncgvadzpkffhfbr.supabase.co/storage/v1/object/public/RANKS/NEW%20PLAYER.png" };
        return { label: "NOOB", color: "#94a3b8", glow: "none", image: "https://zvgchncgvadzpkffhfbr.supabase.co/storage/v1/object/public/RANKS/NOOB.png" };
    };

    const rank = getRank(stats.percent);

    useEffect(() => {
        async function loadPlayerData() {
            try {
                setLoading(true);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return navigate("/");

                const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
                setUserRole(profile?.role || "student");

                const { data: courseData, error } = await supabase.from("courses").select("id, title").eq("slug", slug).single();
                if (error || !courseData) return navigate("/dashboard");

                setCourse(courseData);
                setRealCourseId(courseData.id);

                const { data: firstLesson } = await supabase.from("lessons").select("id").eq("course_id", courseData.id).order("order", { ascending: true }).limit(1).maybeSingle(); 
                if (firstLesson) setActiveLessonId(firstLesson.id);
                
            } catch (err) { 
                console.error(err); 
            } finally { 
                setLoading(false); 
            }
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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase.from("user_progress").select("last_time").eq("user_id", user.id).eq("lesson_id", activeLessonId).maybeSingle();
            setLessonStartTime(data?.last_time || 0);
        }
        fetchSavedTime();
    }, [activeLessonId]);

    if (loading) return <div style={{ color: '#8b5cf6', padding: '40px', fontFamily: 'Sora', fontWeight: 800 }}>Carregando Missão...</div>;

    return (
        <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#020617', fontFamily: "'Sora', sans-serif" }}>
            <Sidebar userRole={userRole} />
            <main className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '40px', marginLeft: '260px' }}>
                <header style={{ marginBottom: '24px' }}>
                    <h2 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 800 }}>{course?.title}</h2>
                </header>

                <div style={{ background: '#09090b', padding: '24px', borderRadius: '20px', border: '1px solid rgba(139, 92, 246, 0.15)', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '24px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ width: '90px', height: '90px', background: '#020617', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${rank.color}`, boxShadow: rank.glow, zIndex: 2 }}>
                        <img src={rank.image} alt={rank.label} style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
                    </div>
                    <div style={{ flex: 1, zIndex: 2 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div>
                                <span style={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: 800 }}>PATENTE ATUAL</span>
                                <h2 style={{ margin: 0, color: rank.color, textShadow: rank.glow, fontSize: '2.2rem', fontWeight: 900 }}>{rank.label}</h2>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800 }}>{stats.percent}% Concluído</span>
                                <span style={{ color: '#9ca3af', fontSize: '0.85rem', display: 'block' }}>{stats.completed} de {stats.total} missões finalizadas</span>
                            </div>
                        </div>
                        <div style={{ width: '100%', height: '10px', background: '#111116', borderRadius: '20px', overflow: 'hidden' }}>
                            <div style={{ width: `${stats.percent}%`, height: '100%', background: `linear-gradient(90deg, ${rank.color}, #fff)`, transition: 'width 1.5s ease' }} />
                        </div>
                    </div>
                </div>

                <div className="player-layout" style={{ display: 'flex', gap: '30px' }}>
                    <div className="video-section" style={{ flex: 1, borderRadius: '20px', overflow: 'hidden' }}>
                        {activeLessonId && <LessonView lessonId={activeLessonId} initialTime={lessonStartTime} onProgressUpdate={handleSaveProgress} />}
                    </div>
                    <div className="sidebar-section" style={{ width: '380px' }}>
                        {realCourseId && <LessonSidebar course_id={realCourseId} currentLessonId={activeLessonId || 0} onSelectLesson={setActiveLessonId} />}
                    </div>
                </div>
            </main>

            {/* --- MODAL DE CONQUISTA PERSONALIZADO --- */}
            {showBadgeModal && unlockedBadge && (
                <div className="achievement-modal-overlay">
                    <div className="achievement-modal-card">
                        <div className="badge-glow-effect"></div>
                        
                        <div className="badge-image-container">
                            <img src={unlockedBadge.image_url} alt="Badge" className="badge-main-img" />
                        </div>

                        <h3 className="achievement-subtitle">Nova Conquista Desbloqueada!</h3>
                        <h2 className="achievement-title">{unlockedBadge.name}</h2>
                        
                        <p className="achievement-description">
                            Sua dedicação deu frutos. Você acaba de se tornar um especialista em <strong>{course?.title}</strong>.
                        </p>

                        <button className="achievement-button" onClick={() => setShowBadgeModal(false)}>
                            Continuar Jornada
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .achievement-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(2, 6, 23, 0.9);
                    backdrop-filter: blur(12px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    padding: 20px;
                    animation: fadeIn 0.3s ease;
                }

                .achievement-modal-card {
                    background: #09090b;
                    border: 1px solid rgba(139, 92, 246, 0.4);
                    border-radius: 32px;
                    padding: 40px;
                    max-width: 440px;
                    width: 100%;
                    text-align: center;
                    position: relative;
                    box-shadow: 0 0 50px rgba(139, 92, 246, 0.2);
                    animation: slideUp 0.5s cubic-bezier(0.17, 0.67, 0.83, 0.67);
                }

                .badge-glow-effect {
                    position: absolute;
                    top: 30%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 200px;
                    height: 200px;
                    background: #8b5cf6;
                    filter: blur(80px);
                    opacity: 0.25;
                    border-radius: 50%;
                }

                .badge-image-container {
                    position: relative;
                    margin-bottom: 30px;
                    display: flex;
                    justify-content: center;
                }

                .badge-main-img {
                    width: 180px;
                    height: 180px;
                    object-fit: contain;
                    filter: drop-shadow(0 0 20px rgba(139, 92, 246, 0.5));
                }

                .achievement-subtitle {
                    color: #a78bfa;
                    font-size: 0.85rem;
                    font-weight: 800;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                    margin-bottom: 12px;
                }

                .achievement-title {
                    color: #fff;
                    font-size: 2.2rem;
                    font-weight: 900;
                    margin-bottom: 16px;
                }

                .achievement-description {
                    color: #94a3b8;
                    font-size: 1rem;
                    line-height: 1.6;
                    margin-bottom: 35px;
                }

                .achievement-button {
                    width: 100%;
                    padding: 18px;
                    border-radius: 16px;
                    border: none;
                    background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
                    color: #fff;
                    font-weight: 800;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 20px rgba(124, 58, 237, 0.4);
                }

                .achievement-button:hover {
                    transform: translateY(-3px);
                    filter: brightness(1.1);
                    box-shadow: 0 8px 30px rgba(124, 58, 237, 0.6);
                }

                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(50px) scale(0.9); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}