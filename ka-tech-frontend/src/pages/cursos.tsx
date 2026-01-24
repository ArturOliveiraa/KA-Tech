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

function Cursos() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [completedCourseIds, setCompletedCourseIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadCatalogData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const [profileRes, coursesRes, progressRes] = await Promise.all([
            supabase.from("profiles").select("role").eq("id", user.id).single(),
            supabase.from("courses").select("*").order('title', { ascending: true }),
            supabase.from("user_progress")
              .select("course_id")
              .eq("user_id", user.id)
              .eq("is_completed", true)
          ]);

          if (profileRes.data) setUserRole(profileRes.data.role);
          if (coursesRes.data) setCourses(coursesRes.data);
          if (progressRes.data) {
            setCompletedCourseIds(progressRes.data.map(p => p.course_id));
          }
        } else {
          const { data } = await supabase.from("courses").select("*").order('title', { ascending: true });
          setCourses(data || []);
        }
      } catch (err) {
        console.error("Erro ao carregar catálogo:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCatalogData();
  }, []);

  // SEPARAÇÃO DOS CURSOS
  const availableCourses = courses.filter(c => !completedCourseIds.includes(c.id));
  const finishedCourses = courses.filter(c => completedCourseIds.includes(c.id));

  // Função auxiliar para renderizar o Card (evita repetição de código)
  const renderCourseCard = (course: Course, isCompleted: boolean) => (
    <div key={course.id} className="course-card-v2" style={{ 
      background: '#09090b', 
      borderRadius: '16px', 
      border: isCompleted ? '1px solid #22c55e' : '1px solid rgba(139, 92, 246, 0.1)', 
      overflow: 'hidden',
      flex: '1 1 300px',
      maxWidth: '400px',
      transition: 'all 0.3s ease',
      boxShadow: isCompleted ? '0 0 20px rgba(34, 197, 94, 0.05)' : '0 10px 30px rgba(0, 0, 0, 0.5)',
      opacity: isCompleted ? 0.85 : 1
    }}>
      <div className="card-thumb" style={{ height: '180px', background: '#111116', overflow: 'hidden', position: 'relative' }}>
        {course.thumbnailUrl ? (
          <img src={course.thumbnailUrl} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#1f2937', fontWeight: 800, fontSize: '1.5rem' }}>KA Tech</div>
        )}
        {isCompleted && (
          <div style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: '#22c55e', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800 }}>
            CONCLUÍDO
          </div>
        )}
      </div>
      <div className="card-body" style={{ padding: '20px' }}>
        <h3 style={{ color: '#fff', marginBottom: '10px', fontSize: '1.2rem', fontWeight: 600 }}>{course.title}</h3>
        <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '20px', height: '40px', overflow: 'hidden', lineHeight: '1.5' }}>
          {course.description}
        </p>
        <button 
          className="local-primary-button" 
          onClick={() => navigate(`/course/${course.slug || course.id}`)}
          style={{
            width: '100%', padding: '12px', borderRadius: '999px', border: 'none',
            background: isCompleted ? '#22c55e' : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', 
            color: '#fff', fontWeight: 600, cursor: 'pointer', fontFamily: "'Sora', sans-serif"
          }}
        >
          {isCompleted ? "Revisar Conteúdo" : "Ver Detalhes"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#020617', fontFamily: "'Sora', sans-serif" }}>
      <Sidebar userRole={userRole} />

      <main className="dashboard-content" style={{ flex: 1, padding: '2rem' }}>
        <header className="dashboard-header" style={{ marginBottom: '40px' }}>
          <h1 style={{ color: '#fff', fontSize: '2.2rem', marginBottom: '8px', fontWeight: 800 }}>Explorar Catálogo</h1>
          <p style={{ color: '#9ca3af' }}>Encontre seu próximo desafio tecnológico.</p>
        </header>

        {loading ? (
          <div style={{ color: '#8b5cf6', fontWeight: 600 }}>Sincronizando biblioteca...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '50px' }}>
            
            {/* SEÇÃO 1: CURSOS NOVOS */}
            <section>
              <h2 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '4px', height: '24px', backgroundColor: '#8b5cf6', borderRadius: '4px' }}></span>
                Novas Jornadas
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                {availableCourses.length > 0 ? (
                  availableCourses.map(c => renderCourseCard(c, false))
                ) : (
                  <p style={{ color: '#4b5563', fontStyle: 'italic' }}>Você já iniciou todos os nossos cursos disponíveis!</p>
                )}
              </div>
            </section>

            {/* SEÇÃO 2: CURSOS CONCLUÍDOS */}
            {finishedCourses.length > 0 && (
              <section style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '40px' }}>
                <h2 style={{ color: '#22c55e', fontSize: '1.4rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '4px', height: '24px', backgroundColor: '#22c55e', borderRadius: '4px' }}></span>
                  Missões Cumpridas
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                  {finishedCourses.map(c => renderCourseCard(c, true))}
                </div>
              </section>
            )}

          </div>
        )}
      </main>
    </div>
  );
}

export default Cursos;