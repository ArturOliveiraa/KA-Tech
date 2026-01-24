import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar"; // Importando o componente unificado

interface Course {
  id: number;
  title: string;
  slug: string;
  description: string;
  thumbnailUrl: string | null;
}

function Cursos() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null); // Estado para a Sidebar
  const navigate = useNavigate();

  useEffect(() => {
    async function loadCatalogData() {
      try {
        setLoading(true);

        // 1. Busca o role do usuário para a Sidebar
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
          if (profile) setUserRole(profile.role);
        }

        // 2. Busca todos os cursos para o catálogo
        const { data, error } = await supabase
          .from("courses")
          .select("*")
          .order('title', { ascending: true });

        if (error) throw error;
        setCourses(data || []);

      } catch (err) {
        console.error("Erro ao carregar catálogo:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCatalogData();
  }, []);

  return (
    <div className="dashboard-wrapper" style={{ 
      display: 'flex', 
      width: '100%', 
      minHeight: '100vh', 
      backgroundColor: '#020617', // Paleta KA Tech
      fontFamily: "'Sora', sans-serif" 
    }}>
      
      {/* 1. Sidebar unificada: resolve a consistência visual */}
      <Sidebar userRole={userRole} />

      {/* 2. Área Principal com recuo automático no PC */}
      <main className="dashboard-content" style={{ flex: 1, padding: '2rem' }}>
        <header className="dashboard-header" style={{ marginBottom: '30px' }}>
          <div className="header-info">
            <h1 style={{ color: '#fff', fontSize: '2rem', marginBottom: '8px', fontWeight: 800 }}>Explorar Catálogo!</h1>
            <p style={{ color: '#9ca3af' }}>Conheça todos os nossos cursos de tecnologia.</p>
          </div>
        </header>

        {loading ? (
          <div className="loading-box" style={{ color: '#8b5cf6', fontWeight: 600 }}>Carregando catálogo...</div>
        ) : (
          /* 3. Grid usando a estrutura de largura total */
          <div className="admin-content-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
            {courses.length > 0 ? (
              courses.map((course) => (
                <div key={course.id} className="course-card-v2" style={{ 
                  background: '#09090b', // Preto Profundo
                  borderRadius: '16px', 
                  border: '1px solid rgba(139, 92, 246, 0.1)', // Borda sutil roxa
                  overflow: 'hidden',
                  flex: '1 1 300px',
                  maxWidth: '400px',
                  transition: 'all 0.3s ease',
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
                      onClick={() => navigate(`/course/${course.slug || course.id}`)}
                      style={{
                        width: '100%', 
                        padding: '12px', 
                        borderRadius: '999px', // Estilo pílula
                        border: 'none',
                        background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', // Degradê Neon
                        color: '#fff', 
                        fontWeight: 600, 
                        cursor: 'pointer',
                        fontFamily: "'Sora', sans-serif",
                        boxShadow: '0 4px 15px rgba(124, 58, 237, 0.3)',
                        transition: 'transform 0.2s ease'
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
                      onMouseOut={(e) => (e.currentTarget.style.filter = 'brightness(1.0)')}
                    >
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state" style={{ width: '100%', textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                <p>Ainda não há cursos cadastrados no catálogo global.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default Cursos;