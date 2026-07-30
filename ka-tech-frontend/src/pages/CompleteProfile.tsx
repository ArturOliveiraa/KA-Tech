import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

import "../App.css";
import logoKaTech from "../assets/ka-tech-logo.png";

function CompleteProfile() {
  const [nome, setNome] = useState("");
  const [equipe, setEquipe] = useState(""); // "TECNICA" | "COMERCIAL"
  const [tipoUnidade, setTipoUnidade] = useState(""); // "MATRIZ" | "FRANQUIA" | "PEV"
  const [estadoSelecionado, setEstadoSelecionado] = useState(""); 
  const [regiaoId, setRegiaoId] = useState("");
  const [buscaUnidade, setBuscaUnidade] = useState("");
  
  const [tagsDisponiveis, setTagsDisponiveis] = useState<{ id: string; name: string; type: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchTags() {
      const { data, error } = await supabase
        .from("tags")
        .select("id, name, type")
        .order("name", { ascending: true });

      if (error) {
        console.error("Erro ao buscar tags:", error);
      } else if (data) {
        setTagsDisponiveis(data);
      }
    }
    fetchTags();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    
    if (!nome || !equipe || !tipoUnidade || !regiaoId) {
      setErrorMessage("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Usuário não autenticado.");

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: nome, equipe: equipe })
        .eq("id", user.id);

      if (profileError) throw profileError;

      const { error: tagError } = await supabase
        .from("profile_tags")
        .upsert([{ profile_id: user.id, tag_id: regiaoId }]);

      if (tagError) throw tagError;

      navigate("/dashboard");

    } catch (err: any) {
      setErrorMessage(err?.message || "Erro ao salvar o perfil.");
    } finally {
      setLoading(false);
    }
  }

  const getEstado = (nomeTag: string) => {
    const match = nomeTag.match(/^([A-Z]{2})\s*-/);
    return match ? match[1] : "Geral";
  };

  const tagsDoTipo = tagsDisponiveis.filter(tag => tag.type === tipoUnidade);
  const estadosDisponiveis = Array.from(new Set(tagsDoTipo.map(tag => getEstado(tag.name)))).sort();
  const exibirFiltroEstado = estadosDisponiveis.length > 1 || (estadosDisponiveis.length === 1 && estadosDisponiveis[0] !== "Geral");
  
  const tagsDoEstado = tagsDoTipo.filter(tag => getEstado(tag.name) === estadoSelecionado || !exibirFiltroEstado);
  
  const unidadesFiltradas = tagsDoEstado.filter(tag => 
    tag.name.toLowerCase().includes(buscaUnidade.toLowerCase())
  );

  return (
    <div className="auth-isolation-wrapper">
      <style>{`
        .auth-isolation-wrapper { 
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; 
          z-index: 9999; background: #020617; font-family: 'Sora', sans-serif; 
          overflow-y: auto; overflow-x: hidden;
          display: flex; align-items: center; justify-content: center;
          background: radial-gradient(circle at top, #1a1033 0%, #020617 80%);
          padding: 20px; 
        }
        
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 40px rgba(139, 92, 246, 0.15); } 50% { box-shadow: 0 0 60px rgba(139, 92, 246, 0.3); } }

        .premium-login-card { 
          width: 100%; max-width: 560px; 
          background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(24px); 
          border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 32px; 
          padding: 40px; margin: auto; box-sizing: border-box;
          animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards, pulseGlow 4s ease-in-out infinite;
        }

        .login-header { text-align: center; margin-bottom: 30px; }
        .login-header img { height: 48px; margin-bottom: 15px; filter: drop-shadow(0 0 15px rgba(255,255,255,0.2)); }
        .login-header h1 { font-size: 1.8rem; color: #fff; font-weight: 800; margin-bottom: 6px; letter-spacing: -0.5px; }
        .login-header p { color: #94a3b8; font-size: 0.9rem; line-height: 1.4; }

        .input-group { margin-bottom: 22px; }
        .input-group label { display: block; color: #cbd5e1; font-size: 0.85rem; margin-bottom: 8px; font-weight: 600; letter-spacing: 0.5px;}

        /* INPUT DE TEXTO */
        .premium-input-wrapper { 
          display: flex; align-items: center; background: rgba(2, 6, 23, 0.6); 
          border: 2px solid #1e293b; border-radius: 16px; padding: 14px 18px; transition: all 0.3s ease; 
        }
        .premium-input-wrapper:focus-within { border-color: #8b5cf6; background: rgba(139, 92, 246, 0.05); }
        .premium-input-wrapper input { background: transparent; border: none; color: #fff; width: 100%; outline: none; margin-left: 10px; font-size: 0.95rem; font-family: 'Sora', sans-serif;}
        .premium-input-wrapper input::placeholder { color: #475569; }

        /* SELEÇÃO POR CLIQUES (GRID DE BOTÕES) */
        .options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 10px;
        }
        .options-grid.states-grid {
          grid-template-columns: repeat(auto-fill, minmax(55px, 1fr));
          max-height: 140px;
          overflow-y: auto;
          padding: 4px;
        }
        .options-grid.states-grid::-webkit-scrollbar { width: 4px; }
        .options-grid.states-grid::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }

        .option-card {
          background: rgba(2, 6, 23, 0.6);
          border: 2px solid #1e293b;
          border-radius: 14px;
          padding: 12px 14px;
          color: #94a3b8;
          font-weight: 600;
          font-size: 0.88rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .option-card:hover {
          border-color: #475569;
          color: #fff;
          background: rgba(30, 41, 59, 0.5);
        }
        .option-card.selected {
          border-color: #8b5cf6;
          background: rgba(139, 92, 246, 0.2);
          color: #c4b5fd;
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.25);
        }

        /* LISTA DE UNIDADES EM CARDS COM BUSCA */
        .units-container {
          background: rgba(2, 6, 23, 0.4);
          border: 2px solid #1e293b;
          border-radius: 16px;
          padding: 12px;
        }
        .unit-search {
          width: 100%;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 10px;
          padding: 10px 14px;
          color: #fff;
          outline: none;
          font-size: 0.9rem;
          margin-bottom: 10px;
          box-sizing: border-box;
        }
        .unit-search:focus { border-color: #8b5cf6; }

        .units-list {
          max-height: 160px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .units-list::-webkit-scrollbar { width: 5px; }
        .units-list::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }

        .unit-item {
          padding: 10px 14px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid #1e293b;
          border-radius: 10px;
          color: #cbd5e1;
          font-size: 0.88rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .unit-item:hover { background: rgba(139, 92, 246, 0.15); color: #fff; border-color: #475569; }
        .unit-item.selected { background: rgba(139, 92, 246, 0.3); color: #fff; border-color: #8b5cf6; font-weight: 600; }
        .unit-empty { text-align: center; color: #64748b; font-size: 0.85rem; padding: 15px; }

        /* BOTÃO DE AÇÃO */
        .btn-premium-action { 
          width: 100%; padding: 16px; border: none; border-radius: 16px; color: #fff; font-weight: 800; 
          background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); cursor: pointer; transition: all 0.3s ease; 
          margin-top: 15px; font-size: 1rem; letter-spacing: 0.5px;
        }
        .btn-premium-action:hover:not(:disabled) { 
          transform: translateY(-2px); box-shadow: 0 12px 25px rgba(236, 72, 153, 0.3); 
        }
        .btn-premium-action:disabled { background: #334155; color: #94a3b8; cursor: not-allowed; }

        @media (max-width: 600px) {
          .auth-isolation-wrapper { padding: 10px; align-items: flex-start; }
          .premium-login-card { padding: 25px 20px; border-radius: 24px; margin-top: 10px; }
        }
      `}</style>

      <div className="auth-page-v2">
        <div className="premium-login-card">
          
          <header className="login-header">
            <img src={logoKaTech} alt="Logo KA Tech" />
            <h1>Quase lá!</h1>
            <p>Precisamos de mais alguns dados para configurar sua jornada.</p>
          </header>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Nome Completo</label>
              <div className="premium-input-wrapper">
                <span>👤</span>
                <input type="text" placeholder="Como devemos te chamar?" value={nome} onChange={(e) => setNome(e.target.value)} required />
              </div>
            </div>

            {/* SELEÇÃO DE EQUIPE POR CLIQUE */}
            <div className="input-group">
              <label>Sua Equipe</label>
              <div className="options-grid">
                {[
                  { id: "TECNICA", label: "Técnica", icon: "💻" },
                  { id: "COMERCIAL", label: "Comercial", icon: "📈" }
                ].map((eq) => (
                  <div 
                    key={eq.id}
                    className={`option-card ${equipe === eq.id ? 'selected' : ''}`}
                    onClick={() => setEquipe(eq.id)}
                  >
                    <span>{eq.icon}</span> {eq.label}
                  </div>
                ))}
              </div>
            </div>

            {/* SELEÇÃO DE TIPO DE UNIDADE POR CLIQUE */}
            <div className="input-group">
              <label>Tipo de Unidade</label>
              <div className="options-grid">
                {[
                  { id: "MATRIZ", label: "Matriz" },
                  { id: "FRANQUIA", label: "Franquia" },
                  { id: "PEV", label: "PEV" }
                ].map((tipo) => (
                  <div 
                    key={tipo.id}
                    className={`option-card ${tipoUnidade === tipo.id ? 'selected' : ''}`}
                    onClick={() => {
                      setTipoUnidade(tipo.id);
                      setEstadoSelecionado("");
                      setRegiaoId("");
                    }}
                  >
                    {tipo.label}
                  </div>
                ))}
              </div>
            </div>

            {/* SELEÇÃO DE ESTADO POR CLIQUE EM GRID */}
            {tipoUnidade && exibirFiltroEstado && (
              <div className="input-group">
                <label>Selecione o Estado ({estadosDisponiveis.length})</label>
                <div className="options-grid states-grid">
                  {estadosDisponiveis.map((est) => (
                    <div 
                      key={est}
                      className={`option-card ${estadoSelecionado === est ? 'selected' : ''}`}
                      onClick={() => {
                        setEstadoSelecionado(est);
                        setRegiaoId("");
                      }}
                    >
                      {est}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LISTA DE UNIDADES COM BUSCA RÁPIDA */}
            {tipoUnidade && (!exibirFiltroEstado || estadoSelecionado) && (
              <div className="input-group">
                <label>Selecione a Unidade</label>
                <div className="units-container">
                  <input 
                    type="text" 
                    className="unit-search" 
                    placeholder="🔍 Digite para filtrar unidade..." 
                    value={buscaUnidade}
                    onChange={(e) => setBuscaUnidade(e.target.value)}
                  />
                  <div className="units-list">
                    {unidadesFiltradas.length > 0 ? (
                      unidadesFiltradas.map((tag) => (
                        <div 
                          key={tag.id}
                          className={`unit-item ${regiaoId === tag.id ? 'selected' : ''}`}
                          onClick={() => setRegiaoId(tag.id)}
                        >
                          📍 {tag.name}
                        </div>
                      ))
                    ) : (
                      <div className="unit-empty">Nenhuma unidade encontrada.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {errorMessage && <div style={{ color: '#f87171', textAlign: 'center', marginBottom: '12px', fontSize: '0.85rem', fontWeight: 500 }}>{errorMessage}</div>}

            <button className="btn-premium-action" type="submit" disabled={loading || !nome || !equipe || !tipoUnidade || !regiaoId}>
              {loading ? "Processando..." : "Finalizar Cadastro"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CompleteProfile;