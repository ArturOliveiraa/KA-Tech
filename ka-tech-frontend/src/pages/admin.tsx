import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";

interface Tag {
  id: number;
  name: string;
}

function Admin() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados para controle de upload da thumbnail do curso
  const [uploadingThumb, setUploadingThumb] = useState(false);

  const [courseTitle, setCourseTitle] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [courseThumb, setCourseThumb] = useState(""); 
  const [selectedTag, setSelectedTag] = useState<string>("");

  const [tagName, setTagName] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate("/");

      // Buscamos apenas o 'role' agora, já que nome e foto estão na Sidebar
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== 'admin' && profile?.role !== 'professor') {
        return navigate("/dashboard");
      }

      setUserRole(profile.role);
      fetchTags();
      setLoading(false);
    }
    checkAccess();
  }, [navigate]);

  async function fetchTags() {
    const { data } = await supabase.from("tags").select("*").order("name");
    if (data) setTags(data);
  }

  // --- LOGICA DE UPLOAD: THUMBNAIL DO CURSO ---
  async function handleUploadThumbnail(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploadingThumb(true);
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `thumb-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from('course-thumbs').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('course-thumbs').getPublicUrl(filePath);
      setCourseThumb(publicUrl);
      alert("Capa carregada com sucesso!");
    } catch (error: any) {
      alert("Erro no upload da capa: " + error.message);
    } finally {
      setUploadingThumb(false);
    }
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("courses").insert([
      { title: courseTitle, description: courseDesc, thumbnailUrl: courseThumb, tag_id: selectedTag || null }
    ]);
    if (error) alert("Erro: " + error.message);
    else {
      alert("Curso publicado com sucesso!");
      setCourseTitle(""); setCourseDesc(""); setCourseThumb(""); setSelectedTag("");
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("tags").upsert([{ name: tagName.toUpperCase().trim() }], { onConflict: 'name' });
    if (error) alert("Erro ao processar tag: " + error.message);
    else {
      alert("Tag processada com sucesso!");
      setTagName("");
      fetchTags();
    }
  };

  if (loading) return <div className="loading-box">Carregando painel...</div>;

  return (
    <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#0b0e14' }}>
      <style>{`
        .dashboard-content {
          flex: 1; 
          padding: 40px;
          margin-left: 260px; 
          width: 100%;
        }
        .admin-content-container {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          justify-content: flex-start; 
          gap: 30px;
          width: 100%;
          margin-top: 20px;
        }
        .admin-card-local {
          background: #121418;
          border-radius: 16px;
          padding: 24px;
          flex: 1 1 450px; 
          max-width: 600px; 
          border: 1px solid #2d323e;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          margin-bottom: 30px;
        }
        .local-field { margin-bottom: 16px; display: flex; flex-direction: column; gap: 6px; }
        .local-field label { color: #e2e8f0; font-size: 0.8rem; font-weight: 500; }
        .local-input-wrapper { position: relative; display: flex; align-items: center; width: 100%; }
        .local-icon { position: absolute; left: 15px; font-size: 1.1rem; }
        .local-input-wrapper input, .local-input-wrapper textarea, .local-input-wrapper select {
          width: 100%; background-color: #1a1d23 !important; color: white !important;
          border: 1px solid #2d323e; border-radius: 8px; padding: 10px 12px 10px 45px; font-size: 14px; outline: none;
        }
        .local-input-wrapper textarea { min-height: 120px; resize: none; }
        .local-primary-button {
          width: 100%; padding: 12px; margin-top: 10px; border-radius: 8px; border: none;
          background: linear-gradient(90deg, #00c9ff 0%, #92fe9d 100%); color: #000; font-weight: bold; cursor: pointer;
        }
        @media (max-width: 768px) {
          .dashboard-content { margin-left: 0; padding: 20px; padding-bottom: 100px; }
          .dashboard-header { flex-direction: column; align-items: flex-start; gap: 15px; }
          .admin-card-local { flex: 1 1 100%; max-width: 100%; }
        }
      `}</style>

      <Sidebar userRole={userRole} />

      <main className="dashboard-content">
        <header className="dashboard-header">
          <div className="header-info">
            <h1>Painel de Gestão</h1>
            <p>Gerencie o conteúdo da plataforma <strong>KA Tech</strong>.</p>
          </div>
        </header>

        <div className="admin-content-container">
          <div className="admin-card-local">
            <header>
              <h2 style={{ color: '#fff', fontSize: '1.4rem' }}>Novo Curso</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Cadastre um novo conteúdo na grade.</p>
            </header>

            <form onSubmit={handleCreateCourse}>
              <div className="local-field">
                <label>Título do Curso</label>
                <div className="local-input-wrapper">
                  <span className="local-icon">📝</span>
                  <input type="text" placeholder="Nome do curso" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} required />
                </div>
              </div>

              <div className="local-field">
                <label>Tag / Categoria</label>
                <div className="local-input-wrapper">
                  <span className="local-icon">🏷️</span>
                  <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)}>
                    <option value="">Selecione uma tag...</option>
                    {tags.map(tag => (
                      <option key={tag.id} value={tag.id}>{tag.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="local-field">
                <label>Descrição</label>
                <div className="local-input-wrapper">
                  <span className="local-icon" style={{ top: '12px' }}>📄</span>
                  <textarea placeholder="O que o aluno aprenderá?" value={courseDesc} onChange={(e) => setCourseDesc(e.target.value)} required />
                </div>
              </div>

              <div className="local-field">
                <label>Capa do Curso (.png / .jpg)</label>
                <div className="local-input-wrapper">
                  <span className="local-icon">🖼️</span>
                  <input type="file" accept="image/*" onChange={handleUploadThumbnail} />
                </div>
                {uploadingThumb && <p style={{fontSize: '0.7rem', color: '#00e5ff'}}>Subindo imagem...</p>}
                {courseThumb && (
                  <img src={courseThumb} alt="Preview" style={{ width: '120px', marginTop: '10px', borderRadius: '4px', border: '1px solid #2d323e' }} />
                )}
              </div>

              <button className="local-primary-button" type="submit" disabled={uploadingThumb}>
                {uploadingThumb ? "Aguarde upload..." : "Publicar Curso"}
              </button>
            </form>
          </div>

          {userRole === 'admin' && (
            <div className="admin-card-local" style={{ height: 'fit-content' }}>
              <header>
                <h2 style={{ color: '#fff', fontSize: '1.4rem' }}>Gerenciar Tags</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Categorias para organização.</p>
              </header>

              <form onSubmit={handleCreateTag}>
                <div className="local-field">
                  <label>Nome da Tag</label>
                  <div className="local-input-wrapper">
                    <span className="local-icon">🏷️</span>
                    <input type="text" placeholder="Ex: COMERCIAL, PEV, BLIP" value={tagName} onChange={(e) => setTagName(e.target.value)} required />
                  </div>
                </div>
                <button className="local-primary-button" type="submit">Criar Tag</button>
              </form>

              <div className="tags-list-container" style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {tags.map(tag => (
                  <span key={tag.id} className="tag-badge" style={{ background: '#1a1d23', border: '1px solid #2d323e', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', color: '#00e5ff' }}>{tag.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Admin;