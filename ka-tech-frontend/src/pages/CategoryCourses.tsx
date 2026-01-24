import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";

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

  const [category, setCategory] = useState<Category | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategoryAndCourses() {
      try {
        setLoading(true);
        
        // 1. Buscar Perfil do Usuário para a Sidebar
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
          setUserRole(profile?.role || null);
        }

        // 2. Buscar dados da Categoria pelo Slug
        const { data: catData, error: catError } = await supabase
          .from("categories")
          .select("id, name, description")
          .eq("slug", slug)
          .single();

        if (catError || !catData) {
          console.error("Categoria não encontrada");
          return navigate("/cursos");
        }

        setCategory(catData);

        // 3. Buscar Cursos desta Categoria
        const { data: coursesData } = await supabase
          .from("courses")
          .select("*")
          .eq("category_id", catData.id)
          .order("createdAt", { ascending: false });

        setCourses(coursesData || []);
      } catch (err) {
        console.error("Erro geral:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCategoryAndCourses();
  }, [slug, navigate]);

  return (
    <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#020617', fontFamily: "'Sora', sans-serif" }}>
      <Sidebar userRole={userRole} />

      <main style={{ flex: 1, padding: '40px', marginLeft: '260px', boxSizing: 'border-box' }}>
        
        {/* Cabeçalho de Navegação */}
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
            marginBottom: '30px'
          }}
        >
          ← Voltar para Trilhas
        </button>

        {loading ? (
          <div style={{ color: '#8b5cf6', textAlign: 'center', padding: '100px', fontWeight: 700 }}>
            Carregando treinamentos...
          </div>
        ) : (
          <>
            <header style={{ marginBottom: '50px' }}>
              <h1 style={{ color: '#fff', fontSize: '2.8rem', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: '10px' }}>
                {category?.name}
              </h1>
              <p style={{ color: '#9ca3af', fontSize: '1.1rem', maxWidth: '700px' }}>
                {category?.description || "Aproveite os cursos disponíveis nesta trilha."}
              </p>
            </header>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
              gap: '25px' 
            }}>
              {courses.length > 0 ? (
                courses.map((course) => (
                  <div 
                    key={course.id}
                    onClick={() => navigate(`/curso/${course.slug}`)}
                    style={{ 
                      background: 'rgba(9, 9, 11, 0.6)', 
                      borderRadius: '24px', 
                      border: '1px solid rgba(139, 92, 246, 0.1)', 
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: '0.3s',
                      backdropFilter: 'blur(10px)'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-5px)')}
                    onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    {/* Thumbnail */}
                    <div style={{ width: '100%', height: '180px', background: '#1e293b', position: 'relative' }}>
                      <img 
                        src={course.thumbnailUrl || "https://via.placeholder.com/400x225"} 
                        alt={course.title} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>

                    {/* Informações */}
                    <div style={{ padding: '25px' }}>
                      <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 800, marginBottom: '10px' }}>
                        {course.title}
                      </h3>
                      <p style={{ 
                        color: '#94a3b8', 
                        fontSize: '0.85rem', 
                        lineHeight: '1.5',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {course.description}
                      </p>
                      
                      <div style={{ marginTop: '20px', color: '#8b5cf6', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        Começar curso <span>→</span>
                      </div>
                    </div>
                  </div>
                ))
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