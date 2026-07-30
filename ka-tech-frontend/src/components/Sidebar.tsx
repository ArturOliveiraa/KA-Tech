import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Avatar from "./Avatar";
import { useUser } from "./UserContext";

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { userRole, userName, avatarUrl, themeColor, sidebarLogo, loading } = useUser();

  const [isLiveActive, setIsLiveActive] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  // Estado para controlar a abertura do menu lateral no Mobile
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const checkLiveStatus = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("lives")
        .select("id")
        .is("duration", null)
        .lte("scheduled_at", now)
        .limit(1);

      setIsLiveActive(data && data.length > 0 ? true : false);
    };

    checkLiveStatus();
    const interval = setInterval(checkLiveStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const toggleMenu = (menu: string) => {
    setExpandedMenu(expandedMenu === menu ? null : menu);
  };

  const handleLinkClick = () => {
    setIsMobileOpen(false);
  };

  const LARGURA_SIDEBAR = "270px";

  if (loading) return <aside className="sidebar-container" style={{ width: LARGURA_SIDEBAR, backgroundColor: '#060913' }} />;

  return (
    <>
      <style>{`
        /* PALETA DE CORES PREMIUM INSPIRADA NO DASHBOARD (DARK) */
        :root { 
          --bg-sidebar: linear-gradient(180deg, #111625 0%, #050810 100%); /* Fundo com profundidade */
          --bg-hover: rgba(255, 255, 255, 0.06);   
          --active-orange: #FF9800; 
          --text-main: #E2E8F0;  
          --text-muted: #8BA0B8; 
          --border-color: rgba(255, 255, 255, 0.05); /* Borda bem sutil */
        }
        
        /* CONTAINER PRINCIPAL */
        .sidebar-container { 
          width: ${LARGURA_SIDEBAR}; 
          height: 100vh; 
          background: var(--bg-sidebar); 
          display: flex; 
          flex-direction: column; 
          position: fixed; 
          left: 0; 
          top: 0; 
          z-index: 1000; 
          font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          box-shadow: 4px 0 25px rgba(0, 0, 0, 0.3); /* Sombra para descolar do fundo do dashboard */
        }

        /* LOGO */
        .sidebar-logo { 
          height: 80px; 
          padding: 15px 20px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          width: 100%; 
          border-bottom: 1px solid var(--border-color); 
        }
        .logo-img { max-width: 180px; max-height: 45px; object-fit: contain; }
        
        /* SCROLL E NAVEGAÇÃO */
        .sidebar-nav { 
          flex: 1; 
          display: flex; 
          flex-direction: column; 
          padding: 15px 12px; 
          gap: 6px; 
          overflow-y: auto; 
          overflow-x: hidden; 
        }
        
        .sidebar-nav::-webkit-scrollbar { width: 6px; }
        .sidebar-nav::-webkit-scrollbar-track { background: transparent; }
        .sidebar-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        
        .nav-group { display: flex; flex-direction: column; width: 100%; }
        
        /* BOTÕES PRINCIPAIS E LINKS */
        .nav-button { 
          background: transparent; 
          border: none; 
          width: 100%; 
          cursor: pointer; 
          text-align: left; 
          padding: 12px 14px; 
          color: var(--text-main); 
          border-radius: 8px; /* Cantos um pouco mais arredondados */
          font-size: 0.95rem; 
          font-weight: 500;
          transition: background-color 0.2s ease, color 0.2s ease;
          display: flex;
          align-items: center;
          text-decoration: none;
        }
        
        .nav-button:hover:not(.active) { background-color: var(--bg-hover); }
        
        .nav-button.active { 
          background-color: var(--active-orange); 
          color: #FFFFFF; 
        }

        .nav-item-content { display: flex; align-items: center; width: 100%; }
        
        .nav-icon { 
          font-size: 1.1rem; 
          margin-right: 12px; 
          width: 22px; 
          text-align: center; 
          color: var(--text-muted);
        }
        .nav-button.active .nav-icon { color: #FFFFFF; }
        
        .nav-text { flex: 1; }
        
        .nav-arrow { 
          font-size: 0.8rem; 
          font-weight: bold;
          color: var(--text-muted); 
          transition: transform 0.2s ease;
        }
        .nav-button.active .nav-arrow { color: #FFFFFF; }

        /* AREA DOS SUBMENUS */
        .sub-menu { display: flex; flex-direction: column; padding: 4px 0 10px 0; gap: 2px; }

        .sub-link { 
          padding: 8px 16px 8px 48px; 
          color: var(--text-main); 
          text-decoration: none; 
          font-size: 0.9rem; 
          font-weight: 400;
          transition: background-color 0.2s ease, color 0.2s ease;
          display: block; 
          border-radius: 6px;
          margin: 0 4px;
        }
        .sub-link:hover { color: #FFFFFF; background-color: var(--bg-hover); }
        .sub-link.active { color: #FFFFFF; font-weight: 600; }

        .divider { height: 1px; background-color: var(--border-color); margin: 10px 0; width: 100%; }

        /* BOTÃO LIVE */
        .nav-live {
          background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%) !important;
          color: white !important;
          animation: pulse-live 2s infinite;
        }

        @keyframes pulse-live {
          0% { transform: scale(1); box-shadow: 0 0 0 rgba(239, 68, 68, 0); }
          50% { transform: scale(1.01); box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4); }
          100% { transform: scale(1); box-shadow: 0 0 0 rgba(239, 68, 68, 0); }
        }

        /* RODAPÉ DO USUÁRIO */
        .sidebar-footer { 
          padding: 15px 20px; 
          border-top: 1px solid var(--border-color); 
          background: rgba(0, 0, 0, 0.15); /* Fundo sutil para separar o rodapé */
        }

        /* ESTILOS ESPECÍFICOS PARA O MOBILE (MENU LATERAL VERDADEIRO) */
        .mobile-overlay {
          display: none;
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(3px); /* Efeito de desfoque elegante */
          z-index: 998;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .mobile-overlay.show { opacity: 1; }
        
        .mobile-toggle {
          display: none;
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 55px;
          height: 55px;
          border-radius: 50%;
          background-color: var(--active-orange);
          color: #fff;
          border: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 1001; 
          cursor: pointer;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        @media (max-width: 1024px) {
          .mobile-overlay { display: block; pointer-events: none; }
          .mobile-overlay.show { pointer-events: auto; }
          .mobile-toggle { display: flex; }
          
          .sidebar-container { 
            transform: translateX(-100%);
            transition: transform 0.3s ease;
          }
          .sidebar-container.open {
            transform: translateX(0);
          }
        }
      `}</style>

      {/* COMPONENTES MOBILE */}
      <div
        className={`mobile-overlay ${isMobileOpen ? 'show' : ''}`}
        onClick={() => setIsMobileOpen(false)}
      />
      <button
        className="mobile-toggle"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? '✕' : '☰'}
      </button>

      <aside className={`sidebar-container ${isMobileOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <Link to="/dashboard" onClick={handleLinkClick} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <img src={sidebarLogo} alt="KA Tech" className="logo-img" />
          </Link>
        </div>

        <nav className="sidebar-nav">

          {/* BOTÃO LIVE */}
          {isLiveActive && (
            <Link to="/live" onClick={handleLinkClick} className={`nav-button nav-live ${location.pathname === '/live' ? 'active' : ''}`}>
              <div className="nav-item-content">
                <span className="nav-icon">((•))</span>
                <span className="nav-text">LIVE!</span>
              </div>
            </Link>
          )}

          {/* CURSOS */}
          <div className="nav-group">
            <button onClick={() => toggleMenu('cursos')} className={`nav-button ${expandedMenu === 'cursos' ? 'active' : ''}`}>
              <div className="nav-item-content">
                <span className="nav-icon">📚</span>
                <span className="nav-text">Cursos</span>
                <span className="nav-arrow" style={{ transform: expandedMenu === 'cursos' ? 'rotate(-90deg)' : 'rotate(0deg)' }}>&lt;</span>
              </div>
            </button>
            {expandedMenu === 'cursos' && (
              <div className="sub-menu">
                <Link to="/dashboard" onClick={handleLinkClick} className={`sub-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>Visão Geral</Link>
              </div>
            )}
          </div>

          {/* TRILHAS */}
          <div className="nav-group">
            <button onClick={() => toggleMenu('trilhas')} className={`nav-button ${expandedMenu === 'trilhas' ? 'active' : ''}`}>
              <div className="nav-item-content">
                <span className="nav-icon">🔍</span>
                <span className="nav-text">Trilhas</span>
                <span className="nav-arrow" style={{ transform: expandedMenu === 'trilhas' ? 'rotate(-90deg)' : 'rotate(0deg)' }}>&lt;</span>
              </div>
            </button>
            {expandedMenu === 'trilhas' && (
              <div className="sub-menu">
                <Link to="/cursos" onClick={handleLinkClick} className={`sub-link ${location.pathname === '/cursos' ? 'active' : ''}`}>Trilhas de Conhecimento</Link>
              </div>
            )}
          </div>

          {/* LIVE CENTER */}
          <div className="nav-group" style={{ display: 'none' }}> // INVISIVEL, V 2.0
            <button onClick={() => toggleMenu('lives')} className={`nav-button ${expandedMenu === 'lives' ? 'active' : ''}`}>
              <div className="nav-item-content">
                <span className="nav-icon">🎥</span>
                <span className="nav-text">Live Center</span>
                <span className="nav-arrow" style={{ transform: expandedMenu === 'lives' ? 'rotate(-90deg)' : 'rotate(0deg)' }}>&lt;</span>
              </div>
            </button>
            {expandedMenu === 'lives' && (
              <div className="sub-menu">
                <Link to="/lives-hub" onClick={handleLinkClick} className={`sub-link ${location.pathname === '/lives-hub' ? 'active' : ''}`}>Visão Geral</Link>
              </div>
            )}
          </div>

          {/* REUNIÕES */}
          <div className="nav-group" style={{ display: 'none' }}> // INVISIVEL, VERSAO V2.0
            <button onClick={() => toggleMenu('reunioes')} className={`nav-button ${expandedMenu === 'reunioes' ? 'active' : ''}`}>
              <div className="nav-item-content">
                <span className="nav-icon">🤝</span>
                <span className="nav-text">Reuniões</span>
                <span className="nav-arrow" style={{ transform: expandedMenu === 'reunioes' ? 'rotate(-90deg)' : 'rotate(0deg)' }}>&lt;</span>
              </div>
            </button>
            {expandedMenu === 'reunioes' && (
              <div className="sub-menu">
                <Link to="/reunioes" onClick={handleLinkClick} className={`sub-link ${location.pathname === '/reunioes' ? 'active' : ''}`}>Visão Geral</Link>
                <Link to="#" className="sub-link" style={{ opacity: 0.5 }}>Standby...</Link>
              </div>
            )}
          </div>

          {/* RANKING */}
          <div className="nav-group">
            <button onClick={() => toggleMenu('ranking')} className={`nav-button ${expandedMenu === 'ranking' ? 'active' : ''}`}>
              <div className="nav-item-content">
                <span className="nav-icon">🏅</span>
                <span className="nav-text">Ranking</span>
                <span className="nav-arrow" style={{ transform: expandedMenu === 'ranking' ? 'rotate(-90deg)' : 'rotate(0deg)' }}>&lt;</span>
              </div>
            </button>
            {expandedMenu === 'ranking' && (
              <div className="sub-menu">
                <Link to="/rankings" onClick={handleLinkClick} className={`sub-link ${location.pathname === '/rankings' ? 'active' : ''}`}>Hall da Fama</Link>
              </div>
            )}
          </div>

          {/* CONQUISTAS */}
          <div className="nav-group">
            <button onClick={() => toggleMenu('conquistas')} className={`nav-button ${expandedMenu === 'conquistas' ? 'active' : ''}`}>
              <div className="nav-item-content">
                <span className="nav-icon">🏆</span>
                <span className="nav-text">Conquistas</span>
                <span className="nav-arrow" style={{ transform: expandedMenu === 'conquistas' ? 'rotate(-90deg)' : 'rotate(0deg)' }}>&lt;</span>
              </div>
            </button>
            {expandedMenu === 'conquistas' && (
              <div className="sub-menu">
                <Link to="/conquistas" onClick={handleLinkClick} className={`sub-link ${location.pathname === '/conquistas' ? 'active' : ''}`}>Salão de Troféus</Link>
              </div>
            )}
          </div>

          {/* ÁREA ADMIN / TEACHER */}
          {(userRole === 'admin' || userRole === 'teacher') && (
            <>
              <div className="divider"></div>

              {/* GESTÃO */}
              <div className="nav-group">
                <button onClick={() => toggleMenu('gestao')} className={`nav-button ${expandedMenu === 'gestao' ? 'active' : ''}`}>
                  <div className="nav-item-content">
                    <span className="nav-icon">🛠️</span>
                    <span className="nav-text">Gestão</span>
                    <span className="nav-arrow" style={{ transform: expandedMenu === 'gestao' ? 'rotate(-90deg)' : 'rotate(0deg)' }}>&lt;</span>
                  </div>
                </button>
                {expandedMenu === 'gestao' && (
                  <div className="sub-menu">
                    <Link to="/admin" onClick={handleLinkClick} className={`sub-link ${location.pathname === '/admin' ? 'active' : ''}`}>Visão Geral</Link>
                    <Link to="/admin/usuarios" onClick={handleLinkClick} className={`sub-link ${location.pathname === '/admin/usuarios' ? 'active' : ''}`}>Usuários</Link>
                    <Link to="/admin/cursos" onClick={handleLinkClick} className={`sub-link ${location.pathname === '/admin/cursos' ? 'active' : ''}`}>Cursos e Trilhas</Link>
                    <Link to="/admin/lives" onClick={handleLinkClick} className={`sub-link ${location.pathname === '/admin/lives' ? 'active' : ''}`}>Gerir Lives</Link>
                    <Link to="/admin/gamificacao" onClick={handleLinkClick} className={`sub-link ${location.pathname === '/admin/gamificacao' ? 'active' : ''}`}>Gamificação</Link>
                  </div>
                )}
              </div>

              {/* RELATÓRIOS */}
              <div className="nav-group">
                <button onClick={() => toggleMenu('relatorios')} className={`nav-button ${expandedMenu === 'relatorios' ? 'active' : ''}`}>
                  <div className="nav-item-content">
                    <span className="nav-icon">📊</span>
                    <span className="nav-text">Relatórios</span>
                    <span className="nav-arrow" style={{ transform: expandedMenu === 'relatorios' ? 'rotate(-90deg)' : 'rotate(0deg)' }}>&lt;</span>
                  </div>
                </button>
                {expandedMenu === 'relatorios' && (
                  <div className="sub-menu">
                    <Link to="/relatorios/x" onClick={handleLinkClick} className={`sub-link ${location.pathname === '/relatorios/x' ? 'active' : ''}`}>Relatório X</Link>
                    <Link to="/relatorios/y" onClick={handleLinkClick} className={`sub-link ${location.pathname === '/relatorios/y' ? 'active' : ''}`}>Relatório Y</Link>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="divider"></div>

          {/* AJUSTES */}
          <div className="nav-group">
            <button onClick={() => toggleMenu('ajustes')} className={`nav-button ${expandedMenu === 'ajustes' ? 'active' : ''}`}>
              <div className="nav-item-content">
                <span className="nav-icon">⚙️</span>
                <span className="nav-text">Ajustes</span>
                <span className="nav-arrow" style={{ transform: expandedMenu === 'ajustes' ? 'rotate(-90deg)' : 'rotate(0deg)' }}>&lt;</span>
              </div>
            </button>
            {expandedMenu === 'ajustes' && (
              <div className="sub-menu">
                <Link to="/configuracoes" onClick={handleLinkClick} className={`sub-link ${location.pathname === '/configuracoes' ? 'active' : ''}`}>Perfil</Link>
              </div>
            )}
          </div>

        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Avatar src={avatarUrl} name={userName} />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <span style={{ color: '#E2E8F0', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{userName}</span>
              <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '0.75rem', cursor: 'pointer', textAlign: 'left', padding: 0 }}>Sair</button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;