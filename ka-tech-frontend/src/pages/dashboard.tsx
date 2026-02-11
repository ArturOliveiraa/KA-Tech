import React from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useUser } from "../components/UserContext";
import logo from "../assets/ka-tech-logo.png";
import styles from "./Dashboard.module.css";
import SEO from "../components/SEO";
import { useDashboardData } from "../hooks/useDashboardData";

function Dashboard() {
  const { userName } = useUser();
  const navigate = useNavigate();
  const { data: enrolledCourses = [], isLoading, isError } = useDashboardData();

  const topThreeRecent = [...enrolledCourses]
    .sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime())
    .slice(0, 3);

  const tableCourses = [...enrolledCourses].sort((a, b) => b.progress - a.progress);

  // Helper simples para garantir que a imagem não quebre
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = logo;
  };

  if (isError) {
     return <div style={{color: 'red', padding: 40}}>Erro ao carregar dados.</div>;
  }

  return (
    <div className={styles.dashboardWrapper}>
      <SEO title="Minha Jornada" description="Acompanhe seu progresso na KA Tech." />
      <Sidebar />

      <main className={styles.dashboardContent}>
        <div className={styles.brandLogoContainer}>
          <img src={logo} alt="KA Tech Logo" />
        </div>
        
        <header className={styles.headerContainer}>
          <h1>Minha <span style={{ color: '#8b5cf6' }}>Jornada</span></h1>
          <p>Olá, <strong style={{ color: '#fff' }}>{userName}</strong>. Vamos continuar?</p>
        </header>

        {isLoading ? (
          <div style={{ padding: '80px', textAlign: 'center', color: '#8b5cf6' }}>Carregando...</div>
        ) : (
          <>
            {enrolledCourses.length > 0 ? (
              <>
                <div className={styles.dashboardGrid}>
                  {topThreeRecent.map((course) => (
                    <div key={course.id} className={styles.premiumCard} onClick={() => navigate(`/curso/${course.slug}`)}>
                      <div className={styles.thumbBox}>
                        <img src={course.thumbnailUrl || ""} alt={course.title} />
                      </div>
                      <div className={styles.cardBody}>
                        <h3>{course.title}</h3>
                        <div className={styles.progressBlock}>
                            <div className={styles.progressLabel}>
                                <span>Progresso</span><span>{course.progress}%</span>
                            </div>
                            <div className={styles.progressTrack}>
                                <div className={styles.progressFill} style={{ width: `${course.progress}%` }}></div>
                            </div>
                        </div>
                        <button className={styles.btnMain}>CONTINUAR</button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <section className={styles.tableSection}>
                  <h2>Cursos Ativos</h2>
                  <div className={styles.listContainer}>
                    <table className={styles.customTable}>
                      <thead>
                        <tr><th></th><th>Treinamento</th><th style={{ textAlign: 'right' }}>Ação</th></tr>
                      </thead>
                      <tbody>
                        {tableCourses.map((course) => (
                          <tr key={course.id} onClick={() => window.innerWidth <= 1024 && navigate(`/curso/${course.slug}`)}>
                            
                            {/* COLUNA 1: Apenas Imagem (Tamanho controlado pelo CSS) */}
                            <td style={{ width: '80px' }}> {/* Largura fixa para coluna da imagem */}
                                <img 
                                    src={course.thumbnailUrl || logo} 
                                    alt={course.title} 
                                    className={styles.courseThumb}
                                    onError={handleImageError}
                                />
                            </td>

                            {/* COLUNA 2: Título + Barra de Progresso */}
                            <td>
                              <div className={styles.desktopInfo}>
                                  {/* Título aparece aqui tanto no Desktop quanto Mobile agora */}
                                  <div className={styles.mobileTitleText}>{course.title}</div>
                                  
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div className={`${styles.progressTrack} ${styles.compact}`}>
                                      <div className={styles.progressFill} style={{ width: `${course.progress}%` }}></div>
                                    </div>
                                    <span className={styles.percentageCompact}>{course.progress}%</span>
                                  </div>
                              </div>
                            </td>

                            {/* COLUNA 3: Botão Play */}
                            <td style={{ textAlign: 'right', width: '60px' }}>
                                <button 
                                    className={styles.btnPlayDesktop}
                                    onClick={(e) => { e.stopPropagation(); navigate(`/curso/${course.slug}`); }}
                                    title="Assistir aula"
                                >
                                    <svg viewBox="0 0 24 24">
                                        <path d="M8 5V19L19 12L8 5Z" />
                                    </svg>
                                </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <h3 style={{color: 'white'}}>Sem cursos ativos no momento.</h3>
                <button onClick={() => navigate('/cursos')} className={styles.btnMain} style={{ maxWidth: '200px', marginTop: '20px' }}>Explorar</button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboard;