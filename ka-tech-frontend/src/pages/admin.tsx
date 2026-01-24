import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import ManageLessons from "../components/ManageLessons"; 

interface Tag {
  id: number;
  name: string;
}

interface Course {
  id: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  tag_id: string | null;
  createdAt: string;
}

function Admin() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [courseThumb, setCourseThumb] = useState(""); 
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [tagName, setTagName] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [manageLessonsCourse, setManageLessonsCourse] = useState<Course | null>(null);

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

      if (profile?.role !== 'admin' && profile?.role !== 'professor') {
        return navigate("/dashboard");
      }

      setUserRole(profile.role);
      fetchTags();
      fetchCourses();
      setLoading(false);
    }
    checkAccess();
  }, [navigate]);

  async function fetchTags() {
    const { data } = await supabase.from("tags").select("*").order("name");
    if (data) setTags(data);
  }

  async function fetchCourses() {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("createdAt", { ascending: false }); 

    if (error) {
      console.error("Erro ao buscar cursos:", error.message);
    } else {
      setCourses(data || []);
    }
  }

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

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const courseData = { 
      title: courseTitle, 
      description: courseDesc, 
      thumbnailUrl: courseThumb, 
      tag_id: selectedTag || null 
    };

    if (editingCourseId) {
      const { error } = await supabase.from("courses").update(courseData).eq("id", editingCourseId);
      if (error) alert("Erro ao atualizar: " + error.message);
      else {
        alert("Curso atualizado com sucesso!");
        setEditingCourseId(null);
      }
    } else {
      const { error } = await supabase.from("courses").insert([courseData]);
      if (error) alert("Erro ao publicar: " + error.message);
      else alert("Curso publicado com sucesso!");
    }

    setCourseTitle(""); setCourseDesc(""); setCourseThumb(""); setSelectedTag("");
    fetchCourses();
  };

  const handleEditInit = (course: Course) => {
    setEditingCourseId(course.id);
    setCourseTitle(course.title);
    setCourseDesc(course.description);
    setCourseThumb(course.thumbnailUrl);
    setSelectedTag(course.tag_id || "");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCourse = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja excluir este curso permanentemente?")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) alert("Erro ao excluir: " + error.message);
    else {
      alert("Curso excluído!");
      fetchCourses();
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

  const handleDeleteTag = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja remover esta tag? Cursos que usam esta tag ficarão sem categoria.")) return;
    const { error } = await supabase.from("tags").delete().eq("id", id);
    if (error) alert("Erro ao remover tag: " + error.message);
    else fetchTags();
  };

  if (loading) return <div className="loading-box" style={{ color: '#8b5cf6', fontFamily: 'Sora', fontSize: '1.2rem', fontWeight: 'bold' }}>Carregando painel...</div>;

  return (
    <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#020617', fontFamily: "'Sora', sans-serif" }}>
      <style>{`
        .dashboard-content { flex: 1; padding: 40px; margin-left: 260px; width: 100%; }
        .admin-content-container { display: flex; flex-direction: row; flex-wrap: wrap; justify-content: flex-start; gap: 30px; width: 100%; margin-top: 20px; }
        
        .admin-card-local { 
          background: #09090b; 
          border-radius: 16px; 
          padding: 32px; /* Aumentado para dar respiro */
          flex: 1 1 450px; 
          max-width: 600px; 
          border: 1px solid rgba(139, 92, 246, 0.1); 
          box-shadow: 0 10px 30px rgba(0,0,0,0.5); 
        }

        .dashboard-header { display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 30px; }
        .dashboard-header h1 { color: #fff; font-weight: 800; letter-spacing: -0.02em; font-size: 2.2rem; }
        
        .local-field { margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; }
        .local-field label { color: #e5e7eb; font-size: 0.95rem; font-weight: 600; } /* Label maior e mais clara */
        
        .local-input-wrapper { position: relative; display: flex; align-items: center; width: 100%; }
        .local-icon { position: absolute; left: 15px; font-size: 1.2rem; filter: grayscale(1) opacity(0.8); }
        
        .local-input-wrapper input, .local-input-wrapper textarea, .local-input-wrapper select {
          width: 100%; background-color: #020617 !important; color: white !important;
          border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 12px; padding: 14px 14px 14px 48px; 
          font-size: 1rem; /* Fonte aumentada para destaque */
          outline: none;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }

        /* Destaque nos Placeholders */
        .local-input-wrapper input::placeholder, 
        .local-input-wrapper textarea::placeholder {
          color: #9ca3af; 
          font-weight: 400;
        }

        .local-input-wrapper input:focus, .local-input-wrapper textarea:focus { 
          border-color: #8b5cf6; 
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
        }
        
        .local-input-wrapper textarea { min-height: 140px; resize: none; }
        
        .local-primary-button { 
          width: 100%; padding: 16px; margin-top: 10px; border-radius: 999px; border: none; 
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); 
          color: #fff; font-weight: 700; cursor: pointer; transition: all 0.3s ease; 
          font-size: 1rem;
          box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
        }
        .local-primary-button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5); filter: brightness(1.1); }
        
        .management-section { width: 100%; margin-top: 50px; }
        .management-section h2 { color: #fff; margin-bottom: 25px; font-size: 1.6rem; font-weight: 800; }

        .course-list-table { width: 100%; border-collapse: separate; border-spacing: 0; background: #09090b; border-radius: 16px; overflow: hidden; border: 1px solid rgba(139, 92, 246, 0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
        .course-list-table th { text-align: left; padding: 20px 24px; background: #111116; color: #d1d5db; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; border-bottom: 1px solid rgba(139, 92, 246, 0.1); }
        .course-list-table td { padding: 20px 24px; border-bottom: 1px solid rgba(139, 92, 246, 0.05); color: #fff; font-size: 1rem; vertical-align: middle; }
        
        .btn-action { padding: 10px 20px; border-radius: 999px; font-size: 0.85rem; font-weight: 700; }

        .tag-badge { background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); padding: 8px 16px; border-radius: 999px; font-size: 0.8rem; color: #a78bfa; font-weight: 700; }

        @media (max-width: 768px) {
          .dashboard-content { margin-left: 0; padding: 20px; padding-bottom: 100px; }
          .admin-card-local { flex: 1 1 100%; padding: 24px; }
        }
      `}</style>

      <Sidebar userRole={userRole} />

      <main className="dashboard-content">
        <header className="dashboard-header">
          <div className="header-info">
            <h1>Painel de Gestão</h1>
            <p style={{ color: '#9ca3af', fontSize: '1.1rem' }}>Gerencie o conteúdo da plataforma <strong style={{ color: '#8b5cf6' }}>KA Tech</strong>.</p>
          </div>
        </header>

        <div className="admin-content-container">
          {manageLessonsCourse ? (
            <ManageLessons 
              courseId={manageLessonsCourse.id} 
              courseTitle={manageLessonsCourse.title} 
              onBack={() => setManageLessonsCourse(null)} 
            />
          ) : (
            <>
              <div className="admin-card-local">
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ color: '#fff', fontSize: '1.6rem', margin: 0, fontWeight: 800 }}>
                      {editingCourseId ? "Editar Curso" : "Novo Curso"}
                    </h2>
                    <p style={{ color: '#9ca3af', fontSize: '0.95rem', marginTop: '8px' }}>
                      {editingCourseId ? "Alterando informações do curso selecionado." : "Cadastre um novo conteúdo na grade."}
                    </p>
                  </div>
                  {editingCourseId && (
                    <button className="cancel-edit-btn" onClick={() => { setEditingCourseId(null); setCourseTitle(""); setCourseDesc(""); setCourseThumb(""); setSelectedTag(""); }}>
                      Cancelar Edição
                    </button>
                  )}
                </header>

                <form onSubmit={handleSaveCourse} style={{ marginTop: '30px' }}>
                  <div className="local-field">
                    <label>Título do Curso</label>
                    <div className="local-input-wrapper">
                      <span className="local-icon">📝</span>
                      <input type="text" placeholder="Digite o nome do curso" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} required />
                    </div>
                  </div>

                  <div className="local-field">
                    <label>Tag / Categoria</label>
                    <div className="local-input-wrapper">
                      <span className="local-icon">🏷️</span>
                      <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)}>
                        <option value="">Selecione uma categoria...</option>
                        {tags.map(tag => (
                          <option key={tag.id} value={tag.id}>{tag.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="local-field">
                    <label>Descrição</label>
                    <div className="local-input-wrapper">
                      <span className="local-icon" style={{ top: '15px' }}>📄</span>
                      <textarea placeholder="Descreva o que o aluno aprenderá neste curso..." value={courseDesc} onChange={(e) => setCourseDesc(e.target.value)} required />
                    </div>
                  </div>

                  <div className="local-field">
                    <label>Capa do Curso (.png / .jpg)</label>
                    <div className="local-input-wrapper">
                      <span className="local-icon">🖼️</span>
                      <input type="file" accept="image/*" onChange={handleUploadThumbnail} />
                    </div>
                    {uploadingThumb && <p style={{fontSize: '0.85rem', color: '#8b5cf6', marginTop: '8px', fontWeight: 600}}>Subindo imagem...</p>}
                    {courseThumb && (
                      <div style={{ marginTop: '20px', background: '#020617', padding: '10px', borderRadius: '12px', width: 'fit-content', border: '1px solid rgba(139,92,246,0.2)' }}>
                        <img src={courseThumb} alt="Preview" style={{ width: '180px', height: '100px', objectFit: 'cover', borderRadius: '8px', display: 'block' }} />
                      </div>
                    )}
                  </div>

                  <button className="local-primary-button" type="submit" disabled={uploadingThumb}>
                    {uploadingThumb ? "Aguarde upload..." : editingCourseId ? "Salvar Alterações" : "Publicar Curso"}
                  </button>
                </form>
              </div>

              {userRole === 'admin' && (
                <div className="admin-card-local" style={{ height: 'fit-content' }}>
                  <header>
                    <h2 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800 }}>Gerenciar Tags</h2>
                    <p style={{ color: '#9ca3af', fontSize: '0.95rem', marginTop: '8px' }}>Categorias para organização.</p>
                  </header>

                  <form onSubmit={handleCreateTag} style={{ marginTop: '30px' }}>
                    <div className="local-field">
                      <label>Nome da Tag</label>
                      <div className="local-input-wrapper">
                        <span className="local-icon">🏷️</span>
                        <input type="text" placeholder="Ex: COMERCIAL, BLIP, IA" value={tagName} onChange={(e) => setTagName(e.target.value)} required />
                      </div>
                    </div>
                    <button className="local-primary-button" type="submit">Criar Categoria</button>
                  </form>

                  <div className="tags-list-container" style={{ marginTop: '30px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    {tags.map(tag => (
                      <span key={tag.id} className="tag-badge">
                        {tag.name}
                        <button className="btn-remove-tag" onClick={() => handleDeleteTag(tag.id)} title="Remover tag">
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <section className="management-section">
                <h2>Cursos Existentes</h2>
                <div style={{ overflowX: 'auto' }}>
                  <table className="course-list-table">
                    <thead>
                      <tr>
                        <th style={{ width: '140px' }}>Capa</th>
                        <th>Título do Curso</th>
                        <th style={{ textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '1.1rem' }}>
                            Nenhum curso encontrado.
                          </td>
                        </tr>
                      ) : (
                        courses.map(course => (
                          <tr key={course.id}>
                            <td>
                              {course.thumbnailUrl ? (
                                <img src={course.thumbnailUrl} alt="capa" style={{ width: '100px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.1)' }} />
                              ) : (
                                <div style={{ width: '100px', height: '60px', background: '#111116', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700 }}>KA TECH</div>
                              )}
                            </td>
                            <td style={{ fontWeight: 600, fontSize: '1.1rem' }}>{course.title}</td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="actions-container">
                                <button className="btn-action btn-lessons" onClick={() => setManageLessonsCourse(course)}>
                                  Aulas
                                </button>
                                <button className="btn-action btn-edit" onClick={() => handleEditInit(course)}>
                                  Editar
                                </button>
                                <button className="btn-action btn-delete" onClick={() => handleDeleteCourse(course.id)}>
                                  Excluir
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default Admin;