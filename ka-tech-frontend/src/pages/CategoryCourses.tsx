import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import { useUser } from "../components/UserContext"; 

// Interfaces para tipagem
interface Course {
  id: number;
  title: string;
  description: string;
  thumbnailUrl: string; // Mantemos camelCase aqui para o React
  slug: string;
  lessons?: { duration: number }[]; 
}

interface Category {
  id: number;
  name: string;
  description: string;
}

export default function CategoryCourses() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { loading: userLoading } = useUser();

  const [category, setCategory] = useState<Category | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<number[]>([]);
  const [completedCourseIds, setCompletedCourseIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

  // Controle de responsividade
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Busca de dados corrigida para snake_case
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate("/");

      const { data: catData, error: catError } = await supabase
        .from("categories")
        .select("id, name, description")
        .eq("slug", slug)
        .single();

      if (catError || !catData) return navigate("/cursos");
      setCategory(catData);

      // BUSCA CORRIGIDA: camelCase alterado para snake_case nos filtros e ordens
      const [coursesRes, enrollmentsRes, progressRes] = await Promise.all([
        supabase
          .from("courses")
          .select("*, lessons(duration)") 
          .eq("category_id", catData.id)
          .order("created_at", { ascending: false }), // CORRIGIDO: created_at
        
        supabase
          .from("course_enrollments")
          .select("course_id") // CORRIGIDO: course_id
          .eq("user_id", user.id), // CORRIGIDO: user_id
        
        supabase
          .from("user_progress")
          .select("course_id")
          .eq("user_id", user.id)
          .eq("is_completed", true)
      ]);

      // MAPEAMENTO: Traduzimos o snake_case do banco para o camelCase do seu front
      const formattedCourses = (coursesRes.data || []).map((c: any) => ({
        ...c,
        thumbnailUrl: c.thumbnail_url // Tradução aqui para o <img> funcionar
      }));

      setCourses(formattedCourses);
      setEnrolledCourseIds(enrollmentsRes.data?.map(e => e.course_id) || []); // CORRIGIDO: course_id
      setCompletedCourseIds(progressRes.data?.map(p => p.course_id) || []);

    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  }, [slug, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCourseAction = async (course: Course) => {
    const isEnrolled = enrolledCourseIds.includes(course.id);

    if (!isEnrolled) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // CORRIGIDO: Nomes das colunas para o INSERT
        const { error } = await supabase
          .from("course_enrollments")
          .insert([{ 
            user_id: user.id, 
            course_id: course.id 
          }]);

        if (error) {
          console.error("Erro técnico na inscrição:", error.message);
          alert("Não foi possível confirmar sua inscrição.");
          return;
        }
        
        setEnrolledCourseIds(prev => [...prev, course.id]);
      }
    }
    navigate(`/curso/${course.slug}`);
  };

  // O restante do seu retorno JSX permanece idêntico
  return (
    <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#020617', fontFamily: "'Sora', sans-serif" }}>
      <Sidebar />

      <main style={{ 
        flex: 1, 
        padding: isMobile ? '20px' : '40px', 
        marginLeft: isMobile ? '0' : '260px', 
        boxSizing: 'border-box',
        width: '100%',
        paddingBottom: isMobile ? '100px' : '40px' 
      }}>
        
        <button 
          onClick={() => navigate("/cursos")}
          style={{ 
            background: 'transparent', color: '#8b5cf6', border: 'none', cursor: 'pointer', 
            fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '30px'
          }}
        >
          ← Voltar para Trilhas
        </button>

        {(loading || userLoading) ? (
          <div style={{ color: '#8b5cf6', textAlign: 'center', padding: '100px', fontWeight: 700 }}>
            Sincronizando trilha...
          </div>
        ) : (
          <>
            <header style={{ marginBottom: isMobile ? '30px' : '50px', textAlign: isMobile ? 'center' : 'left' }}>
              <h1 style={{ color: '#fff', fontSize: isMobile ? '2rem' : '2.8rem', fontWeight: 900, letterSpacing: '-1px', marginBottom: '10px' }}>
                {category?.name}
              </h1>
              <p style={{ color: '#9ca3af', fontSize: '1.1rem', maxWidth: '700px' }}>
                {category?.description}
              </p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {courses.map((course) => {
                const isEnrolled = enrolledCourseIds.includes(course.id);
                const isCompleted = completedCourseIds.includes(course.id);

                const totalLessons = course.lessons?.length || 0;
                const totalMinutes = course.lessons?.reduce((acc, lesson) => acc + (lesson.duration || 0), 0) || 0;

                return (
                  <div key={course.id} style={{ background: 'rgba(9, 9, 11, 0.6)', borderRadius: '24px', border: isCompleted ? '1px solid #22c55e' : isEnrolled ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)', overflow: 'hidden', transition: '0.3s', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ width: '100%', height: '180px', background: '#1e293b', position: 'relative' }}>
                      
                      {isCompleted && (
                        <div style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: '#22c55e', color: '#fff', padding: '6px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, zIndex: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          CONCLUÍDO
                        </div>
                      )}

                      <img src={course.thumbnailUrl || "https://via.placeholder.com/400x225"} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ padding: '25px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 800, marginBottom: '5px' }}>{course.title}</h3>
                      
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '15px' }}>
                        <span style={{ color: '#8b5cf6', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          📚 {totalLessons} {totalLessons === 1 ? 'aula' : 'aulas'}
                        </span>
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          ⏱️ {Math.round(totalMinutes)} min
                        </span>
                      </div>

                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '20px', flex: 1 }}>{course.description}</p>
                      
                      <button 
                        onClick={() => handleCourseAction(course)}
                        style={{ width: '100%', padding: '14px', borderRadius: '14px', cursor: 'pointer', fontWeight: 800, border: 'none', background: isCompleted ? 'rgba(34, 197, 94, 0.1)' : isEnrolled ? 'rgba(139, 92, 246, 0.1)' : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', color: isCompleted ? '#22c55e' : (isEnrolled ? '#a78bfa' : '#fff') }}
                      >
                        {isCompleted ? "REVISAR CONTEÚDO" : (isEnrolled ? "ACESSAR TREINAMENTO" : "CONFIRMAR INSCRIÇÃO")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}