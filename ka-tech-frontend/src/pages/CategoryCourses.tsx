import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import { useUser } from "../components/UserContext"; 

interface Course {
  id: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  slug: string;
}

interface Category {
  id: number;
  name: string;
  description: string;
}

export default function CategoryDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { loading: userLoading } = useUser();

  const [category, setCategory] = useState<Category | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<number[]>([]);
  const [completedCourseIds, setCompletedCourseIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado para detectar mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

      const [coursesRes, enrollmentsRes, progressRes] = await Promise.all([
        supabase.from("courses").select("*").eq("category_id", catData.id).order("createdAt", { ascending: false }),
        supabase.from("course_enrollments").select("courseId").eq("userId", user.id),
        supabase.from("user_progress").select("course_id").eq("user_id", user.id).eq("is_completed", true)
      ]);

      setCourses(coursesRes.data || []);
      setEnrolledCourseIds(enrollmentsRes.data?.map(e => e.courseId) || []);
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
        const { error } = await supabase
          .from("course_enrollments")
          .insert([{ userId: user.id, courseId: course.id, role: 'STUDENT' }]);

        if (error) {
          console.error("Erro ao se inscrever:", error.message);
          return;
        }
        setEnrolledCourseIds(prev => [...prev, course.id]);
      }
    }
    navigate(`/curso/${course.slug}`);
  };

  return (
    <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#020617', fontFamily: "'Sora', sans-serif" }}>
      <Sidebar />

      <main style={{ 
        flex: 1, 
        padding: isMobile ? '20px' : '40px', 
        marginLeft: isMobile ? '0' : '260px', 
        boxSizing: 'border-box',
        width: '100%',
        paddingBottom: isMobile ? '100px' : '40px' // Espaço para não cobrir o conteúdo com menu mobile
      }}>
        
        <button 
          onClick={() => navigate("/cursos")}
          style={{ 
            background: 'transparent', 
            color: '#8b5cf6', 
            border: 'none', 
            cursor: 'pointer', 
            fontWeight: 700, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            marginBottom: '30px',
            fontSize: isMobile ? '0.9rem' : '1rem'
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
              <h1 style={{ 
                color: '#fff', 
                fontSize: isMobile ? '2rem' : '2.8rem', 
                fontWeight: 900, 
                letterSpacing: '-1px', 
                marginBottom: '10px' 
              }}>
                {category?.name}
              </h1>
              <p style={{ 
                color: '#9ca3af', 
                fontSize: isMobile ? '0.95rem' : '1.1rem', 
                maxWidth: '700px',
                margin: isMobile ? '0 auto' : '0'
              }}>
                {category?.description}
              </p>
            </header>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', 
              gap: '20px' 
            }}>
              {courses.length > 0 ? (
                courses.map((course) => {
                  const isEnrolled = enrolledCourseIds.includes(course.id);
                  const isCompleted = completedCourseIds.includes(course.id);

                  return (
                    <div 
                      key={course.id}
                      style={{ 
                        background: 'rgba(9, 9, 11, 0.6)', 
                        borderRadius: '24px', 
                        border: isCompleted 
                          ? '1px solid #22c55e' 
                          : isEnrolled ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)', 
                        overflow: 'hidden',
                        transition: '0.3s',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <div style={{ width: '100%', height: isMobile ? '160px' : '180px', background: '#1e293b', position: 'relative' }}>
                        <img 
                          src={course.thumbnailUrl || "https://via.placeholder.com/400x225"} 
                          alt={course.title} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isCompleted ? 0.6 : 1 }}
                        />
                        {(isEnrolled || isCompleted) && (
                          <div style={{ 
                            position: 'absolute', top: '15px', right: '15px', 
                            background: isCompleted ? '#22c55e' : '#8b5cf6', 
                            color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 800 
                          }}>
                            {isCompleted ? "CONCLUÍDO ✅" : "INSCRITO"}
                          </div>
                        )}
                      </div>

                      <div style={{ padding: isMobile ? '20px' : '25px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ color: '#fff', fontSize: isMobile ? '1.15rem' : '1.25rem', fontWeight: 800, marginBottom: '10px' }}>
                          {course.title}
                        </h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '20px', flex: 1 }}>
                          {course.description}
                        </p>
                        
                        <button 
                          onClick={() => handleCourseAction(course)}
                          style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '14px',
                            cursor: 'pointer',
                            fontWeight: 800,
                            fontFamily: 'Sora',
                            transition: '0.3s',
                            border: 'none',
                            background: isCompleted
                              ? 'rgba(34, 197, 94, 0.1)' 
                              : isEnrolled 
                                ? 'rgba(139, 92, 246, 0.1)' 
                                : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                            color: isCompleted ? '#22c55e' : (isEnrolled ? '#a78bfa' : '#fff'),
                            boxShadow: (isEnrolled || isCompleted) ? 'none' : '0 10px 20px rgba(124, 58, 237, 0.2)',
                            borderStyle: 'solid',
                            borderWidth: (isEnrolled || isCompleted) ? '1px' : '0',
                            borderColor: isCompleted ? '#22c55e' : (isEnrolled ? '#8b5cf6' : 'transparent'),
                            fontSize: '0.85rem'
                          }}
                        >
                          {isCompleted ? "REVISAR CONTEÚDO" : (isEnrolled ? "ACESSAR TREINAMENTO" : "CONFIRMAR INSCRIÇÃO")}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
                   Nenhum curso disponível para esta categoria no momento.
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}