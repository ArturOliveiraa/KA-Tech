import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "../App.css";

// Interfaces baseadas no seu esquema de banco de dados
interface Course {
  id: number;
  title: string;
  description: string;
  thumbnailUrl: string | null;
}

interface Profile {
  full_name: string | null;
  role: string;
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
        
        // 1. Verificar autenticação
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/");
          return;
        }

        // 2. Buscar Perfil (Nome e Role) na tabela 'profiles'
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;

        const profile = profileData as Profile;
        setUserName(profile?.full_name || user.email?.split('@')[0] || "Aluno");
        setUserRole(profile?.role || "aluno");

        // 3. Buscar Cursos na tabela 'courses'
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select("*");

        if (coursesError) throw coursesError;
        setCourses(coursesData || []);

      } catch (err) {
        console.error("ERRO DETALHADO:", err); 
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [navigate]);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <div className="dashboard-wrapper">
      {/* Sidebar - Padrão Visual KA Tech */}
      <aside className="dashboard-sidebar">
        <div className="brand">
          <div className="logo-icon-small">KA</div>
          <span style={{ fontWeight: "bold", fontSize: "1.2rem", marginLeft: "8px" }}>Tech</span>
        </div>

        <nav className="dashboard-nav">
          <button className="nav-link active" onClick={() => navigate("/dashboard")}>
          <span>📚</span> Meus Cursos
          </button>
          
          <button className="nav-link" onClick={() => navigate("/cursos")}>
          <span>🔍</span> Explorar
          </button>
          
          {/* Botão de Gestão: Apenas visível para Admin e Professor */}
          {(userRole === 'admin' || userRole === 'professor') && (
            <button 
              className="nav-link admin-access" 
              onClick={() => navigate("/admin")}
              style={{ color: '#00e5ff', fontWeight: 'bold' }}
            >
              <span>🛠️</span> Painel de Gestão
            </button>
          )}

          <button className="nav-link"><span>⚙️</span> Configurações</button>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          Sair da conta
        </button>
      </aside>

      {/* Área Principal */}
      <main className="dashboard-content">
        <header className="dashboard-header">
          <div className="header-info">
            <h1>Área do Aluno</h1>
            <p>Bem-vindo de volta, <strong>{userName}</strong>!</p>
          </div>
          <div className="user-profile-circle">
            {userName.charAt(0).toUpperCase()}
          </div>
        </header>

        {loading ? (
          <div className="loading-box">Carregando conteúdos...</div>
        ) : (
          <div className="courses-grid">
            {courses.length > 0 ? (
              courses.map((course) => (
                <div key={course.id} className="course-card-v2">
                  <div className="card-thumb">
                    {course.thumbnailUrl ? (
                      <img src={course.thumbnailUrl} alt={course.title} />
                    ) : (
                      <div className="thumb-placeholder">KA Tech</div>
                    )}
                  </div>
                  <div className="card-body">
                    <h3>{course.title}</h3>
                    <p>{course.description}</p>
                    <button 
                      className="primary-button card-button"
                      onClick={() => navigate(`/course/${course.id}`)}
                    >
                      Acessar Aula
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>Você ainda não possui cursos vinculados.</p>
                <button className="secondary-button" onClick={() => navigate("/cursos")}>
                  <span>🔍</span> Explorar
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