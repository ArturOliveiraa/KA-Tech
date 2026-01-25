import React from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Avatar from "./Avatar";
import logo from "../assets/ka-tech-logo.png";
import { useUser } from "./UserContext"; 

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { userRole, userName, avatarUrl, themeColor, loading } = useUser();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const LARGURA_SIDEBAR = "260px";

  if (loading) return <aside className="sidebar-container" style={{ width: LARGURA_SIDEBAR, backgroundColor: '#020617' }} />;

  return (
    <>
      <style>{`
        :root { 
          --primary-color: ${themeColor}; 
          --bg-sidebar: #020617; 
          --font-main: 'Sora', sans-serif;
        }

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
          padding: 20px 10px;
          display: flex; 
          align-items: center; 
          justify-content: center;
          width: 100%;
        }

        .logo-img {
          width: 100%;
          max-width: 240px;
          height: auto;
          filter: drop-shadow(0 0 12px rgba(139, 92, 246, 0.4)); 
        }

        .sidebar-nav { 
          flex: 1; 
          display: flex; 
          flex-direction: column; 
          padding: 20px 16px; 
          gap: 8px;
          /* SOLUÇÃO PARA A BARRA LATERAL NO DESKTOP */
          overflow-y: auto;
          overflow-x: hidden; 
        }

        /* Custom Scrollbar para Desktop */
        .sidebar-nav::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-nav::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.1);
          border-radius: 10px;
        }

        .nav-link { 
          display: flex; 
          align-items: center; 
          padding: 12px 16px; 
          color: #9ca3af; 
          text-decoration: none; 
          border-radius: 12px; 
          font-size: 0.9rem; 
          transition: all 0.3s ease; 
        }

        .nav-link:hover { 
          background-color: rgba(139, 92, 246, 0.05); 
          color: #fff; 
        }
        
        .nav-link.active { 
          background: linear-gradient(90deg, rgba(139, 92, 246, 0.15) 0%, transparent 100%); 
          color: var(--primary-color); 
          border-left: 4px solid var(--primary-color);
          border-radius: 0 12px 12px 0;
          font-weight: 600; 
        }

        .nav-icon { font-size: 1.2rem; margin-right: 12px; }

        .sidebar-footer { 
          padding: 20px 16px; 
          border-top: 1px solid rgba(139, 92, 246, 0.1);
          background: rgba(0, 0, 0, 0.2);
        }

        /* --- AJUSTE MOBILE (BOTTOM BAR) --- */
        @media (max-width: 1024px) {
          .sidebar-container {
            width: 100%; 
            height: 75px; 
            bottom: 0; 
            top: auto; 
            flex-direction: row;
            border-right: none;
            border-top: 1px solid rgba(139, 92, 246, 0.15);
            background: rgba(2, 6, 23, 0.95);
            backdrop-filter: blur(10px);
          }

          .sidebar-logo, .sidebar-footer { display: none; }

          .sidebar-nav { 
            flex-direction: row; 
            justify-content: space-around; 
            padding: 0 10px; 
            gap: 0;
            overflow: hidden; /* Impede scroll no mobile bar */
            width: 100%;
            align-items: center;
          }

          .nav-link { 
            flex-direction: column; 
            font-size: 0.65rem; 
            padding: 5px; 
            gap: 4px;
            color: #64748b;
            min-width: 60px;
            text-align: center;
          }

          .nav-icon { margin-right: 0; font-size: 1.3rem; }

          .nav-link.active { 
            background: none;
            border-left: none;
            border-top: 3px solid var(--primary-color);
            border-radius: 0;
            color: var(--primary-color);
            padding-top: 2px;
          }

          .hide-mobile { display: none; }
        }
      `}</style>

      <aside className="sidebar-container">
        <div className="sidebar-logo">
          <Link to="/dashboard" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <img src={logo} alt="KA Tech" className="logo-img" />
          </Link>
        </div>

        <nav className="sidebar-nav">
          <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
            <span className="nav-icon">📚</span> <span>Cursos</span>
          </Link>

          <Link to="/cursos" className={`nav-link ${location.pathname === '/cursos' ? 'active' : ''}`}>
            <span className="nav-icon">🔍</span> <span>Trilhas</span>
          </Link>

          <Link to="/rankings" className={`nav-link ${location.pathname === '/rankings' ? 'active' : ''}`}>
            <span className="nav-icon">🏅</span> <span>Ranking</span>
          </Link>

          <Link to="/conquistas" className={`nav-link ${location.pathname === '/conquistas' ? 'active' : ''} hide-mobile`}>
            <span className="nav-icon">🏆</span> <span>Conquistas</span>
          </Link>

          {(userRole === 'admin' || userRole === 'teacher') && (
            <Link to="/admin" className={`nav-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}>
              <span className="nav-icon">🛠️</span> <span>Gestão</span>
            </Link>
          )}

          <Link to="/configuracoes" className={`nav-link ${location.pathname === '/configuracoes' ? 'active' : ''}`}>
            <span className="nav-icon">⚙️</span> <span>Ajustes</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Avatar src={avatarUrl} name={userName} />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {userName}
              </span>
              <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                Encerrar Sessão
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;