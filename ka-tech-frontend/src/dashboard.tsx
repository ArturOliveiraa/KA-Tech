import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import "./App.css";

// Interface baseada na sua tabela 'public.courses' do Supabase
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
  const navigate = useNavigate();

  useEffect(() => {
    // Opção 1: Definindo a função dentro do hook para evitar erros de dependência
    async function loadData() {
      try {
        setLoading(true);
        
        // Busca o usuário logado via Supabase Auth
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/");
          return;
        }

        // Define o nome vindo do metadata ou usa o prefixo do e-mail
        const name = user.user_metadata?.name || user.email?.split('@')[0] || "Aluno";
        setUserName(name);

        // Busca os cursos na tabela 'courses'
        const { data: coursesData, error } = await supabase
          .from("courses")
          .select("*");

        if (error) throw error;
        setCourses(coursesData || []);

      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [navigate]); // 'navigate' é a única dependência externa estável

  async function handleLogout() {
    await supabase.auth.signOut();
    localStorage.removeItem("ka-tech-token"); // Limpa o token local
    navigate("/");
  }

  return (
    <div className="dashboard-wrapper">
      {/* Sidebar - Mantendo o padrão visual da KA Tech */}
      <aside className="dashboard-sidebar">
        <div className="brand">
          <div className="logo-icon-small">KA</div>
          <span style={{ fontWeight: "bold", fontSize: "1.2rem", marginLeft: "8px" }}>Tech</span>
        </div>

        <nav className="dashboard-nav">
          <button className="nav-link active"><span>📚</span> Meus Cursos</button>
          <button className="nav-link"><span>🔍</span> Explorar</button>
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
          <div className="loading-box">Carregando seus cursos...</div>
        ) : (
          <div className="courses-grid">
            {courses.length > 0 ? (
              courses.map((course) => (
                <div key={course.id} className="course-card-v2">
                  <div className="card-thumb">
                    {course.thumbnailUrl ? (
                      <img src={course.thumbnailUrl} alt={course.title} />
                    ) : (
                      <div className="thumb-placeholder">KA</div>
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
              <div className="loading-box">Nenhum curso encontrado.</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;