import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import Avatar from "../components/Avatar";
import { 
  Trophy, Zap, Clock, Flame, Crown, Award, Star, TrendingUp 
} from "lucide-react";

type RankingCategory = "xp" | "badges" | "maratonistas" | "tempo" | "on_fire";

interface RankingUser {
  full_name: string | null; // <--- Tipagem ajustada para aceitar null
  avatar_url: string | null;
  score: number;
  rank_name?: string;
}

export default function Rankings() {
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<RankingCategory>("xp");
  const [rankingList, setRankingList] = useState<RankingUser[]>([]);

  const loadRanking = useCallback(async () => {
    setLoading(true);
    let tableName = "";
    let scoreColumn = "";

    switch (activeCategory) {
      case "xp": tableName = "ranking_xp"; scoreColumn = "total_xp"; break;
      case "badges": tableName = "ranking_badges"; scoreColumn = "total_badges"; break;
      case "maratonistas": tableName = "ranking_maratonistas"; scoreColumn = "lessons_completed"; break;
      case "tempo": tableName = "ranking_tempo_voo"; scoreColumn = "total_time_spent"; break;
      case "on_fire": tableName = "ranking_on_fire"; scoreColumn = "active_days"; break;
    }

    const selectQuery = `full_name, avatar_url, ${scoreColumn}${activeCategory === 'xp' ? ', rank_name' : ''}`;

    const { data, error } = await supabase
      .from(tableName)
      .select(selectQuery)
      .order(scoreColumn, { ascending: false })
      .limit(10);

    if (!error && data) {
      const formattedData: RankingUser[] = data.map((item: any) => ({
        full_name: item.full_name,
        avatar_url: item.avatar_url,
        score: item[scoreColumn] || 0,
        rank_name: item.rank_name
      }));
      setRankingList(formattedData);
    }
    setLoading(false);
  }, [activeCategory]);

  useEffect(() => {
    loadRanking();
  }, [loadRanking]);

  // Design do Score baseado na Categoria
  const formatScore = (user: RankingUser, isPodium: boolean) => {
    const score = user.score;

    if (activeCategory === "xp") {
      return (
        <div className={isPodium ? "xp-podium-center" : "xp-table-right"}>
          <span className="xp-points-text">{score.toLocaleString()} XP</span>
          <span className="xp-rank-subtext">{user.rank_name || "Panda Broto"}</span>
        </div>
      );
    }

    let suffix = "";
    let color = "#8b5cf6"; 
    
    if (activeCategory === "badges") { suffix = " Insígnias"; color = "#fcd34d"; }
    else if (activeCategory === "tempo") { suffix = " min"; color = "#60a5fa"; }
    else if (activeCategory === "maratonistas") { suffix = " aulas"; color = "#34d399"; }
    else if (activeCategory === "on_fire") { suffix = " 🔥"; color = "#f97316"; }

    return (
      <div className={isPodium ? "score-podium-center" : "score-table-right"}>
        <span style={{ color: color, fontWeight: 900, fontSize: isPodium ? '1.15rem' : '1rem' }}>
          {score.toLocaleString()}<span style={{ fontSize: '0.75em', opacity: 0.8, marginLeft: '4px' }}>{suffix}</span>
        </span>
      </div>
    );
  };

  const categories = [
    { id: "xp", label: "XP Global", icon: <Star size={16} /> },
    { id: "badges", label: "Colecionadores", icon: <Award size={16} /> },
    { id: "maratonistas", label: "Maratonistas", icon: <Zap size={16} /> },
    { id: "tempo", label: "Tempo de Voo", icon: <Clock size={16} /> },
    { id: "on_fire", label: "Ofensiva", icon: <Flame size={16} /> }
  ];

  const podium = rankingList.slice(0, 3);
  const remainders = rankingList.slice(3, 10);

  return (
    <div className="dashboard-wrapper">
      <Sidebar />
      <main className="ranking-main-content">
        
        <header className="ranking-header">
          <div className="title-wrapper">
            <Trophy size={42} color="#fbbf24" style={{ filter: 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.5))' }} />
            <h1>Hall da Fama</h1>
          </div>
          <p>A elite da <strong style={{ color: '#8b5cf6' }}>KA Tech</strong>. Conquiste o topo e escreva seu nome na história.</p>
        </header>

        {/* MENU DE ABAS PREMIUM */}
        <div className="ranking-tabs-container">
          <div className="ranking-tabs">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as RankingCategory)}
                className={`tab-btn ${activeCategory === cat.id ? 'active' : ''}`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <TrendingUp size={44} className="animate-pulse" style={{ marginBottom: '15px', color: '#8b5cf6' }} />
            <span>Computando posições...</span>
          </div>
        ) : (
          <div className="ranking-animate-in">
            {/* PÓDIO HOLOGRÁFICO */}
            <div className="podium-container">
              {/* 2º LUGAR - PRATA */}
              {podium[1] && (
                <div className="podium-item silver">
                  <div className="podium-glow silver-glow"></div>
                  <div className="podium-rank">2</div>
                  <div className="avatar-wrapper-podium silver-border">
                    <Avatar src={podium[1].avatar_url} name={podium[1].full_name || "Misterioso"} />
                  </div>
                  <div className="podium-info">
                    {/* Correção de segurança do Split */}
                    <span className="podium-name">{(podium[1].full_name || "Misterioso").split(' ')[0]}</span>
                    <div className="podium-score">{formatScore(podium[1], true)}</div>
                  </div>
                </div>
              )}

              {/* 1º LUGAR - OURO */}
              {podium[0] && (
                <div className="podium-item gold">
                  <div className="crown-wrapper">
                    <Crown size={36} color="#fbbf24" fill="#fbbf24" style={{ filter: 'drop-shadow(0 4px 15px rgba(251, 191, 36, 0.8))' }} />
                  </div>
                  <div className="podium-glow gold-glow"></div>
                  <div className="podium-rank gold-rank">1</div>
                  <div className="avatar-wrapper-podium gold-border first-place">
                    <Avatar src={podium[0].avatar_url} name={podium[0].full_name || "Misterioso"} />
                  </div>
                  <div className="podium-info">
                    {/* Correção de segurança do Split */}
                    <span className="podium-name winner-name">{(podium[0].full_name || "Misterioso").split(' ')[0]}</span>
                    <div className="podium-score">{formatScore(podium[0], true)}</div>
                  </div>
                </div>
              )}

              {/* 3º LUGAR - BRONZE */}
              {podium[2] && (
                <div className="podium-item bronze">
                  <div className="podium-glow bronze-glow"></div>
                  <div className="podium-rank">3</div>
                  <div className="avatar-wrapper-podium bronze-border">
                    <Avatar src={podium[2].avatar_url} name={podium[2].full_name || "Misterioso"} />
                  </div>
                  <div className="podium-info">
                    {/* Correção de segurança do Split */}
                    <span className="podium-name">{(podium[2].full_name || "Misterioso").split(' ')[0]}</span>
                    <div className="podium-score">{formatScore(podium[2], true)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* LISTA DE JOGADORES (4º ao 10º) - GAMER ROWS */}
            {remainders.length > 0 && (
              <div className="ranking-list-container">
                {remainders.map((user, index) => (
                  <div key={index} className="ranking-row-card">
                    <div className="rank-position">
                      <span className="rank-number">{index + 4}</span>
                    </div>
                    
                    <div className="user-info-row">
                      <div className="avatar-fixed">
                        <Avatar src={user.avatar_url} name={user.full_name || "Misterioso"} />
                      </div>
                      {/* Correção de segurança do nome */}
                      <span className="user-name-list">{user.full_name || "Usuário Misterioso"}</span>
                    </div>
                    
                    <div className="score-cell">
                      {formatScore(user, false)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {rankingList.length === 0 && !loading && (
              <div className="empty-state">
                Ainda não há competidores suficientes nesta categoria.
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        :root { 
            --primary: #8b5cf6; 
            --bg-dark: #020617; 
            --card-glass: rgba(15, 23, 42, 0.6); 
            --border: rgba(255, 255, 255, 0.08);
            
            /* Cores e Brilhos das Medalhas */
            --gold: #fbbf24; --gold-glow: rgba(251, 191, 36, 0.2);
            --silver: #94a3b8; --silver-glow: rgba(148, 163, 184, 0.15);
            --bronze: #d97706; --bronze-glow: rgba(217, 119, 6, 0.15);
        }
        
        * { box-sizing: border-box; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .dashboard-wrapper { display: flex; min-height: 100vh; background-color: var(--bg-dark); font-family: 'Inter', system-ui, sans-serif; overflow-x: hidden; }
        .ranking-main-content { flex: 1; padding: 50px 60px; margin-left: 260px; transition: 0.3s; width: calc(100% - 260px); max-width: 100%; display: flex; flex-direction: column; align-items: center; }

        /* Cabeçalho */
        .ranking-header { text-align: center; margin-bottom: 45px; width: 100%; }
        .title-wrapper { display: flex; alignItems: center; gap: 15px; justifyContent: center; flex-wrap: wrap; margin-bottom: 8px; }
        .ranking-header h1 { color: #fff; font-size: 3rem; font-weight: 900; margin: 0; letter-spacing: -1.5px; text-transform: uppercase; background: linear-gradient(to bottom, #ffffff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;}
        .ranking-header p { color: #94a3b8; font-size: 1.1rem; }

        /* Abas */
        .ranking-tabs-container { width: 100%; display: flex; justify-content: center; margin-bottom: 50px; }
        .ranking-tabs { 
          display: inline-flex; gap: 6px; flex-wrap: wrap; justify-content: center;
          background: rgba(255,255,255,0.02); padding: 8px; border-radius: 20px; border: 1px solid var(--border);
          box-shadow: inset 0 2px 10px rgba(0,0,0,0.2);
        }
        .tab-btn { 
          display: flex; align-items: center; gap: 8px;
          background: transparent; color: #64748b; border: none; padding: 12px 22px; 
          border-radius: 14px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); font-size: 0.95rem; font-weight: 700; 
        }
        .tab-btn:hover { color: #e2e8f0; background: rgba(255,255,255,0.04); }
        .tab-btn.active { 
          background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: #fff; 
          box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4); 
        }

        .loading-state { color: #8b5cf6; text-align: center; padding: 100px; font-weight: 700; font-size: 1.1rem; display: flex; flex-direction: column; align-items: center; }
        .animate-pulse { animation: pulse 2s infinite; }

        .ranking-animate-in { animation: fadeUp 0.6s ease-out forwards; width: 100%; max-width: 900px; }

        /* Pódio Flutuante e Alinhado */
        .podium-container { 
          display: flex; align-items: flex-end; justify-content: center; gap: 24px; 
          margin-bottom: 60px; padding: 40px 10px 0 10px; width: 100%; min-height: 320px;
        }
        
        .podium-item { 
          display: flex; flex-direction: column; align-items: center; justify-content: space-between;
          background: rgba(15, 23, 42, 0.7); border-radius: 28px; 
          border: 1px solid var(--border); border-top-width: 2px;
          flex: 1; position: relative; max-width: 220px; transition: 0.4s;
          backdrop-filter: blur(12px); box-shadow: 0 20px 40px rgba(0,0,0,0.4);
          animation: float 6s ease-in-out infinite;
        }
        
        .podium-glow { position: absolute; top: 0; left: 0; width: 100%; height: 100px; border-radius: 28px 28px 0 0; pointer-events: none; opacity: 0.8; }
        .gold-glow { background: linear-gradient(180deg, var(--gold-glow) 0%, transparent 100%); }
        .silver-glow { background: linear-gradient(180deg, var(--silver-glow) 0%, transparent 100%); }
        .bronze-glow { background: linear-gradient(180deg, var(--bronze-glow) 0%, transparent 100%); }

        .podium-item.gold { 
          border-top-color: var(--gold); min-height: 280px; padding: 35px 20px 25px;
          transform: translateY(-20px); z-index: 3;
          box-shadow: 0 30px 60px rgba(0,0,0,0.5), 0 0 40px var(--gold-glow); order: 2; 
          animation-delay: -1s;
        }
        .podium-item.silver { 
          border-top-color: var(--silver); min-height: 230px; padding: 25px 20px;
          order: 1; animation-delay: -2s; box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 30px var(--silver-glow);
        }
        .podium-item.bronze { 
          border-top-color: var(--bronze); min-height: 210px; padding: 25px 20px;
          order: 3; animation-delay: -3s; box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 30px var(--bronze-glow);
        }

        .avatar-wrapper-podium { 
          width: 75px; height: 75px; overflow: hidden; border-radius: 50%; display: flex; align-items: center; justify-content: center; 
          background: #0f172a; border: 4px solid transparent; box-shadow: 0 10px 25px rgba(0,0,0,0.6); position: relative; z-index: 2;
        }
        .first-place { width: 95px; height: 95px; border-width: 5px; }
        
        .avatar-wrapper-podium > *, .avatar-fixed > * { width: 100% !important; height: 100% !important; border-radius: 50%; }
        .avatar-wrapper-podium img, .avatar-fixed img { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block; }

        .silver-border { border-color: var(--silver); }
        .gold-border { border-color: var(--gold); }
        .bronze-border { border-color: var(--bronze); }
        
        .podium-rank { 
          position: absolute; top: -16px; background: #0f172a; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; 
          border: 2px solid var(--border); border-radius: 50%; font-weight: 900; font-size: 0.95rem; color: #fff; box-shadow: 0 6px 15px rgba(0,0,0,0.5); z-index: 4;
        }
        .gold-rank { border-color: var(--gold); color: var(--gold); width: 38px; height: 38px; top: -19px; font-size: 1.1rem;}
        
        .podium-info { display: flex; flex-direction: column; align-items: center; width: 100%; position: relative; z-index: 2; margin-top: auto;}
        .podium-name { color: #f8fafc; font-weight: 800; margin-top: 15px; font-size: 1.05rem; text-align: center; }
        .winner-name { font-size: 1.3rem; color: var(--gold); text-shadow: 0 0 20px rgba(251,191,36,0.4); }
        .podium-score { margin-top: 8px; width: 100%; }
        
        .crown-wrapper { position: absolute; top: -55px; z-index: 4; animation: pulse 3s infinite; }

        /* Linhas da Lista (4º ao 10º) */
        .ranking-list-container { 
          display: flex; flex-direction: column; gap: 14px; width: 100%; 
        }
        
        .ranking-row-card {
          display: flex; align-items: center; justify-content: space-between;
          background: linear-gradient(90deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%); 
          border: 1px solid var(--border); border-left: 4px solid #334155;
          padding: 16px 28px; border-radius: 20px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
        }
        .ranking-row-card:hover {
          transform: translateX(6px); background: rgba(30, 41, 59, 0.9);
          border-left-color: var(--primary); box-shadow: 0 12px 25px rgba(0,0,0,0.3);
        }

        .rank-position { 
          width: 50px; display: flex; align-items: center;
        }
        .rank-number {
          font-weight: 900; color: #475569; font-size: 1.2rem; 
          background: rgba(0,0,0,0.3); width: 36px; height: 36px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
        }
        .ranking-row-card:hover .rank-number { color: var(--primary); background: rgba(139, 92, 246, 0.1); }

        .user-info-row { display: flex; align-items: center; gap: 18px; flex: 1; }
        .avatar-fixed { width: 48px; height: 48px; flex-shrink: 0; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #000; border: 2px solid rgba(255,255,255,0.1); }
        .user-name-list { color: #f8fafc; font-weight: 700; font-size: 1.05rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 350px; }
        
        /* Scores Formatting */
        .xp-podium-center, .score-podium-center { display: flex; flex-direction: column; align-items: center; text-align: center; width: 100%; line-height: 1.2; }
        .xp-table-right, .score-table-right { display: flex; flex-direction: column; align-items: flex-end; text-align: right; line-height: 1.2; }

        .xp-points-text { 
          color: transparent; font-weight: 900; font-size: 1.2rem; 
          background: linear-gradient(135deg, #c4b5fd 0%, #8b5cf6 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .score-table-right .xp-points-text { font-size: 1.1rem; }
        .xp-rank-subtext { color: #64748b; font-size: 0.75rem; text-transform: uppercase; font-weight: 800; margin-top: 4px; letter-spacing: 0.5px;}
        
        .empty-state { text-align: center; color: #64748b; padding: 60px; font-size: 1.1rem; }

        @media (max-width: 1024px) {
          .ranking-main-content { margin-left: 0; padding: 30px 20px 100px 20px; width: 100%; }
          .ranking-header { text-align: center; }
          .podium-container { gap: 16px; margin-bottom: 40px; min-height: 280px;}
          .podium-item { padding: 25px 15px; }
          .user-name-list { max-width: 180px; }
        }

        @media (max-width: 600px) {
          .ranking-header h1 { font-size: 2.2rem; }
          .podium-container { flex-direction: column; align-items: center; gap: 20px; padding-top: 20px; min-height: auto;}
          .podium-item { width: 100%; max-width: 100%; flex-direction: row; gap: 16px; padding: 20px; border-radius: 20px; border: 1px solid var(--border); border-left-width: 3px; min-height: auto !important; animation: none;}
          
          /* Refazendo pódio para mobile (estilo lista destacada) */
          .podium-glow { display: none; }
          .podium-item.gold { transform: none; order: unset; border-left-color: var(--gold); border-top-width: 1px; box-shadow: 0 10px 20px rgba(0,0,0,0.5); }
          .podium-item.silver { order: unset; border-left-color: var(--silver); border-top-width: 1px;}
          .podium-item.bronze { order: unset; border-left-color: var(--bronze); border-top-width: 1px;}
          
          .podium-rank { position: static; width: 34px; height: 34px; flex-shrink: 0; font-size: 1rem;}
          .podium-info { align-items: flex-start; text-align: left; margin: 0; }
          .podium-name { margin: 0; text-align: left; font-size: 1.15rem;}
          .podium-score { text-align: left; margin-top: 4px; }
          .xp-podium-center, .score-podium-center { align-items: flex-start; text-align: left; }
          .crown-wrapper { position: absolute; top: -15px; right: 20px; transform: rotate(15deg); }
          
          .avatar-wrapper-podium { width: 55px; height: 55px; margin: 0; }
          .first-place { width: 60px; height: 60px; border-width: 3px;}
          
          .ranking-row-card { padding: 14px 20px; border-radius: 16px; }
          .rank-position { width: 36px; }
          .rank-number { width: 30px; height: 30px; font-size: 1rem;}
          .avatar-fixed { width: 40px; height: 40px; }
          .user-name-list { font-size: 0.95rem; }
        }
      `}</style>
    </div>
  );
}