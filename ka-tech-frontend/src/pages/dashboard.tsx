import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import { useUser } from "../components/UserContext"; 

interface Course {
  id: number;
  title: string;
  slug: string;
  description: string;
  thumbnailUrl: string | null;
}

function Dashboard() {
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { userName } = useUser(); 
  const navigate = useNavigate();

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/");
          return;
        }

        // Lógica: Busca apenas cursos onde o usuário está matriculado e não concluiu
        const [enrollmentsRes, progressRes] = await Promise.all([
          supabase
            .from("course_enrollments")
            .select(`
              courseId,
              courses (id, title, slug, description, thumbnailUrl)
            `)
            .eq("userId", user.id),
          supabase
            .from("user_progress")
            .select("course_id")
            .eq("user_id", user.id)
            .eq("is_completed", true)
        ]);

        const completedIds = progressRes.data?.map(p => p.course_id) || [];
        
        if (enrollmentsRes.data) {
          const activeCourses = enrollmentsRes.data
            .map((e: any) => e.courses)
            .filter((c: any) => c && !completedIds.includes(c.id));
          
          setEnrolledCourses(activeCourses);
        }

      } catch (err) {
        console.error("Erro ao carregar dashboard:", err); 
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [navigate]);

  return (
    <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#020617' }}>
      
      <Sidebar />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .course-card-premium {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          cursor: pointer;
          animation: fadeIn 0.5s ease forwards;
        }

        .course-card-premium:hover {
          transform: translateY(-10px) scale(1.02);
          border-color: #8b5cf6;
          box-shadow: 0 20px 40px rgba(139, 92, 246, 0.2);
          background: rgba(30, 27, 75, 0.4);
        }

        .card-thumb { height: 200px; overflow: hidden; position: relative; }
        .card-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s ease; }
        .course-card-premium:hover .card-thumb img { transform: scale(1.1); }

        .btn-access {
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          color: white; border: none; padding: 12px; border-radius: 12px;
          font-weight: 800; transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
          cursor: pointer;
        }

        .empty-dashboard {
          background: rgba(30, 27, 75, 0.1);
          border: 2px dashed rgba(139, 92, 246, 0.2);
          border-radius: 24px; padding: 60px; text-align: center; width: 100%;
        }
      `}</style>

      <main className="dashboard-content" style={{ flex: 1, padding: '60px 40px', marginLeft: '260px' }}>
        <header style={{ marginBottom: '50px' }}>
            <h1 style={{ color: '#fff', fontSize: '2.5rem', marginBottom: '12px', fontWeight: 900, letterSpacing: '-1px' }}>
              Minha <span style={{ color: '#8b5cf6' }}>Jornada</span>
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
              Bem-vindo de volta, <strong style={{ color: '#fff' }}>{userName}</strong>. Continue de onde parou.
            </p>
        </header>

        {loading ? (
          <div style={{ color: '#8b5cf6', fontWeight: 600, textAlign: 'center', marginTop: '100px' }}>
            Sincronizando treinamentos...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px' }}>
            {enrolledCourses.length > 0 ? (
              enrolledCourses.map((course) => (
                <div 
                  key={course.id} 
                  className="course-card-premium"
                  onClick={() => navigate(`/curso/${course.slug}`)}
                >
                  <div className="card-thumb">
                    {course.thumbnailUrl ? (
                      <img src={course.thumbnailUrl} alt={course.title} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#1e1b4b', color: '#8b5cf6', fontWeight: 900, fontSize: '2rem' }}>KA</div>
                    )}
                  </div>
                  
                  <div style={{ padding: '24px' }}>
                    <h3 style={{ color: '#fff', marginBottom: '12px', fontSize: '1.3rem', fontWeight: 700 }}>{course.title}</h3>
                    <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '25px', height: '45px', overflow: 'hidden', lineHeight: '1.5' }}>
                      {course.description}
                    </p>
                    <button className="btn-access" style={{ width: '100%' }}>CONTINUAR</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-dashboard">
                <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🚀</div>
                <h3 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '10px' }}>Seu Dashboard está vazio</h3>
                <p style={{ color: '#94a3b8', marginBottom: '30px' }}>Inscreva-se em novos cursos na aba Trilhas.</p>
                <button 
                  onClick={() => navigate('/cursos')}
                  style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: '1px solid #8b5cf6', padding: '12px 30px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Explorar Trilhas
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;