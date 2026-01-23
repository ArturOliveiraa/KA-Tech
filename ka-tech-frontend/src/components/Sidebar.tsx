import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Avatar from "./Avatar";

interface SidebarProps {
  userRole: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ userRole }) => {
  const location = useLocation();
  const [userName, setUserName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    async function getProfileData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .single();
        
        if (data) {
          setUserName(data.full_name || "Usuário");
          setAvatarUrl(data.avatar_url);
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
        /* --- ESTRUTURA GLOBAL --- */
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body, #root { 
          width: 100% !important; 
          min-height: 100vh;
          background-color: #0b0e14;
          overflow-x: hidden;
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

          /* Ocupa 100% da largura restante e expande */
          .dashboard-content {
            margin-left: ${LARGURA_SIDEBAR} !important;
            width: calc(100% - ${LARGURA_SIDEBAR}) !important;
            min-height: 100vh;
            padding: 40px;
            display: flex !important;
            flex-direction: column;
            flex: 1; /* Força a expansão total */
          }

          .admin-content-container {
            width: 100% !important;
            display: flex !important;
            flex-wrap: wrap;
            gap: 24px;
          }
        }

        /* --- ESTILOS VISUAIS (Sidebar) --- */
        .sidebar-logo { padding: 30px 24px; font-weight: bold; color: #fff; font-size: 1.4rem; display: flex; align-items: center; gap: 8px; }
        .logo-box { background: #00e5ff; color: #000; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; }
        .sidebar-nav { flex: 1; display: flex; flex-direction: column; padding: 10px 16px; gap: 4px; }
        .nav-link { display: flex; align-items: center; padding: 12px 16px; color: #94a3b8; text-decoration: none; border-radius: 8px; font-size: 0.9rem; transition: 0.2s; }
        .nav-link:hover { background-color: #1a1d23; color: #fff; }
        .nav-link.active { background-color: rgba(0, 229, 255, 0.1); color: #00e5ff; font-weight: 600; }
        .sidebar-footer { padding: 16px; border-top: 1px solid #2d323e; }

        /* --- LAYOUT PARA MOBILE --- */
        @media (max-width: 768px) {
          .sidebar-container {
            width: 100%; height: 70px; background-color: #0d1117;
            border-top: 1px solid #2d323e; display: flex; flex-direction: row;
            position: fixed; bottom: 0; left: 0; z-index: 1000; padding: 0 10px;
          }
          .dashboard-content {
            margin-left: 0 !important;
            width: 100% !important;
            padding: 20px;
            padding-bottom: 90px;
          }
          .sidebar-logo, .sidebar-footer, .nav-link span { display: none !important; }
          .sidebar-nav { flex-direction: row; justify-content: space-around; width: 100%; padding: 0; }
          .nav-link { font-size: 1.6rem; }
        }
      `}</style>

      <aside className="sidebar-container">
        <div className="sidebar-logo">
          <span className="logo-box">KA</span> <span>Tech</span>
        </div>

        <nav className="sidebar-nav">
          <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
            📚 <span>Meus Cursos</span>
          </Link>
          <Link to="/cursos" className={`nav-link ${location.pathname === '/cursos' ? 'active' : ''}`}>
            🔍 <span>Explorar</span>
          </Link>
          {(userRole === 'admin' || userRole === 'professor') && (
            <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>
              🛠️ <span>Gestão</span>
            </Link>
          )}
          <Link to="/configuracoes" className={`nav-link ${location.pathname === '/configuracoes' ? 'active' : ''}`}>
            ⚙️ <span>Ajustes</span>
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