import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Avatar from "./Avatar";

// Import da sua logo
import logo from "../assets/ka-tech-logo.png";

interface SidebarProps {
  userRole: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ userRole }) => {
  const location = useLocation();
  const [userName, setUserName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // --- NOVO: DEFAULT PARA O ROXO KA TECH ---
  const [themeColor, setThemeColor] = useState("#8b5cf6");

  useEffect(() => {
    async function getProfileData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, theme_color")
          .eq("id", user.id)
          .single();

        if (data) {
          setUserName(data.full_name || "Usuário");
          setAvatarUrl(data.avatar_url);

          if (data.theme_color) {
            setThemeColor(data.theme_color);
            document.documentElement.style.setProperty('--primary-color', data.theme_color);
          }
        }
      }
    }
    getProfileData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const LARGURA_SIDEBAR = "260px";

  return (
    <>
      <style>{`
        /* --- VARIÁVEIS DE TEMA --- */
        :root { 
          --primary-color: ${themeColor}; 
          --bg-sidebar: #020617; /* Navy Profundo */
          --font-main: 'Sora', sans-serif;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body, #root { 
          width: 100% !important; 
          min-height: 100vh;
          background-color: var(--bg-sidebar);
          font-family: var(--font-main);
        }

        /* --- LAYOUT PARA PC --- */
        @media (min-width: 769px) {
          .sidebar-container {
            width: ${LARGURA_SIDEBAR};
            height: 100vh;
            background-color: var(--bg-sidebar);
            border-right: 1px solid rgba(139, 92, 246, 0.1); /* Borda roxa sutil */
            display: flex;
            flex-direction: column;
            position: fixed;
            left: 0;
            top: 0;
            z-index: 1000;
          }

          .dashboard-content {
            margin-left: ${LARGURA_SIDEBAR} !important;
            width: calc(100% - ${LARGURA_SIDEBAR}) !important;
            min-height: 100vh;
            padding: 40px;
          }
        }

        /* --- AJUSTE DA LOGO --- */
        .sidebar-logo { 
          padding: 20px 10px;
          display: flex; 
          align-items: center; 
          justify-content: center;
          width: 100%;
        }

        .logo-img {
          width: 100%; /* Ajustado para ocupar a largura da sidebar */
          max-width: 240px;
          height: auto;
          display: block;
          object-fit: contain;
          /* Glow roxo característico da marca */
          filter: drop-shadow(0 0 12px rgba(139, 92, 246, 0.4)); 
        }

        .sidebar-nav { 
          flex: 1; 
          display: flex; 
          flex-direction: column; 
          padding: 20px 16px; 
          gap: 8px; 
        }

        .nav-link { 
          display: flex; 
          align-items: center; 
          padding: 12px 16px; 
          color: #9ca3af; 
          text-decoration: none; 
          border-radius: 12px; 
          font-size: 0.9rem; 
          font-weight: 400;
          transition: all 0.3s ease; 
        }

        .nav-link:hover { 
          background-color: rgba(139, 92, 246, 0.05); 
          color: #fff; 
        }
        
        /* --- ESTADO ATIVO NEON --- */
        .nav-link.active { 
          background: linear-gradient(90deg, rgba(139, 92, 246, 0.15) 0%, transparent 100%); 
          color: var(--primary-color); 
          border-left: 4px solid var(--primary-color);
          border-radius: 0 12px 12px 0;
          font-weight: 600; 
        }

        .sidebar-footer { 
          padding: 20px 16px; 
          border-top: 1px solid rgba(139, 92, 246, 0.1);
          background: rgba(0, 0, 0, 0.2);
        }

        @media (max-width: 768px) {
          .sidebar-container {
            width: 100%; 
            height: 70px; 
            background-color: #09090b;
            position: fixed; 
            bottom: 0; 
            left: 0; 
            z-index: 1000;
            border-top: 1px solid rgba(139, 92, 246, 0.2);
          }
          .sidebar-logo { display: none !important; }
          .sidebar-nav { 
            flex-direction: row; 
            justify-content: space-around; 
            padding: 10px; 
          }
          .nav-link { padding: 8px; flex-direction: column; font-size: 0.7rem; gap: 4px; }
          .nav-link.active { border-left: none; border-bottom: 3px solid var(--primary-color); border-radius: 0; }
        }
      `}</style>

      <aside className="sidebar-container">
        <div className="sidebar-logo">
          <img
            src={logo}
            alt="KA Tech"
            className="logo-img"
          />
        </div>

        <nav className="sidebar-nav">
          <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
            <span style={{ fontSize: '1.2rem', marginRight: '12px' }}>📚</span> <span>Meus Cursos</span>
          </Link>
          <Link to="/cursos" className={`nav-link ${location.pathname === '/cursos' ? 'active' : ''}`}>
            <span style={{ fontSize: '1.2rem', marginRight: '12px' }}>🔍</span> <span>Explorar</span>
          </Link>
          {(userRole === 'admin' || userRole === 'teacher') && (
            <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>
              <span style={{ fontSize: '1.2rem', marginRight: '12px' }}>🛠️</span> <span>Gestão</span>
            </Link>
          )}
          <Link to="/configuracoes" className={`nav-link ${location.pathname === '/configuracoes' ? 'active' : ''}`}>
            <span style={{ fontSize: '1.2rem', marginRight: '12px' }}>⚙️</span> <span>Ajustes</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Avatar src={avatarUrl} name={userName} />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userName}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  fontSize: '0.75rem',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: 500
                }}
              >
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