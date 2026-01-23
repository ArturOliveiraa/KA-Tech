import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "../App.css";

interface Course {
  id: number;
  title: string;
  description: string;
  thumbnail_url: string | null;
}

function Cursos() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchAllCourses() {
      try {
        setLoading(true);
        
        // Busca todos os cursos sem filtros, para exibir o catálogo completo
        const { data, error } = await supabase
          .from("courses")
          .select("*")
          .order('title', { ascending: true }); // Organiza por ordem alfabética

        if (error) throw error;
        setCourses(data || []);

      } catch (err) {
        console.error("Erro ao carregar catálogo:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAllCourses();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <div className="dashboard-wrapper">
      {/* Sidebar - Mantendo a consistência visual */}
      <aside className="dashboard-sidebar">
        <div className="brand">
          <div className="logo-icon-small">KA</div>
          <span style={{ fontWeight: "bold", fontSize: "1.2rem", marginLeft: "8px" }}>Tech</span>
        </div>

        <nav className="dashboard-nav">
          <button className="nav-link" onClick={() => navigate("/dashboard")}>
            <span>📚</span> Meus Cursos
          </button>
          <button className="nav-link active" onClick={() => navigate("/cursos")}>
            <span>🔍</span> Explorar
          </button>
          <button className="nav-link"><span>⚙️</span> Configurações</button>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          Sair da conta
        </button>
      </aside>

      {/* Conteúdo Principal do Catálogo */}
      <main className="dashboard-content">
        <header className="dashboard-header">
          <div className="header-info">
            <h1>Explorar Catálogo!</h1>
            <p>Conheça todos os nossos cursos de tecnologia.</p>
          </div>
        </header>

        {loading ? (
          <div className="loading-box">Carregando catálogo...</div>
        ) : (
          <div className="courses-grid">
            {courses.length > 0 ? (
              courses.map((course) => (
                <div key={course.id} className="course-card-v2">
                  <div className="card-thumb">
                    {course.thumbnail_url ? (
                      <img src={course.thumbnail_url} alt={course.title} />
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
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
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