import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { 
  Trophy, Flame, Download, Sparkles, Award, Calendar, Clock, BookOpen
} from "lucide-react";

// Import da logo padrão como fallback
import defaultLogo from "../assets/ka-tech-logo.png";

export default function Achievements() {
    const [achievements, setAchievements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState("");
    const [stats, setStats] = useState({ totalBadges: 0, totalLessons: 0 });
    const [certLogo, setCertLogo] = useState<string>("");
    
    const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const [profileRes, badgesRes, progressRes, settingsRes] = await Promise.all([
                    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
                    supabase.from("user_badges").select(`
                        earned_at,
                        badges (
                            name, 
                            image_url, 
                            courses (
                                id,
                                total_duration,
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
            setGeneratingPdfId(elementId);
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
            alert("Ocorreu um erro ao gerar seu certificado. Tente novamente.");
        } finally {
            setGeneratingPdfId(null);
        }
    };

    if (loading) return (
        <div className="dashboard-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#020617' }}>
            <Sidebar />
            <div style={{ textAlign: 'center', flex: 1, marginLeft: '260px' }}>
                <Sparkles size={44} color="#8b5cf6" style={{ animation: 'pulse 2s infinite', margin: '0 auto 15px' }} />
                <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800, fontFamily: 'Inter, sans-serif' }}>Polindo seus troféus...</h3>
                <style>{`@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.1); } }`}</style>
            </div>
        </div>
    );

    return (
        <div className="dashboard-wrapper">
            <Sidebar/>

            <main className="achievements-content">
                {/* HERO HEADER - Salão de Troféus */}
                <header className="hero-header">
                    <div className="ambient-glow"></div>
                    <div className="hero-text">
                        <h1 className="page-title">Salão de Troféus</h1>
                        <p className="hero-subtitle">O reflexo do seu esforço e dedicação, <strong style={{ color: '#fff' }}>{userName.split(' ')[0] || 'Aluno'}</strong>.</p>
                    </div>
                    
                    <div className="stats-pills">
                        <div className="stat-pill glass-panel">
                            <div className="stat-icon-wrapper gold-glow"><Trophy size={20} color="#fbbf24" /></div>
                            <div className="stat-info">
                                <span className="stat-value">{stats.totalBadges}</span>
                                <span className="stat-label">Conquistas</span>
                            </div>
                        </div>
                        <div className="stat-pill glass-panel">
                            <div className="stat-icon-wrapper flame-glow"><Flame size={20} color="#f97316" /></div>
                            <div className="stat-info">
                                <span className="stat-value">{stats.totalLessons}</span>
                                <span className="stat-label">Aulas Dominadas</span>
                            </div>
                        </div>
                    </div>
                </header>

                {achievements.length === 0 ? (
                    <div className="empty-state glass-panel">
                        <Award size={80} color="#334155" style={{ marginBottom: '25px', opacity: 0.6 }} />
                        <h3 style={{ color: '#f8fafc', fontSize: '1.8rem', marginBottom: '12px', fontWeight: 800 }}>Sua estante está pronta.</h3>
                        <p style={{ color: '#94a3b8', maxWidth: '450px', margin: '0 auto', lineHeight: '1.6', fontSize: '1.05rem' }}>
                            Você ainda não desbloqueou nenhuma insígnia. Conclua trilhas e treinamentos para eternizar seu conhecimento aqui.
                        </p>
                    </div>
                ) : (
                    <div className="achievements-grid">
                        {achievements.map((item, index) => {
                            const badge = item.badges;
                            const course = Array.isArray(badge?.courses) ? badge.courses[0] : badge?.courses;
                            
                            const totalMinutes = course?.total_duration || 0;
                            const totalHours = (totalMinutes / 60).toFixed(1).replace('.0', '');
                            const durationText = `${totalHours}h`;
                            const lessonCount = course?.lessons?.[0]?.count || 0;

                            const teacherList = course?.course_enrollments
                                ?.filter((e: any) => e.role === 'TEACHER')
                                ?.map((e: any) => e.profiles?.full_name)
                                .filter(Boolean);
                            
                            const teacherNames = (teacherList && teacherList.length > 0) 
                                ? teacherList.join(", ") : "Equipe KA Academy";

                            // Formatação da Data de Conquista
                            const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
                            const earnedDate = new Date(item.earned_at).toLocaleDateString('pt-BR', dateOptions);

                            const uniqueId = `pdf-template-${index}`;
                            const isGenerating = generatingPdfId === uniqueId;

                            return (
                                <div key={index} className="achievement-card glass-panel" style={{ animationDelay: `${index * 0.15}s` }}>
                                    
                                    {/* TEMPLATE DO PDF (Oculto - Não alterar estrutura) */}
                                    <div id={uniqueId} style={{ display: 'none', width: '1000px', height: '650px', backgroundColor: '#fff', position: 'relative', fontFamily: 'sans-serif', boxSizing: 'border-box', color: '#0f172a' }}>
                                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '30px', backgroundColor: '#7c3aed' }}></div>
                                        <div style={{ padding: '60px 80px 60px 110px' }}>
                                            <div style={{ marginBottom: '50px', textAlign: 'left' }}>
                                                <img src={certLogo} alt="Logo" style={{ height: '55px', objectFit: 'contain' }} />
                                            </div>
                                            <p style={{ color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: 800, fontSize: '16px', margin: 0, textAlign: 'left' }}>Certificado de Conclusão</p>
                                            <h1 style={{ fontSize: '72px', fontWeight: 900, margin: '15px 0 30px 0', lineHeight: '1', textTransform: 'uppercase', textAlign: 'left' }}>{badge?.name}</h1>
                                            <p style={{ fontSize: '24px', color: '#475569', maxWidth: '820px', lineHeight: '1.6', margin: 0, textAlign: 'left' }}>
                                                Certificamos que o aluno(a) <strong style={{ color: '#0f172a' }}>{userName}</strong> concluiu com êxito este treinamento online com carga horária total de <strong>{durationText}</strong>.
                                            </p>
                                            <div style={{ position: 'absolute', bottom: '60px', left: '110px', right: '80px', borderTop: '2px solid #f1f5f9', paddingTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                <div style={{ width: '30%', textAlign: 'left' }}>
                                                    <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Emitido em</p>
                                                    <p style={{ margin: '5px 0 0 0', fontSize: '18px', fontWeight: 700 }}>{new Date(item.earned_at).toLocaleDateString('pt-BR')}</p>
                                                </div>
                                                <div style={{ width: '40%', textAlign: 'center' }}>
                                                    <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0, color: '#94a3b8', fontWeight: 600 }}>EMITIDO POR KA ACADEMY</p>
                                                </div>
                                                <div style={{ width: '30%', textAlign: 'right' }}>
                                                    <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Professores:</p>
                                                    <p style={{ margin: '5px 0 0 0', fontSize: '18px', fontWeight: 700, lineHeight: '1.2' }}>{teacherNames}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* VITRINE DA INSÍGNIA */}
                                    <div className="badge-showcase">
                                        <div className="spotlight"></div>
                                        <div className="badge-image-container">
                                            {badge?.image_url ? (
                                                <img src={badge.image_url} alt={badge.name} className="floating-badge" />
                                            ) : (
                                                <Award size={60} color="#cbd5e1" className="floating-badge" />
                                            )}
                                        </div>
                                        <div className="pedestal"></div>
                                    </div>
                                    
                                    {/* INFORMAÇÕES DO CARD */}
                                    <div className="card-info">
                                        <div className="date-pill">
                                            <Calendar size={12} /> Conquistado em {earnedDate}
                                        </div>
                                        
                                        <h3 className="course-title" title={badge?.name}>{badge?.name}</h3>
                                        
                                        <div className="course-meta">
                                            <span><Clock size={14} /> {durationText}</span>
                                            <span className="meta-dot">•</span>
                                            <span><BookOpen size={14} /> {lessonCount} aulas</span>
                                        </div>
                                        
                                        <button 
                                            className="btn-cert" 
                                            onClick={() => handleGeneratePDF(badge?.name, uniqueId)}
                                            disabled={isGenerating}
                                        >
                                            {isGenerating ? (
                                                <><Sparkles size={18} className="animate-spin-slow" /> Gerando PDF...</>
                                            ) : (
                                                <><Download size={18} /> Baixar Certificado</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            <style>{`
                :root { 
                    --primary: #8b5cf6; --primary-hover: #7c3aed;
                    --bg-dark: #020617; 
                    --card-glass: rgba(15, 23, 42, 0.5); 
                    --border: rgba(255, 255, 255, 0.08);
                }

                * { box-sizing: border-box; }

                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); filter: drop-shadow(0 15px 25px rgba(0,0,0,0.6)); }
                    50% { transform: translateY(-12px) rotate(2deg); filter: drop-shadow(0 25px 35px rgba(0,0,0,0.4)); }
                }
                @keyframes spin-slow { 100% { transform: rotate(360deg); } }
                .animate-spin-slow { animation: spin-slow 3s linear infinite; }

                .dashboard-wrapper { display: flex; min-height: 100vh; background-color: var(--bg-dark); font-family: 'Inter', system-ui, sans-serif; overflow-x: hidden; }
                .achievements-content { flex: 1; padding: 60px; margin-left: 260px; transition: all 0.3s ease; width: calc(100% - 260px); }
                
                /* HERO HEADER */
                .hero-header { 
                    position: relative; margin-bottom: 60px; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 30px;
                    padding-bottom: 40px; border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                .ambient-glow {
                    position: absolute; top: -50px; left: -50px; width: 300px; height: 300px;
                    background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%); pointer-events: none; z-index: 0;
                }
                .hero-text { position: relative; z-index: 1; }
                .page-title { color: #fff; font-size: 3rem; font-weight: 900; margin: 0; letter-spacing: -1.5px; background: linear-gradient(to right, #ffffff, #c4b5fd); -webkit-background-clip: text; -webkit-text-fill-color: transparent;}
                .hero-subtitle { color: #94a3b8; font-size: 1.15rem; margin: 10px 0 0 0; font-weight: 500;}

                /* Pílulas de Estatísticas */
                .stats-pills { display: flex; gap: 15px; flex-wrap: wrap; position: relative; z-index: 1;}
                .stat-pill { 
                    display: flex; align-items: center; gap: 16px; padding: 16px 24px; border-radius: 20px;
                }
                .glass-panel {
                    background: var(--card-glass); backdrop-filter: blur(20px);
                    border: 1px solid var(--border); box-shadow: 0 20px 40px -10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
                }
                .stat-icon-wrapper {
                    width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center;
                    background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.05);
                }
                .gold-glow { box-shadow: inset 0 0 15px rgba(251, 191, 36, 0.1), 0 0 10px rgba(251, 191, 36, 0.1); border-color: rgba(251, 191, 36, 0.2); }
                .flame-glow { box-shadow: inset 0 0 15px rgba(249, 115, 22, 0.1), 0 0 10px rgba(249, 115, 22, 0.1); border-color: rgba(249, 115, 22, 0.2); }
                
                .stat-info { display: flex; flex-direction: column; justify-content: center; }
                .stat-value { color: #f8fafc; font-size: 1.6rem; font-weight: 900; line-height: 1; margin-bottom: 4px; }
                .stat-label { color: #64748b; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;}

                /* Empty State */
                .empty-state { text-align: center; padding: 100px 20px; border-radius: 30px; margin-top: 20px; border-style: dashed; border-color: rgba(255,255,255,0.1);}

                /* Cards de Colecionador */
                .achievements-grid { 
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 35px; padding-bottom: 50px;
                }
                
                .achievement-card { 
                    border-radius: 28px; text-align: center; display: flex; flex-direction: column; overflow: hidden;
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); position: relative;
                    animation: fadeUp 0.6s ease-out forwards; opacity: 0;
                    border-top: 1px solid rgba(255,255,255,0.15); /* Efeito de luz no topo do vidro */
                }
                .achievement-card:hover {
                    transform: translateY(-10px); border-color: rgba(139, 92, 246, 0.4);
                    box-shadow: 0 30px 60px -15px rgba(0,0,0,0.6), 0 0 40px rgba(139, 92, 246, 0.15);
                }

                /* Vitrine / Spotlight */
                .badge-showcase {
                    position: relative; height: 220px; display: flex; align-items: center; justify-content: center;
                    background: linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(2, 6, 23, 0.9) 100%);
                }
                .spotlight {
                    position: absolute; top: -50%; left: 50%; transform: translateX(-50%);
                    width: 200px; height: 300px; background: radial-gradient(ellipse at top, rgba(139, 92, 246, 0.25) 0%, transparent 70%);
                    pointer-events: none; z-index: 1;
                }
                .badge-image-container {
                    position: relative; z-index: 3; width: 130px; height: 130px;
                    display: flex; align-items: center; justify-content: center;
                }
                .floating-badge {
                    width: 100%; height: 100%; object-fit: contain;
                    animation: float 6s ease-in-out infinite;
                }
                .pedestal {
                    position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
                    width: 140px; height: 20px; background: radial-gradient(ellipse at center, rgba(139, 92, 246, 0.3) 0%, transparent 70%);
                    border-radius: 50%; filter: blur(4px); z-index: 2;
                }

                /* Informações e Botão */
                .card-info { padding: 30px 24px; display: flex; flex-direction: column; flex: 1; background: rgba(15, 23, 42, 0.3); align-items: center;}
                
                .date-pill {
                    display: inline-flex; align-items: center; gap: 6px; margin-bottom: 16px;
                    background: rgba(0,0,0,0.4); padding: 6px 14px; border-radius: 20px;
                    font-size: 0.75rem; color: #94a3b8; font-weight: 600; border: 1px solid rgba(255,255,255,0.05);
                }

                .course-title { 
                    color: #f8fafc; font-size: 1.25rem; font-weight: 800; margin: 0 0 16px 0; line-height: 1.4;
                    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
                    text-shadow: 0 2px 10px rgba(0,0,0,0.5);
                }
                
                .course-meta { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 30px; color: #64748b; font-size: 0.9rem; font-weight: 500;}
                .meta-dot { font-size: 1rem; opacity: 0.5; }

                .btn-cert { 
                    margin-top: auto; width: 100%; padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); 
                    background: rgba(255,255,255,0.03); color: #cbd5e1; font-weight: 700; font-size: 0.95rem; cursor: pointer; 
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                }
                .achievement-card:hover .btn-cert:not(:disabled) {
                    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%); 
                    color: #fff; border-color: transparent;
                    box-shadow: 0 10px 25px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255,255,255,0.2);
                }
                .btn-cert:active:not(:disabled) { transform: scale(0.96); }
                .btn-cert:disabled { opacity: 0.7; cursor: not-allowed; background: #1e293b; color: #94a3b8; }

                /* Mobile Adaptations */
                @media (max-width: 1024px) { 
                    .achievements-content { margin-left: 0; padding: 40px 30px 100px 30px; width: 100%; } 
                }

                @media (max-width: 768px) {
                    .achievements-content { padding: 30px 20px 100px 20px; }
                    .hero-header { flex-direction: column; align-items: flex-start; gap: 25px; padding-bottom: 30px;}
                    .page-title { font-size: 2.2rem; }
                    .stats-pills { width: 100%; flex-direction: column; }
                    .stat-pill { width: 100%; }
                    .achievements-grid { grid-template-columns: 1fr; gap: 25px;} 
                }
            `}</style>
        </div>
    );
}