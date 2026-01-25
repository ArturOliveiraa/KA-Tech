import React, { useEffect, useState, useCallback } from "react";
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
    const [activeCategory, setActiveCategory] = useState<RankingCategory>("badges");
    const [rankingList, setRankingList] = useState<RankingUser[]>([]);

    const loadRanking = useCallback(async () => {
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
    }, [activeCategory]);

    useEffect(() => {
        loadRanking();
    }, [loadRanking]);

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
                    {score} {fireEmoji}
                </span>
            );
        }
        return score;
    };

    const categories = [
        { id: "badges", label: "🏆 Reis" }, 
        { id: "maratonistas", label: "⚡ Maratonas" },
        { id: "tempo", label: "⏳ Tempo" },
        { id: "on_fire", label: "🔥 Ofensiva" }
    ];

    const podium = rankingList.slice(0, 3);
    const remainders = rankingList.slice(3, 10);

    return (
        <div className="dashboard-wrapper">
            <Sidebar/>

            <main className="ranking-main-content">
                {/* Logo removida daqui para não aparecer no mobile */}

                <header className="ranking-header">
                    <h1>Hall da Fama</h1>
                    <p>A elite da <strong style={{color: '#8b5cf6'}}>KA Tech</strong>.</p>
                </header>

                <div className="ranking-tabs">
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

                {loading ? (
                    <div className="loading-state">Sincronizando pódio...</div>
                ) : (
                    <>
                        <div className="podium-container">
                            {/* 2º LUGAR */}
                            {podium[1] && (
                                <div className="podium-item silver">
                                    <div className="podium-rank">2</div>
                                    <div className="avatar-wrapper-podium silver-border">
                                        <Avatar src={podium[1].avatar_url} name={podium[1].full_name} />
                                    </div>
                                    <span className="podium-name">{podium[1].full_name.split(' ')[0]}</span>
                                    <span className="podium-score">{formatScore(podium[1].score)}</span>
                                </div>
                            )}

                            {/* 1º LUGAR */}
                            {podium[0] && (
                                <div className="podium-item gold">
                                    <div className="podium-rank">1</div>
                                    <div className="crown">👑</div>
                                    <div className="avatar-wrapper-podium gold-border first-place">
                                        <Avatar src={podium[0].avatar_url} name={podium[0].full_name} />
                                    </div>
                                    <span className="podium-name">{podium[0].full_name.split(' ')[0]}</span>
                                    <span className="podium-score">{formatScore(podium[0].score)}</span>
                                </div>
                            )}

                            {/* 3º LUGAR */}
                            {podium[2] && (
                                <div className="podium-item bronze">
                                    <div className="podium-rank">3</div>
                                    <div className="avatar-wrapper-podium bronze-border">
                                        <Avatar src={podium[2].avatar_url} name={podium[2].full_name} />
                                    </div>
                                    <span className="podium-name">{podium[2].full_name.split(' ')[0]}</span>
                                    <span className="podium-score">{formatScore(podium[2].score)}</span>
                                </div>
                            )}
                        </div>

                        <div className="ranking-list-card">
                            <div className="table-responsive">
                                <table className="ranking-table">
                                    <thead>
                                        <tr>
                                            <th>RANK</th>
                                            <th>ESTUDANTE</th>
                                            <th style={{ textAlign: 'right' }}>PONTOS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {remainders.map((user, index) => (
                                            <tr key={index}>
                                                <td className="rank-number">#{index + 4}</td>
                                                <td>
                                                    <div className="user-info-cell">
                                                        <div className="avatar-mini">
                                                            <Avatar src={user.avatar_url} name={user.full_name} />
                                                        </div>
                                                        <span className="user-name-text">{user.full_name}</span>
                                                    </div>
                                                </td>
                                                <td className="score-cell">
                                                    {formatScore(user.score)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </main>

            <style>{`
                :root { --primary: #8b5cf6; --bg-dark: #020617; --card-glass: rgba(15, 23, 42, 0.7); }
                * { box-sizing: border-box; }

                .dashboard-wrapper { display: flex; min-height: 100vh; background-color: #020617; font-family: 'Sora', sans-serif; overflow-x: hidden; }
                
                .ranking-main-content { 
                    flex: 1; 
                    padding: 40px; 
                    margin-left: 260px; 
                    transition: 0.3s;
                    width: calc(100% - 260px);
                    max-width: 100%;
                }

                .ranking-header h1 { color: #fff; font-size: 2.2rem; font-weight: 900; margin: 0; letter-spacing: -1px; }
                .ranking-header p { color: #94a3b8; margin-top: 5px; font-size: 1rem; }

                .ranking-tabs { display: flex; gap: 8px; margin-bottom: 30px; flex-wrap: wrap; margin-top: 20px; }
                
                .tab-btn { 
                    background: #0f172a; color: #94a3b8; border: 1px solid rgba(139, 92, 246, 0.2); 
                    padding: 10px 15px; border-radius: 12px; cursor: pointer; transition: 0.3s; 
                    font-family: 'Sora'; font-size: 0.75rem; font-weight: 700; 
                }
                .tab-btn.active { background: #8b5cf6; color: #fff; box-shadow: 0 0 15px rgba(139, 92, 246, 0.4); border-color: #8b5cf6; }
                
                .loading-state { color: #8b5cf6; text-align: center; padding: 100px; font-weight: 800; font-size: 1.2rem; }

                .podium-container { display: flex; align-items: flex-end; justify-content: center; gap: 15px; margin-bottom: 40px; padding: 10px; width: 100%; }
                
                .podium-item { 
                    display: flex; flex-direction: column; align-items: center; 
                    background: #09090b; padding: 20px; border-radius: 24px; 
                    border: 1px solid rgba(255,255,255,0.05); flex: 1; position: relative; 
                    max-width: 180px; transition: 0.3s;
                }
                
                .podium-item.gold { border-color: #ffd700; transform: scale(1.1); z-index: 2; padding-top: 30px; box-shadow: 0 10px 30px rgba(255, 215, 0, 0.1); }
                .podium-item.silver { border-color: #c0c0c0; }
                .podium-item.bronze { border-color: #cd7f32; }

                .avatar-wrapper-podium { 
                    width: 60px; height: 60px; overflow: hidden; border-radius: 50%; 
                    display: flex; align-items: center; justify-content: center; 
                    background: #1e293b; border: 3px solid transparent; 
                }
                .first-place { width: 80px; height: 80px; }
                .silver-border { border-color: #c0c0c0; }
                .gold-border { border-color: #ffd700; }
                .bronze-border { border-color: #cd7f32; }
                
                .podium-rank { 
                    position: absolute; top: -10px; background: #020617; 
                    width: 28px; height: 28px; display: flex; align-items: center; 
                    justify-content: center; border: 2px solid #1f2937; 
                    border-radius: 50%; font-weight: 900; font-size: 0.75rem; color: #fff; 
                }
                
                .podium-name { color: #fff; font-weight: 800; margin-top: 12px; font-size: 0.85rem; text-align: center; }
                .podium-score { color: #8b5cf6; font-weight: 900; font-size: 0.8rem; text-align: center; margin-top: 4px; }
                .crown { font-size: 1.5rem; position: absolute; top: -25px; z-index: 3; }

                .ranking-list-card { background: #09090b; border-radius: 28px; border: 1px solid rgba(255, 255, 255, 0.03); padding: 15px; box-shadow: 0 20px 50px rgba(0,0,0,0.4); width: 100%; }
                .table-responsive { overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch; }
                .ranking-table { width: 100%; border-collapse: collapse; min-width: 320px; }
                
                .ranking-table th { text-align: left; padding: 15px 10px; color: #ffffff; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; border-bottom: 1px solid #1f2937; }
                .ranking-table td { padding: 15px 10px; border-bottom: 1px solid #111827; }
                
                .rank-number { font-weight: 900; color: #94a3b8; font-size: 0.8rem; }
                .user-info-cell { display: flex; align-items: center; gap: 10px; }
                .avatar-mini { width: 30px; height: 30px; flex-shrink: 0; }
                .user-name-text { color: #fff; font-weight: 700; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .score-cell { text-align: right; font-weight: 900; color: #8b5cf6; font-size: 0.85rem; }

                @media (max-width: 1024px) {
                    .ranking-main-content { margin-left: 0; padding: 20px 15px 160px 15px; width: 100%; }
                    .ranking-header { text-align: center; }
                    .ranking-tabs { justify-content: center; }
                    .podium-container { gap: 10px; margin-bottom: 30px; }
                    .podium-item { padding: 15px 10px; }
                }

                @media (max-width: 600px) {
                    .ranking-header h1 { font-size: 1.7rem; }
                    .podium-container { flex-direction: column; align-items: center; gap: 15px; }
                    .podium-item { width: 100%; max-width: none; flex-direction: row; gap: 15px; padding: 12px 15px; border-radius: 18px; }
                    .podium-item.gold { transform: none; order: 1; padding-top: 12px; }
                    .podium-item.silver { order: 2; }
                    .podium-item.bronze { order: 3; }
                    .podium-rank { position: static; width: 25px; height: 25px; flex-shrink: 0; font-size: 0.7rem; }
                    .podium-name { margin: 0; text-align: left; flex: 1; font-size: 0.9rem; }
                    .podium-score { margin: 0; text-align: right; font-size: 0.85rem; }
                    .crown { position: absolute; top: -10px; right: 10px; font-size: 1.2rem; transform: rotate(15deg); }
                    .avatar-wrapper-podium { width: 45px; height: 45px; }
                    .first-place { width: 45px; height: 45px; }
                }
            `}</style>
        </div>
    );
}