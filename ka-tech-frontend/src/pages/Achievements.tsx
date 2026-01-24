import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Import da logo
import logo from "../assets/ka-tech-logo.png";

export default function Achievements() {
    const [achievements, setAchievements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState("");
    const [stats, setStats] = useState({ totalBadges: 0, totalLessons: 0 });

    useEffect(() => {
        async function loadData() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const [profileRes, badgesRes, progressRes] = await Promise.all([
                    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
                    supabase.from("user_badges").select(`
                        earned_at,
                        badges (
                            name, 
                            image_url, 
                            courses (
                                course_tags (tags (name)), 
                                lessons (count),
                                course_enrollments (
                                    role,
                                    profiles (full_name)
                                )
                            )
                        )
                    `).eq("user_id", user.id),
                    supabase.from("user_progress").select("*", { count: 'exact', head: true }).eq("user_id", user.id).eq("is_completed", true)
                ]);

                if (profileRes.data) setUserName(profileRes.data.full_name);
                
                if (badgesRes.data) {
                    setAchievements(badgesRes.data);
                    setStats({
                        totalBadges: badgesRes.data.length,
                        totalLessons: progressRes.count || 0
                    });
                }
            } catch (error) {
                console.error("Erro ao carregar conquistas:", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const handleGeneratePDF = async (badgeName: string, elementId: string) => {
        const element = document.getElementById(elementId);
        if (!element) return;

        try {
            element.style.display = "block";
            const canvas = await html2canvas(element, {
                scale: 4,
                useCORS: true,
                backgroundColor: "#ffffff"
            });

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({
                orientation: "landscape",
                unit: "px",
                format: [1000, 650]
            });

            pdf.addImage(imgData, "PNG", 0, 0, 1000, 650);
            pdf.save(`Certificado-KA-Tech-${badgeName}.pdf`);
            element.style.display = "none";
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
        }
    };

    return (
        <div className="dashboard-wrapper" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#020617', fontFamily: "'Sora', sans-serif" }}>
            <Sidebar userRole="student" />

            <main style={{ flex: 1, padding: '40px', marginLeft: '260px' }}>
                <header style={{ marginBottom: '40px' }}>
                    <h1 style={{ color: '#fff', fontSize: '2.2rem', fontWeight: 800, marginBottom: '25px' }}>Minhas Conquistas</h1>
                    
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
                </header>

                {loading ? <p style={{ color: '#8b5cf6' }}>Carregando troféus...</p> : (
                    <div className="achievements-grid">
                        {achievements.map((item, index) => {
                            const badge = Array.isArray(item.badges) ? item.badges[0] : item.badges;
                            const course = Array.isArray(badge?.courses) ? badge.courses[0] : badge?.courses;
                            const lessonCount = course?.lessons?.[0]?.count || 0;
                            const uniqueId = `pdf-template-${index}`;

                            // Lógica para filtrar instrutores (quem não tem role 'student')
                            const instructorNames = course?.course_enrollments
                                ?.filter((e: any) => e.role !== 'student') 
                                .map((e: any) => e.profiles?.full_name)
                                .join(", ") || "Equipe KA Academy";

                            return (
                                <div key={index} className="achievement-card">
                                    <div id={uniqueId} style={{ 
                                        display: 'none', 
                                        width: '1000px', 
                                        height: '650px', 
                                        backgroundColor: '#fff', 
                                        color: '#1e293b',
                                        position: 'relative'
                                    }}>
                                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '25px', background: 'linear-gradient(to bottom, #7c3aed, #a855f7)' }}></div>

                                        <div style={{ padding: '60px 80px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                                <img src={logo} alt="KA Tech" style={{ width: '180px' }} />
                                            </div>

                                            <div style={{ textAlign: 'left', marginTop: 'auto', marginBottom: 'auto' }}>
                                                <p style={{ color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: 800, fontSize: '14px', marginBottom: '10px' }}>
                                                    Certificado de Conclusão
                                                </p>
                                                <h1 style={{ fontSize: '3.8rem', fontWeight: 800, color: '#0f172a', margin: '0 0 20px 0', lineHeight: '1.1' }}>
                                                    {badge?.name}
                                                </h1>
                                                <p style={{ fontSize: '1.4rem', color: '#475569', maxWidth: '800px', lineHeight: '1.5' }}>
                                                    Certificamos que o aluno(a) <strong style={{ color: '#0f172a' }}>{userName}</strong> concluiu com êxito este treinamento online com carga horária total de <strong>{lessonCount} aulas</strong>.
                                                </p>
                                            </div>

                                            <div style={{ marginTop: 'auto' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '30px', marginBottom: '20px' }}>
                                                    <div>
                                                        <p style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Emitido em <strong>{new Date(item.earned_at).toLocaleDateString('pt-BR')}</strong></p>
                                                    </div>

                                                    <div style={{ textAlign: 'left', maxWidth: '400px' }}>
                                                        <p style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b', fontWeight: 700, marginBottom: '5px' }}>Instrutores:</p>
                                                        <p style={{ margin: 0, fontSize: '1rem', color: '#475569', lineHeight: '1.4' }}>{instructorNames}</p>
                                                    </div>
                                                </div>
                                                <p style={{ textAlign: 'center', fontSize: '0.65rem', color: '#94a3b8', margin: 0 }}>Emitido por KA Academy</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="badge-wrapper">
                                        <img src={badge?.image_url} alt={badge?.name} />
                                    </div>
                                    <h3 className="course-title">{badge?.name}</h3>
                                    <div className="tag-container">
                                        {course?.course_tags?.map((t: any, idx: number) => (
                                            <span key={idx} className="tag-pill">{t.tags.name}</span>
                                        ))}
                                    </div>
                                    <div className="lesson-count-txt">📁 {lessonCount} Aulas finalizadas</div>
                                    <button className="btn-pdf" onClick={() => handleGeneratePDF(badge?.name, uniqueId)}>
                                        📄 Baixar Certificado (PDF)
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            <style>{`
                .stats-grid { display: flex; gap: 20px; }
                .stat-card { 
                    background: #09090b; 
                    padding: 25px 30px; 
                    border-radius: 20px; 
                    display: flex; 
                    align-items: center; 
                    gap: 20px; 
                    flex: 1; 
                    border: 1px solid rgba(139, 92, 246, 0.15);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                }
                .stat-icon { font-size: 2.5rem; }
                .stat-value { color: #fff; font-size: 2rem; font-weight: 900; margin: 0; line-height: 1; }
                .stat-label { color: #94a3b8; font-size: 0.75rem; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; }
                .achievements-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 25px; }
                .achievement-card { 
                    background: #09090b; 
                    padding: 30px 20px; 
                    border-radius: 24px; 
                    text-align: center; 
                    border: 1px solid rgba(139, 92, 246, 0.1);
                    transition: transform 0.2s ease;
                }
                .badge-wrapper { 
                    width: 120px; height: 120px; margin: 0 auto 20px; 
                    background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%); 
                    border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    border: 1px solid rgba(139, 92, 246, 0.1);
                }
                .badge-wrapper img { width: 80px; height: 80px; object-fit: contain; }
                .course-title { color: #fff; font-size: 1.2rem; font-weight: 800; margin-bottom: 12px; }
                .tag-container { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: 12px; }
                .tag-pill { background: rgba(139, 92, 246, 0.1); color: #a78bfa; padding: 4px 10px; border-radius: 10px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; }
                .lesson-count-txt { color: #94a3b8; font-size: 0.8rem; margin-bottom: 20px; font-weight: 600; }
                .btn-pdf { 
                    width: 100%; padding: 14px; border-radius: 12px; border: none; 
                    background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); 
                    color: #fff; font-weight: 800; cursor: pointer; font-size: 0.85rem;
                }
            `}</style>
        </div>
    );
}