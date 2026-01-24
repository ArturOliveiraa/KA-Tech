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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const [profileRes, badgesRes, progressRes] = await Promise.all([
                supabase.from("profiles").select("full_name").eq("id", user.id).single(),
                supabase.from("user_badges").select(`
                    earned_at,
                    badges (name, image_url, courses (course_tags (tags (name)), lessons (count)))
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
            setLoading(false);
        }
        loadData();
    }, []);

    const handleGeneratePDF = async (badgeName: string, elementId: string) => {
        const element = document.getElementById(elementId);
        if (!element) return;

        try {
            element.style.display = "block";
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#020617"
            });

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({
                orientation: "landscape",
                unit: "px",
                format: [1000, 600]
            });

            pdf.addImage(imgData, "PNG", 0, 0, 1000, 600);
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

                            return (
                                <div key={index} className="achievement-card">
                                    <div id={uniqueId} style={{ display: 'none', width: '1000px', height: '600px', padding: '40px', backgroundColor: '#020617', color: '#fff' }}>
                                        <div style={{ border: '10px solid #8b5cf6', height: '100%', borderRadius: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                                            <img src={logo} alt="KA Tech" style={{ width: '250px', marginBottom: '30px' }} />
                                            <p style={{ color: '#8b5cf6', letterSpacing: '5px', textTransform: 'uppercase', fontWeight: 800 }}>Certificado de Conclusão</p>
                                            <h1 style={{ fontSize: '4rem', margin: '20px 0', fontWeight: 900 }}>{userName}</h1>
                                            <p style={{ fontSize: '1.5rem', color: '#94a3b8' }}>concluiu com êxito o treinamento de <strong>{lessonCount} aulas</strong></p>
                                            <h2 style={{ fontSize: '2.5rem', margin: '15px 0' }}>{badge?.name}</h2>
                                            <img src={badge?.image_url} alt="Badge" style={{ width: '120px' }} />
                                            <p style={{ marginTop: '30px', color: '#64748b' }}>Emitido em {new Date(item.earned_at).toLocaleDateString()}</p>
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
                /* --- DASHBOARD DE RELATÓRIOS (Ajustado) --- */
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

                /* --- GRID DE CONQUISTAS --- */
                .achievements-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 25px; }
                .achievement-card { 
                    background: #09090b; 
                    padding: 30px 20px; 
                    border-radius: 24px; 
                    text-align: center; 
                    border: 1px solid rgba(139, 92, 246, 0.1);
                    transition: transform 0.2s ease;
                }
                .achievement-card:hover { transform: translateY(-5px); border-color: rgba(139, 92, 246, 0.4); }

                /* --- INSIGNIA (Ajustada) --- */
                .badge-wrapper { 
                    width: 120px; 
                    height: 120px; 
                    margin: 0 auto 20px; 
                    background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%); 
                    border-radius: 50%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    border: 1px solid rgba(139, 92, 246, 0.1);
                }
                .badge-wrapper img { 
                    width: 80px; 
                    height: 80px; 
                    object-fit: contain;
                    filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.3));
                }

                .course-title { color: #fff; font-size: 1.2rem; font-weight: 800; margin-bottom: 12px; }
                .tag-container { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: 12px; }
                .tag-pill { background: rgba(139, 92, 246, 0.1); color: #a78bfa; padding: 4px 10px; border-radius: 10px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; border: 1px solid rgba(139, 92, 246, 0.15); }
                .lesson-count-txt { color: #94a3b8; font-size: 0.8rem; margin-bottom: 20px; font-weight: 600; }
                
                .btn-pdf { 
                    width: 100%; 
                    padding: 14px; 
                    border-radius: 12px; 
                    border: none; 
                    background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); 
                    color: #fff; 
                    font-weight: 800; 
                    cursor: pointer; 
                    transition: 0.2s;
                    font-size: 0.85rem;
                }
                .btn-pdf:hover { filter: brightness(1.1); transform: scale(1.02); }

                @media (max-width: 768px) {
                    .stats-grid { flex-direction: column; }
                    main { margin-left: 0 !important; padding: 20px !important; }
                }
            `}</style>
        </div>
    );
}