import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Brain, Link, Trash2, ExternalLink, Search, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Quiz {
  id: string;
  title: string;
  description: string;
  slug: string;
  url: string;
  created_at: string;
}

export default function QuizList() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuizzes();
  }, []);

  async function fetchQuizzes() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuizzes(data || []);
    } catch (err: any) {
      alert("Erro ao carregar quizzes: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este quiz? Isso apagará todas as perguntas associadas.")) return;
    
    try {
      // O Supabase cuidará das perguntas se o ON DELETE CASCADE estiver ativo, 
      // caso contrário, você precisaria deletar as questions manualmente antes.
      const { error } = await supabase.from("quizzes").delete().eq("id", id);
      if (error) throw error;
      
      setQuizzes(quizzes.filter(q => q.id !== id));
    } catch (err: any) {
      alert("Erro ao excluir: " + err.message);
    }
  };

  const copyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredQuizzes = quizzes.filter(q => 
    q.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div style={{ padding: '100px', textAlign: 'center', color: '#8b5cf6', fontWeight: 800 }}>Carregando biblioteca de quizzes...</div>;

  return (
    <div className="quiz-list-wrapper">
      <style>{`
        .quiz-list-wrapper { min-height: 100vh; background: #020617; color: #fff; padding: 40px; font-family: 'Sora', sans-serif; }
        .container { max-width: 1000px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
        .header h1 { font-size: 2rem; font-weight: 900; margin: 0; }
        
        .search-bar { position: relative; margin-bottom: 30px; }
        .search-bar input { width: 100%; padding: 15px 20px 15px 50px; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 15px; color: #fff; outline: none; transition: 0.3s; }
        .search-bar input:focus { border-color: #8b5cf6; box-shadow: 0 0 15px rgba(139, 92, 246, 0.2); }
        .search-icon { position: absolute; left: 18px; top: 15px; color: #64748b; }

        .quiz-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .quiz-card { background: #0f172a; border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 25px; transition: 0.3s; }
        .quiz-card:hover { transform: translateY(-5px); border-color: rgba(139, 92, 246, 0.3); }
        
        .quiz-title { font-size: 1.2rem; font-weight: 800; margin-bottom: 10px; color: #fff; display: flex; align-items: center; gap: 10px; }
        .quiz-desc { color: #94a3b8; font-size: 0.85rem; line-height: 1.5; margin-bottom: 20px; height: 40px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        
        .card-actions { display: flex; gap: 10px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px; }
        .action-btn { flex: 1; padding: 10px; border-radius: 12px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; font-size: 0.75rem; transition: 0.2s; }
        .btn-view { background: rgba(139, 92, 246, 0.1); color: #c4b5fd; }
        .btn-copy { background: rgba(16, 185, 129, 0.1); color: #6ee7b7; }
        .btn-delete { background: rgba(239, 68, 68, 0.1); color: #fca5a5; flex: 0; padding: 10px 15px; }
        
        .btn-view:hover { background: #8b5cf6; color: #fff; }
        .btn-copy:hover { background: #10b981; color: #fff; }
        .btn-delete:hover { background: #ef4444; color: #fff; }

        @media (max-width: 768px) { .quiz-list-wrapper { padding: 20px; } .header { flex-direction: column; align-items: flex-start; gap: 20px; } }
      `}</style>

      <div className="container">
        <header className="header">
          <div>
            <h1>Biblioteca de Quizzes</h1>
            <p style={{ color: '#64748b' }}>Todos os desafios gerados pela IA</p>
          </div>
          <button 
            onClick={() => navigate("/admin/gestao-conteudo")}
            style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 700 }}
          >
            + Criar Novo
          </button>
        </header>

        <div className="search-bar">
          <Search className="search-icon" size={20} />
          <input 
            type="text" 
            placeholder="Pesquisar por título..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="quiz-grid">
          {filteredQuizzes.map((q) => (
            <div key={q.id} className="quiz-card">
              <div className="quiz-title">
                <Brain size={20} color="#8b5cf6" />
                {q.title}
              </div>
              <p className="quiz-desc">{q.description || "Sem descrição disponível."}</p>
              
              <div className="card-actions">
                <button 
                  className="action-btn btn-view" 
                  onClick={() => window.open(q.url || `/quizzes/${q.slug}`, "_blank")}
                >
                  <ExternalLink size={16} /> TESTAR
                </button>
                
                <button 
                  className="action-btn btn-copy" 
                  onClick={() => copyLink(q.url || `${window.location.origin}/quizzes/${q.slug}`, q.id)}
                >
                  {copiedId === q.id ? <Check size={16} /> : <Copy size={16} />}
                  {copiedId === q.id ? "COPIADO" : "LINK"}
                </button>

                <button 
                  className="action-btn btn-delete" 
                  onClick={() => handleDelete(q.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredQuizzes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>
            Nenhum quiz encontrado.
          </div>
        )}
      </div>
    </div>
  );
}