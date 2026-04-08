import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import { useUser } from "../components/UserContext";
import { 
  FolderTree, Tags, Tag as TagIcon, Link as LinkIcon, Plus, User, 
  Trash2, ArrowRight, Settings, Sparkles, Layers, Search, ChevronDown, Check 
} from "lucide-react";

interface Tag { id: string; name: string; }
interface Category { id: number; name: string; slug: string; }
interface Profile { id: string; full_name: string | null; }

const generateSlug = (text: string) => {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, "-").trim();
};

function Admin() {
  const { userRole, loading: contextLoading } = useUser();
  const [loadingData, setLoadingData] = useState(true);

  const [tagName, setTagName] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryName, setCategoryName] = useState("");

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedTagId, setSelectedTagId] = useState("");

  // Estados para o Custom Dropdown do Colaborador
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  // Estados para o Custom Dropdown do Setor (Tag)
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");

  const navigate = useNavigate();

  const fetchTags = useCallback(async () => {
    const { data } = await supabase.from("tags").select("*").order("name");
    if (data) setTags(data);
  }, []);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    if (data) setCategories(data);
  }, []);

  const fetchProfiles = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name");

    if (error) {
      console.error("Erro ao buscar alunos:", error.message);
    }

    if (data) setProfiles(data);
  }, []);

  useEffect(() => {
    if (!contextLoading) {
      if (userRole !== 'admin' && userRole !== 'teacher') {
        navigate("/dashboard");
        return;
      }
      const loadAdminData = async () => {
        await Promise.all([fetchTags(), fetchCategories(), fetchProfiles()]);
        setLoadingData(false);
      };
      loadAdminData();
    }
  }, [contextLoading, userRole, navigate, fetchTags, fetchCategories, fetchProfiles]);

  // Fechar os dropdowns se clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.custom-dropdown-container')) {
        setIsStudentDropdownOpen(false);
        setIsTagDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeleteTag = async (id: string) => {
    if (userRole !== 'admin') return alert("Apenas administradores podem remover tags.");
    if (!window.confirm("Deseja realmente remover este Setor (Tag)?")) return;
    await supabase.from("tags").delete().eq("id", id);
    fetchTags();
  };

  const handleDeleteCategory = async (id: number) => {
    if (userRole !== 'admin') return alert("Apenas administradores podem remover categorias.");
    if (!window.confirm("Deseja realmente remover esta Trilha? Isso não apagará as aulas vinculadas automaticamente, cuidado com os vínculos perdidos!")) return;
    await supabase.from("categories").delete().eq("id", id);
    fetchCategories();
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;
    await supabase.from("tags").upsert([{ name: tagName.toUpperCase().trim() }], { onConflict: 'name' });
    setTagName("");
    fetchTags();
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    const slug = generateSlug(categoryName);
    await supabase.from("categories").insert([{ name: categoryName.trim(), slug }]);
    setCategoryName("");
    fetchCategories();
  };

  const handleAssignTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedTagId) {
      return alert("Por favor, selecione um Colaborador e um Setor antes de confirmar.");
    }

    try {
      const { error } = await supabase.rpc('vincular_tag_aluno', {
        aluno_id: selectedStudentId,
        tag_uuid: selectedTagId
      });

      if (error) {
        console.error(error);
        alert("Erro ao vincular: " + error.message);
      } else {
        alert("Vínculo realizado com sucesso! ✨");
        setSelectedStudentId("");
        setSelectedTagId("");
      }
    } catch (err) {
      console.error("Erro inesperado:", err);
      alert("Ocorreu um erro inesperado.");
    }
  };

  // Filtros de perfis e tags para os campos de busca
  const filteredProfiles = profiles.filter(profile => 
    (profile.full_name || "Sem nome cadastrado").toLowerCase().includes(studentSearch.toLowerCase())
  );
  const selectedStudentName = profiles.find(p => p.id === selectedStudentId)?.full_name || "Selecione o Colaborador...";

  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(tagSearch.toLowerCase())
  );
  const selectedTagName = tags.find(t => t.id === selectedTagId)?.name || "Selecione o Setor...";

  if (contextLoading || loadingData) return (
    <div className="dashboard-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <Settings size={44} color="#8b5cf6" style={{ animation: 'spin 3s linear infinite', margin: '0 auto 15px' }} />
          <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800, fontFamily: 'Inter, sans-serif' }}>Carregando Estrutura...</h3>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
       </div>
    </div>
  );

  return (
    <div className="dashboard-wrapper">
      <style>{`
        :root { 
            --primary: #8b5cf6; --primary-hover: #7c3aed;
            --bg-dark: #020617; 
            --card-glass: rgba(15, 23, 42, 0.4); 
            --border: rgba(255, 255, 255, 0.06);
            --text-muted: #94a3b8;
        }
        
        * { box-sizing: border-box; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes dropdownFade {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dashboard-wrapper { 
            display: flex; width: 100%; min-height: 100vh; 
            background: var(--bg-dark); font-family: 'Inter', system-ui, sans-serif;
            overflow-x: hidden; color: #f8fafc;
        }

        .dashboard-content { 
          flex: 1; margin-left: 260px; padding: 50px 60px; transition: 0.3s;
          animation: fadeUp 0.5s ease-out forwards;
        }

        /* Cabeçalho */
        .dashboard-header { margin-bottom: 40px; }
        .dashboard-header h1 { 
          color: #fff; font-size: 2.6rem; font-weight: 900; margin: 0 0 8px 0; letter-spacing: -1px; 
          background: linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .dashboard-header p { color: var(--text-muted); font-size: 1.05rem; margin: 0; font-weight: 500; }

        /* Banner de Navegação Premium */
        .cta-banner { 
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.9) 100%); 
          padding: 40px 45px; border-radius: 28px; border: 1px solid rgba(139, 92, 246, 0.2); 
          display: flex; align-items: center; justify-content: space-between; gap: 30px;
          margin-bottom: 50px; 
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
          position: relative; overflow: hidden; backdrop-filter: blur(20px);
        }
        .cta-banner::before {
          content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
          background: radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 50%);
          pointer-events: none;
        }
        .cta-text h2 { color: #fff; font-size: 1.7rem; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.5px; }
        .cta-text p { color: var(--text-muted); font-size: 1.05rem; margin: 0; line-height: 1.5; }
        
        .btn-cta { 
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%); 
          color: #fff; padding: 16px 36px; border-radius: 18px; border: none; font-weight: 800; 
          cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
          display: inline-flex; align-items: center; gap: 10px;
          white-space: nowrap; font-size: 1.05rem; 
          box-shadow: 0 10px 25px rgba(139, 92, 246, 0.3), inset 0 1px 0 rgba(255,255,255,0.2);
          z-index: 2;
        }
        .btn-cta:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(139, 92, 246, 0.5), inset 0 1px 0 rgba(255,255,255,0.3); }
        .btn-cta:active { transform: translateY(0); }

        /* Grid de Cards */
        .admin-grid { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 30px; 
        }
        
        .glass-card { 
          background: var(--card-glass); border-radius: 28px; padding: 40px; 
          border: 1px solid var(--border); 
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
          backdrop-filter: blur(20px); display: flex; flex-direction: column;
          position: relative; overflow: visible; 
        }
        .card-header { display: flex; align-items: center; gap: 14px; margin-bottom: 30px; position: relative; z-index: 2; }
        .card-header h2 { color: #fff; font-size: 1.5rem; font-weight: 800; margin: 0; letter-spacing: -0.5px; }

        /* Inputs e Forms */
        .input-group { position: relative; margin-bottom: 24px; width: 100%; z-index: 2; }
        .input-icon { position: absolute; left: 22px; top: 50%; transform: translateY(-50%); color: #64748b; display: flex; transition: 0.3s; z-index: 3; pointer-events: none;}
        
        .form-input { 
          width: 100%; background-color: rgba(0,0,0,0.2); color: white; border: 1px solid rgba(255,255,255,0.05); 
          border-radius: 18px; padding: 20px 20px 20px 60px; outline: none; transition: all 0.3s ease;
          font-family: 'Inter', sans-serif; font-size: 1.05rem; appearance: none;
        }
        .form-input::placeholder { color: #475569; }
        
        .form-input:focus { 
          border-color: var(--primary); background: rgba(139, 92, 246, 0.03); 
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.15); 
        }
        .form-input:focus + .input-icon { color: var(--primary); }

        /* ESTILOS DO DROPDOWN CUSTOMIZADO (COMBOBOX) */
        .custom-dropdown-container { position: relative; width: 100%; margin-bottom: 24px; z-index: 50; }
        .dropdown-trigger {
          width: 100%; background-color: rgba(0,0,0,0.2); color: white; border: 1px solid rgba(255,255,255,0.05); 
          border-radius: 18px; padding: 20px 20px 20px 60px; transition: all 0.3s ease;
          font-family: 'Inter', sans-serif; font-size: 1.05rem; display: flex; align-items: center; justify-content: space-between;
          cursor: pointer; text-align: left;
        }
        .dropdown-trigger:hover, .dropdown-trigger.open {
          border-color: var(--primary); background: rgba(139, 92, 246, 0.03);
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.15);
        }
        .dropdown-trigger .placeholder { color: #94a3b8; }
        
        .dropdown-menu {
          position: absolute; top: calc(100% + 8px); left: 0; width: 100%;
          background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px;
          box-shadow: 0 15px 40px rgba(0,0,0,0.6); overflow: hidden;
          animation: dropdownFade 0.2s ease-out; z-index: 100;
        }
        .dropdown-search-box {
          padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05);
          position: relative; background: #0f172a;
        }
        .dropdown-search-icon {
          position: absolute; left: 24px; top: 50%; transform: translateY(-50%); color: #64748b;
        }
        .dropdown-search-input {
          width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 12px 12px 12px 40px; color: #fff; outline: none; font-size: 0.95rem;
        }
        .dropdown-search-input:focus { border-color: var(--primary); }
        
        .dropdown-list { max-height: 250px; overflow-y: auto; padding: 8px; }
        .dropdown-list::-webkit-scrollbar { width: 6px; }
        .dropdown-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        
        .dropdown-item {
          padding: 12px 16px; border-radius: 10px; cursor: pointer; color: #cbd5e1;
          transition: 0.2s; display: flex; align-items: center; justify-content: space-between;
          font-size: 0.95rem;
        }
        .dropdown-item:hover { background: rgba(139, 92, 246, 0.1); color: #fff; }
        .dropdown-item.selected { background: var(--primary); color: #fff; font-weight: 600; }

        /* Botoes e Pilulas */
        .btn-submit { 
          width: 100%; padding: 20px; border-radius: 16px; border: none; 
          background: rgba(255,255,255,0.03); color: #fff; font-weight: 800; cursor: pointer; transition: 0.3s;
          display: flex; align-items: center; justify-content: center; gap: 10px; border: 1px solid var(--border);
          font-size: 1.05rem; z-index: 2; position: relative;
        }
        .btn-submit:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); transform: translateY(-2px); }
        .btn-submit:active { transform: translateY(0); }

        .pill-container { margin-top: 35px; display: flex; flex-wrap: wrap; gap: 12px; position: relative; z-index: 2; }
        
        .data-pill { 
          background: rgba(2, 6, 23, 0.6); border: 1px solid var(--border); 
          padding: 10px 16px; border-radius: 14px; font-size: 0.9rem; color: #e2e8f0; 
          font-weight: 600; display: inline-flex; align-items: center; gap: 10px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative; overflow: hidden;
        }
        .data-pill:hover { border-color: rgba(255,255,255,0.15); background: rgba(30, 41, 59, 0.9); padding-right: 42px; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        
        .data-pill.category:hover { border-color: rgba(52, 211, 153, 0.4); }
        .data-pill.tag:hover { border-color: rgba(139, 92, 246, 0.4); }
        
        .btn-delete-pill { 
          position: absolute; right: -40px; top: 0; bottom: 0; width: 40px;
          background: rgba(239, 68, 68, 0.15); border: none; color: #f87171; 
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: 0.3s; opacity: 0;
        }
        .btn-delete-pill:hover { background: #ef4444; color: #fff; }
        .data-pill:hover .btn-delete-pill { right: 0; opacity: 1; }

        @media (max-width: 1024px) {
          .dashboard-content { margin-left: 0; padding: 40px 20px; }
          .cta-banner { flex-direction: column; text-align: center; padding: 30px 20px; }
          .cta-banner .btn-cta { width: 100%; justify-content: center; }
          .glass-card { padding: 30px 20px; }
        }
      `}</style>

      <Sidebar />

      <main className="dashboard-content">
        <header className="dashboard-header">
          <h1>Painel do Admin</h1>
          <p>Organize categorias, setores e gerencie os acessos do seu time com precisão.</p>
        </header>

        {/* CTA BANNER: Chamada para a Gestão de Aulas */}
        <div className="cta-banner">
          <div className="cta-text">
            <h2>Gestão de Trilhas & Aulas</h2>
            <p>Monte o conteúdo da plataforma, edite vídeos, inteligência artificial e gamificação em um só lugar.</p>
          </div>
          <button onClick={() => navigate("/admin/gestao-conteudo")} className="btn-cta">
            Acessar Gerenciador <ArrowRight size={20} />
          </button>
        </div>

        <div className="admin-grid">
          
          {/* CARD 1: TRILHAS (CATEGORIAS) */}
          <div className="glass-card">
            <div className="card-header">
              <Layers size={30} color="#34d399" />
              <h2>Categorias</h2>
            </div>
            
            <form onSubmit={handleCreateCategory}>
              <div className="input-group">
                <input 
                  type="text" className="form-input" placeholder="Nova Categoria (Ex: Vendas)" 
                  value={categoryName} onChange={(e) => setCategoryName(e.target.value)} required 
                />
                <div className="input-icon"><FolderTree size={22} /></div>
              </div>
              <button className="btn-submit" type="submit"><Plus size={20} /> Adicionar Categoria</button>
            </form>

            <div className="pill-container">
              {categories.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Nenhuma categoria criada.</span>}
              {categories.map(cat => (
                <div key={cat.id} className="data-pill category">
                  <span>{cat.name}</span>
                  {userRole === 'admin' && (
                    <button className="btn-delete-pill" onClick={() => handleDeleteCategory(cat.id)} title="Excluir Categoria">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CARD 2: TAGS (SETORES) */}
          <div className="glass-card">
            <div className="card-header">
              <Tags size={30} color="var(--primary)" />
              <h2>Setores (Tags)</h2>
            </div>
            
            <form onSubmit={handleCreateTag}>
              <div className="input-group">
                <input 
                  type="text" className="form-input" placeholder="Novo Setor (Ex: COMERCIAL)" 
                  value={tagName} onChange={(e) => setTagName(e.target.value)} required 
                />
                <div className="input-icon"><TagIcon size={22} /></div>
              </div>
              <button className="btn-submit" type="submit"><Plus size={20} /> Adicionar Setor</button>
            </form>

            <div className="pill-container">
              {tags.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Nenhuma tag criada.</span>}
              {tags.map(tag => (
                <div key={tag.id} className="data-pill tag">
                  <span>{tag.name}</span>
                  {userRole === 'admin' && (
                    <button className="btn-delete-pill" onClick={() => handleDeleteTag(tag.id)} title="Excluir Setor">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CARD 3: VÍNCULOS (ATRIBUIÇÕES) */}
          <div className="glass-card" style={{ border: '1px solid rgba(139, 92, 246, 0.25)' }}>
            <div style={{ position: 'absolute', top: '-10%', right: '-10%', padding: '20px', opacity: 0.05, pointerEvents: 'none' }}>
              <Sparkles size={180} />
            </div>
            
            <div className="card-header">
              <LinkIcon size={30} color="#60a5fa" />
              <h2>Atribuir Acessos</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '30px', position: 'relative', zIndex: 2, lineHeight: '1.5' }}>
              Vincule um Colaborador a um Setor específico para liberar permissões exclusivas ou segmentar análises no dashboard.
            </p>

            <form onSubmit={handleAssignTag} style={{ position: 'relative', zIndex: 2 }}>
              
              {/* SELECT CUSTOMIZADO (COLABORADOR COM BUSCA) */}
              <div className="custom-dropdown-container">
                <button 
                  type="button"
                  className={`dropdown-trigger ${isStudentDropdownOpen ? 'open' : ''}`}
                  onClick={() => {
                    setIsStudentDropdownOpen(!isStudentDropdownOpen);
                    setIsTagDropdownOpen(false); // Fecha o outro se estiver aberto
                  }}
                >
                  <div className="input-icon" style={{ left: '20px' }}><User size={22} /></div>
                  <span className={selectedStudentId ? "" : "placeholder"}>{selectedStudentName}</span>
                  <ChevronDown size={20} color="#94a3b8" style={{ transition: '0.3s', transform: isStudentDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                </button>

                {isStudentDropdownOpen && (
                  <div className="dropdown-menu">
                    <div className="dropdown-search-box">
                      <Search size={18} className="dropdown-search-icon" />
                      <input 
                        autoFocus
                        type="text" 
                        className="dropdown-search-input" 
                        placeholder="Buscar colaborador..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                      />
                    </div>
                    <div className="dropdown-list">
                      {filteredProfiles.length === 0 ? (
                        <div style={{ padding: '15px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>Nenhum colaborador encontrado.</div>
                      ) : (
                        filteredProfiles.map(profile => (
                          <div 
                            key={profile.id} 
                            className={`dropdown-item ${selectedStudentId === profile.id ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedStudentId(profile.id);
                              setIsStudentDropdownOpen(false);
                              setStudentSearch("");
                            }}
                          >
                            {profile.full_name || "Sem nome cadastrado"}
                            {selectedStudentId === profile.id && <Check size={18} />}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SELECT CUSTOMIZADO (SETOR/TAG COM BUSCA) */}
              <div className="custom-dropdown-container" style={{ zIndex: 49 }}>
                <button 
                  type="button"
                  className={`dropdown-trigger ${isTagDropdownOpen ? 'open' : ''}`}
                  onClick={() => {
                    setIsTagDropdownOpen(!isTagDropdownOpen);
                    setIsStudentDropdownOpen(false); // Fecha o outro se estiver aberto
                  }}
                >
                  <div className="input-icon" style={{ left: '20px' }}><TagIcon size={22} /></div>
                  <span className={selectedTagId ? "" : "placeholder"}>{selectedTagName}</span>
                  <ChevronDown size={20} color="#94a3b8" style={{ transition: '0.3s', transform: isTagDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                </button>

                {isTagDropdownOpen && (
                  <div className="dropdown-menu">
                    <div className="dropdown-search-box">
                      <Search size={18} className="dropdown-search-icon" />
                      <input 
                        autoFocus
                        type="text" 
                        className="dropdown-search-input" 
                        placeholder="Buscar setor..."
                        value={tagSearch}
                        onChange={(e) => setTagSearch(e.target.value)}
                      />
                    </div>
                    <div className="dropdown-list">
                      {filteredTags.length === 0 ? (
                        <div style={{ padding: '15px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>Nenhum setor encontrado.</div>
                      ) : (
                        filteredTags.map(tag => (
                          <div 
                            key={tag.id} 
                            className={`dropdown-item ${selectedTagId === tag.id ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedTagId(tag.id);
                              setIsTagDropdownOpen(false);
                              setTagSearch("");
                            }}
                          >
                            {tag.name}
                            {selectedTagId === tag.id && <Check size={18} />}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button className="btn-submit" type="submit" style={{ 
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                borderColor: 'transparent', marginTop: '15px', color: '#fff',
                boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)'
              }}>
                <LinkIcon size={20} /> Confirmar Vínculo
              </button>
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}

export default Admin;