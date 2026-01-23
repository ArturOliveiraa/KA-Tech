import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "../App.css";

interface Course {
  id: number;
  title: string;
  description: string;
  thumbnail_url: string | null;
  course_tags: { tags: { name: string } }[]; // Incluindo as Tags
}

function Cursos() {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchCatalog() {
      try {
        setLoading(true);
        // BUSCA GLOBAL: Pega todos os cursos e suas respectivas tags
        const { data, error } = await supabase
          .from("courses")
          .select("*, course_tags(tags(name))");

        if (error) throw error;
        setAllCourses(data || []);
      } catch (err) {
        console.error("Erro ao carregar catálogo:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCatalog();
  }, []);

  return (
    <div className="dashboard-wrapper">
      <aside className="dashboard-sidebar">
        <div className="brand">
          <div className="logo-icon-small">KA</div>
          <span style={{ fontWeight: "bold", fontSize: "1.2rem", marginLeft: "8px" }}>Tech</span>
        </div>
        <nav className="dashboard-nav">
          <button className="nav-link" onClick={() => navigate("/dashboard")}><span>📚</span> Meus Cursos</button>
          <button className="nav-link active"><span>🔍</span> Explorar</button>
          <button className="nav-link"><span>⚙️</span> Configurações</button>
        </nav>
        <button className="logout-btn" onClick={() => navigate("/")}>Sair da conta</button>
      </aside>

      <main className="dashboard-content">
        <header className="dashboard-header">
          <h1>Explorar Catálogo!</h1>
          <p>Conheça todos os nossos cursos de tecnologia.</p>
        </header>

        {loading ? (
          <div className="loading-box">Carregando cursos...</div>
        ) : (
          <div className="courses-grid">
            {allCourses.map((course) => (
              <div key={course.id} className="course-card-v2">
                <div className="card-thumb">
                  {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} />
                  ) : (
                    <div className="thumb-placeholder">KA Tech</div>
                  )}
                </div>
                <div className="card-body">
                  {/* Exibição das Tags */}
                  <div className="tag-container">
                    {course.course_tags.map((t, i) => (
                      <span key={i} className="tag-badge">{t.tags.name}</span>
                    ))}
                  </div>
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>
                  <button className="primary-button">Ver Detalhes</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Cursos;