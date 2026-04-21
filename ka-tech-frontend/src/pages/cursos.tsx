import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import { 
  Search, Sparkles, X, Compass, ArrowRight, BrainCircuit, 
  MonitorPlay, CreditCard, Store, Tv, PlayCircle, Library
} from "lucide-react";

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image_url: string;
}

interface AiLessonResult {
  lesson_title: string;
  course_slug: string;
  content: string;
  similarity: number;
}

function Cursos() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [aiSearchTerm, setAiSearchTerm] = useState("");
  const [aiResults, setAiResults] = useState<AiLessonResult[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiResults, setShowAiResults] = useState(false);

  const [enrolledSlugs, setEnrolledSlugs] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        const { data: categoriesRes, error } = await supabase
          .from("categories")
          .select("*")
          .order('name', { ascending: true });

        if (error) throw error;
        setCategories(categoriesRes || []);

        if (user) {
          const { data: enrollments } = await supabase
            .from("course_enrollments")
            .select(`courses (slug)`)
            .eq("user_id", user.id);

          if (enrollments) {
            const slugs = enrollments.map((e: any) => e.courses?.slug).filter(Boolean);
            setEnrolledSlugs(slugs);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredCategories = useMemo(() => {
    return categories.filter(cat =>
      cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiSearchTerm.trim()) return;

    setIsAiLoading(true);
    setShowAiResults(true);

    try {
      const response = await fetch('https://pandai.discloud.app/search-lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiSearchTerm }),
      });

      if (!response.ok) throw new Error('Falha na comunicação com a IA');

      const data = await response.json();
      setAiResults(data.results || []);
    } catch (error) {
      console.error("Erro na busca IA:", error);
      alert("Não foi possível conectar ao cérebro da IA. Tente novamente.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAccessLesson = (courseSlug: string) => {
    navigate(`/curso/${courseSlug}`);
  };

  const getCategoryIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('live')) return <Tv size={28} />;
    if (lowerName.includes('pdv')) return <CreditCard size={28} />;
    if (lowerName.includes('shop')) return <Store size={28} />;
    return <Library size={28} />;
  };

  return (
    <div className="dashboard-wrapper">
      <Sidebar />

      {/* Fundo Decorativo para Preencher Telas Grandes */}
      <div className="ambient-bg">
        <div className="ambient-blob blob-1"></div>
        <div className="ambient-blob blob-2"></div>
      </div>

      <main className="main-content">
        
        {/* HERO SECTION - IA EM DESTAQUE */}
        <section className="hero-ai-section">
            <div className="hero-content glass-panel">
                <div className="hero-badge">
                    <Sparkles size={14} className="text-cyan-400" />
                    <span>Powered by pandAI</span>
                </div>
                
                <h1 className="hero-title">O que você quer <span className="text-gradient">aprender hoje?</span></h1>
                <p className="hero-subtitle">Faça uma pergunta específica e nossa IA encontrará o momento exato da aula para você.</p>
                
                <form onSubmit={handleAiSearch} className="ai-search-form">
                    <div className="ai-input-wrapper">
                        <BrainCircuit className="ai-icon" size={24} />
                        <input
                            type="text"
                            className="ai-input"
                            placeholder="Ex: Como cancelar uma venda no PDV?"
                            value={aiSearchTerm}
                            onChange={(e) => setAiSearchTerm(e.target.value)}
                        />
                        <button type="submit" className="ai-submit-btn" disabled={isAiLoading}>
                            {isAiLoading ? <span className="animate-pulse">Analisando...</span> : "Pesquisar"}
                        </button>
                    </div>
                </form>
            </div>
        </section>

        {/* RESULTADOS DA IA */}
        {showAiResults && (
          <section className="ai-results-area glass-panel">
            <div className="results-header">
              <h3><BrainCircuit size={22} className="text-cyan-400" /> Soluções Encontradas</h3>
              <button onClick={() => setShowAiResults(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>

            {isAiLoading ? (
              <div className="ai-loading">
                 <Sparkles size={40} className="animate-spin-slow text-cyan-400" style={{ margin: '0 auto 15px' }}/>
                 <p>Sincronizando com a base de conhecimento neural...</p>
              </div>
            ) : aiResults.length > 0 ? (
              <div className="ai-grid">
                {aiResults.map((item, index) => (
                  <div key={index} className="ai-result-card" onClick={() => handleAccessLesson(item.course_slug)}>
                    <div className="ai-card-header">
                        <div className="ai-card-icon"><PlayCircle size={20} /></div>
                        <div className="match-badge">Match {(item.similarity * 100).toFixed(0)}%</div>
                    </div>
                    <h4 className="ai-card-title">{item.lesson_title}</h4>
                    <p className="ai-snippet">"{item.content.substring(0, 150)}..."</p>
                    <div className="ai-card-footer">
                        <span>Acessar Aula</span>
                        <ArrowRight size={16} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ai-no-results">
                Ainda não possuímos nenhum conteúdo sobre esse tema específico em nossa base de aulas.
              </div>
            )}
          </section>
        )}

        {/* CONTROLES DE TRILHAS (HEADER DA GRID) */}
        <div className="section-controls">
            <div className="section-title-wrapper">
                <Compass size={28} className="text-primary" />
                <h2>Trilhas de Conhecimento</h2>
            </div>

            <div className="classic-search">
                <Search className="classic-search-icon" size={18} />
                <input
                    type="text"
                    placeholder="Filtrar trilhas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="classic-search-input"
                />
            </div>
        </div>

        {/* GRID DE CATEGORIAS */}
        {loading ? (
          <div className="loading-container glass-panel">
             <Compass size={48} className="animate-spin-slow text-primary" style={{ margin: '0 auto 15px' }} />
             <p>Carregando acervo de trilhas...</p>
          </div>
        ) : (
          <div className="categories-grid">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((cat) => (
                <div key={cat.id} className="category-card glass-panel" onClick={() => navigate(`/categoria/${cat.slug}`)}>
                  
                  <div className="card-top">
                      <div className="card-icon-wrapper">
                        {cat.image_url ? (
                          <img src={cat.image_url} alt={cat.name} className="cat-img" />
                        ) : (
                          getCategoryIcon(cat.name)
                        )}
                      </div>
                  </div>

                  <div className="card-content">
                      <h3 className="card-title">{cat.name}</h3>
                      <p className="card-desc">
                        {cat.description || "Inicie seu aprendizado nesta trilha de conhecimento especializada. Domine o assunto passo a passo."}
                      </p>
                  </div>

                  <div className="card-footer">
                      <button className="card-btn">
                          Acessar Trilha <ArrowRight size={18} className="btn-icon-slide" />
                      </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results glass-panel">
                Nenhuma trilha encontrada para <strong>"{searchTerm}"</strong>.
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        :root {
            --primary: #8b5cf6; 
            --primary-hover: #7c3aed;
            --ai-cyan: #06b6d4;
            --bg-dark: #020617; 
            --bg-card: rgba(15, 23, 42, 0.5); 
            --border-color: rgba(255, 255, 255, 0.08);
            --text-light: #f8fafc;
            --text-dim: #94a3b8;
        }
        
        * { box-sizing: border-box; }

        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin-slow { 100% { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 4s linear infinite; }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }

        /* Utilidades Rápidas */
        .text-primary { color: var(--primary); }
        .text-cyan-400 { color: var(--ai-cyan); }
        .text-gradient { background: linear-gradient(135deg, #c4b5fd 0%, #8b5cf6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

        .dashboard-wrapper {
            display: flex; width: 100%; min-height: 100vh; position: relative;
            background-color: var(--bg-dark); font-family: 'Inter', system-ui, sans-serif;
            overflow-x: hidden; color: var(--text-light);
        }

        /* BACKGROUND AMBIENTE PARA PREENCHER TELA */
        .ambient-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
        .ambient-blob { position: absolute; border-radius: 50%; filter: blur(120px); opacity: 0.15; }
        .blob-1 { top: -10%; left: 10%; width: 50vw; height: 50vw; background: var(--primary); }
        .blob-2 { bottom: -20%; right: -10%; width: 60vw; height: 60vw; background: var(--ai-cyan); }

        /* CONTEÚDO PRINCIPAL */
        .main-content {
            position: relative; z-index: 1; flex: 1; margin-left: 260px; 
            padding: 60px 80px 100px 80px; width: calc(100% - 260px); 
            animation: fadeUp 0.6s ease-out forwards;
        }

        /* COMPONENTE DE VIDRO */
        .glass-panel {
            background: var(--bg-card); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
            border: 1px solid var(--border-color); border-top-color: rgba(255,255,255,0.15);
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
        }

        /* HERO AI SECTION */
        .hero-ai-section { margin-bottom: 60px; }
        .hero-content { 
            border-radius: 32px; padding: 60px; text-align: center; 
            display: flex; flex-direction: column; align-items: center; position: relative; overflow: hidden;
        }
        .hero-content::before {
            content: ''; position: absolute; top: 0; left: 0; right: 0; height: 100%;
            background: radial-gradient(ellipse at top, rgba(6, 182, 212, 0.15) 0%, transparent 60%); pointer-events: none;
        }
        
        .hero-badge {
            display: inline-flex; align-items: center; gap: 8px; background: rgba(6, 182, 212, 0.1);
            border: 1px solid rgba(6, 182, 212, 0.3); padding: 8px 16px; border-radius: 20px;
            font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24px;
        }

        .hero-title { font-size: 3.5rem; font-weight: 900; margin: 0 0 16px 0; letter-spacing: -1.5px; line-height: 1.1; }
        .hero-subtitle { color: var(--text-dim); font-size: 1.25rem; max-width: 600px; margin: 0 0 40px 0; line-height: 1.5; }

        .ai-search-form { width: 100%; max-width: 800px; }
        .ai-input-wrapper {
            display: flex; background: rgba(2, 6, 23, 0.6); border: 1px solid rgba(255,255,255,0.1);
            border-radius: 24px; padding: 8px; position: relative; transition: 0.3s ease;
        }
        .ai-input-wrapper:focus-within {
            border-color: var(--ai-cyan); box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.15);
            background: rgba(2, 6, 23, 0.8);
        }
        .ai-icon { position: absolute; left: 24px; top: 50%; transform: translateY(-50%); color: #64748b; }
        
        .ai-input {
            flex: 1; background: transparent; border: none; padding: 20px 20px 20px 64px;
            color: #fff; font-size: 1.15rem; outline: none; font-family: 'Inter', sans-serif;
        }
        .ai-input::placeholder { color: #475569; }

        .ai-submit-btn {
            background: var(--ai-cyan); color: #000; border: none; padding: 0 32px;
            border-radius: 16px; font-weight: 800; font-size: 1.05rem; cursor: pointer; transition: 0.3s;
        }
        .ai-submit-btn:hover:not(:disabled) { transform: scale(1.02); box-shadow: 0 10px 25px rgba(6, 182, 212, 0.4); }
        .ai-submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }


        /* RESULTADOS DA IA */
        .ai-results-area { border-radius: 32px; padding: 40px; margin-bottom: 60px; animation: fadeUp 0.4s ease; }
        .results-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 1px solid var(--border-color); padding-bottom: 20px;}
        .results-header h3 { display: flex; align-items: center; gap: 12px; margin: 0; font-size: 1.4rem; font-weight: 800;}
        .close-btn { background: rgba(255,255,255,0.05); border: none; color: var(--text-dim); padding: 8px; border-radius: 50%; cursor: pointer; transition: 0.2s;}
        .close-btn:hover { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

        .ai-loading { text-align: center; color: var(--text-dim); padding: 60px; font-size: 1.1rem; }
        .ai-no-results { text-align: center; color: var(--text-dim); padding: 40px; font-size: 1.1rem; }

        .ai-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; }
        .ai-result-card {
            background: rgba(6, 182, 212, 0.05); border: 1px solid rgba(6, 182, 212, 0.2);
            border-radius: 20px; padding: 24px; cursor: pointer; transition: 0.3s;
            display: flex; flex-direction: column;
        }
        .ai-result-card:hover { background: rgba(6, 182, 212, 0.1); border-color: rgba(6, 182, 212, 0.4); transform: translateY(-4px); }
        
        .ai-card-header { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .ai-card-icon { width: 40px; height: 40px; background: rgba(0,0,0,0.3); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--ai-cyan);}
        .match-badge { background: var(--text-light); color: #000; font-size: 0.75rem; font-weight: 800; padding: 6px 12px; border-radius: 20px; align-self: flex-start;}
        
        .ai-card-title { color: #fff; font-size: 1.15rem; font-weight: 800; margin: 0 0 10px 0; line-height: 1.4;}
        .ai-snippet { color: var(--text-dim); font-size: 0.95rem; line-height: 1.6; margin: 0 0 20px 0; font-style: italic; flex: 1;}
        .ai-card-footer { display: flex; align-items: center; gap: 8px; color: var(--ai-cyan); font-weight: 700; font-size: 0.95rem; }
        .ai-result-card:hover .ai-card-footer { gap: 12px; }


        /* HEADER DAS TRILHAS */
        .section-controls {
            display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 20px; margin-bottom: 40px;
        }
        .section-title-wrapper { display: flex; align-items: center; gap: 12px; }
        .section-title-wrapper h2 { font-size: 1.8rem; font-weight: 800; margin: 0; }

        .classic-search { position: relative; width: 100%; max-width: 320px; }
        .classic-search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #64748b; }
        .classic-search-input {
            width: 100%; padding: 16px 16px 16px 45px; border-radius: 16px; background: var(--bg-card);
            border: 1px solid var(--border-color); color: #fff; font-size: 1rem; outline: none; transition: 0.3s;
        }
        .classic-search-input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1); }


        /* GRID DE TRILHAS (BENTO STYLE) */
        .categories-grid { 
            display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 35px; 
        }

        .category-card {
            border-radius: 28px; padding: 40px 35px; display: flex; flex-direction: column; min-height: 320px;
            cursor: pointer; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .category-card:hover {
            transform: translateY(-8px) scale(1.02); border-color: rgba(139, 92, 246, 0.5);
            box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.6), 0 0 40px rgba(139, 92, 246, 0.15);
        }

        .card-top { margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
        .card-icon-wrapper {
            width: 64px; height: 64px; background: rgba(0,0,0,0.4); border-radius: 18px;
            display: flex; align-items: center; justify-content: center; color: var(--primary);
            border: 1px solid rgba(255,255,255,0.08); transition: 0.4s;
        }
        .category-card:hover .card-icon-wrapper { background: var(--primary); color: #fff; border-color: var(--primary); transform: scale(1.1) rotate(-5deg); }
        .cat-img { width: 36px; height: 36px; object-fit: contain; }

        .card-content { flex: 1; display: flex; flex-direction: column;}
        .card-title { font-size: 1.5rem; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;}
        .card-desc { color: var(--text-dim); font-size: 1.05rem; line-height: 1.6; margin: 0; }

        .card-footer { margin-top: 35px; }
        .card-btn {
            width: 100%; background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); color: #fff;
            padding: 18px; border-radius: 16px; font-weight: 700; font-size: 1.05rem; cursor: pointer; transition: 0.3s;
            display: flex; align-items: center; justify-content: space-between;
        }
        .btn-icon-slide { transition: 0.3s; opacity: 0.5;}
        
        .category-card:hover .card-btn {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
            border-color: transparent; box-shadow: 0 10px 25px rgba(139, 92, 246, 0.4);
        }
        .category-card:hover .btn-icon-slide { transform: translateX(5px); opacity: 1;}

        .loading-container, .no-results { text-align: center; padding: 100px 20px; color: var(--text-dim); font-size: 1.1rem; border-radius: 32px;}

        /* RESPONSIVIDADE */
        @media (max-width: 1024px) {
            .main-content { margin-left: 0; padding: 40px 30px 100px 30px; width: 100%; }
            .hero-content { padding: 40px 25px; }
            .hero-title { font-size: 2.5rem; }
            .ai-input-wrapper { flex-direction: column; background: transparent; border: none; padding: 0;}
            .ai-input { background: rgba(2, 6, 23, 0.6); border: 1px solid rgba(255,255,255,0.1); margin-bottom: 15px;}
            .ai-icon { top: 30px; }
            .ai-submit-btn { padding: 20px; width: 100%; }
            .section-controls { flex-direction: column; align-items: flex-start; gap: 20px; }
            .classic-search { max-width: 100%; }
            .categories-grid { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
        }

        @media (max-width: 600px) {
            .main-content { padding: 30px 20px 100px 20px; }
            .hero-title { font-size: 2rem; }
            .categories-grid { grid-template-columns: 1fr; }
            .category-card { padding: 30px 25px; }
        }
      `}</style>
    </div>
  );
}

export default Cursos;