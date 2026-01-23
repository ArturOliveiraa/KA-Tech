import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar"; // Importando o componente unificado

interface Course {
  id: number;
  title: string;
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
    <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#0b0e14' }}>
      
      {/* 1. Sidebar unificada: resolve a consistência visual */}
      <Sidebar userRole={userRole} />

      {/* 2. Área Principal com recuo automático no PC */}
      <main className="dashboard-content">
        <header className="dashboard-header" style={{ marginBottom: '30px' }}>
          <div className="header-info">
            <h1 style={{ color: '#fff', fontSize: '2rem', marginBottom: '8px' }}>Explorar Catálogo!</h1>
            <p style={{ color: '#94a3b8' }}>Conheça todos os nossos cursos de tecnologia.</p>
          </div>
        </header>

        {loading ? (
          <div className="loading-box" style={{ color: '#00e5ff' }}>Carregando catálogo...</div>
        ) : (
          /* 3. Grid usando a estrutura de largura total */
          <div className="admin-content-container">
            {courses.length > 0 ? (
              courses.map((course) => (
                <div key={course.id} className="course-card-v2" style={{ 
                  background: '#121418', 
                  borderRadius: '16px', 
                  border: '1px solid #2d323e',
                  overflow: 'hidden',
                  flex: '1 1 300px',
                  maxWidth: '400px'
                }}>
                  <div className="card-thumb" style={{ height: '180px', background: '#1a1d23', overflow: 'hidden' }}>
                    {course.thumbnailUrl ? (
                      <img src={course.thumbnailUrl} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#2d323e', fontWeight: 'bold' }}>KA Tech</div>
                    )}
                  </div>
                  <div className="card-body" style={{ padding: '20px' }}>
                    <h3 style={{ color: '#fff', marginBottom: '10px', fontSize: '1.2rem' }}>{course.title}</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px', height: '40px', overflow: 'hidden' }}>
                      {course.description}
                    </p>
                    <button 
                      className="local-primary-button" 
                      onClick={() => navigate(`/course/${course.id}`)}
                      style={{
                        width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
                        background: 'linear-gradient(90deg, #00c9ff 0%, #92fe9d 100%)', color: '#000', fontWeight: 'bold', cursor: 'pointer'
                      }}
                    >
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state" style={{ width: '100%', textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
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