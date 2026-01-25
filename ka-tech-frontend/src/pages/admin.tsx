import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";

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
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Tags
  const [tagName, setTagName] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);

  // Categorias (Trilhas)
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryName, setCategoryName] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate("/");

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== 'admin' && profile?.role !== 'teacher') {
        return navigate("/dashboard");
      }

      setUserRole(profile.role);
      fetchTags();
      fetchCategories();
      setLoading(false);
    }
    checkAccess();
  }, [navigate]);

  async function fetchTags() {
    const { data } = await supabase.from("tags").select("*").order("name");
    if (data) setTags(data);
  }

  async function fetchCategories() {
    const { data } = await supabase.from("categories").select("*").order("name");
    if (data) setCategories(data);
  }

  const handleDeleteTag = async (id: string) => {
    if (userRole !== 'admin') return alert("Apenas administradores podem remover tags.");
    if (!window.confirm("Deseja remover esta tag? Isso afetará os cursos vinculados.")) return;
    
    const { error } = await supabase.from("tags").delete().eq("id", id);
    if (error) alert("Erro: " + error.message);
    else fetchTags();
  };

  const handleDeleteCategory = async (id: number) => {
    if (userRole !== 'admin') return alert("Apenas administradores podem remover categorias.");
    if (!window.confirm("Deseja remover esta trilha? Cursos vinculados ficarão sem categoria.")) return;
    
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) alert("Erro: " + error.message);
    else fetchCategories();
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("tags").upsert([{ name: tagName.toUpperCase().trim() }], { onConflict: 'name' });
    if (error) alert(error.message);
    else { setTagName(""); fetchTags(); }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = generateSlug(categoryName);
    const { error } = await supabase.from("categories").insert([{ name: categoryName.trim(), slug }]);
    if (error) alert(error.message);
    else { setCategoryName(""); fetchCategories(); }
  };

  if (loading) return <div className="loading-box">Sincronizando portal...</div>;

  return (
    <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#020617', fontFamily: "'Sora', sans-serif" }}>
      <style>{`
        .dashboard-content { flex: 1; padding: 40px; margin-left: 260px; width: 100%; }
        .admin-content-container { display: flex; flex-wrap: wrap; gap: 30px; margin-top: 20px; }
        .admin-card-local { background: #09090b; border-radius: 16px; padding: 32px; flex: 1 1 450px; border: 1px solid rgba(139, 92, 246, 0.1); }
        .local-field { margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; }
        .local-input-wrapper { position: relative; display: flex; align-items: center; }
        .local-icon { position: absolute; left: 15px; font-size: 1.2rem; }
        .local-input-wrapper input { width: 100%; background-color: #020617; color: white; border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 12px; padding: 14px 14px 14px 48px; outline: none; }
        .local-primary-button { width: 100%; padding: 16px; border-radius: 999px; border: none; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #fff; font-weight: 700; cursor: pointer; transition: 0.3s; }
        .tag-badge { background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); padding: 8px 16px; border-radius: 999px; font-size: 0.8rem; color: #a78bfa; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .delete-btn-small { background: none; border: none; color: #ef4444; font-size: 1.1rem; cursor: pointer; padding: 0; line-height: 1; }
        .nav-card { background: linear-gradient(135deg, #1e1e2e 0%, #111116 100%); padding: 40px; border-radius: 20px; text-align: center; border: 1px solid #8b5cf6; width: 100%; margin-bottom: 30px; }
      `}</style>

      <Sidebar/>

      <main className="dashboard-content">
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
          
          {/* TRILHAS */}
          <div className="admin-card-local">
            <h2 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800, marginBottom: '20px' }}>Trilhas (Categorias)</h2>
            <form onSubmit={handleCreateCategory}>
              <div className="local-field">
                <div className="local-input-wrapper">
                  <span className="local-icon">📁</span>
                  <input type="text" placeholder="Nome da Trilha (Ex: Softshop)" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} required />
                </div>
              </div>
              <button className="local-primary-button">Criar Trilha</button>
            </form>
            <div style={{ marginTop: '25px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {categories.map(cat => (
                <span key={cat.id} className="tag-badge" style={{borderColor: '#22c55e', color: '#22c55e'}}>
                  {cat.name}
                  {userRole === 'admin' && (
                    <button className="delete-btn-small" onClick={() => handleDeleteCategory(cat.id)} title="Remover Trilha">&times;</button>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* TAGS */}
          <div className="admin-card-local">
            <h2 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800, marginBottom: '20px' }}>Tags (Habilidades)</h2>
            <form onSubmit={handleCreateTag}>
              <div className="local-field">
                <div className="local-input-wrapper">
                  <span className="local-icon">🏷️</span>
                  <input type="text" placeholder="Nome da Tag (Ex: PEV, COMERCIAL)" value={tagName} onChange={(e) => setTagName(e.target.value)} required />
                </div>
              </div>
              <button className="local-primary-button">Criar Tag</button>
            </form>
            <div style={{ marginTop: '25px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {tags.map(tag => (
                <span key={tag.id} className="tag-badge">
                  {tag.name}
                  {userRole === 'admin' && (
                    <button className="delete-btn-small" onClick={() => handleDeleteTag(tag.id)} title="Remover Tag">&times;</button>
                  )}
                </span>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default Admin;