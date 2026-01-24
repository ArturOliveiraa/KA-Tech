import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";

interface Course {
  id: number;
  title: string;
  slug: string;
  description: string;
  thumbnailUrl: string | null;
}

function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<number[]>([]); 
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
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

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single();

        if (profile) {
          setUserName(profile.full_name || "Aluno");
          setUserRole(profile.role);
        }

        // Busca cursos e matrículas simultaneamente
        const [coursesRes, enrollmentsRes] = await Promise.all([
          supabase.from("courses").select("*"),
          supabase.from("course_enrollments").select("courseId").eq("userId", user.id)
        ]);

        setCourses(coursesRes.data || []);
        
        if (enrollmentsRes.data) {
          setEnrolledCourseIds(enrollmentsRes.data.map(e => e.courseId));
        }

      } catch (err) {
        console.error("Erro ao carregar dashboard:", err); 
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [navigate]);

  // Lógica para Inscrição ou Acesso
  const handleCourseAction = async (course: Course) => {
    const isEnrolled = enrolledCourseIds.includes(course.id);

    if (!isEnrolled) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Insere a matrícula oficial na tabela course_enrollments
        const { error } = await supabase
          .from("course_enrollments")
          .insert([
            { 
              userId: user.id, 
              courseId: course.id, 
              role: 'STUDENT' 
            }
          ]);

        if (error) {
          console.error("Erro na inscrição:", error.message);
          return;
        }

        setEnrolledCourseIds([...enrolledCourseIds, course.id]);
      }
    }

    navigate(`/course/${course.slug || course.id}`);
  };

  return (
    <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#020617', fontFamily: "'Sora', sans-serif" }}>
      
      <Sidebar userRole={userRole} />

      <main className="dashboard-content" style={{ flex: 1, padding: '2rem' }}>
        <header className="dashboard-header" style={{ marginBottom: '30px' }}>
          <div className="header-info">
            <h1 style={{ color: '#fff', fontSize: '2rem', marginBottom: '8px', fontWeight: 800 }}>Área do Aluno</h1>
            <p style={{ color: '#9ca3af' }}>Bem-vindo de volta, <strong style={{ color: '#8b5cf6' }}>{userName}</strong>!</p>
          </div>
        </header>

        {loading ? (
          <div className="loading-box" style={{ color: '#8b5cf6', fontWeight: 600 }}>Sincronizando seus cursos...</div>
        ) : (
          <div className="admin-content-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
            {courses.length > 0 ? (
              courses.map((course) => {
                const isEnrolled = enrolledCourseIds.includes(course.id);

                return (
                  <div key={course.id} className="course-card-v2" style={{ 
                    background: '#09090b', 
                    borderRadius: '16px', 
                    border: isEnrolled ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)', 
                    overflow: 'hidden',
                    flex: '1 1 300px',
                    maxWidth: '400px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
                  }}>
                    <div className="card-thumb" style={{ height: '180px', background: '#111116', overflow: 'hidden' }}>
                      {course.thumbnailUrl ? (
                        <img src={course.thumbnailUrl} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#1f2937', fontWeight: 800, fontSize: '1.5rem' }}>KA Tech</div>
                      )}
                    </div>
                    
                    <div className="card-body" style={{ padding: '20px' }}>
                      <h3 style={{ color: '#fff', marginBottom: '10px', fontSize: '1.2rem', fontWeight: 600 }}>{course.title}</h3>
                      <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '20px', height: '40px', overflow: 'hidden', lineHeight: '1.5' }}>
                        {course.description}
                      </p>
                      
                      <button 
                        className="local-primary-button"
                        onClick={() => handleCourseAction(course)}
                        style={{
                          width: '100%', 
                          padding: '12px', 
                          borderRadius: '12px', 
                          // CORREÇÃO: Removida a duplicata do border
                          background: isEnrolled 
                            ? 'rgba(139, 92, 246, 0.1)' 
                            : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', 
                          color: isEnrolled ? '#8b5cf6' : '#fff', 
                          border: isEnrolled ? '1px solid #8b5cf6' : 'none',
                          fontWeight: 700, 
                          cursor: 'pointer',
                          fontFamily: "'Sora', sans-serif",
                          boxShadow: isEnrolled ? 'none' : '0 4px 15px rgba(124, 58, 237, 0.3)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {isEnrolled ? "Ver Progresso" : "Confirmar Inscrição"}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state" style={{ textAlign: 'center', width: '100%', padding: '40px', color: '#9ca3af' }}>
                <p>Nenhum curso disponível no momento.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;