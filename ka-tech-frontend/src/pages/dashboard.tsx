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

function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
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

        const { data: coursesData } = await supabase
          .from("courses")
          .select("*");

        setCourses(coursesData || []);
      } catch (err) {
        console.error("Erro ao carregar dashboard:", err); 
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [navigate]);

  return (
    <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#0b0e14' }}>
      
      {/* 1. Sidebar unificada: agora com foto e menu responsivo */}
      <Sidebar userRole={userRole} />

      {/* 2. Área Principal com recuo automático no PC */}
      <main className="dashboard-content">
        <header className="dashboard-header" style={{ marginBottom: '30px' }}>
          <div className="header-info">
            <h1 style={{ color: '#fff', fontSize: '2rem', marginBottom: '8px' }}>Área do Aluno</h1>
            <p style={{ color: '#94a3b8' }}>Bem-vindo de volta, <strong>{userName}</strong>!</p>
          </div>
          {/* Removido o círculo de perfil daqui, pois já está na Sidebar */}
        </header>

        {loading ? (
          <div className="loading-box" style={{ color: '#00e5ff' }}>Carregando conteúdos...</div>
        ) : (
          /* 3. Grid usando a mesma estrutura de largura total do Admin */
          <div className="admin-content-container">
            {courses.length > 0 ? (
              courses.map((course) => (
                <div key={course.id} className="course-card-v2" style={{ 
                  background: '#121418', 
                  borderRadius: '16px', 
                  border: '1px solid #2d323e',
                  overflow: 'hidden',
                  flex: '1 1 300px',
                  maxWidth: '400px',
                  transition: 'transform 0.2s'
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
                      Acessar Aula
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state" style={{ textAlign: 'center', width: '100%', padding: '40px', color: '#94a3b8' }}>
                <p>Você ainda não possui cursos vinculados.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;