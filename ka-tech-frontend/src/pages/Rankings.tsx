import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import Avatar from "../components/Avatar";

type RankingCategory = "badges" | "maratonistas" | "tempo" | "on_fire";

interface RankingUser {
    full_name: string;
    avatar_url: string | null;
    score: number;
}

export default function Rankings() {
    const [loading, setLoading] = useState(true);
    // REMOVIDO: userRole state
    const [activeCategory, setActiveCategory] = useState<RankingCategory>("badges");
    const [rankingList, setRankingList] = useState<RankingUser[]>([]);

    // REMOVIDO: useEffect que buscava o cargo do usuário (não utilizado nesta página)

    useEffect(() => {
        loadRanking();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCategory]);

    const loadRanking = async () => {
        setLoading(true);
        let tableName = "";
        let scoreColumn = "";

        switch (activeCategory) {
            case "badges": tableName = "ranking_badges"; scoreColumn = "total_badges"; break;
            case "maratonistas": tableName = "ranking_maratonistas"; scoreColumn = "lessons_completed"; break;
            case "tempo": tableName = "ranking_tempo_voo"; scoreColumn = "total_time_spent"; break;
            case "on_fire": tableName = "ranking_on_fire"; scoreColumn = "active_days"; break;
        }

        const { data, error } = await supabase
            .from(tableName)
            .select(`full_name, avatar_url, ${scoreColumn}`)
            .limit(10);

        if (!error && data) {
            const formattedData: RankingUser[] = data.map((item: any) => ({
                full_name: item.full_name,
                avatar_url: item.avatar_url,
                score: item[scoreColumn]
            }));
            setRankingList(formattedData);
        }
        setLoading(false);
    };

    const formatScore = (score: number) => {
        if (activeCategory === "badges") return `${score} insígnias`;
        if (activeCategory === "tempo") return `${score} min`;
        if (activeCategory === "maratonistas") return `${score} aulas`;
        if (activeCategory === "on_fire") {
            let fireEmoji = "🔥";
            if (score >= 7) fireEmoji = "🔥⚡"; 
            if (score >= 30) fireEmoji = "🔥👑"; 

            return (
                <span style={{
                    color: score > 0 ? '#f59e0b' : '#64748b',
                    fontWeight: 900,
                    textShadow: score >= 7 ? '0 0 10px rgba(245, 158, 11, 0.5)' : 'none'
                }}>
                    {score} dias {fireEmoji}
                </span>
            );
        }
        return score;
    };

    const categories = [
        { id: "badges", label: "🏆 Reis das Insígnias" },
        { id: "maratonistas", label: "⚡ Maratonistas" },
        { id: "tempo", label: "⏳ Tempo de Voo" },
        { id: "on_fire", label: "🔥 Ofensiva" }
    ];

    const podium = rankingList.slice(0, 3);
    const remainders = rankingList.slice(3, 10);

    return (
        <div className="dashboard-wrapper" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#020617', fontFamily: "'Sora', sans-serif" }}>
            <Sidebar/>

            <main style={{ flex: 1, padding: '40px', marginLeft: '260px' }}>
                <header style={{ marginBottom: '40px' }}>
                    <h1 style={{ color: '#fff', fontSize: '2.2rem', fontWeight: 800 }}>Hall da Fama</h1>
                    <p style={{ color: '#94a3b8' }}>A elite da KAtech. Onde os melhores se encontram.</p>
                </header>

                <div className="ranking-tabs" style={{ display: 'flex', gap: '15px', marginBottom: '40px', flexWrap: 'wrap' }}>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id as RankingCategory)}
                            className={`tab-btn ${activeCategory === cat.id ? 'active' : ''}`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {loading ? <p style={{ color: '#8b5cf6', textAlign: 'center' }}>Sincronizando pódio...</p> : (
                    <>
                        <div className="podium-container">
                            {/* 2º LUGAR */}
                            {podium[1] && (
                                <div className="podium-item silver">
                                    <div className="podium-rank">2</div>
                                    <div className="avatar-wrapper-podium" style={{ width: '70px', height: '70px' }}>
                                        <Avatar src={podium[1].avatar_url} name={podium[1].full_name} />
                                    </div>
                                    <span className="podium-name">{podium[1].full_name}</span>
                                    <span className="podium-score">{formatScore(podium[1].score)}</span>
                                </div>
                            )}

                            {/* 1º LUGAR */}
                            {podium[0] && (
                                <div className="podium-item gold">
                                    <div className="podium-rank">1</div>
                                    <div className="crown">👑</div>
                                    <div className="avatar-wrapper-podium" style={{ width: '90px', height: '90px' }}>
                                        <Avatar src={podium[0].avatar_url} name={podium[0].full_name} />
                                    </div>
                                    <span className="podium-name">{podium[0].full_name}</span>
                                    <span className="podium-score">{formatScore(podium[0].score)}</span>
                                </div>
                            )}

                            {/* 3º LUGAR */}
                            {podium[2] && (
                                <div className="podium-item bronze">
                                    <div className="podium-rank">3</div>
                                    <div className="avatar-wrapper-podium" style={{ width: '70px', height: '70px' }}>
                                        <Avatar src={podium[2].avatar_url} name={podium[2].full_name} />
                                    </div>
                                    <span className="podium-name">{podium[2].full_name}</span>
                                    <span className="podium-score">{formatScore(podium[2].score)}</span>
                                </div>
                            )}
                        </div>

                        <div className="ranking-list-card">
                            <table className="ranking-table">
                                <thead>
                                    <tr>
                                        <th>RANK</th>
                                        <th>ESTUDANTE</th>
                                        <th style={{ textAlign: 'right' }}>PONTUAÇÃO</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {remainders.map((user, index) => (
                                        <tr key={index}>
                                            <td style={{ fontWeight: 800, color: '#94a3b8' }}>#{index + 4}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '30px', height: '30px' }}>
                                                        <Avatar src={user.avatar_url} name={user.full_name} />
                                                    </div>
                                                    <span style={{ color: '#fff', fontWeight: 600 }}>{user.full_name}</span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 800, color: '#8b5cf6' }}>
                                                {formatScore(user.score)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </main>

            <style>{`
                .tab-btn { background: #0f172a; color: #94a3b8; border: 1px solid rgba(139, 92, 246, 0.2); padding: 10px 20px; border-radius: 12px; cursor: pointer; transition: 0.3s; font-family: 'Sora', sans-serif; font-size: 0.8rem; font-weight: 600; }
                .tab-btn.active { background: #8b5cf6; color: #fff; box-shadow: 0 0 15px rgba(139, 92, 246, 0.4); border-color: #8b5cf6; }
                
                .podium-container { display: flex; align-items: flex-end; justify-content: center; gap: 20px; margin-bottom: 50px; padding: 20px; }
                .podium-item { display: flex; flex-direction: column; align-items: center; background: #09090b; padding: 20px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); min-width: 180px; position: relative; }
                .podium-item.gold { border-color: #ffd700; transform: scale(1.1); z-index: 2; }
                .podium-item.silver { border-color: #c0c0c0; }
                .podium-item.bronze { border-color: #cd7f32; }

                .avatar-wrapper-podium { overflow: hidden; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #1e293b; }
                
                .podium-rank { position: absolute; top: -15px; background: #020617; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 2px solid #1f2937; border-radius: 50%; font-weight: 900; font-size: 0.8rem; color: #fff; }
                .podium-name { color: #fff; font-weight: 700; margin-top: 12px; font-size: 0.9rem; }
                .podium-score { color: #8b5cf6; font-weight: 800; font-size: 1.1rem; }
                .crown { font-size: 1.5rem; margin-bottom: 5px; }

                .ranking-list-card { background: #09090b; border-radius: 20px; border: 1px solid rgba(139, 92, 246, 0.08); padding: 20px; }
                .ranking-table { width: 100%; border-collapse: collapse; }
                .ranking-table th { text-align: left; padding: 12px; color: #64748b; font-size: 0.7rem; border-bottom: 1px solid #1f2937; }
                .ranking-table td { padding: 15px 12px; border-bottom: 1px solid #111827; }
            `}</style>
        </div>
    );
}