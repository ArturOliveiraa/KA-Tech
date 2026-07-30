import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Avatar from "./Avatar";
import { useUser } from "./UserContext";
import { MessageSquare, X, Send } from "lucide-react";

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { userRole, userName, avatarUrl, themeColor, sidebarLogo, loading } = useUser();

  const [isLiveActive, setIsLiveActive] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // === ESTADOS PARA O FEEDBACK WIDGET ===
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('melhoria');
  const [feedbackName, setFeedbackName] = useState(userName || ''); 
  const [feedbackContact, setFeedbackContact] = useState(''); 
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

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

  // Preenche o nome caso demore a carregar do contexto
  useEffect(() => {
    if (userName && !feedbackName) setFeedbackName(userName);
  }, [userName, feedbackName]);

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

  // === LÓGICA DE ENVIO DO FEEDBACK ===
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim() || !feedbackName.trim() || !feedbackContact.trim()) return;

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Você precisa estar logado para enviar feedback.");
        return;
      }

      const { error } = await supabase
        .from('feedbacks')
        .insert([{ 
          user_id: user.id, 
          type: feedbackType, 
          message: feedbackMessage,
          user_name: feedbackName,
          contact_info: feedbackContact
        }]);

      if (error) throw error;

      setFeedbackSuccess(true);
      setFeedbackMessage('');
      setFeedbackContact('');
      setTimeout(() => {
        setIsFeedbackOpen(false);
        setFeedbackSuccess(false);
      }, 3000);

    } catch (error) {
      console.error("Erro ao enviar feedback:", error);
      alert("Ocorreu um erro ao enviar seu feedback. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const LARGURA_SIDEBAR = "270px";

  if (loading) return <aside className="sidebar-container" style={{ width: LARGURA_SIDEBAR, backgroundColor: '#060913' }} />;

  return (
    <>
      <style>{`
        /* PALETA DE CORES PREMIUM INSPIRADA NO DASHBOARD (DARK) */
        :root { 
          --bg-sidebar: linear-gradient(180deg, #111625 0%, #050810 100%);
          --bg-hover: rgba(255, 255, 255, 0.06);   
          --active-orange: #FF9800; 
          --text-main: #E2E8F0;  
          --text-muted: #8BA0B8; 
          --border-color: rgba(255, 255, 255, 0.05);
        }
        
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
          box-shadow: 4px 0 25px rgba(0, 0, 0, 0.3);
        }

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
        
        .nav-button { 
          background: transparent; 
          border: none; 
          width: 100%; 
          cursor: pointer; 
          text-align: left; 
          padding: 12px 14px; 
          color: var(--text-main); 
          border-radius: 8px;
          font-size: 0.95rem; 
          font-weight: 500;
          transition: background-color 0.2s ease, color 0.2s ease;
          display: flex;
          align-items: center;
          text-decoration: none;
        }
        
        .nav-button:hover:not(.active) { background-color: var(--bg-hover); }
        .nav-button.active { background-color: var(--active-orange); color: #FFFFFF; }

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

        .sidebar-footer { 
          padding: 15px 20px; 
          border-top: 1px solid var(--border-color); 
          background: rgba(0, 0, 0, 0.15); 
        }

        /* MODAL DE FEEDBACK DENTRO DA SIDEBAR (CORRIGIDO) */
        .feedback-popover {
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 16px;
          margin: 4px 10px 10px 10px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          animation: fadeUp 0.2s ease;
          box-sizing: border-box; 
        }
        
        .feedback-input {
          width: 100%; 
          padding: 10px 12px; 
          border-radius: 6px;
          background: rgba(255,255,255,0.05); 
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff; 
          outline: none; 
          margin-bottom: 10px; 
          font-size: 0.85rem;
          box-sizing: border-box; 
          font-family: inherit;
        }
        
        .feedback-input:focus {
          border-color: var(--active-orange);
          background: rgba(255,255,255,0.08);
        }

        .feedback-btn {
          width: 100%; 
          padding: 12px; 
          border-radius: 6px;
          background: var(--active-orange); 
          color: #fff; 
          border: none;
          font-weight: 600; 
          cursor: pointer; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 6px; 
          font-size: 0.9rem;
          box-sizing: border-box;
          transition: filter 0.2s;
        }
        
        .feedback-btn:hover {
          filter: brightness(1.1);
        }

        .mobile-overlay {
          display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.6); backdrop-filter: blur(3px); z-index: 998;
          opacity: 0; transition: opacity 0.3s ease;
        }
        .mobile-overlay.show { opacity: 1; }
        
        .mobile-toggle {
          display: none; position: fixed; bottom: 20px; right: 20px; width: 55px; height: 55px;
          border-radius: 50%; background-color: var(--active-orange); color: #fff; border: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1001; cursor: pointer;
          align-items: center; justify-content: center; font-size: 1.5rem;
        }

        @media (max-width: 1024px) {
          .mobile-overlay { display: block; pointer-events: none; }
          .mobile-overlay.show { pointer-events: auto; }
          .mobile-toggle { display: flex; }
          .sidebar-container { transform: translateX(-100%); transition: transform 0.3s ease; }
          .sidebar-container.open { transform: translateX(0); }
        }
      `}</style>

      <div className={`mobile-overlay ${isMobileOpen ? 'show' : ''}`} onClick={() => setIsMobileOpen(false)} />
      <button className="mobile-toggle" onClick={() => setIsMobileOpen(!isMobileOpen)}>
        {isMobileOpen ? '✕' : '☰'}
      </button>

      <aside className={`sidebar-container ${isMobileOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <Link to="/dashboard" onClick={handleLinkClick} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <img src={sidebarLogo} alt="KA Tech" className="logo-img" />
          </Link>
        </div>

        <nav className="sidebar-nav">
          {isLiveActive && (
            <Link to="/live" onClick={handleLinkClick} className={`nav-button nav-live ${location.pathname === '/live' ? 'active' : ''}`}>
              <div className="nav-item-content">
                <span className="nav-icon">((•))</span>
                <span className="nav-text">LIVE!</span>
              </div>
            </Link>
          )}

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
                    <Link to="/admin/feedbacks" onClick={handleLinkClick} className={`sub-link ${location.pathname === '/admin/feedbacks' ? 'active' : ''}`}>Feedbacks (Bugs)</Link>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="divider"></div>

          {/* FEEDBACK BUTTON INLINE */}
          <div className="nav-group">
            <button 
              onClick={() => setIsFeedbackOpen(!isFeedbackOpen)} 
              className={`nav-button ${isFeedbackOpen ? 'active' : ''}`}
            >
              <div className="nav-item-content">
                <MessageSquare className="nav-icon" size={18} style={{ width: '22px' }} />
                <span className="nav-text" style={{ fontSize: '0.9rem' }}>Deixar Feedback</span>
                <span className="nav-arrow" style={{ transform: isFeedbackOpen ? 'rotate(-90deg)' : 'rotate(0deg)' }}>&lt;</span>
              </div>
            </button>
            
            {isFeedbackOpen && (
              <div className="feedback-popover">
                {feedbackSuccess ? (
                  <div style={{ textAlign: 'center', padding: '10px 0', color: '#10b981', fontSize: '0.9rem' }}>
                    Obrigado pelo seu feedback! 🚀
                  </div>
                ) : (
                  <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
                    <input 
                      type="text"
                      value={feedbackName}
                      onChange={(e) => setFeedbackName(e.target.value)}
                      placeholder="Seu Nome"
                      required
                      className="feedback-input"
                    />

                    <input 
                      type="text"
                      value={feedbackContact}
                      onChange={(e) => setFeedbackContact(e.target.value)}
                      placeholder="Discord ou WhatsApp"
                      required
                      className="feedback-input"
                    />

                    <select 
                      value={feedbackType} 
                      onChange={(e) => setFeedbackType(e.target.value)}
                      className="feedback-input"
                    >
                      <option value="melhoria" style={{ color: '#000' }}>💡 Sugestão</option>
                      <option value="bug" style={{ color: '#000' }}>🐛 Reportar Bug</option>
                      <option value="elogio" style={{ color: '#000' }}>⭐ Elogio</option>
                      <option value="outro" style={{ color: '#000' }}>🤔 Outro</option>
                    </select>

                    <textarea 
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      placeholder="Descreva detalhadamente..."
                      rows={3}
                      required
                      className="feedback-input"
                      style={{ resize: 'none' }}
                    />

                    <button type="submit" disabled={isSubmitting} className="feedback-btn">
                      {isSubmitting ? 'Enviando...' : <><Send size={14} /> Enviar</>}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

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