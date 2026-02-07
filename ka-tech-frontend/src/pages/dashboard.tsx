import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import { useUser } from "../components/UserContext";
import logo from "../assets/ka-tech-logo.png";
import styles from "../css/dashboard.module.css";

interface Course {
  id: number;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  progress: number;
  totalDuration: number;
  enrolledAt: string;
}

function Dashboard() {
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const { userName, loading: contextLoading } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate("/");

        const { data, error } = await supabase.rpc('get_user_dashboard');

        if (error) {
          console.error("Erro ao carregar dashboard:", error);
          return;
        }

        if (data) {
          const activeCourses = (data as Course[]).filter(c => c.progress < 100);
          setEnrolledCourses(activeCourses);
        }

      } catch (err) {
        console.error("Erro no processamento:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [navigate]);

  const topThreeRecent = [...enrolledCourses]
    .sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime())
    .slice(0, 3);

  const tableCourses = [...enrolledCourses].sort((a, b) => b.progress - a.progress);

  return (
    <div className={styles.dashboardWrapper}>
      <Sidebar />

      <main className={styles.dashboardContent}>
        <div className={styles.brandLogoContainer}>
          <img src={logo} alt="KA Tech Logo" />
        </div>
        <header className={styles.headerContainer}>
          <h1>Minha <span style={{ color: '#8b5cf6' }}>Jornada</span></h1>
          <p>Olá, <strong style={{ color: '#fff' }}>{userName}</strong>. Continue de onde parou!</p>
        </header>

        {(loading || contextLoading) ? (
          <div style={{ padding: '100px', textAlign: 'center', color: '#8b5cf6', fontWeight: 800 }}>Sincronizando...</div>
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
                        <div className={styles.progressLabel}>
                          <span>EVOLUÇÃO REAL</span><span>{course.progress}%</span>
                        </div>
                        <div className={styles.progressTrack}>
                          <div className={styles.progressFill} style={{ width: `${course.progress}%` }}></div>
                        </div>
                        <button className={styles.btnMain}>CONTINUAR</button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <section className={styles.tableSection}>
                  <h2 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: '20px', marginLeft: '10px' }}>Cursos Ativos</h2>
                  <div className={styles.listContainer}>
                    <table className={styles.customTable}>
                      <thead>
                        <tr><th>Treinamento</th><th>Progresso</th><th style={{ textAlign: 'right' }}>Ação</th></tr>
                      </thead>
                      <tbody>
                        {tableCourses.map((course) => (
                          <tr key={course.id}>
                            <td style={{ fontWeight: 700 }}>{course.title}</td>
                            <td style={{ width: '40%' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div className={styles.progressTrack} style={{ height: '4px' }}>
                                  <div className={styles.progressFill} style={{ width: `${course.progress}%` }}></div>
                                </div>
                                <span style={{ color: '#8b5cf6', fontSize: '0.8rem', fontWeight: 800 }}>{course.progress}%</span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button onClick={() => navigate(`/curso/${course.slug}`)} className={styles.btnMain} style={{ marginTop: 0, padding: '10px 20px', width: 'auto' }}>ABRIR</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '100px 20px' }}>
                <h2 style={{ color: '#fff' }}>Tudo pronto por aqui! 🚀</h2>
                <p style={{ color: '#94a3b8', marginBottom: '30px' }}>Você concluiu todos os seus treinamentos pendentes.</p>
                <button onClick={() => navigate('/cursos')} className={styles.btnMain} style={{ width: '250px' }}>Explorar Trilhas</button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboard;