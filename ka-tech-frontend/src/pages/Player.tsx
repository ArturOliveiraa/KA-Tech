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

    // --- ADICIONADO: Estado para o tempo inicial do vídeo ---
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

    // --- ADICIONADO: Função para salvar o progresso no Supabase ---
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
            label: "GOD", color: "#ff00ff", glow: "0 0 20px #ff00ff", animation: "rankPulse 1.5s infinite",
            image: "https://zvgchncgvadzpkffhfbr.supabase.co/storage/v1/object/public/RANKS/GOD.png" 
        };
        if (p >= 75) return { 
            label: "HACKER", color: "#00e5ff", glow: "0 0 10px #00e5ff", animation: "none",
            image: "https://zvgchncgvadzpkffhfbr.supabase.co/storage/v1/object/public/RANKS/HACKER.png" 
        };
        if (p >= 50) return { 
            label: "PRO PLAYER", color: "#7000ff", glow: "0 0 10px #7000ff", animation: "none",
            image: "https://zvgchncgvadzpkffhfbr.supabase.co/storage/v1/object/public/RANKS/PRO%20PLAYER.png" 
        };
        if (p >= 25) return { 
            label: "NEW PLAYER", color: "#00ff88", glow: "0 0 5px #00ff88", animation: "none",
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

    // --- ADICIONADO: Efeito para buscar o tempo salvo sempre que a aula mudar ---
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

    if (loading) return <div style={{ color: '#00e5ff', padding: '40px' }}>Carregando...</div>;

    return (
        <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#0b0e14' }}>
            <Sidebar userRole={userRole} />

            <main className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '40px' }}>
                <header style={{ marginBottom: '24px' }}>
                    <h2 style={{ color: '#fff', fontSize: '1.5rem' }}>{course?.title}</h2>
                </header>

                <div style={{ background: '#121418', padding: '24px', borderRadius: '16px', border: '1px solid #2d323e', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ 
                        width: '80px', height: '80px', background: '#0b0e14', borderRadius: '12px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${rank.color}`,
                        boxShadow: rank.glow
                    }}>
                        <img src={rank.image} alt={rank.label} style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                    </div>

                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                            <div>
                                <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold' }}>PATENTE ATUAL</span>
                                <h2 style={{ margin: 0, color: rank.color, textShadow: rank.glow, fontSize: '1.8rem', fontWeight: '900', animation: rank.animation }}>
                                    {rank.label}
                                </h2>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>{stats.percent}% Concluído</span>
                                <span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block' }}>{stats.completed} de {stats.total} missões</span>
                            </div>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#0b0e14', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{ width: `${stats.percent}%`, height: '100%', background: `linear-gradient(90deg, ${rank.color}, #fff)`, boxShadow: rank.glow, transition: 'width 1s ease-in-out' }} />
                        </div>
                    </div>
                </div>

                <div className="player-layout" style={{ display: 'flex', gap: '24px' }}>
                    <div className="video-section" style={{ flex: 1 }}>
                        {/* AJUSTADO: Passando o tempo inicial e a função de atualização para o LessonView */}
                        {activeLessonId && (
                            <LessonView 
                                lessonId={activeLessonId} 
                                initialTime={lessonStartTime} 
                                onProgressUpdate={handleSaveProgress} 
                            />
                        )}
                    </div>
                    <div className="sidebar-section" style={{ width: '320px' }}>
                        <LessonSidebar courseId={Number(courseId)} currentLessonId={activeLessonId || 0} onSelectLesson={setActiveLessonId} />
                    </div>
                </div>
            </main>

            <style>{`
                @keyframes rankPulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.08); }
                    100% { transform: scale(1); }
                }
            `}</style>
        </div>
    );
}