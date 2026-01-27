import React from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Avatar from "./Avatar";
import { useUser } from "./UserContext"; 

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { userRole, userName, avatarUrl, themeColor, sidebarLogo, loading } = useUser();

  // Simulação de estado de Live
  const isLiveActive = true; 

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const LARGURA_SIDEBAR = "260px";

  if (loading) return <aside className="sidebar-container" style={{ width: LARGURA_SIDEBAR, backgroundColor: '#020617' }} />;

  return (
    <>
      <style>{`
        :root { --primary-color: ${themeColor}; --bg-sidebar: #020617; }
        
        .sidebar-container { 
          width: ${LARGURA_SIDEBAR}; 
          height: 100vh; 
          background-color: var(--bg-sidebar); 
          border-right: 1px solid rgba(139, 92, 246, 0.1); 
          display: flex; 
          flex-direction: column; 
          position: fixed; 
          left: 0; 
          top: 0; 
          z-index: 1000; 
        }

        .sidebar-logo { 
          height: 100px; 
          padding: 20px 10px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          width: 100%; 
        }
        
        .logo-img { 
          max-width: 200px; 
          max-height: 65px; 
          width: auto; 
          height: auto; 
          object-fit: contain; 
          filter: drop-shadow(0 0 12px rgba(139, 92, 246, 0.4)); 
          transition: all 0.5s ease; 
        }
        
        .sidebar-nav { flex: 1; display: flex; flex-direction: column; padding: 20px 16px; gap: 8px; overflow-y: auto; overflow-x: hidden; }
        .nav-link { display: flex; align-items: center; padding: 12px 16px; color: #9ca3af; text-decoration: none; border-radius: 12px; font-size: 0.9rem; transition: all 0.3s ease; }
        .nav-link:hover { background-color: rgba(139, 92, 246, 0.05); color: #fff; }
        .nav-link.active { background: linear-gradient(90deg, rgba(139, 92, 246, 0.15) 0%, transparent 100%); color: var(--primary-color); border-left: 4px solid var(--primary-color); border-radius: 0 12px 12px 0; font-weight: 600; }
        .nav-icon { font-size: 1.2rem; margin-right: 12px; }

        /* --- ESTILO DO BOTÃO LIVE (VERMELHO) --- */
        .nav-live {
          /* Gradiente Vermelho Vibrante */
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
          color: white !important;
          font-weight: 800 !important;
          letter-spacing: 0.5px;
          /* Sombra vermelha */
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
          margin-bottom: 12px;
          animation: pulse-live 2s infinite;
        }

        @keyframes pulse-live {
          0% { transform: scale(1); opacity: 1; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4); }
          50% { transform: scale(1.02); opacity: 0.9; box-shadow: 0 4px 25px rgba(239, 68, 68, 0.6); }
          100% { transform: scale(1); opacity: 1; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4); }
        }
        /* --------------------------------------- */

        .sidebar-footer { padding: 20px 16px; border-top: 1px solid rgba(139, 92, 246, 0.1); background: rgba(0, 0, 0, 0.2); }
        
        @media (max-width: 1024px) {
          .sidebar-container { width: 100% !important; height: 70px !important; bottom: 0 !important; top: auto !important; flex-direction: row !important; border-right: none !important; border-top: 1px solid rgba(139, 92, 246, 0.15) !important; background: rgba(2, 6, 23, 0.98) !important; backdrop-filter: blur(10px); }
          .sidebar-logo, .sidebar-footer { display: none !important; }
          .sidebar-nav { flex-direction: row !important; justify-content: space-around !important; padding: 0 4px !important; gap: 0 !important; overflow: hidden !important; width: 100% !important; align-items: center !important; }
          .nav-link { flex-direction: column !important; font-size: 0.5rem !important; padding: 8px 2px !important; gap: 2px !important; color: #64748b; flex: 1 !important; min-width: 0 !important; text-align: center !important; }
          .nav-icon { margin-right: 0 !important; font-size: 1rem !important; }
          .nav-link.active { background: none !important; border-left: none !important; border-top: 3px solid var(--primary-color) !important; border-radius: 0 !important; color: var(--primary-color) !important; padding-top: 5px !important; }
          
          /* Ajuste mobile para o botão vermelho */
          .nav-live { margin-bottom: 0 !important; animation: none !important; border-top: 3px solid #ef4444 !important; background: none !important; color: #ef4444 !important; }
        }
      `}</style>

      <aside className="sidebar-container">
        <div className="sidebar-logo">
          <Link to="/dashboard" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <img src={sidebarLogo} alt="KA Tech" className="logo-img" />
          </Link>
        </div>

        <nav className="sidebar-nav">
          {/* BOTÃO DE LIVE VERMELHO */}
          {isLiveActive && (
            <Link to="/live" className={`nav-link nav-live ${location.pathname === '/live' ? 'active' : ''}`}>
              <span className="nav-icon">((•))</span> 
              <span>LIVE!</span>
            </Link>
          )}

          <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}><span className="nav-icon">📚</span> <span>Cursos</span></Link>
          <Link to="/cursos" className={`nav-link ${location.pathname === '/cursos' ? 'active' : ''}`}><span className="nav-icon">🔍</span> <span>Trilhas</span></Link>
          <Link to="/rankings" className={`nav-link ${location.pathname === '/rankings' ? 'active' : ''}`}><span className="nav-icon">🏅</span> <span>Ranking</span></Link>
          <Link to="/conquistas" className={`nav-link ${location.pathname === '/conquistas' ? 'active' : ''}`}><span className="nav-icon">🏆</span> <span>Conquistas</span></Link>
          
          {(userRole === 'admin' || userRole === 'teacher') && (
            <>
              <Link to="/admin" className={`nav-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}><span className="nav-icon">🛠️</span> <span>Gestão</span></Link>
              <Link to="/relatorios" className={`nav-link ${location.pathname === '/relatorios' ? 'active' : ''}`}><span className="nav-icon">📊</span> <span>Relatórios</span></Link>
            </>
          )}
          
          <Link to="/configuracoes" className={`nav-link ${location.pathname === '/configuracoes' ? 'active' : ''}`}><span className="nav-icon">⚙️</span> <span>Ajustes</span></Link>
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Avatar src={avatarUrl} name={userName} />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{userName}</span>
              <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', textAlign: 'left', padding: 0 }}>Sair</button>
            </div>
          </div>
        </div>
      </aside> 
    </>
  );
};

export default Sidebar;