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
  // --- NOVO: ESTADO PARA A COR DO TEMA ---
  const [themeColor, setThemeColor] = useState("#00e5ff");

  useEffect(() => {
    async function getProfileData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, theme_color") // Buscando theme_color
          .eq("id", user.id)
          .single();
        
        if (data) {
          setUserName(data.full_name || "Usuário");
          setAvatarUrl(data.avatar_url);
          // Aplica a cor do tema globalmente se existir
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
        /* --- VARIÁVEL GLOBAL DE COR --- */
        :root { --primary-color: ${themeColor}; }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body, #root { 
          width: 100% !important; 
          min-height: 100vh;
          background-color: #0b0e14;
        }

        /* --- LAYOUT PARA PC (Desktop) --- */
        @media (min-width: 769px) {
          .sidebar-container {
            width: ${LARGURA_SIDEBAR};
            height: 100vh;
            background-color: #0d1117;
            border-right: 1px solid #2d323e;
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

        /* --- AJUSTE DA LOGO CENTRALIZADA --- */
        .sidebar-logo { 
          padding: 0px 0px 0px 0px; /* Padding removido para colar no topo */
          display: flex; 
          align-items: center; 
          justify-content: center;
          width: 100%;
        }

        .logo-img {
          width: 1500px; /* Tamanho otimizado para os 260px da sidebar */
          height: 230px;
          display: block;
          object-fit: contain;
          /* Glow baseado na cor do tema */
          filter: drop-shadow(0 0 8px rgba(0, 0, 0, 0.5)); 
        }

        .sidebar-nav { flex: 1; display: flex; flex-direction: column; padding: 20px 16px; gap: 4px; }
        .nav-link { display: flex; align-items: center; padding: 12px 16px; color: #94a3b8; text-decoration: none; border-radius: 8px; font-size: 0.9rem; transition: 0.2s; }
        .nav-link:hover { background-color: #1a1d23; color: #fff; }
        
        /* --- LINK ATIVO USA A COR DINÂMICA --- */
        .nav-link.active { 
          background-color: rgba(var(--primary-color-rgb, 0, 229, 255), 0.1); 
          color: var(--primary-color); 
          border-left: 3px solid var(--primary-color);
          border-radius: 0 8px 8px 0;
          font-weight: 600; 
        }

        .sidebar-footer { padding: 16px; border-top: 1px solid #2d323e; }

        @media (max-width: 768px) {
          .sidebar-container {
            width: 100%; height: 70px; background-color: #0d1117;
            position: fixed; bottom: 0; left: 0; z-index: 1000;
          }
          .sidebar-logo { display: none !important; }
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
            <span style={{ marginRight: '10px' }}>📚</span> <span>Meus Cursos</span>
          </Link>
          <Link to="/cursos" className={`nav-link ${location.pathname === '/cursos' ? 'active' : ''}`}>
            <span style={{ marginRight: '10px' }}>🔍</span> <span>Explorar</span>
          </Link>
          {(userRole === 'admin' || userRole === 'professor') && (
            <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>
              <span style={{ marginRight: '10px' }}>🛠️</span> <span>Gestão</span>
            </Link>
          )}
          <Link to="/configuracoes" className={`nav-link ${location.pathname === '/configuracoes' ? 'active' : ''}`}>
            <span style={{ marginRight: '10px' }}>⚙️</span> <span>Ajustes</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Avatar src={avatarUrl} name={userName} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 500 }}>{userName}</span>
              <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ff4b4b', fontSize: '0.7rem', padding: 0, cursor: 'pointer', textAlign: 'left' }}>Sair</button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;