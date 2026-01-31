import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient"; 
import Sidebar from "../components/Sidebar";
import logo from "./assets/ka-tech-logo.png";

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

    useEffect(() => {
        // Atualiza o relógio a cada minuto para checar status de "Ao Vivo"
        const timer = setInterval(() => setNow(new Date()), 60000);
        fetchData();
        return () => clearInterval(timer);
    }, []);

    async function fetchData() {
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
        }
    }

    return (
        <div className="dashboard-layout">
            <Sidebar />

            <style>{`
                .dashboard-layout { display: flex; width: 100%; min-height: 100vh; background: #020617; font-family: 'Sora', sans-serif; color: #fff; }
                .main-content { flex: 1; margin-left: 260px; padding: 40px; width: calc(100% - 260px); max-width: 1600px; }

                .grid-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 25px; }

                /* Efeito de Pulsação para o "Ao Vivo" */
                @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }

                .live-card { 
                    background: rgba(15, 23, 42, 0.7); 
                    border: 1px solid rgba(255, 255, 255, 0.08); 
                    border-radius: 20px; 
                    overflow: hidden; 
                    transition: 0.3s; 
                    cursor: pointer; 
                }
                .live-card.on-air { border-color: #ef4444; box-shadow: 0 0 20px rgba(239, 68, 68, 0.2); }
                .live-card:hover { transform: translateY(-5px); border-color: #8b5cf6; }
                
                .thumb-box { position: relative; width: 100%; aspect-ratio: 16/9; }
                .thumb-box img { width: 100%; height: 100%; object-fit: cover; }
                
                .badge { position: absolute; top: 12px; left: 12px; padding: 5px 12px; border-radius: 8px; font-weight: 900; font-size: 0.65rem; text-transform: uppercase; }
                .badge.agendada { background: #64748b; color: #fff; }
                .badge.ao-vivo { background: #ef4444; color: #fff; animation: pulse 2s infinite; display: flex; align-items: center; gap: 5px; }

                .badge-time { position: absolute; bottom: 12px; right: 12px; background: rgba(0,0,0,0.85); color: #fff; padding: 4px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; }

                .card-body { padding: 18px; }
                .card-title { font-weight: 800; color: #fff; margin-bottom: 6px; font-size: 1.05rem; }
                .card-status { color: #94a3b8; font-size: 0.8rem; display: flex; align-items: center; gap: 6px; }

                /* MOBILE FIX */
                @media (max-width: 1024px) { 
                    .main-content { margin-left: 0; width: 100%; padding: 20px 15px 140px 15px; } 
                    .grid-container { grid-template-columns: 1fr; }
                    .header-title { text-align: center; font-size: 1.6rem !important; }
                }
            `}</style>

            <main className="main-content">
                <header style={{ marginBottom: '40px' }}>
                    <h1 className="header-title" style={{ fontSize: '2.2rem', fontWeight: 900 }}>KA Tech Live Center</h1>
                    <p style={{ color: '#64748b' }}>Aulas e mentorias exclusivas</p>
                </header>

                <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: '#ef4444' }}>●</span> PRÓXIMAS TRANSMISSÕES
                </h2>
                
                <div className="grid-container">
                    {upcoming.map(live => {
                        // Lógica: Se o horário de agendamento já passou, está "AO VIVO"
                        const isLive = new Date(live.scheduled_at) <= now;

                        return (
                            <div key={live.id} className={`live-card ${isLive ? 'on-air' : ''}`} onClick={() => navigate('/live')}>
                                <div className="thumb-box">
                                    {isLive ? (
                                        <span className="badge ao-vivo">
                                            <span style={{ width: '8px', height: '8px', background: '#fff', borderRadius: '50%' }}></span>
                                            AO VIVO AGORA
                                        </span>
                                    ) : (
                                        <span className="badge agendada">AGENDADA</span>
                                    )}
                                    <img src={`https://img.youtube.com/vi/${live.video_id}/maxresdefault.jpg`} alt="" />
                                </div>
                                <div className="card-body">
                                    <div className="card-title">{live.title}</div>
                                    <div className="card-status">
                                        {isLive ? (
                                            <span style={{ color: '#ef4444', fontWeight: 700 }}>Acontecendo agora</span>
                                        ) : (
                                            <>📅 {new Date(live.scheduled_at).toLocaleString('pt-BR')}</>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginTop: '50px', marginBottom: '20px', color: '#fff' }}>
                    <span style={{ color: '#8b5cf6' }}>📚</span> REPLAYS DISPONÍVEIS
                </h2>
                
                <div className="grid-container">
                    {replays.map(live => (
                        <div key={live.id} className="live-card" onClick={() => navigate('/live')}>
                            <div className="thumb-box">
                                <span className="badge-time">⏱️ {live.duration}</span>
                                <img src={`https://img.youtube.com/vi/${live.video_id}/maxresdefault.jpg`} alt="" />
                            </div>
                            <div className="card-body">
                                <div className="card-title">{live.title}</div>
                                <div className="card-status">Replay de {new Date(live.scheduled_at).toLocaleDateString('pt-BR')}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}