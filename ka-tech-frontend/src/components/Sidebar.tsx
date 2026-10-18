import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  BarChart3, BookOpen, ChevronDown, Compass, LayoutDashboard, LogOut, Medal, Menu,
  MessageSquare, Moon, Settings, ShieldCheck, Sun, Trophy, X,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import Avatar from "./Avatar";
import { useUser } from "./UserContext";
import { useTheme } from "./ThemeContext";
import FeedbackModal from "./FeedbackModal";

type NavItem = { to: string; label: string; icon: React.ElementType };

const LEARN: NavItem[] = [
  { to: "/dashboard", label: "Minha jornada", icon: LayoutDashboard },
  { to: "/cursos", label: "Trilhas", icon: Compass },
];

const COMMUNITY: NavItem[] = [
  { to: "/rankings", label: "Ranking", icon: Medal },
  { to: "/conquistas", label: "Conquistas", icon: Trophy },
];

const ADMIN: NavItem[] = [
  { to: "/admin/usuarios", label: "Usuários", icon: ShieldCheck },
  { to: "/admin/cursos", label: "Cursos e trilhas", icon: BookOpen },
  { to: "/admin/gamificacao", label: "Gamificação", icon: Trophy },
  { to: "/admin/feedbacks", label: "Feedbacks", icon: MessageSquare },
  { to: "/admin/relatorio-alunos", label: "Relatório de alunos", icon: BarChart3 },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { userRole, userName, avatarUrl, sidebarLogo, loading } = useUser();
  const { theme, toggleTheme } = useTheme();

  const [isLiveActive, setIsLiveActive] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(() => location.pathname.startsWith("/admin"));

  const isStaff = userRole === "admin" || userRole === "teacher";

  useEffect(() => {
    const checkLiveStatus = async () => {
      const { data } = await supabase
        .from("lives")
        .select("id")
        .is("duration", null)
        .lte("scheduled_at", new Date().toISOString())
        .limit(1);
      setIsLiveActive(!!data && data.length > 0);
    };
    checkLiveStatus();
    const interval = setInterval(checkLiveStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fecha a gaveta ao trocar de página
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Trava a rolagem do fundo com a gaveta aberta
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const renderLink = ({ to, label, icon: Icon }: NavItem) => (
    <NavLink key={to} to={to} className={({ isActive }) => `sb-link ${isActive ? "is-active" : ""}`}>
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  );

  const ThemeIcon = theme === "dark" ? Sun : Moon;

  return (
    <>
      {/* Barra superior (tablet e celular) */}
      <header className="sb-topbar">
        <button className="sb-icon-btn" onClick={() => setMobileOpen(true)} aria-label="Abrir menu" aria-expanded={mobileOpen}>
          <Menu size={20} />
        </button>
        <Link to="/dashboard" className="sb-topbar__logo">
          <img src={sidebarLogo} alt="KA Tech" className="brand-logo-img" />
        </Link>
        <button className="sb-icon-btn" onClick={toggleTheme} aria-label={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}>
          <ThemeIcon size={18} />
        </button>
      </header>

      <div className={`sb-overlay ${mobileOpen ? "is-open" : ""}`} onClick={() => setMobileOpen(false)} aria-hidden="true" />

      <aside className={`sb ${mobileOpen ? "is-open" : ""}`} aria-label="Menu principal">
        <div className="sb-brand">
          <Link to="/dashboard" className="sb-brand__logo">
            <img src={sidebarLogo} alt="KA Tech" className="brand-logo-img" />
          </Link>
          <button className="sb-icon-btn sb-close" onClick={() => setMobileOpen(false)} aria-label="Fechar menu">
            <X size={20} />
          </button>
        </div>

        <nav className="sb-nav">
          {isLiveActive && (
            <NavLink to="/live" className={({ isActive }) => `sb-live ${isActive ? "is-active" : ""}`}>
              <span className="sb-live__dot" aria-hidden="true" />
              <span>Ao vivo agora</span>
              <span className="sb-live__tag">LIVE</span>
            </NavLink>
          )}

          {loading ? (
            <div className="sb-skeleton" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => <div key={i} className="ui-skeleton" style={{ height: 38 }} />)}
            </div>
          ) : (
            <>
              <div className="sb-group">
                <span className="sb-group__label">Aprender</span>
                {LEARN.map(renderLink)}
              </div>

              <div className="sb-group">
                <span className="sb-group__label">Comunidade</span>
                {COMMUNITY.map(renderLink)}
              </div>

              {isStaff && (
                <div className="sb-group">
                  <button
                    className="sb-group__toggle"
                    onClick={() => setAdminOpen((v) => !v)}
                    aria-expanded={adminOpen}
                    aria-controls="sb-admin"
                  >
                    <span>Gestão</span>
                    <ChevronDown size={16} style={{ transform: adminOpen ? "rotate(180deg)" : "none" }} />
                  </button>
                  {adminOpen && <div id="sb-admin" className="sb-group__items">{ADMIN.map(renderLink)}</div>}
                </div>
              )}
            </>
          )}
        </nav>

        <div className="sb-footer">
          <div className="sb-actions">
            <button className="sb-link" onClick={() => setFeedbackOpen(true)}>
              <MessageSquare size={18} aria-hidden="true" />
              <span>Deixar feedback</span>
            </button>
            <button className="sb-link" onClick={toggleTheme} aria-pressed={theme === "dark"}>
              <ThemeIcon size={18} aria-hidden="true" />
              <span>{theme === "dark" ? "Tema claro" : "Tema escuro"}</span>
            </button>
          </div>

          <div className="sb-user">
            <Link to="/configuracoes" className="sb-user__profile" title="Configurações do perfil">
              <Avatar src={avatarUrl} name={userName} />
              <span className="sb-user__text">
                <span className="sb-user__name">{userName}</span>
                <span className="sb-user__role">{userRole === "admin" ? "Administrador" : userRole === "teacher" ? "Instrutor" : "Aluno"}</span>
              </span>
              <Settings size={16} aria-hidden="true" className="sb-user__gear" />
            </Link>
            <button className="sb-icon-btn sb-logout" onClick={handleLogout} aria-label="Sair da conta" title="Sair">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} defaultName={userName} />
    </>
  );
};

export default Sidebar;
