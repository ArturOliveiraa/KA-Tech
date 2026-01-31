import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import logo from "../assets/ka-tech-logo.png";

interface Live {
    id: string;
    title: string;
    video_id: string;
    scheduled_at: string;
    duration: string | null;
}

export default function LiveSetup() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [lives, setLives] = useState<Live[]>([]);

    const [title, setTitle] = useState("");
    const [videoId, setVideoId] = useState("");
    const [liveDate, setLiveDate] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        fetchUpcomingLives();
    }, []);

    async function fetchUpcomingLives() {
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from("lives")
            .select("*")
            .gte("scheduled_at", now) 
            .order("scheduled_at", { ascending: true });
        
        if (error) console.error("Erro ao buscar:", error.message);
        if (data) setLives(data);
    }

    // FUNÇÃO PARA ENCERRAR LIVE E CALCULAR DURAÇÃO AUTOMÁTICA
    const handleFinishLive = async (live: Live) => {
        if (!window.confirm("Deseja encerrar esta live agora?")) return;

        const startTime = new Date(live.scheduled_at).getTime();
        const endTime = new Date().getTime();
        const diffInMs = endTime - startTime;

        if (diffInMs <= 0) return alert("A live ainda não atingiu o horário de início agendado!");

        // Cálculo da duração formatada
        const hours = Math.floor(diffInMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
        const finalDuration = `${hours > 0 ? hours + 'h ' : ''}${minutes}min`;

        const { error } = await supabase
            .from("lives")
            .update({ duration: finalDuration })
            .eq("id", live.id);

        if (error) {
            alert("Erro ao finalizar: " + error.message);
        } else {
            alert(`Live finalizada com sucesso! Duração: ${finalDuration}`);
            fetchUpcomingLives(); // Remove da lista de "Próximas"
        }
    };

    const handleSaveLive = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Garante que a data está em formato ISO para o Postgres
        const isoDate = new Date(liveDate).toISOString();
        const liveData = { title, video_id: videoId, scheduled_at: isoDate };

        try {
            const { error } = editingId 
                ? await supabase.from("lives").update(liveData).eq("id", editingId)
                : await supabase.from("lives").insert([liveData]);

            if (error) throw error;

            alert(editingId ? "Agendamento atualizado!" : "Live agendada com sucesso!");
            resetForm();
            fetchUpcomingLives();
        } catch (err: any) {
            console.error("Erro detalhado:", err);
            alert(`Erro ${err.code || 'Postgrest'}: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setTitle(""); setVideoId(""); setLiveDate(""); setEditingId(null);
    };

    return (
        <div className="dashboard-wrapper">
            <Sidebar />
            
            <style>{`
                :root { 
                    --primary: #8b5cf6; 
                    --bg-dark: #020617; 
                    --card-glass: rgba(15, 23, 42, 0.75); 
                    --border: rgba(255, 255, 255, 0.08);
                }
                .dashboard-wrapper { display: flex; width: 100%; min-height: 100vh; background: var(--bg-dark); font-family: 'Sora', sans-serif; color: #fff; overflow-x: hidden; }
                .main-content { flex: 1; margin-left: 260px; padding: 40px; width: calc(100% - 260px); }
                .brand-logo-mobile { display: none !important; } 
                .header-flex { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; flex-wrap: wrap; gap: 20px; }
                .header-flex h1 { font-size: 2.2rem; font-weight: 900; margin: 0; }
                .live-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 30px; align-items: start; }
                .glass-card { background: var(--card-glass); backdrop-filter: blur(20px); border-radius: 30px; padding: 40px; border: 1px solid var(--border); box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
                .form-label { color: #94a3b8; margin-bottom: 12px; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; display: block; }
                .form-input { width: 100%; padding: 18px 22px; border-radius: 18px; background: rgba(0, 0, 0, 0.4); border: 1px solid var(--border); color: #fff; outline: none; font-family: 'Sora'; }
                .btn-submit { width: 100%; padding: 20px; border-radius: 20px; border: none; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; font-weight: 900; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; }
                .course-item { padding: 25px; background: rgba(255,255,255,0.02); border-radius: 24px; margin-bottom: 20px; border: 1px solid var(--border); }
                .action-btn { padding: 10px 15px; border-radius: 12px; border: none; cursor: pointer; font-weight: 800; font-size: 0.7rem; text-transform: uppercase; }
                .action-btn.edit { background: rgba(139, 92, 246, 0.15); color: #c4b5fd; margin-right: 8px; }
                .action-btn.finish { background: #ef4444; color: #fff; }

                @media (max-width: 1024px) { 
                    .main-content { margin-left: 0; padding: 20px; width: 100%; } 
                    .brand-logo-mobile { display: flex !important; width: 100%; justify-content: center; margin-bottom: 30px; }
                    .brand-logo-mobile img { height: 60px; filter: drop-shadow(0 0 10px var(--primary)); }
                    .live-grid { grid-template-columns: 1fr; } 
                }
            `}</style>

            <main className="main-content">
                <div className="brand-logo-mobile">
                    <img src={logo} alt="KA Tech Logo" />
                </div>

                <header className="header-flex">
                    <div>
                        <h1>Agendamento de Live</h1>
                        <p style={{ color: '#64748b', marginTop: '5px' }}>Gerencie as transmissões futuras</p>
                    </div>
                    <button onClick={() => navigate(-1)} className="action-btn edit" style={{ padding: '15px 30px', borderRadius: '18px', fontWeight: 900 }}>VOLTAR</button>
                </header>

                <div className="live-grid">
                    <div className="glass-card">
                        <h2 style={{ color: '#fff', marginBottom: '30px', fontWeight: 900 }}>{editingId ? "✏️ Editar" : "✨ Novo Agendamento"}</h2>
                        <form onSubmit={handleSaveLive}>
                            <div style={{ marginBottom: '20px' }}>
                                <label className="form-label">TÍTULO DA LIVE</label>
                                <input className="form-input" placeholder="Ex: Aula de Faturamento" value={title} onChange={(e) => setTitle(e.target.value)} required />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label className="form-label">YOUTUBE VIDEO ID</label>
                                <input className="form-input" placeholder="ID do vídeo (após o v=)" value={videoId} onChange={(e) => setVideoId(e.target.value)} required />
                            </div>
                            <div style={{ marginBottom: '25px' }}>
                                <label className="form-label">DATA E HORA DE INÍCIO</label>
                                <input type="datetime-local" className="form-input" value={liveDate} onChange={(e) => setLiveDate(e.target.value)} required />
                            </div>
                            <button type="submit" className="btn-submit" disabled={loading}>
                                {loading ? "SALVANDO..." : editingId ? "SALVAR ALTERAÇÕES" : "PUBLICAR LIVE"}
                            </button>
                            {editingId && (
                                <button type="button" onClick={resetForm} style={{ width: '100%', marginTop: '15px', background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontWeight: 900 }}>CANCELAR</button>
                            )}
                        </form>
                    </div>

                    <div className="glass-card">
                        <h2 style={{ color: '#fff', marginBottom: '30px', fontWeight: 900 }}>🚀 Próximas Lives</h2>
                        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            {lives.length === 0 ? (
                                <p style={{ color: '#64748b', textAlign: 'center' }}>Nenhuma live agendada para o futuro.</p>
                            ) : (
                                lives.map(live => (
                                    <div key={live.id} className="course-item" style={{ borderLeft: '4px solid #8b5cf6' }}>
                                        <div style={{ fontWeight: 900, fontSize: '1rem' }}>{live.title}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '8px 0' }}>
                                            📅 {new Date(live.scheduled_at).toLocaleString('pt-BR')}
                                        </div>
                                        <div style={{ display: 'flex' }}>
                                            <button 
                                                onClick={() => { setEditingId(live.id); setTitle(live.title); setVideoId(live.video_id); setLiveDate(new Date(live.scheduled_at).toISOString().slice(0, 16)); }} 
                                                className="action-btn edit"
                                            >EDITAR</button>
                                            <button 
                                                onClick={() => handleFinishLive(live)} 
                                                className="action-btn finish"
                                            >⏹️ ENCERRAR</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}