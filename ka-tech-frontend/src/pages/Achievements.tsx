import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Import da logo padrão como fallback
import defaultLogo from "../assets/ka-tech-logo.png";

export default function Achievements() {
    const [achievements, setAchievements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState("");
    const [stats, setStats] = useState({ totalBadges: 0, totalLessons: 0 });
    const [certLogo, setCertLogo] = useState<string>("");

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Query que conecta as insígnias ao curso e seus professores
                const [profileRes, badgesRes, progressRes, settingsRes] = await Promise.all([
                    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
                    supabase.from("user_badges").select(`
                        earned_at,
                        badges (
                            name, 
                            image_url, 
                            courses (
                                id,
                                lessons:lessons(count),
                                course_enrollments (
                                    role,
                                    profiles (full_name)
                                )
                            )
                        )
                    `).eq("user_id", user.id),
                    supabase.from("user_progress").select("*", { count: 'exact', head: true }).eq("user_id", user.id).eq("is_completed", true),
                    supabase.from("platform_settings").select("value").eq("key", "certificate_logo").maybeSingle()
                ]);

                if (profileRes.data) setUserName(profileRes.data.full_name);
                setCertLogo(settingsRes.data?.value || defaultLogo);

                if (badgesRes.data) {
                    setAchievements(badgesRes.data);
                    setStats({
                        totalBadges: badgesRes.data.length,
                        totalLessons: progressRes.count || 0
                    });
                }
            } catch (error) {
                console.error("Erro ao carregar dados:", error);
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
            element.style.position = "fixed";
            element.style.left = "-9999px";
            
            const canvas = await html2canvas(element, {
                scale: 3, 
                useCORS: true,
                backgroundColor: "#ffffff",
                width: 1000,
                height: 650
            });

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({
                orientation: "landscape",
                unit: "px",
                format: [1000, 650]
            });

            pdf.addImage(imgData, "PNG", 0, 0, 1000, 650);
            pdf.save(`Certificado-${badgeName}.pdf`);
            
            element.style.display = "none";
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            element.style.display = "none";
        }
    };

    return (
        <div className="dashboard-wrapper">
            <Sidebar/>

            <main className="achievements-content">
                <header style={{ marginBottom: '40px' }}>
                    <h1 className="page-title">Minhas Conquistas</h1>
                    <div className="stats-grid">
                        <div className="stat-card">
                            <span className="stat-icon">🏆</span>
                            <div><span className="stat-label">INSÍGNIAS</span><h2 className="stat-value">{stats.totalBadges}</h2></div>
                        </div>
                        <div className="stat-card">
                            <span className="stat-icon">🔥</span>
                            <div><span className="stat-label">AULAS DOMINADAS</span><h2 className="stat-value">{stats.totalLessons}</h2></div>
                        </div>
                    </div>
                </header>

                {loading ? <p style={{ color: '#8b5cf6', textAlign: 'center' }}>Sincronizando...</p> : (
                    <div className="achievements-grid">
                        {achievements.map((item, index) => {
                            const badge = item.badges;
                            const course = Array.isArray(badge?.courses) ? badge.courses[0] : badge?.courses;
                            
                            const lessonCount = course?.lessons?.[0]?.count || 0;
                            const lessonText = lessonCount === 1 ? "1 aula" : `${lessonCount} aulas`;

                            // EXTRAÇÃO DE PROFESSORES: Agora filtra pelo role 'TEACHER'
                            const teacherList = course?.course_enrollments
                                ?.filter((e: any) => e.role === 'TEACHER')
                                ?.map((e: any) => e.profiles?.full_name)
                                .filter(Boolean);
                            
                            const teacherNames = (teacherList && teacherList.length > 0) 
                                ? teacherList.join(", ") 
                                : "Equipe KA Academy";

                            const uniqueId = `pdf-template-${index}`;

                            return (
                                <div key={index} className="achievement-card">
                                    
                                    {/* TEMPLATE DO PDF */}
                                    <div id={uniqueId} style={{ 
                                        display: 'none', 
                                        width: '1000px', 
                                        height: '650px', 
                                        backgroundColor: '#fff', 
                                        position: 'relative',
                                        fontFamily: 'sans-serif',
                                        boxSizing: 'border-box',
                                        color: '#0f172a'
                                    }}>
                                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '30px', backgroundColor: '#7c3aed' }}></div>
                                        
                                        <div style={{ padding: '60px 80px 60px 110px' }}>
                                            <div style={{ marginBottom: '50px', textAlign: 'left' }}>
                                                <img src={certLogo} alt="Logo" style={{ height: '55px', objectFit: 'contain' }} />
                                            </div>

                                            <p style={{ color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: 800, fontSize: '16px', margin: 0, textAlign: 'left' }}>
                                                Certificado de Conclusão
                                            </p>
                                            
                                            <h1 style={{ fontSize: '72px', fontWeight: 900, margin: '15px 0 30px 0', lineHeight: '1', textTransform: 'uppercase', textAlign: 'left' }}>
                                                {badge?.name}
                                            </h1>

                                            <p style={{ fontSize: '24px', color: '#475569', maxWidth: '820px', lineHeight: '1.6', margin: 0, textAlign: 'left' }}>
                                                Certificamos que o aluno(a) <strong style={{ color: '#0f172a' }}>{userName}</strong> concluiu com êxito este treinamento online com carga horária total de <strong>{lessonText}</strong>.
                                            </p>

                                            <div style={{ 
                                                position: 'absolute', 
                                                bottom: '60px', 
                                                left: '110px', 
                                                right: '80px', 
                                                borderTop: '2px solid #f1f5f9', 
                                                paddingTop: '30px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-end'
                                            }}>
                                                <div style={{ width: '30%', textAlign: 'left' }}>
                                                    <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Emitido em</p>
                                                    <p style={{ margin: '5px 0 0 0', fontSize: '18px', fontWeight: 700 }}>
                                                        {new Date(item.earned_at).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>

                                                <div style={{ width: '40%', textAlign: 'center' }}>
                                                    <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0, color: '#94a3b8', fontWeight: 600 }}>
                                                        EMITIDO POR KA ACADEMY
                                                    </p>
                                                </div>

                                                <div style={{ width: '30%', textAlign: 'right' }}>
                                                    <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Professores:</p>
                                                    <p style={{ margin: '5px 0 0 0', fontSize: '18px', fontWeight: 700, lineHeight: '1.2' }}>
                                                        {teacherNames}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* UI DO CARD (MINIATURA) */}
                                    <div className="badge-wrapper">
                                        <img src={badge?.image_url} alt={badge?.name} />
                                    </div>
                                    <h3 className="course-title">{badge?.name}</h3>
                                    <div className="lesson-count-txt">📁 {lessonText} finalizadas</div>
                                    <button className="btn-pdf" onClick={() => handleGeneratePDF(badge?.name, uniqueId)}>
                                        📄 Baixar Certificado
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            <style>{`
                .dashboard-wrapper { display: flex; min-height: 100vh; background-color: #020617; font-family: 'Sora', sans-serif; }
                .achievements-content { flex: 1; padding: 40px; margin-left: 260px; transition: all 0.3s ease; }
                .page-title { color: #fff; font-size: 2.2rem; font-weight: 800; margin-bottom: 25px; }
                .stats-grid { display: flex; gap: 20px; margin-bottom: 40px; }
                .stat-card { background: #09090b; padding: 25px; border-radius: 20px; display: flex; align-items: center; gap: 20px; flex: 1; border: 1px solid rgba(139, 92, 246, 0.1); }
                .stat-icon { font-size: 2.5rem; }
                .stat-value { color: #fff; font-size: 2rem; font-weight: 900; margin: 0; }
                .stat-label { color: #94a3b8; font-size: 0.7rem; font-weight: 800; letter-spacing: 1px; }
                .achievements-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 25px; }
                .achievement-card { background: #09090b; padding: 30px 20px; border-radius: 24px; text-align: center; border: 1px solid rgba(139, 92, 246, 0.1); }
                .badge-wrapper { width: 100px; height: 100px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; background: rgba(139, 92, 246, 0.05); border-radius: 50%; border: 1px solid rgba(139, 92, 246, 0.1); }
                .badge-wrapper img { width: 70px; height: 70px; object-fit: contain; }
                .course-title { color: #fff; font-size: 1.1rem; font-weight: 800; margin-bottom: 12px; }
                .lesson-count-txt { color: #94a3b8; font-size: 0.8rem; margin-bottom: 20px; }
                .btn-pdf { width: 100%; padding: 14px; border-radius: 12px; border: none; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #fff; font-weight: 800; cursor: pointer; }
                @media (max-width: 1024px) { .achievements-content { margin-left: 0; padding: 20px; } }
            `}</style>
        </div>
    );
}