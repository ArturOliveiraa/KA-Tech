import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import { useUser } from "../components/UserContext";

interface Tag { id: string; name: string; }
interface Category { id: number; name: string; slug: string; }
// CORREÇÃO 1: Ajustada interface pois 'email' não vem da tabela profiles
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

  const navigate = useNavigate();

  const fetchTags = useCallback(async () => {
    const { data } = await supabase.from("tags").select("*").order("name");
    if (data) setTags(data);
  }, []);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    if (data) setCategories(data);
  }, []);

  // CORREÇÃO 2: Removido 'email' do select para evitar o erro 400
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

  const handleDeleteTag = async (id: string) => {
    if (userRole !== 'admin') return alert("Apenas administradores podem remover tags.");
    if (!window.confirm("Deseja remover esta tag?")) return;
    await supabase.from("tags").delete().eq("id", id);
    fetchTags();
  };

  const handleDeleteCategory = async (id: number) => {
    if (userRole !== 'admin') return alert("Apenas administradores podem remover categorias.");
    if (!window.confirm("Deseja remover esta trilha?")) return;
    await supabase.from("categories").delete().eq("id", id);
    fetchCategories();
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from("tags").upsert([{ name: tagName.toUpperCase().trim() }], { onConflict: 'name' });
    setTagName("");
    fetchTags();
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = generateSlug(categoryName);
    await supabase.from("categories").insert([{ name: categoryName.trim(), slug }]);
    setCategoryName("");
    fetchCategories();
  };

  const handleAssignTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedTagId) {
      return alert("Selecione um aluno e uma tag.");
    }

    try {
      // Chamada à função RPC que criamos no banco
      const { error } = await supabase.rpc('vincular_tag_aluno', {
        aluno_id: selectedStudentId,
        tag_uuid: selectedTagId
      });

      if (error) {
        console.error(error);
        // Tratamento de erro amigável
        alert("Erro ao vincular: " + error.message);
      } else {
        alert("Tag vinculada com sucesso!");
        // Limpa apenas o aluno para facilitar inserção em massa na mesma tag, se quiser
        // Ou limpe ambos:
        setSelectedStudentId("");
        setSelectedTagId("");
      }
    } catch (err) {
      console.error("Erro inesperado:", err);
      alert("Ocorreu um erro inesperado.");
    }
  };

  return (
    <div className="dashboard-wrapper">
      <style>{`
        :root { 
            --primary: #8b5cf6; 
            --bg-dark: #020617; 
            --card-glass: rgba(15, 23, 42, 0.7); 
        }
        
        * { box-sizing: border-box; }

        .dashboard-wrapper { 
            display: flex; 
            width: 100%; 
            min-height: 100vh; 
            background: var(--bg-dark); 
            font-family: 'Sora', sans-serif;
            overflow-x: hidden;
        }

        .dashboard-content { 
          flex: 1; 
          margin-left: 260px; 
          padding: 40px; 
          transition: 0.3s;
          width: 100%;
          display: flex;
          flex-direction: column;
        }

        .dashboard-header {
          display: flex;
          flex-direction: column;
          margin-bottom: 40px;
        }

        .dashboard-header h1 { color: #fff; font-size: 2.5rem; font-weight: 800; margin: 0 0 10px 0; letter-spacing: -1px; }
        .dashboard-header p { color: #9ca3af; margin: 0; }

        .nav-card { 
          background: linear-gradient(135deg, rgba(30, 30, 46, 0.8) 0%, rgba(17, 17, 22, 0.8) 100%); 
          padding: 40px; border-radius: 24px; text-align: center; border: 1px solid var(--primary); 
          width: 100%; margin-bottom: 40px; backdrop-filter: blur(10px);
        }

        .admin-content-container { 
            display: flex; 
            flex-wrap: wrap; 
            gap: 25px; 
            width: 100%;
        }
        
        .admin-card-local { 
          background: var(--card-glass); 
          border-radius: 24px; 
          padding: 30px; 
          flex: 1 1 400px; 
          max-width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.05); 
          box-shadow: 0 15px 35px rgba(0,0,0,0.3);
          backdrop-filter: blur(12px);
        }

        .local-input-wrapper { position: relative; display: flex; align-items: center; margin-bottom: 20px; width: 100%; }
        .local-input-wrapper span { position: absolute; left: 18px; font-size: 1.2rem; z-index: 5; pointer-events: none; }
        
        .local-input-wrapper input,
        .local-input-wrapper select { 
          width: 100%; background-color: #020617; color: white; border: 1px solid rgba(139, 92, 246, 0.2); 
          border-radius: 14px; padding: 18px 18px 18px 55px; outline: none; transition: 0.3s;
          font-family: 'Sora'; font-size: 1rem; appearance: none;
        }
        
        .select-arrow {
            background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%238b5cf6%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
            background-repeat: no-repeat;
            background-position: right 15px center;
            background-size: 12px;
        }

        .local-input-wrapper input:focus,
        .local-input-wrapper select:focus { border-color: var(--primary); box-shadow: 0 0 15px rgba(139, 92, 246, 0.2); }

        .local-primary-button { 
          width: 100%; padding: 18px; border-radius: 16px; border: none; 
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); 
          color: #fff; font-weight: 800; cursor: pointer; transition: 0.3s;
          text-transform: uppercase; letter-spacing: 1px; font-size: 0.9rem;
        }
        .local-primary-button:hover { transform: translateY(-2px); filter: brightness(1.1); box-shadow: 0 8px 25px rgba(139, 92, 246, 0.4); }

        .tag-badge { 
          background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); 
          padding: 12px 18px; border-radius: 12px; font-size: 0.85rem; color: #a78bfa; 
          font-weight: 700; display: flex; align-items: center; gap: 10px;
        }
        .btn-delete-pill { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.4rem; line-height: 1; padding: 0; }

        .loading-container { display: flex; justify-content: center; align-items: center; height: 60vh; width: 100%; color: var(--primary); font-weight: 800; font-size: 1.2rem; }

        @media (max-width: 1024px) {
          .dashboard-content { 
              margin-left: 0; 
              padding: 40px 20px 150px 20px; 
          }
          .dashboard-header { 
            text-align: center;
            align-items: center;
            margin-top: 20px;
          }
          .dashboard-header h1 { 
            font-size: 2.2rem; 
            width: 100%;
          }
          .dashboard-header p {
            width: 100%;
          }
          .admin-card-local { flex: 1 1 100%; }
        }
      `}</style>

      <Sidebar />

      <main className="dashboard-content">
        {(contextLoading || loadingData) ? (
          <div className="loading-container">Sincronizando portal administrativo...</div>
        ) : (
          <>
            <header className="dashboard-header">
              <h1>Gestão de Estrutura</h1>
              <p>Gerencie as Trilhas, Tags e <strong style={{ color: '#8b5cf6' }}>Atribuições</strong> da plataforma KA Tech.</p>
            </header>

            <div className="nav-card">
              <h2 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 800, marginBottom: '15px' }}>Lançar Cursos e Aulas</h2>
              <p style={{ color: '#9ca3af', marginBottom: '30px', fontSize: '1.1rem' }}>Os dados abaixo alimentam a estrutura de cadastro de novos conteúdos.</p>
              <button
                onClick={() => navigate("/admin/gestao-conteudo")}
                className="local-primary-button"
                style={{ maxWidth: '400px', margin: '0 auto' }}
              >
                Ir para Cadastro de Cursos →
              </button>
            </div>

            <div className="admin-content-container">
              {/* CARD 1: TRILHAS */}
              <div className="admin-card-local">
                <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  📁 Trilhas (Categorias)
                </h2>
                <form onSubmit={handleCreateCategory}>
                  <div className="local-input-wrapper">
                    <span>📝</span>
                    <input type="text" placeholder="Nome da Trilha" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} required />
                  </div>
                  <button className="local-primary-button" type="submit">Criar Trilha</button>
                </form>
                <div style={{ marginTop: '30px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {categories.map(cat => (
                    <span key={cat.id} className="tag-badge" style={{ borderColor: 'rgba(34, 197, 94, 0.4)', color: '#4ade80' }}>
                      {cat.name}
                      {userRole === 'admin' && (
                        <button className="btn-delete-pill" onClick={() => handleDeleteCategory(cat.id)} title="Remover Trilha">&times;</button>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* CARD 2: CRIAR TAGS */}
              <div className="admin-card-local">
                <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  🏷️ Tags (Setor)
                </h2>
                <form onSubmit={handleCreateTag}>
                  <div className="local-input-wrapper">
                    <span>🖋️</span>
                    <input type="text" placeholder="Nome da Tag" value={tagName} onChange={(e) => setTagName(e.target.value)} required />
                  </div>
                  <button className="local-primary-button" type="submit">Criar Tag</button>
                </form>
                <div style={{ marginTop: '30px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {tags.map(tag => (
                    <span key={tag.id} className="tag-badge">
                      {tag.name}
                      {userRole === 'admin' && (
                        <button className="btn-delete-pill" onClick={() => handleDeleteTag(tag.id)} title="Remover Tag">&times;</button>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* CARD 3: ATRIBUIR TAGS */}
              <div className="admin-card-local" style={{ borderColor: 'rgba(139, 92, 246, 0.3)' }}>
                <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  🔗 Atribuir Tags a Alunos
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px' }}>
                  Vincule alunos a setores específicos (ex: Franquia) para segmentar relatórios.
                </p>
                <form onSubmit={handleAssignTag}>
                  {/* Select Aluno */}
                  <div className="local-input-wrapper">
                    <span>👤</span>
                    <select
                      className="select-arrow"
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      required
                    >
                      <option value="" disabled>Selecione o Aluno...</option>
                      {profiles.map(profile => (
                        <option key={profile.id} value={profile.id}>
                          {profile.full_name || "Aluno sem nome"}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Tag */}
                  <div className="local-input-wrapper">
                    <span>🏷️</span>
                    <select
                      className="select-arrow"
                      value={selectedTagId}
                      onChange={(e) => setSelectedTagId(e.target.value)}
                      required
                    >
                      <option value="" disabled>Selecione a Tag...</option>
                      {tags.map(tag => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button className="local-primary-button" type="submit">Vincular Tag</button>
                </form>
              </div>

            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default Admin;