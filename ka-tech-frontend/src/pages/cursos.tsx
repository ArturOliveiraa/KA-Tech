import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";

// --- INTERFACES ---
interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image_url: string;
}

// Interface para os resultados que vêm do Python
interface AiLessonResult {
  lesson_title: string; // Nome da aula (Ex: "Vendas com Pix")
  course_slug: string;  // Pasta do curso (Ex: "pdv")
  content: string;
  similarity: number;
}

function Cursos() {
  // --- ESTADOS ORIGINAIS ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // --- NOVOS ESTADOS (IA) ---
  const [aiSearchTerm, setAiSearchTerm] = useState("");
  const [aiResults, setAiResults] = useState<AiLessonResult[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiResults, setShowAiResults] = useState(false);

  const navigate = useNavigate();

  // --- CARREGAMENTO INICIAL (Mantido) ---
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

  // --- FILTRO LOCAL (Mantido) ---
  const filteredCategories = useMemo(() => {
    return categories.filter(cat =>
      cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiSearchTerm.trim()) return;

    setIsAiLoading(true);
    setShowAiResults(true);

    try {
      const response = await fetch('https://pandai.discloud.app/search-lessons', {
        method: 'POST', // O React vai enviar o POST correto que o navegador não envia
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: aiSearchTerm }),
      });

      if (!response.ok) {
        throw new Error('Falha na comunicação com a IA');
      }

      const data = await response.json();
      setAiResults(data.results || []);

    } catch (error) {
      console.error("Erro na busca IA:", error);
      alert("Não foi possível conectar ao cérebro da IA. Tente novamente.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="dashboard-wrapper">
      <Sidebar />

      <main className="main-content">
        <header className="header-section">
          <div className="header-titles">
            <h1>Explorar Trilhas</h1>
            <p>Escolha um caminho e comece a sua jornada.</p>
          </div>

          {/* Busca Clássica (Filtro) */}
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Filtrar categorias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </header>

        {/* ======================================================= */}
        {/* NOVA SEÇÃO: BUSCA COM INTELIGÊNCIA ARTIFICIAL (GEMINI)  */}
        {/* ======================================================= */}
        <section className="ai-search-wrapper">
          <div className="ai-container">
            <div className="ai-header-content">
              <span className="ai-badge">✨ Powered by  pandAI</span>
              <h2>Dúvida específica? Pergunte à IA.</h2>
              <p>Ela busca dentro do conteúdo falado de todas as aulas.</p>
            </div>

            <form onSubmit={handleAiSearch} className="ai-form">
              <input
                type="text"
                className="ai-input"
                placeholder="Ex: Como cancelar uma venda no PDV?"
                value={aiSearchTerm}
                onChange={(e) => setAiSearchTerm(e.target.value)}
              />
              <button type="submit" className="ai-btn" disabled={isAiLoading}>
                {isAiLoading ? "Pensando..." : "Buscar Aula"}
              </button>
            </form>
          </div>
        </section>

        {/* RESULTADOS DA IA (Só aparecem se houver busca) */}
        {showAiResults && (
          <section className="ai-results-area">
            <div className="results-header">
              <h3>🤖 Aulas Encontradas</h3>
              <button onClick={() => setShowAiResults(false)} className="close-btn">Fechar</button>
            </div>

            {isAiLoading ? (
              <div className="ai-loading">Consultando o cérebro digital... 🧠</div>
            ) : aiResults.length > 0 ? (
              <div className="lessons-grid">
                {aiResults.map((item, index) => (
                  <div
                    key={index}
                    className="lesson-card-ai"
                    onClick={() => navigate(`/curso/${item.course_slug}`)} // Agora vai para o CURSO
                  >
                    <div className="match-badge">Match: {(item.similarity * 100).toFixed(0)}%</div>

                    {/* Mostra o nome real da aula que a IA buscou */}
                    <h4>Aula: {item.lesson_title}</h4>

                    <p className="lesson-snippet">"{item.content.substring(0, 160)}..."</p>

                    <span className="link-text">Ver na Trilha →</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ai-no-results">
                Ainda não possuímos nenhum conteúdo sobre esse tema.
              </div>
            )}
            <hr className="divider" />
          </section>
        )}
        {/* ======================================================= */}


        {/* --- LISTAGEM DE CATEGORIAS (MANTIDA) --- */}
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
            --ai-accent: #0ea5e9; /* Azul Ciano para IA */
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

        /* --- ESTILOS NOVOS DA IA --- */
        .ai-search-wrapper {
            margin-bottom: 40px;
            background: linear-gradient(90deg, rgba(14, 165, 233, 0.15), rgba(139, 92, 246, 0.05));
            border-radius: 20px;
            padding: 2px; /* Borda gradiente fake */
            box-shadow: 0 0 30px rgba(14, 165, 233, 0.1);
        }

        .ai-container {
            background: rgba(2, 6, 23, 0.95);
            border-radius: 18px;
            padding: 30px;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .ai-header-content h2 { color: white; margin: 10px 0 5px 0; font-size: 1.5rem; }
        .ai-header-content p { color: var(--text-dim); margin: 0; font-size: 0.9rem; }
        
        .ai-badge {
            background: linear-gradient(90deg, #0ea5e9, #8b5cf6);
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: bold;
            color: white;
            text-transform: uppercase;
        }

        .ai-form {
            display: flex;
            gap: 15px;
        }

        .ai-input {
            flex: 1;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 12px;
            color: white;
            outline: none;
            transition: 0.3s;
        }
        .ai-input:focus { border-color: var(--ai-accent); box-shadow: 0 0 10px rgba(14,165,233,0.3); }

        .ai-btn {
            background: var(--ai-accent);
            border: none;
            padding: 0 30px;
            border-radius: 12px;
            color: white;
            font-weight: bold;
            cursor: pointer;
            transition: 0.3s;
        }
        .ai-btn:hover { filter: brightness(1.2); }

        /* RESULTADOS IA */
        .ai-results-area { margin-bottom: 50px; animation: fadeIn 0.5s ease; }
        .results-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .results-header h3 { color: var(--ai-accent); margin: 0; }
        .close-btn { background: none; border: none; color: var(--text-dim); cursor: pointer; text-decoration: underline; }

        .ai-loading, .ai-no-results { text-align: center; color: var(--text-dim); padding: 30px; font-style: italic; }

        .lessons-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }

        .lesson-card-ai {
            background: rgba(14, 165, 233, 0.05);
            border: 1px solid rgba(14, 165, 233, 0.2);
            padding: 20px;
            border-radius: 16px;
            cursor: pointer;
            transition: 0.3s;
            position: relative;
        }
        .lesson-card-ai:hover { transform: translateY(-5px); background: rgba(14, 165, 233, 0.1); }
        
        .match-badge {
            position: absolute;
            top: 15px; right: 15px;
            background: rgba(0,0,0,0.6);
            color: var(--ai-accent);
            font-size: 0.7rem;
            padding: 3px 8px;
            border-radius: 6px;
            font-weight: bold;
        }

        .lesson-card-ai h4 { color: white; margin: 0 0 10px 0; font-size: 1.1rem; padding-right: 50px; }
        .lesson-card-ai p { color: var(--text-dim); font-size: 0.9rem; line-height: 1.5; margin-bottom: 15px; }
        .link-text { color: var(--ai-accent); font-weight: bold; font-size: 0.9rem; }
        
        .divider { border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 40px; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }


        /* --- ESTILOS ORIGINAIS (MANTIDOS) --- */
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

        /* --- AJUSTE PARA MOBILE --- */
        @media (max-width: 1024px) {
            .main-content {
                margin-left: 0;
                padding: 30px 20px 180px 20px; 
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
            .header-titles h1 { font-size: 2rem; }
            .categories-grid { grid-template-columns: 1fr; }
            .category-card { padding: 25px; }
            .ai-form { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}

export default Cursos;