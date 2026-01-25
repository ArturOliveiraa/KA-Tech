import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image_url: string;
}

function Cursos() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data: categoriesRes, error } = await supabase
          .from("categories")
          .select("*")
          .order('name', { ascending: true });

        if (error) throw error;

        setCategories(categoriesRes || []);
      } catch (err) {
        console.error("Erro ao carregar categorias:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredCategories = useMemo(() => {
    return categories.filter(cat =>
      cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  return (
    <div className="dashboard-wrapper">
      <Sidebar />

      <main className="main-content">
        <header className="header-section">
          <div className="header-titles">
            <h1>Explorar Trilhas</h1>
            <p>Escolha um caminho e comece a sua jornada.</p>
          </div>

          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Buscar trilha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </header>

        {loading ? (
          <div className="loading-container">
            Sincronizando trilhas...
          </div>
        ) : (
          <div className="categories-grid">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="category-card"
                  onClick={() => navigate(`/categoria/${cat.slug}`)}
                >
                  <div className="card-glow"></div>

                  <div className="card-icon">
                    {cat.image_url ? (
                      <img src={cat.image_url} alt={cat.name} />
                    ) : (
                      <span>🚀</span>
                    )}
                  </div>

                  <h2>{cat.name}</h2>
                  <p>
                    {cat.description || "Inicie seu aprendizado nesta trilha de conhecimento específica."}
                  </p>

                  <button className="btn-access">
                    Acessar Cursos <span>→</span>
                  </button>
                </div>
              ))
            ) : (
              <div className="no-results">
                Nenhuma trilha encontrada com o nome "{searchTerm}".
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        :root {
            --primary: #8b5cf6;
            --bg-dark: #020617;
            --card-glass: rgba(15, 23, 42, 0.6);
            --text-light: #fff;
            --text-dim: #9ca3af;
        }
        
        * { box-sizing: border-box; }

        .dashboard-wrapper {
            display: flex;
            width: 100%;
            min-height: 100vh;
            background-color: var(--bg-dark);
            font-family: 'Sora', sans-serif;
        }

        .main-content {
            flex: 1;
            padding: 40px;
            margin-left: 260px;
            transition: all 0.3s ease;
        }

        .header-section {
            margin-bottom: 50px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 30px;
        }

        .header-titles h1 {
            color: var(--text-light);
            font-size: 2.5rem;
            font-weight: 900;
            letter-spacing: -1px;
            margin: 0 0 10px 0;
        }

        .header-titles p {
            color: var(--text-dim);
            font-size: 1.1rem;
            margin: 0;
        }

        .search-box {
            position: relative;
            width: 100%;
            max-width: 350px;
        }

        .search-icon {
            position: absolute;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 1.2rem;
            z-index: 10;
            opacity: 0.7;
        }

        .search-input {
            width: 100%;
            padding: 16px 20px 16px 55px;
            border-radius: 16px;
            background: var(--card-glass);
            border: 1px solid rgba(139, 92, 246, 0.2);
            color: var(--text-light);
            outline: none;
            font-family: 'Sora', sans-serif;
            font-size: 0.95rem;
            transition: 0.3s;
            backdrop-filter: blur(10px);
        }

        .search-input:focus {
            border-color: var(--primary);
            box-shadow: 0 0 15px rgba(139, 92, 246, 0.2);
        }

        .loading-container, .no-results {
            color: var(--text-dim);
            text-align: center;
            padding: 100px;
            font-size: 1.2rem;
            font-weight: 700;
            grid-column: 1 / -1;
        }
        .loading-container { color: var(--primary); }

        .categories-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 30px;
        }

        .category-card {
            background: linear-gradient(145deg, rgba(9, 9, 11, 0.8) 0%, rgba(2, 6, 23, 0.8) 100%);
            backdrop-filter: blur(10px);
            border-radius: 28px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            padding: 35px;
            display: flex;
            flex-direction: column;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            position: relative;
            overflow: hidden;
            cursor: pointer;
        }

        .category-card:hover {
            transform: translateY(-10px);
            border-color: rgba(139, 92, 246, 0.4);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }

        .card-glow {
            position: absolute;
            top: -20px;
            right: -20px;
            width: 100px;
            height: 100px;
            background: rgba(139, 92, 246, 0.1);
            border-radius: 50%;
            filter: blur(40px);
            pointer-events: none;
        }

        .card-icon {
            width: 60px;
            height: 60px;
            background: rgba(139, 92, 246, 0.1);
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 25px;
            border: 1px solid rgba(139, 92, 246, 0.2);
        }

        .card-icon img { width: 32px; height: 32px; object-fit: contain; }
        .card-icon span { font-size: 1.5rem; }

        .category-card h2 {
            color: var(--text-light);
            font-size: 1.6rem;
            font-weight: 800;
            margin: 0 0 12px 0;
        }

        .category-card p {
            color: var(--text-dim);
            font-size: 0.95rem;
            line-height: 1.6;
            margin: 0 0 30px 0;
            flex: 1;
        }

        .btn-access {
            background: rgba(139, 92, 246, 0.1);
            color: #a78bfa;
            border: 1px solid rgba(139, 92, 246, 0.2);
            padding: 16px;
            border-radius: 14px;
            cursor: pointer;
            font-weight: 800;
            font-size: 0.9rem;
            transition: 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }

        .category-card:hover .btn-access {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }

        /* --- AJUSTE PARA MOBILE (Foco no Padding Inferior) --- */
        @media (max-width: 1024px) {
            .main-content {
                margin-left: 0;
                padding: 30px 20px 180px 20px; /* Aumentado o padding inferior para 180px */
            }

            .header-section {
                flex-direction: column;
                align-items: flex-start;
            }

            .search-box {
                max-width: 100%;
            }
        }

        @media (max-width: 600px) {
            .header-titles h1 {
                font-size: 2rem;
            }
            .categories-grid {
                grid-template-columns: 1fr; 
            }
            .category-card {
                padding: 25px;
            }
        }
      `}</style>
    </div>
  );
}

export default Cursos;