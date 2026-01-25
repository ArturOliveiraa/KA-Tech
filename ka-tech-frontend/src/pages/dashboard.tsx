import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import { useUser } from "../components/UserContext"; 
import logo from "../assets/ka-tech-logo.png"; 

interface Course {
  id: number;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  progress: number;
  total_duration: number; 
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

        const [enrollmentsRes, lessonsRes, progressRes] = await Promise.all([
          supabase.from("course_enrollments").select(`createdAt, courses (*)`).eq("userId", user.id),
          supabase.from("lessons").select("id, course_id, duration"),
          supabase.from("user_progress").select("course_id, lesson_id, is_completed, last_time").eq("user_id", user.id)
        ]);

        if (enrollmentsRes.data) {
          const processed = enrollmentsRes.data.map((en: any) => {
            const course = en.courses;
            if (!course) return null;

            const currentCourseId = Number(course.id);
            const courseLessons = (lessonsRes.data || []).filter(l => Number(l.course_id) === currentCourseId);
            const totalCourseMinutes = Number(course.total_duration) || 0;
            
            const watchedMinutes = courseLessons.reduce((acc, lesson) => {
              const lessonProg = (progressRes.data || []).find(p => Number(p.lesson_id) === Number(lesson.id));
              if (!lessonProg) return acc;

              const timeFromThisLesson = lessonProg.is_completed 
                ? (Number(lesson.duration) || 0) 
                : (Number(lessonProg.last_time) / 60 || 0);

              return acc + timeFromThisLesson;
            }, 0);
            
            const percent = totalCourseMinutes > 0 ? Math.round((watchedMinutes / totalCourseMinutes) * 100) : 0;

            return { 
              ...course, 
              enrolledAt: en.createdAt,
              progress: Math.min(percent, 100)
            };
          }).filter((c): c is Course => c !== null && c.progress < 100);

          setEnrolledCourses(processed);
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
    <div className="dashboard-wrapper">
      <Sidebar />

      <style>{`
        :root { --primary: #8b5cf6; --bg-dark: #020617; --card-glass: rgba(15, 23, 42, 0.7); }
        
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .dashboard-wrapper { display: flex; width: 100%; min-height: 100vh; background: var(--bg-dark); }

        .dashboard-content { 
          flex: 1; margin-left: 260px; padding: 40px 60px; transition: 0.3s; 
          animation: slideUp 0.6s ease-out;
        }

        /* MOBILE HEADER LOGO - ATUALIZADO */
        .mobile-nav-top {
          display: none; 
          width: 100%; 
          padding: 40px 20px 20px 20px; 
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(to bottom, rgba(139, 92, 246, 0.15), transparent);
        }
        /* Ajuste de 200px solicitado */
        .mobile-nav-top img { 
          height: 200px; 
          width: auto; 
          filter: drop-shadow(0 0 25px rgba(139, 92, 246, 0.5)); 
          object-fit: contain;
        }

        .header-container { margin-bottom: 40px; }
        .header-container h1 { font-size: 2.5rem; font-weight: 900; color: #fff; margin: 0; }
        .header-container p { color: #94a3b8; margin-top: 5px; font-size: 1.1rem; }

        /* CARDS */
        .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 25px; }
        .premium-card {
          background: var(--card-glass); backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 24px;
          overflow: hidden; transition: 0.4s; cursor: pointer;
        }
        .premium-card:hover { transform: translateY(-8px); border-color: var(--primary); }

        .thumb-box { height: 180px; background: #000; position: relative; }
        .thumb-box img { width: 100%; height: 100%; object-fit: cover; opacity: 0.8; }

        .card-body { padding: 24px; }
        .card-body h3 { font-size: 1.2rem; color: #fff; margin-bottom: 15px; font-weight: 800; }

        .progress-label { display: flex; justify-content: space-between; font-size: 0.7rem; font-weight: 900; color: var(--primary); margin-bottom: 8px; }
        .progress-track { width: 100%; height: 6px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #7c3aed, #d946ef); transition: width 1s ease; }

        .btn-main {
          width: 100%; margin-top: 20px; padding: 14px; border-radius: 14px; border: none;
          background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff;
          font-weight: 800; cursor: pointer; transition: 0.3s;
        }

        .table-section { margin-top: 60px; padding-bottom: 50px; }
        .list-container { background: rgba(15, 23, 42, 0.3); border-radius: 30px; border: 1px solid rgba(255,255,255,0.03); padding: 10px; }
        .custom-table { width: 100%; border-collapse: collapse; }
        .custom-table th { padding: 20px; text-align: left; color: var(--primary); font-size: 0.7rem; text-transform: uppercase; }
        .custom-table td { padding: 20px; color: #e5e7eb; border-top: 1px solid rgba(255,255,255,0.02); }

        /* RESPONSIVIDADE */
        @media (max-width: 1024px) {
          .dashboard-content { margin-left: 0; padding: 0 20px 100px 20px; }
          .mobile-nav-top { display: flex; }
          .header-container { text-align: center; margin-top: 20px; }
        }

        @media (max-width: 768px) {
          .dashboard-grid { grid-template-columns: 1fr; }
          .custom-table thead { display: none; }
          .custom-table tr { display: flex; flex-direction: column; background: rgba(255,255,255,0.02); margin-bottom: 15px; border-radius: 20px; padding: 15px; }
          .custom-table td { border: none; padding: 8px; width: 100% !important; text-align: center !important; }
        }
      `}</style>

      <main className="dashboard-content">
        <div className="mobile-nav-top">
          <img src={logo} alt="KA Tech Logo" />
        </div>

        <header className="header-container">
            <h1>Minha <span style={{ color: '#8b5cf6' }}>Jornada</span></h1>
            <p>Olá, <strong style={{ color: '#fff' }}>{userName}</strong>. Continue de onde parou!</p>
        </header>

        {(loading || contextLoading) ? (
          <div style={{ padding: '100px', textAlign: 'center', color: '#8b5cf6', fontWeight: 800 }}>Calculando sua evolução...</div>
        ) : (
          <>
            {enrolledCourses.length > 0 ? (
              <>
                <div className="dashboard-grid">
                  {topThreeRecent.map((course) => (
                    <div key={course.id} className="premium-card" onClick={() => navigate(`/curso/${course.slug}`)}>
                      <div className="thumb-box">
                        <img src={course.thumbnailUrl || ""} alt={course.title} />
                      </div>
                      <div className="card-body">
                        <h3>{course.title}</h3>
                        <div className="progress-label">
                          <span>EVOLUÇÃO REAL</span><span>{course.progress}%</span>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${course.progress}%` }}></div>
                        </div>
                        <button className="btn-main">CONTINUAR</button>
                      </div>
                    </div>
                  ))}
                </div>

                <section className="table-section">
                  <h2 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: '20px', marginLeft: '10px' }}>Cursos Ativos</h2>
                  <div className="list-container">
                    <table className="custom-table">
                      <thead>
                        <tr><th>Treinamento</th><th>Progresso</th><th style={{ textAlign: 'right' }}>Ação</th></tr>
                      </thead>
                      <tbody>
                        {tableCourses.map((course) => (
                          <tr key={course.id}>
                            <td style={{ fontWeight: 700 }}>{course.title}</td>
                            <td style={{ width: '40%' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div className="progress-track" style={{ height: '4px' }}>
                                  <div className="progress-fill" style={{ width: `${course.progress}%` }}></div>
                                </div>
                                <span style={{ color: '#8b5cf6', fontSize: '0.8rem', fontWeight: 800 }}>{course.progress}%</span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button onClick={() => navigate(`/curso/${course.slug}`)} className="btn-main" style={{ marginTop: 0, padding: '10px 20px', width: 'auto' }}>ABRIR</button>
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
                <button onClick={() => navigate('/cursos')} className="btn-main" style={{ width: '250px' }}>Explorar Trilhas</button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboard;