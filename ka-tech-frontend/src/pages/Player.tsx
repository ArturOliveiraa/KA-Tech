import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import LessonView from "../components/LessonView";
import LessonSidebar from "../components/LessonSidebar";

interface CourseData {
    id: number;
    title: string;
}

export default function Player() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();

    const [course, setCourse] = useState<CourseData | null>(null);
    const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadPlayerData() {
            try {
                setLoading(true);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return navigate("/");

                // 1. Carregar perfil para a Sidebar
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", user.id)
                    .single();
                setUserRole(profile?.role || "student");

                // 2. Carregar dados do curso
                const { data: courseData } = await supabase
                    .from("courses")
                    .select("id, title")
                    .eq("id", courseId)
                    .single();
                setCourse(courseData);

                // 3. Buscar a primeira aula do curso para começar o player automaticamente
                // AJUSTE: Convertendo courseId para Number e usando maybeSingle para evitar erro 406
                const { data: firstLesson } = await supabase
                    .from("lessons")
                    .select("id")
                    .eq("courseId", Number(courseId)) 
                    .order("order", { ascending: true })
                    .limit(1)
                    .maybeSingle(); 

                if (firstLesson) {
                    setActiveLessonId(firstLesson.id);
                }
            } catch (err) {
                console.error("Erro ao carregar player:", err);
            } finally {
                setLoading(false);
            }
        }
        loadPlayerData();
    }, [courseId, navigate]);

    if (loading) return <div className="loading-box" style={{ color: '#00e5ff', padding: '40px' }}>Preparando ambiente de aula...</div>;

    return (
        <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#0b0e14' }}>

            {/* 1. Sidebar Principal (Menu) */}
            <Sidebar userRole={userRole} />

            {/* 2. Área de Conteúdo do Player */}
            <main className="dashboard-content" style={{ display: 'flex', flexDirection: 'column' }}>

                {/* Header do Curso */}
                <header style={{ marginBottom: '24px' }}>
                    <h2 style={{ color: '#fff', fontSize: '1.5rem' }}>{course?.title}</h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Aproveite sua aula na <strong>KA Tech</strong></p>
                </header>

                {/* Layout do Player + Lista de Aulas */}
                <div className="player-layout" style={{
                    display: 'flex',
                    gap: '24px',
                    flex: 1,
                    width: '100%'
                }}>

                    {/* Lado Esquerdo: Vídeo e Conteúdo */}
                    <div className="video-section" style={{ flex: 1, minWidth: 0 }}>
                        {activeLessonId ? (
                            <LessonView lessonId={activeLessonId} />
                        ) : (
                            <div style={{ padding: '40px', background: '#121418', borderRadius: '16px', color: '#94a3b8', border: '1px solid #2d323e', textAlign: 'center' }}>
                                Este curso ainda não possui aulas cadastradas.
                            </div>
                        )}
                    </div>

                    {/* Lado Direito: Navegação entre Aulas */}
                    <div className="sidebar-section" style={{ width: '320px', flexShrink: 0 }}>
                        <div style={{
                            background: '#121418',
                            borderRadius: '16px',
                            border: '1px solid #2d323e',
                            overflow: 'hidden',
                            position: 'sticky',
                            top: '40px'
                        }}>
                            <LessonSidebar
                                courseId={Number(courseId)}
                                currentLessonId={activeLessonId || 0}
                                onSelectLesson={(id: number) => { 
                                    setActiveLessonId(id);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                            />
                        </div>
                    </div>
                </div>
            </main>

            <style>{`
        /* Ajustes Responsivos para o Player */
        @media (max-width: 1100px) {
          .player-layout { flex-direction: column; }
          .sidebar-section { width: 100% !important; }
        }
      `}</style>
        </div>
    );
}