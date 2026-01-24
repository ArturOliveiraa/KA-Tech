import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import LessonView from "../components/LessonView";
import LessonSidebar from "../components/LessonSidebar";
import confetti from "canvas-confetti";

export default function Player() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();

    const [course, setCourse] = useState<any>(null);
    const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ completed: 0, total: 0, percent: 0 });
    const [lessonStartTime, setLessonStartTime] = useState(0);

    const fireConfetti = () => {
        const duration = 5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function() {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);
            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    };

    const calculateProgress = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !courseId) return;

        const [lessonsRes, progressRes] = await Promise.all([
            supabase.from("lessons").select("id", { count: 'exact', head: true }).eq("courseId", Number(courseId)),
            supabase.from("user_progress").select("lesson_id", { count: 'exact', head: true }).eq("user_id", user.id).eq("course_id", Number(courseId)).eq("is_completed", true)
        ]);

        const total = lessonsRes.count || 0;
        const completed = progressRes.count || 0;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        if (percent === 100 && stats.percent < 100) fireConfetti();
        setStats({ completed, total, percent });
    }, [courseId, stats.percent]);

    const handleSaveProgress = useCallback(async (time: number, completed: boolean = false) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !activeLessonId) return;

        await supabase.from("user_progress").upsert({
            user_id: user.id,
            course_id: Number(courseId),
            lesson_id: activeLessonId,
            last_time: time,
            is_completed: completed,
            updated_at: new Date()
        }, { onConflict: 'user_id,lesson_id' });

        if (completed) window.dispatchEvent(new Event("progressUpdated"));
    }, [activeLessonId, courseId]);

    const getRank = (p: number) => {
        if (p >= 100) return { 
            label: "GOD", color: "#ff00ff", glow: "0 0 25px rgba(255, 0, 255, 0.5)", animation: "rankPulse 1.5s infinite",
            image: "https://zvgchncgvadzpkffhfbr.supabase.co/storage/v1/object/public/RANKS/GOD.png" 
        };
        if (p >= 75) return { 
            label: "HACKER", color: "#00e5ff", glow: "0 0 20px rgba(0, 229, 255, 0.5)", animation: "none",
            image: "https://zvgchncgvadzpkffhfbr.supabase.co/storage/v1/object/public/RANKS/HACKER.png" 
        };
        if (p >= 50) return { 
            label: "PRO PLAYER", color: "#8b5cf6", glow: "0 0 20px rgba(139, 92, 246, 0.5)", animation: "none",
            image: "https://zvgchncgvadzpkffhfbr.supabase.co/storage/v1/object/public/RANKS/PRO%20PLAYER.png" 
        };
        if (p >= 25) return { 
            label: "NEW PLAYER", color: "#00ff88", glow: "0 0 15px rgba(0, 255, 136, 0.4)", animation: "none",
            image: "https://zvgchncgvadzpkffhfbr.supabase.co/storage/v1/object/public/RANKS/NEW%20PLAYER.png" 
        };
        return { 
            label: "NOOB", color: "#94a3b8", glow: "none", animation: "none",
            image: "https://zvgchncgvadzpkffhfbr.supabase.co/storage/v1/object/public/RANKS/NOOB.png" 
        };
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
                const { data: courseData } = await supabase.from("courses").select("id, title").eq("id", courseId).single();
                setCourse(courseData);
                const { data: firstLesson } = await supabase.from("lessons").select("id").eq("courseId", Number(courseId)).order("order", { ascending: true }).limit(1).maybeSingle(); 
                if (firstLesson) setActiveLessonId(firstLesson.id);
                calculateProgress();
            } catch (err) { console.error(err); } finally { setLoading(false); }
        }
        loadPlayerData();
        window.addEventListener("progressUpdated", calculateProgress);
        return () => window.removeEventListener("progressUpdated", calculateProgress);
    }, [courseId, navigate, calculateProgress]);

    useEffect(() => {
        async function fetchSavedTime() {
            if (!activeLessonId) return;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from("user_progress")
                .select("last_time")
                .eq("user_id", user.id)
                .eq("lesson_id", activeLessonId)
                .maybeSingle();
            
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
                    <h2 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{course?.title}</h2>
                </header>

                <div style={{ 
                    background: '#09090b', 
                    padding: '24px', 
                    borderRadius: '20px', 
                    border: '1px solid rgba(139, 92, 246, 0.15)', 
                    marginBottom: '32px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '24px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', top: '-50px', left: '-50px', width: '150px', height: '150px', background: rank.color, opacity: 0.05, filter: 'blur(60px)', borderRadius: '50%' }} />

                    <div style={{ 
                        width: '90px', height: '90px', background: '#020617', borderRadius: '16px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        border: `2px solid ${rank.color}`,
                        boxShadow: rank.glow,
                        zIndex: 2
                    }}>
                        <img src={rank.image} alt={rank.label} style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
                    </div>

                    <div style={{ flex: 1, zIndex: 2 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
                            <div>
                                <span style={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>PATENTE ATUAL</span>
                                <h2 style={{ margin: 0, color: rank.color, textShadow: rank.glow, fontSize: '2.2rem', fontWeight: 900, animation: rank.animation }}>
                                    {rank.label}
                                </h2>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800 }}>{stats.percent}% Concluído</span>
                                <span style={{ color: '#9ca3af', fontSize: '0.85rem', display: 'block', fontWeight: 500 }}>{stats.completed} de {stats.total} missões finalizadas</span>
                            </div>
                        </div>
                        <div style={{ width: '100%', height: '10px', background: '#111116', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                            <div style={{ 
                                width: `${stats.percent}%`, 
                                height: '100%', 
                                background: `linear-gradient(90deg, ${rank.color}, #fff)`, 
                                boxShadow: rank.glow, 
                                transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)' 
                            }} />
                        </div>
                    </div>
                </div>

                <div className="player-layout" style={{ display: 'flex', gap: '30px' }}>
                    {/* AJUSTADO: Removido o fundo preto e bordas da video-section para eliminar o "caixote" */}
                    <div className="video-section" style={{ flex: 1, borderRadius: '20px', overflow: 'hidden' }}>
                        {activeLessonId && (
                            <LessonView 
                                lessonId={activeLessonId} 
                                initialTime={lessonStartTime} 
                                onProgressUpdate={handleSaveProgress} 
                            />
                        )}
                    </div>
                    <div className="sidebar-section" style={{ width: '380px' }}>
                        <LessonSidebar 
                            courseId={Number(courseId)} 
                            currentLessonId={activeLessonId || 0} 
                            onSelectLesson={setActiveLessonId} 
                        />
                    </div>
                </div>
            </main>

            <style>{`
                @keyframes rankPulse {
                    0% { transform: scale(1); filter: brightness(1); }
                    50% { transform: scale(1.05); filter: brightness(1.2); }
                    100% { transform: scale(1); filter: brightness(1); }
                }
                ::-webkit-scrollbar { width: 8px; }
                ::-webkit-scrollbar-track { background: #020617; }
                ::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: #8b5cf6; }
            `}</style>
        </div>
    );
}