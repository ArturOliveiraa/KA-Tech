import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient"; 
import Sidebar from "../components/Sidebar";
import { 
  Radio, PlaySquare, Calendar, Clock, Video, PlayCircle, Sparkles 
} from "lucide-react";

interface Live {
    id: string;
    title: string;
    video_id: string;
    scheduled_at: string;
    duration: string | null;
}

export default function LiveHub() {
    const navigate = useNavigate();
    const [upcoming, setUpcoming] = useState<Live[]>([]);
    const [replays, setReplays] = useState<Live[]>([]);
    const [now, setNow] = useState(new Date());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        fetchData();
        return () => clearInterval(timer);
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const { data: upcomingData } = await supabase
                .from("lives")
                .select("*")
                .is("duration", null)
                .order("scheduled_at", { ascending: true });

            const { data: replaysData } = await supabase
                .from("lives")
                .select("*")
                .not("duration", "is", null)
                .order("scheduled_at", { ascending: false });

            if (upcomingData) setUpcoming(upcomingData);
            if (replaysData) setReplays(replaysData);
        } catch (error) {
            console.error("Erro:", error);
        } finally {
            setLoading(false);
        }
    }

    // Função que extrai apenas o ID limpo de 11 caracteres
    const getYouTubeId = (urlOrId: string) => {
        if (!urlOrId) return "";
        if (urlOrId.length === 11 && !urlOrId.includes("/")) return urlOrId;
        
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const match = urlOrId.match(regex);
        return match ? match[1] : urlOrId;
    };

    const handleWatch = (live: Live) => {
        navigate('/live', { 
            state: { 
                videoId: getYouTubeId(live.video_id),
                isReplay: !!live.duration 
            } 
        });
    };

    if (loading) return (
        <div className="dashboard-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <Sidebar />
           <div style={{ textAlign: 'center', flex: 1, marginLeft: '260px' }}>
              <Radio size={44} color="#8b5cf6" style={{ animation: 'pulse 2s infinite', margin: '0 auto 15px' }} />
              <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800, fontFamily: 'Inter, sans-serif' }}>Sintonizando frequências...</h3>
              <style>{`@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.1); } }`}</style>
           </div>
        </div>
    );

    return (
        <div className="dashboard-layout">
            <Sidebar />

            <style>{`
                :root { 
                    --primary: #8b5cf6; 
                    --bg-dark: #020617; 
                    --card-glass: rgba(15, 23, 42, 0.6); 
                    --border: rgba(255, 255, 255, 0.08);
                }

                * { box-sizing: border-box; }

                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes pulseRed {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                    70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }

                .dashboard-layout { display: flex; width: 100%; min-height: 100vh; background: var(--bg-dark); font-family: 'Inter', system-ui, sans-serif; color: #fff; overflow-x: hidden;}
                .main-content { flex: 1; margin-left: 260px; padding: 50px 60px; transition: 0.3s ease; width: calc(100% - 260px); max-width: 1800px; margin-right: auto;}
                
                /* HERO HEADER */
                .hero-header { 
                    position: relative; margin-bottom: 60px; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 30px;
                    padding-bottom: 30px; border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                .ambient-glow {
                    position: absolute; top: -50px; left: -50px; width: 300px; height: 300px;
                    background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%); pointer-events: none; z-index: 0;
                }
                .hero-text { position: relative; z-index: 1; }
                .page-title { color: #fff; font-size: 3rem; font-weight: 900; margin: 0; letter-spacing: -1.5px; background: linear-gradient(to right, #ffffff, #c4b5fd); -webkit-background-clip: text; -webkit-text-fill-color: transparent;}
                .hero-subtitle { color: #94a3b8; font-size: 1.15rem; margin: 10px 0 0 0; font-weight: 500;}

                .section-title { 
                    font-size: 1.4rem; font-weight: 900; margin-bottom: 25px; display: flex; align-items: center; gap: 12px; color: #f8fafc; letter-spacing: -0.5px;
                }

                .grid-container { 
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 30px; margin-bottom: 60px;
                }

                /* CARDS (Estilo Streaming) */
                .live-card { 
                    background: var(--card-glass); border: 1px solid var(--border); border-radius: 24px; overflow: hidden; 
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); cursor: pointer; display: flex; flex-direction: column;
                    backdrop-filter: blur(12px); box-shadow: 0 15px 35px -10px rgba(0,0,0,0.5);
                    animation: fadeUp 0.6s ease-out forwards; opacity: 0;
                }
                .live-card:hover { 
                    transform: translateY(-8px); border-color: rgba(139, 92, 246, 0.5); 
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7), 0 0 30px rgba(139, 92, 246, 0.15); 
                }
                
                .live-card.on-air { border-color: rgba(239, 68, 68, 0.4); box-shadow: 0 15px 35px rgba(239, 68, 68, 0.15); }
                .live-card.on-air:hover { border-color: #ef4444; box-shadow: 0 25px 50px rgba(239, 68, 68, 0.25), 0 0 30px rgba(239, 68, 68, 0.2); }
                
                /* THUMBNAIL */
                .thumb-box { position: relative; width: 100%; aspect-ratio: 16/9; overflow: hidden; background: #000; }
                .thumb-img { width: 100%; height: 100%; object-fit: cover; opacity: 0.9; transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
                .live-card:hover .thumb-img { transform: scale(1.08); opacity: 1; }
                
                /* Overlay Gradient */
                .thumb-overlay {
                    position: absolute; inset: 0; z-index: 1; pointer-events: none;
                    background: linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 40%, rgba(0,0,0,0.6) 100%);
                }

                /* BADGES */
                .badge { 
                    position: absolute; top: 16px; left: 16px; padding: 6px 14px; border-radius: 12px; font-weight: 800; font-size: 0.75rem; 
                    text-transform: uppercase; z-index: 2; backdrop-filter: blur(10px); letter-spacing: 0.5px;
                }
                .badge.agendada { background: rgba(30, 41, 59, 0.8); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.1); }
                .badge.ao-vivo { 
                    background: #ef4444; color: #fff; display: flex; align-items: center; gap: 6px; 
                    box-shadow: 0 0 15px rgba(239, 68, 68, 0.5); animation: pulseRed 2s infinite; border: 1px solid #fca5a5;
                }
                
                .badge-time { 
                    position: absolute; bottom: 16px; right: 16px; background: rgba(2, 6, 23, 0.85); color: #fff; 
                    padding: 6px 12px; border-radius: 10px; font-size: 0.8rem; font-weight: 700; z-index: 2;
                    backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 6px;
                }

                .card-body { padding: 24px; display: flex; flex-direction: column; flex: 1; position: relative; z-index: 2; background: var(--card-glass); }
                .card-title { font-weight: 800; color: #f8fafc; margin-bottom: 12px; font-size: 1.2rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                
                .card-meta { color: #94a3b8; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; font-weight: 500; margin-top: auto;}
                .card-meta.live-now { color: #ef4444; font-weight: 700; }
                
                /* Play Button Overlay */
                .play-overlay {
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.8);
                    width: 60px; height: 60px; background: rgba(139, 92, 246, 0.9); border-radius: 50%;
                    display: flex; align-items: center; justify-content: center; z-index: 3;
                    opacity: 0; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    box-shadow: 0 10px 25px rgba(139, 92, 246, 0.5);
                }
                .live-card:hover .play-overlay { opacity: 1; transform: translate(-50%, -50%) scale(1); }

                /* Empty State */
                .empty-state {
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    padding: 60px 20px; background: rgba(30, 41, 59, 0.3); border-radius: 24px; border: 2px dashed rgba(255,255,255,0.05);
                    text-align: center; margin-bottom: 60px;
                }

                @media (max-width: 1024px) { 
                    .main-content { margin-left: 0; width: 100%; padding: 40px 20px 100px 20px; } 
                    .grid-container { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;}
                    .hero-header { flex-direction: column; align-items: flex-start; gap: 20px; }
                    .page-title { font-size: 2.2rem; }
                }
            `}</style>

            <main className="main-content">
                {/* HERO HEADER */}
                <header className="hero-header">
                    <div className="ambient-glow"></div>
                    <div className="hero-text">
                        <h1 className="page-title">Live Center</h1>
                        <p className="hero-subtitle">Transmissões ao vivo, mentorias e biblioteca de replays.</p>
                    </div>
                </header>

                {/* SESSÃO 1: PRÓXIMAS TRANSMISSÕES */}
                <h2 className="section-title">
                    <Radio size={24} color="#ef4444" /> Transmissões Oficiais
                </h2>
                
                {upcoming.length === 0 ? (
                    <div className="empty-state">
                        <Calendar size={48} color="#475569" style={{ marginBottom: '15px' }} />
                        <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '8px' }}>Agenda Livre</h3>
                        <p style={{ color: '#94a3b8' }}>Nenhuma transmissão programada para os próximos dias.</p>
                    </div>
                ) : (
                    <div className="grid-container">
                        {upcoming.map((live, index) => {
                            const isLive = new Date(live.scheduled_at) <= now;
                            const cleanId = getYouTubeId(live.video_id);
                            
                            return (
                                <div key={live.id} className={`live-card ${isLive ? 'on-air' : ''}`} onClick={() => handleWatch(live)} style={{ animationDelay: `${index * 0.1}s` }}>
                                    <div className="thumb-box">
                                        <div className="thumb-overlay"></div>
                                        <div className="play-overlay"><PlayCircle size={32} color="#fff" fill="#fff" /></div>
                                        
                                        {isLive ? (
                                            <span className="badge ao-vivo">
                                                <Radio size={14} /> AO VIVO AGORA
                                            </span>
                                        ) : (
                                            <span className="badge agendada">Agendada</span>
                                        )}
                                        
                                        <img 
                                            src={`https://img.youtube.com/vi/${cleanId}/maxresdefault.jpg`} 
                                            onError={(e) => (e.currentTarget.src = `https://img.youtube.com/vi/${cleanId}/hqdefault.jpg`)}
                                            alt={live.title} 
                                            className="thumb-img" 
                                        />
                                    </div>
                                    <div className="card-body">
                                        <h3 className="card-title" title={live.title}>{live.title}</h3>
                                        <div className={`card-meta ${isLive ? 'live-now' : ''}`}>
                                            {isLive ? (
                                                <><Sparkles size={16} /> Acontecendo agora</>
                                            ) : (
                                                <><Calendar size={16} /> {new Date(live.scheduled_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* SESSÃO 2: REPLAYS (ACERVO) */}
                <h2 className="section-title" style={{ marginTop: '20px' }}>
                    <PlaySquare size={24} color="#8b5cf6" /> Biblioteca de Replays
                </h2>
                
                {replays.length === 0 ? (
                    <div className="empty-state">
                        <Video size={48} color="#475569" style={{ marginBottom: '15px' }} />
                        <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '8px' }}>Acervo Vazio</h3>
                        <p style={{ color: '#94a3b8' }}>Os replays das transmissões aparecerão aqui.</p>
                    </div>
                ) : (
                    <div className="grid-container">
                        {replays.map((live, index) => {
                            const cleanId = getYouTubeId(live.video_id);
                            
                            return (
                                <div key={live.id} className="live-card" onClick={() => handleWatch(live)} style={{ animationDelay: `${(upcoming.length + index) * 0.1}s` }}>
                                    <div className="thumb-box">
                                        <div className="thumb-overlay"></div>
                                        <div className="play-overlay"><PlayCircle size={32} color="#fff" fill="#fff" /></div>
                                        
                                        {live.duration && (
                                            <span className="badge-time"><Clock size={14} /> {live.duration}</span>
                                        )}
                                        
                                        <img 
                                            src={`https://img.youtube.com/vi/${cleanId}/maxresdefault.jpg`} 
                                            onError={(e) => (e.currentTarget.src = `https://img.youtube.com/vi/${cleanId}/hqdefault.jpg`)}
                                            alt={live.title} 
                                            className="thumb-img" 
                                        />
                                    </div>
                                    <div className="card-body">
                                        <h3 className="card-title" title={live.title}>{live.title}</h3>
                                        <div className="card-meta">
                                            <Calendar size={16} /> Replay de {new Date(live.scheduled_at).toLocaleDateString('pt-BR')}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}