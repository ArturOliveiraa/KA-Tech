import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";

export default function Achievements() {
    const [achievements, setAchievements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalBadges: 0, totalLessons: 0 });

    useEffect(() => {
        async function fetchAchievements() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Busca as conquistas detalhadas para os cards
            const { data: badgesData, error: badgesError } = await supabase
                .from("user_badges")
                .select(`
                    earned_at,
                    badges (
                        name,
                        image_url,
                        courses (
                            course_tags (tags (name)),
                            lessons (count)
                        )
                    )
                `)
                .eq("user_id", user.id);

            // 2. Busca o total REAL de aulas concluídas para o relatório do topo
            const { count: dominatedCount } = await supabase
                .from("user_progress")
                .select("*", { count: 'exact', head: true })
                .eq("user_id", user.id);

            if (!badgesError && badgesData) {
                setAchievements(badgesData);
                setStats({
                    totalBadges: badgesData.length,
                    totalLessons: dominatedCount || 0
                });
            }
            setLoading(false);
        }
        fetchAchievements();
    }, []);

    return (
        <div className="dashboard-wrapper" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#020617', fontFamily: "'Sora', sans-serif" }}>
            <Sidebar userRole="student" />

            <main style={{ flex: 1, padding: '40px', marginLeft: '260px' }}>
                <header style={{ marginBottom: '40px' }}>
                    <h1 style={{ color: '#fff', fontSize: '2.5rem', fontWeight: 800 }}>Minhas Conquistas</h1>
                    <p style={{ color: '#9ca3af', fontSize: '1.1rem' }}>Sua galeria de troféus e maestria na plataforma.</p>
                </header>

                {/* --- DASHBOARD DE RELATÓRIOS --- */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <span className="stat-icon">🏆</span>
                        <div>
                            <span className="stat-label">INSÍGNIAS</span>
                            <h2 className="stat-value">{stats.totalBadges}</h2>
                        </div>
                    </div>
                    <div className="stat-card">
                        <span className="stat-icon">🔥</span>
                        <div>
                            <span className="stat-label">AULAS DOMINADAS</span>
                            <h2 className="stat-value">{stats.totalLessons}</h2>
                        </div>
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid rgba(139, 92, 246, 0.1)', marginBottom: '40px' }} />

                {loading ? (
                    <p style={{ color: '#8b5cf6' }}>Carregando troféus...</p>
                ) : achievements.length === 0 ? (
                    <div className="empty-state">
                        <span style={{ fontSize: '3rem' }}>🔒</span>
                        <h2 style={{ color: '#fff', marginTop: '20px' }}>Nenhuma insígnia ainda</h2>
                        <p style={{ color: '#9ca3af' }}>Conclua seu primeiro curso para desbloquear uma conquista!</p>
                    </div>
                ) : (
                    <div className="achievements-grid">
                        {achievements.map((item, index) => {
                            // Tratamento de arrays para evitar o erro de valor 0
                            const badge = Array.isArray(item.badges) ? item.badges[0] : item.badges;
                            const course = Array.isArray(badge?.courses) ? badge.courses[0] : badge?.courses;
                            const lessonCount = course?.lessons?.[0]?.count || 0;

                            return (
                                <div key={index} className="achievement-card">
                                    <div className="badge-wrapper">
                                        <img src={badge?.image_url} alt={badge?.name} />
                                    </div>
                                    <h3>{badge?.name}</h3>
                                    
                                    {/* Tags do Curso */}
                                    <div className="tag-container">
                                        {course?.course_tags?.map((t: any, idx: number) => (
                                            <span key={idx} className="tag-pill">{t.tags.name}</span>
                                        ))}
                                    </div>

                                    {/* Quantidade de Aulas do Curso */}
                                    <div className="lesson-count">
                                        <span style={{ opacity: 0.7 }}>📁</span> {lessonCount} {lessonCount === 1 ? 'Aula' : 'Aulas'} finalizadas
                                    </div>

                                    <span className="earned-date">Conquistado em: {new Date(item.earned_at).toLocaleDateString()}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            <style>{`
                .stats-grid { display: flex; gap: 20px; margin-bottom: 40px; }
                .stat-card {
                    background: #09090b;
                    border: 1px solid rgba(139, 92, 246, 0.1);
                    padding: 24px;
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    flex: 1;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                }
                .stat-icon { font-size: 2.2rem; }
                .stat-label { color: #94a3b8; font-size: 0.7rem; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; }
                .stat-value { color: #fff; font-size: 2rem; font-weight: 900; margin: 0; line-height: 1; }

                .achievements-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 25px; }
                .achievement-card {
                    background: #09090b;
                    border: 1px solid rgba(139, 92, 246, 0.15);
                    border-radius: 24px;
                    padding: 32px 24px;
                    text-align: center;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .achievement-card:hover {
                    transform: translateY(-10px);
                    border-color: #8b5cf6;
                    box-shadow: 0 15px 40px rgba(139, 92, 246, 0.15);
                }
                .badge-wrapper {
                    width: 120px;
                    height: 120px;
                    margin: 0 auto 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%);
                    border-radius: 50%;
                }
                .badge-wrapper img { width: 90px; height: 90px; object-fit: contain; filter: drop-shadow(0 0 15px rgba(139, 92, 246, 0.4)); }
                .achievement-card h3 { color: #fff; margin-bottom: 12px; font-size: 1.3rem; font-weight: 800; }
                .tag-container { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: 15px; }
                .tag-pill { background: rgba(139, 92, 246, 0.1); color: #a78bfa; padding: 4px 12px; border-radius: 999px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; border: 1px solid rgba(139, 92, 246, 0.2); }
                .lesson-count { color: #fff; font-size: 0.85rem; margin-bottom: 15px; font-weight: 700; background: rgba(255,255,255,0.03); padding: 6px; border-radius: 8px; }
                .earned-date { color: #64748b; font-size: 0.75rem; }
                .empty-state { padding: 80px 20px; text-align: center; background: #09090b; border-radius: 32px; border: 2px dashed rgba(139, 92, 246, 0.2); }

                @media (max-width: 768px) {
                    .stats-grid { flex-direction: column; }
                    main { margin-left: 0 !important; padding: 20px !important; padding-bottom: 100px !important; }
                }
            `}</style>
        </div>
    );
}