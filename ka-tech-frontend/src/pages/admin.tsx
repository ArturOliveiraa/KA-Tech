import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import { useUser } from "../components/UserContext"; 

interface Tag {
  id: string;
  name: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

const generateSlug = (text: string) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, "-")
    .trim();
};

function Admin() {
  const { userRole, loading: contextLoading } = useUser();
  const [loadingData, setLoadingData] = useState(true);
  
  const [tagName, setTagName] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryName, setCategoryName] = useState("");

  const navigate = useNavigate();

  // Envolvendo as buscas em useCallback para evitar alertas de dependência
  const fetchTags = useCallback(async () => {
    const { data } = await supabase.from("tags").select("*").order("name");
    if (data) setTags(data);
  }, []);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    if (data) setCategories(data);
  }, []);

  useEffect(() => {
    if (!contextLoading) {
      if (userRole !== 'admin' && userRole !== 'teacher') {
        navigate("/dashboard");
        return;
      }
      
      // CORREÇÃO AQUI: Transformado em arrow function (const)
      const loadAdminData = async () => {
        await Promise.all([fetchTags(), fetchCategories()]);
        setLoadingData(false);
      };

      loadAdminData();
    }
  }, [contextLoading, userRole, navigate, fetchTags, fetchCategories]);

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

  return (
    <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#020617', fontFamily: "'Sora', sans-serif" }}>
      <style>{`
        .dashboard-content { flex: 1; padding: 40px; margin-left: 260px; width: 100%; }
        .admin-content-container { display: flex; flex-wrap: wrap; gap: 30px; margin-top: 20px; }
        .admin-card-local { background: #09090b; border-radius: 16px; padding: 32px; flex: 1 1 450px; border: 1px solid rgba(139, 92, 246, 0.1); }
        .local-input-wrapper input { width: 100%; background-color: #020617; color: white; border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 12px; padding: 14px 14px 14px 48px; outline: none; }
        .local-primary-button { width: 100%; padding: 16px; border-radius: 999px; border: none; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #fff; font-weight: 700; cursor: pointer; transition: 0.3s; }
        .tag-badge { background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); padding: 8px 16px; border-radius: 999px; font-size: 0.8rem; color: #a78bfa; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .nav-card { background: linear-gradient(135deg, #1e1e2e 0%, #111116 100%); padding: 40px; border-radius: 20px; text-align: center; border: 1px solid #8b5cf6; width: 100%; margin-bottom: 30px; }
        .loading-container { display: flex; justify-content: center; align-items: center; height: 60vh; width: 100%; color: #8b5cf6; font-weight: 700; font-size: 1.2rem; }
      `}</style>

      <Sidebar />

      <main className="dashboard-content">
        {(contextLoading || loadingData) ? (
          <div className="loading-container">
            Sincronizando portal administrativo...
          </div>
        ) : (
          <>
            <header className="dashboard-header" style={{marginBottom: '40px'}}>
              <h1 style={{color: '#fff', fontSize: '2.5rem', fontWeight: 800}}>Gestão de Estrutura</h1>
              <p style={{ color: '#9ca3af' }}>Configure Trilhas e Tags da plataforma <strong style={{ color: '#8b5cf6' }}>KA Tech</strong>.</p>
            </header>

            <div className="nav-card">
                <h2 style={{color: '#fff', marginBottom: '15px'}}>Lançar Cursos e Aulas</h2>
                <p style={{color: '#9ca3af', marginBottom: '25px'}}>Os dados estruturados abaixo serão usados no cadastro de novos cursos.</p>
                <button 
                    onClick={() => navigate("/admin/gestao-conteudo")}
                    className="local-primary-button" 
                    style={{maxWidth: '300px'}}
                >
                    Ir para Cadastro de Cursos →
                </button>
            </div>

            <div className="admin-content-container">
              <div className="admin-card-local">
                <h2 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800, marginBottom: '20px' }}>Trilhas (Categorias)</h2>
                <form onSubmit={handleCreateCategory}>
                  <div style={{ marginBottom: '20px' }}>
                    <div className="local-input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{ position: 'absolute', left: '15px' }}>📁</span>
                      <input type="text" placeholder="Nome da Trilha" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} required />
                    </div>
                  </div>
                  <button className="local-primary-button">Criar Trilha</button>
                </form>
                <div style={{ marginTop: '25px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {categories.map(cat => (
                    <span key={cat.id} className="tag-badge" style={{borderColor: '#22c55e', color: '#22c55e'}}>
                      {cat.name}
                      {userRole === 'admin' && (
                        <button style={{background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem'}} onClick={() => handleDeleteCategory(cat.id)}>&times;</button>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              <div className="admin-card-local">
                <h2 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800, marginBottom: '20px' }}>Tags (Habilidades)</h2>
                <form onSubmit={handleCreateTag}>
                  <div style={{ marginBottom: '20px' }}>
                    <div className="local-input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{ position: 'absolute', left: '15px' }}>🏷️</span>
                      <input type="text" placeholder="Nome da Tag" value={tagName} onChange={(e) => setTagName(e.target.value)} required />
                    </div>
                  </div>
                  <button className="local-primary-button">Criar Tag</button>
                </form>
                <div style={{ marginTop: '25px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {tags.map(tag => (
                    <span key={tag.id} className="tag-badge">
                      {tag.name}
                      {userRole === 'admin' && (
                        <button style={{background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem'}} onClick={() => handleDeleteTag(tag.id)}>&times;</button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default Admin;