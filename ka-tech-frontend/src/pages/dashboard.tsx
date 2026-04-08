import React from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useUser } from "../components/UserContext";
import logo from "../assets/ka-tech-logo.png";
import SEO from "../components/SEO";
import { useDashboardData } from "../hooks/useDashboardData";
import { Play, PlayCircle, BookOpen, Compass, Target, Flame, ChevronRight } from "lucide-react";

export default function Dashboard() {
  const { userName } = useUser();
  const navigate = useNavigate();
  const { data: enrolledCourses = [], isLoading, isError } = useDashboardData();

  // Ordenações
  const recentCourses = [...enrolledCourses].sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime());
  const featuredCourse = recentCourses[0]; // O mais recente ganha o Banner Principal
  const otherRecent = recentCourses.slice(1, 4); // Os próximos 3
  const tableCourses = [...enrolledCourses].sort((a, b) => b.progress - a.progress);

  // Helper para garantir que a imagem não quebre
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = logo;
  };

  if (isError) {
    return (
        <div className="dashboard-wrapper" style={{ justifyContent: 'center', alignItems: 'center' }}>
            <Sidebar />
            <div style={{ color: '#ef4444', textAlign: 'center', marginLeft: '260px' }}>
                <h3>Erro ao carregar sua jornada.</h3>
                <p>Tente recarregar a página.</p>
            </div>
        </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <SEO title="Minha Jornada" description="Acompanhe seu progresso na KA Tech." />
      <Sidebar />

      {/* Fundo Decorativo */}
      <div className="ambient-bg">
        <div className="ambient-blob blob-1"></div>
        <div className="ambient-blob blob-2"></div>
      </div>

      <main className="dashboard-content">
        <div className="brand-logo-mobile">
          <img src={logo} alt="KA Tech Logo" />
        </div>
        
        {/* HEADER MINIMALISTA */}
        <header className="hero-header">
          <h1 className="page-title">Minha <span className="text-gradient">Jornada</span></h1>
          <p className="hero-subtitle">Bem-vindo de volta, <strong>{userName.split(' ')[0]}</strong>. Retome seu foco.</p>
        </header>

        {isLoading ? (
          <div className="loading-state glass-panel">
            <Compass size={44} className="animate-spin-slow text-primary" style={{ margin: '0 auto 15px' }} />
            <p>Sincronizando seu progresso...</p>
          </div>
        ) : (
          <>
            {enrolledCourses.length > 0 ? (
              <>
                {/* 1. DESTAQUE PRINCIPAL (HERO BANNER FLUIDO) */}
                {featuredCourse && (
                  <div className="featured-banner glass-panel" onClick={() => navigate(`/curso/${featuredCourse.slug}`)}>
                      {/* Fundo do Banner usa a imagem do curso escurecida */}
                      <div 
                        className="featured-bg" 
                        style={{ backgroundImage: `url(${featuredCourse.thumbnailUrl || logo})` }}
                      ></div>
                      <div className="featured-overlay"></div>

                      <div className="featured-content">
                          <div className="featured-badge"><Flame size={14} /> CONTINUAR ASSISTINDO</div>
                          <h2 className="featured-title" title={featuredCourse.title}>{featuredCourse.title}</h2>
                          
                          <div className="featured-progress-wrapper">
                              <div className="progress-track featured-track">
                                  <div className="progress-fill" style={{ width: `${featuredCourse.progress}%` }}></div>
                              </div>
                              <span className="featured-percent">{featuredCourse.progress}% concluído</span>
                          </div>

                          <button className="btn-featured-play">
                              <Play size={20} fill="currentColor" /> Retomar Aula
                          </button>
                      </div>
                  </div>
                )}

                {/* 2. RECENTES (Caso tenha mais de 1 curso em andamento) */}
                {otherRecent.length > 0 && (
                  <div className="section-block">
                    <h3 className="section-title"><Target size={20} className="text-primary"/> Assistidos Recentemente</h3>
                    <div className="recent-grid">
                      {otherRecent.map((course, index) => (
                        <div 
                            key={course.id} 
                            className="recent-card glass-panel" 
                            onClick={() => navigate(`/curso/${course.slug}`)}
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="recent-thumb">
                            <div className="thumb-overlay-dark"></div>
                            <img src={course.thumbnailUrl || logo} alt={course.title} onError={handleImageError} />
                            <div className="play-icon-center"><PlayCircle size={36} color="#fff" /></div>
                          </div>

                          <div className="recent-info">
                            <h4 className="recent-title" title={course.title}>{course.title}</h4>
                            <div className="progress-track compact-track">
                                <div className="progress-fill" style={{ width: `${course.progress}%` }}></div>
                            </div>
                            <span className="recent-percent">{course.progress}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 3. TODOS OS CURSOS ATIVOS (GRID FLUIDO PREENCHENDO 100%) */}
                <div className="section-block" style={{ marginTop: '50px' }}>
                    <h3 className="section-title"><BookOpen size={20} className="text-primary"/> Seu Acervo Completo</h3>
                    
                    <div className="all-courses-grid">
                        {tableCourses.map((course, index) => (
                            <div 
                                key={course.id} 
                                className="list-card glass-panel"
                                onClick={() => navigate(`/curso/${course.slug}`)}
                                style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                <div className="list-thumb">
                                    <img src={course.thumbnailUrl || logo} alt={course.title} onError={handleImageError} />
                                </div>

                                <div className="list-info">
                                    <h4 className="list-title" title={course.title}>{course.title}</h4>
                                    
                                    <div className="list-progress-area">
                                        <div className="progress-track super-compact">
                                            <div className="progress-fill" style={{ width: `${course.progress}%` }}></div>
                                        </div>
                                        <span className="list-percent">{course.progress}%</span>
                                    </div>
                                </div>

                                <div className="list-action">
                                    <button className="btn-circle-play" title="Acessar">
                                        <ChevronRight size={24} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              </>
            ) : (
              <div className="empty-state glass-panel">
                <Compass size={64} color="#475569" style={{ marginBottom: '20px', opacity: 0.5 }} />
                <h3 style={{ color: '#fff', fontSize: '1.8rem', marginBottom: '10px', fontWeight: 800 }}>O início da sua jornada.</h3>
                <p style={{ color: '#94a3b8', maxWidth: '450px', margin: '0 auto 30px', fontSize: '1.05rem', lineHeight: '1.5' }}>
                    Seu painel está vazio. Explore as trilhas de conhecimento no menu lateral e dê o primeiro passo rumo à maestria.
                </p>
                <button onClick={() => navigate('/cursos')} className="btn-primary-large">
                    Explorar Trilhas Agora
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <style>{`
        :root {
            --primary: #8b5cf6; 
            --primary-hover: #7c3aed;
            --bg-dark: #020617; 
            --bg-card: rgba(15, 23, 42, 0.4); 
            --border-color: rgba(255, 255, 255, 0.08);
            --text-light: #f8fafc;
            --text-dim: #94a3b8;
            --track-bg: rgba(0,0,0,0.4);
        }
        
        * { box-sizing: border-box; }

        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin-slow { 100% { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 4s linear infinite; }

        .text-primary { color: var(--primary); }
        .text-gradient { background: linear-gradient(135deg, #c4b5fd 0%, #8b5cf6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

        .dashboard-wrapper {
            display: flex; width: 100%; min-height: 100vh; position: relative;
            background-color: var(--bg-dark); font-family: 'Inter', system-ui, sans-serif;
            overflow-x: hidden; color: var(--text-light);
        }

        /* AMBIENT BACKGROUND */
        .ambient-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
        .ambient-blob { position: absolute; border-radius: 50%; filter: blur(140px); opacity: 0.15; }
        .blob-1 { top: -10%; left: 10%; width: 40vw; height: 40vw; background: var(--primary); }
        .blob-2 { bottom: -20%; right: -10%; width: 50vw; height: 50vw; background: #0ea5e9; }

        /* CONTENT: Remoção do Max-Width para Ocupar 100% */
        .dashboard-content {
            position: relative; z-index: 1; flex: 1; margin-left: 260px; 
            padding: 50px 60px 100px 60px; width: calc(100% - 260px); 
        }

        .brand-logo-mobile { display: none; width: 100%; justify-content: center; margin-bottom: 30px; }
        .brand-logo-mobile img { height: 50px; object-fit: contain; }

        .glass-panel {
            background: var(--bg-card); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--border-color); border-top-color: rgba(255,255,255,0.12);
        }

        /* HEADER */
        .hero-header { margin-bottom: 40px; }
        .page-title { font-size: 2.5rem; font-weight: 900; margin: 0 0 5px 0; letter-spacing: -1px; color: #fff;}
        .hero-subtitle { color: var(--text-dim); font-size: 1.1rem; margin: 0; font-weight: 400; }

        /* 1. FEATURED BANNER (HERO) */
        .featured-banner {
            position: relative; width: 100%; height: 380px; border-radius: 32px; overflow: hidden;
            margin-bottom: 40px; cursor: pointer; transition: 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            display: flex; align-items: flex-end; box-shadow: 0 20px 50px -10px rgba(0,0,0,0.5);
            animation: fadeUp 0.6s ease-out forwards;
        }
        .featured-banner:hover { transform: translateY(-5px); box-shadow: 0 30px 60px -10px rgba(0,0,0,0.7); border-color: rgba(139, 92, 246, 0.4);}
        
        .featured-bg {
            position: absolute; inset: 0; background-size: cover; background-position: center; 
            filter: blur(5px) brightness(0.8); transform: scale(1.05); transition: 0.8s;
        }
        .featured-banner:hover .featured-bg { filter: blur(2px) brightness(1); transform: scale(1.08); }
        
        .featured-overlay {
            position: absolute; inset: 0;
            background: linear-gradient(to top, rgba(2, 6, 23, 1) 0%, rgba(2, 6, 23, 0.6) 50%, transparent 100%);
        }

        .featured-content {
            position: relative; z-index: 2; padding: 40px; width: 100%; max-width: 800px;
        }
        .featured-badge {
            display: inline-flex; align-items: center; gap: 6px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4);
            color: #fca5a5; font-size: 0.75rem; font-weight: 800; padding: 6px 12px; border-radius: 20px; letter-spacing: 1px; margin-bottom: 15px;
        }
        .featured-title { font-size: 2.4rem; font-weight: 900; color: #fff; margin: 0 0 20px 0; line-height: 1.2; text-shadow: 0 4px 20px rgba(0,0,0,0.8); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;}
        
        .featured-progress-wrapper { display: flex; align-items: center; gap: 15px; margin-bottom: 25px; width: 100%; max-width: 400px;}
        .featured-track { height: 8px; flex: 1; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; }
        .featured-percent { font-weight: 700; color: #cbd5e1; font-size: 0.95rem; }

        .btn-featured-play {
            background: #fff; color: #000; border: none; padding: 14px 28px; border-radius: 16px;
            font-size: 1.05rem; font-weight: 800; cursor: pointer; transition: 0.3s;
            display: inline-flex; align-items: center; gap: 10px; box-shadow: 0 10px 30px rgba(255,255,255,0.2);
        }
        .featured-banner:hover .btn-featured-play { background: var(--primary); color: #fff; box-shadow: 0 10px 30px rgba(139, 92, 246, 0.4); }

        /* SECTION TITLES */
        .section-block { margin-bottom: 50px; }
        .section-title { font-size: 1.25rem; font-weight: 800; color: #fff; margin: 0 0 20px 0; display: flex; align-items: center; gap: 10px; letter-spacing: -0.3px;}

        /* 2. RECENTES GRID */
        .recent-grid { 
            display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; 
        }
        .recent-card {
            border-radius: 20px; overflow: hidden; cursor: pointer; display: flex; flex-direction: column;
            transition: all 0.3s ease; animation: fadeUp 0.5s ease-out forwards; opacity: 0;
        }
        .recent-card:hover { transform: translateY(-5px); border-color: rgba(139, 92, 246, 0.4); box-shadow: 0 15px 30px rgba(0,0,0,0.4); }
        
        .recent-thumb { position: relative; width: 100%; aspect-ratio: 16/9; background: #000; overflow: hidden;}
        .recent-thumb img { width: 100%; height: 100%; object-fit: cover; opacity: 0.8; transition: 0.5s; }
        .recent-card:hover .recent-thumb img { transform: scale(1.05); opacity: 1; }
        
        .thumb-overlay-dark { position: absolute; inset: 0; background: rgba(0,0,0,0.2); z-index: 1; transition: 0.3s;}
        .recent-card:hover .thumb-overlay-dark { background: rgba(0,0,0,0); }

        .play-icon-center { 
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 2;
            opacity: 0.5; transition: 0.3s; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));
        }
        .recent-card:hover .play-icon-center { opacity: 1; transform: translate(-50%, -50%) scale(1.1); color: var(--primary); }

        .recent-info { padding: 20px; flex: 1; display: flex; flex-direction: column; justify-content: flex-end;}
        .recent-title { font-size: 1.1rem; font-weight: 700; color: #fff; margin: 0 0 15px 0; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;}
        .compact-track { height: 4px; margin-bottom: 8px;}
        .recent-percent { font-size: 0.8rem; font-weight: 700; color: var(--text-dim); }


        /* 3. TODOS OS CURSOS (GRID FLUIDO 100%) */
        /* Essa é a grande sacada: grid com minmax() longo faz a lista se comportar como cards largos que preenchem a tela */
        .all-courses-grid {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 20px;
        }

        .list-card {
            display: flex; align-items: center; gap: 20px; padding: 16px; border-radius: 20px;
            cursor: pointer; transition: all 0.3s ease; animation: fadeUp 0.5s ease-out forwards; opacity: 0;
        }
        .list-card:hover {
            transform: translateX(5px); border-color: rgba(139, 92, 246, 0.4);
            background: rgba(30, 41, 59, 0.6); box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        }

        .list-thumb { width: 90px; height: 60px; border-radius: 12px; overflow: hidden; background: #000; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.05);}
        .list-thumb img { width: 100%; height: 100%; object-fit: cover; opacity: 0.9; transition: 0.3s;}
        .list-card:hover .list-thumb img { opacity: 1; transform: scale(1.05);}

        .list-info { flex: 1; display: flex; flex-direction: column; justify-content: center; min-width: 0;}
        .list-title { 
            font-size: 1.05rem; font-weight: 700; color: #fff; margin: 0 0 8px 0; line-height: 1.2;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        
        .list-progress-area { display: flex; align-items: center; gap: 12px; width: 100%; max-width: 250px; }
        .super-compact { height: 4px; flex: 1;}
        .list-percent { font-size: 0.8rem; font-weight: 700; color: var(--text-dim); min-width: 35px;}

        .list-action { flex-shrink: 0; display: flex; align-items: center; justify-content: center; padding-right: 10px;}
        .btn-circle-play {
            background: transparent; border: none; color: var(--text-dim);
            cursor: pointer; transition: 0.3s; display: flex; align-items: center; justify-content: center;
        }
        .list-card:hover .btn-circle-play { color: var(--primary); transform: translateX(5px); }

        /* BARRAS DE PROGRESSO GLOBAIS */
        .progress-track { background: var(--track-bg); border-radius: 99px; overflow: hidden; width: 100%; }
        .progress-fill { 
            height: 100%; border-radius: 99px; transition: width 1s cubic-bezier(0.16, 1, 0.3, 1);
            background: linear-gradient(90deg, #8b5cf6 0%, #d946ef 100%);
            box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
        }

        /* EMPTY STATE / LOADING */
        .loading-state { text-align: center; padding: 60px 20px; border-radius: 24px; color: var(--text-dim); font-size: 1.1rem; }
        .empty-state { text-align: center; padding: 100px 20px; border-radius: 32px; border-style: dashed;}
        
        .btn-primary-large {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
            color: #fff; border: none; padding: 18px 36px; border-radius: 18px; font-weight: 800;
            font-size: 1.05rem; cursor: pointer; transition: 0.3s; box-shadow: 0 10px 25px rgba(139, 92, 246, 0.3);
        }
        .btn-primary-large:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(139, 92, 246, 0.5); filter: brightness(1.1); }


        /* MOBILE RESPONSIVE */
        @media (max-width: 1024px) {
            .dashboard-content { margin-left: 0; padding: 40px 30px 120px 30px; width: 100%; max-width: 100%; }
            .featured-banner { height: 320px; }
            .featured-content { padding: 30px; }
            .featured-title { font-size: 2rem; }
            .all-courses-grid { grid-template-columns: 1fr; } /* Em tablet, a lista vira 1 coluna */
        }

        @media (max-width: 600px) {
            .dashboard-content { padding: 30px 20px 100px 20px; }
            .brand-logo-mobile { display: flex; }
            .page-title { font-size: 2.2rem; }
            
            .featured-banner { height: auto; min-height: 300px; }
            .featured-content { padding: 25px 20px; }
            .featured-title { font-size: 1.6rem; }
            
            .recent-grid { grid-template-columns: 1fr; }
            
            /* Lista de cursos em Mobile */
            .list-card { padding: 12px 16px; gap: 15px; }
            .list-card:hover { transform: none; }
            .list-thumb { width: 70px; height: 50px; }
            .list-title { font-size: 0.95rem; white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
            .list-progress-area { max-width: 100%; }
            .list-action { display: none; } /* Oculta a seta no mobile para economizar espaço */
        }
      `}</style>
    </div>
  );
}