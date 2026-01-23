import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import ManageLessons from "../components/ManageLessons"; // ADICIONADO: Importação do componente

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

  // ADICIONADO: Estado para controlar qual curso estamos gerenciando as aulas
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
    
    if (error) {
      alert("Erro ao remover tag: " + error.message);
    } else {
      fetchTags();
    }
  };

  if (loading) return <div className="loading-box">Carregando painel...</div>;

  return (
    <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#0b0e14' }}>
      <style>{`
        .dashboard-content { flex: 1; padding: 40px; margin-left: 260px; width: 100%; }
        .admin-content-container { display: flex; flex-direction: row; flex-wrap: wrap; justify-content: flex-start; gap: 30px; width: 100%; margin-top: 20px; }
        .admin-card-local { background: #121418; border-radius: 16px; padding: 24px; flex: 1 1 450px; max-width: 600px; border: 1px solid #2d323e; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        .dashboard-header { display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 30px; }
        .local-field { margin-bottom: 16px; display: flex; flex-direction: column; gap: 6px; }
        .local-field label { color: #e2e8f0; font-size: 0.8rem; font-weight: 500; }
        .local-input-wrapper { position: relative; display: flex; align-items: center; width: 100%; }
        .local-icon { position: absolute; left: 15px; font-size: 1.1rem; }
        .local-input-wrapper input, .local-input-wrapper textarea, .local-input-wrapper select {
          width: 100%; background-color: #1a1d23 !important; color: white !important;
          border: 1px solid #2d323e; border-radius: 8px; padding: 10px 12px 10px 45px; font-size: 14px; outline: none;
        }
        .local-input-wrapper textarea { min-height: 120px; resize: none; }
        .local-primary-button { width: 100%; padding: 12px; margin-top: 10px; border-radius: 8px; border: none; background: linear-gradient(90deg, #00c9ff 0%, #92fe9d 100%); color: #000; font-weight: bold; cursor: pointer; transition: opacity 0.3s ease; }
        .local-primary-button:hover { opacity: 0.9; }
        
        .management-section { width: 100%; margin-top: 40px; }
        .course-list-table { width: 100%; border-collapse: separate; border-spacing: 0; background: #121418; border-radius: 16px; overflow: hidden; border: 1px solid #2d323e; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        .course-list-table th { text-align: left; padding: 18px 24px; background: #1a1d23; color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #2d323e; }
        .course-list-table td { padding: 18px 24px; border-bottom: 1px solid #2d323e; color: #fff; font-size: 0.95rem; vertical-align: middle; }
        
        .actions-container { display: flex; justify-content: flex-end; gap: 12px; align-items: center; white-space: nowrap; }
        .btn-action { padding: 8px 16px; border-radius: 8px; border: 1px solid transparent; cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: all 0.3s ease; }
        
        /* ADICIONADO: Estilos do Botão Aulas e Tags */
        .btn-lessons { background: rgba(146, 254, 157, 0.1); color: #92fe9d; border-color: rgba(146, 254, 157, 0.5); }
        .btn-lessons:hover { background: #92fe9d; color: #000; box-shadow: 0 0 15px rgba(146, 254, 157, 0.4); }

        .btn-edit { background: rgba(0, 201, 255, 0.1); color: #00c9ff; border-color: rgba(0, 201, 255, 0.5); }
        .btn-edit:hover { background: #00c9ff; color: #0b0e14; box-shadow: 0 0 15px rgba(0, 201, 255, 0.4); }

        .btn-delete { background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.5); }
        .btn-delete:hover { background: #ef4444; color: #fff; box-shadow: 0 0 15px rgba(239, 68, 68, 0.4); }

        .cancel-edit-btn { background: transparent; color: #ef4444; border: 1px solid #ef4444; padding: 6px 12px; font-size: 0.75rem; border-radius: 8px; cursor: pointer; margin-left: 15px; }

        .tag-badge { background: rgba(0, 229, 255, 0.1); border: 1px solid #00e5ff; padding: 6px 12px; border-radius: 20px; fontSize: 0.75rem; color: #00e5ff; font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .btn-remove-tag { background: transparent; border: none; color: rgba(0, 229, 255, 0.5); cursor: pointer; font-size: 1.1rem; line-height: 1; padding: 0; display: flex; align-items: center; transition: color 0.2s ease; }
        .btn-remove-tag:hover { color: #ef4444; }

        @media (max-width: 768px) {
          .dashboard-content { margin-left: 0; padding: 20px; padding-bottom: 100px; }
          .course-list-table th, .course-list-table td { padding: 12px; }
          .actions-container { gap: 6px; }
          .btn-action { padding: 6px 10px; font-size: 0.7rem; }
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
          {/* ADICIONADO: Lógica Condicional para Aulas */}
          {manageLessonsCourse ? (
            <ManageLessons 
              courseId={manageLessonsCourse.id} 
              courseTitle={manageLessonsCourse.title} 
              onBack={() => setManageLessonsCourse(null)} 
            />
          ) : (
            <>
              {/* FORMULÁRIO DE CURSO ORIGINAL */}
              <div className="admin-card-local">
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ color: '#fff', fontSize: '1.4rem', margin: 0 }}>
                      {editingCourseId ? "Editar Curso" : "Novo Curso"}
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '5px' }}>
                      {editingCourseId ? "Alterando informações do curso selecionado." : "Cadastre um novo conteúdo na grade."}
                    </p>
                  </div>
                  {editingCourseId && (
                    <button className="cancel-edit-btn" onClick={() => { setEditingCourseId(null); setCourseTitle(""); setCourseDesc(""); setCourseThumb(""); setSelectedTag(""); }}>
                      Cancelar Edição
                    </button>
                  )}
                </header>

                <form onSubmit={handleSaveCourse} style={{ marginTop: '25px' }}>
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
                    {uploadingThumb && <p style={{fontSize: '0.7rem', color: '#00e5ff', marginTop: '5px'}}>Subindo imagem...</p>}
                    {courseThumb && (
                      <div style={{ marginTop: '15px', background: '#1a1d23', padding: '5px', borderRadius: '8px', width: 'fit-content', border: '1px solid #2d323e' }}>
                        <img src={courseThumb} alt="Preview" style={{ width: '150px', height: '85px', objectFit: 'cover', borderRadius: '6px', display: 'block' }} />
                      </div>
                    )}
                  </div>

                  <button className="local-primary-button" type="submit" disabled={uploadingThumb}>
                    {uploadingThumb ? "Aguarde upload..." : editingCourseId ? "Salvar Alterações" : "Publicar Curso"}
                  </button>
                </form>
              </div>

              {/* GERENCIAR TAGS ORIGINAL */}
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

                  <div className="tags-list-container" style={{ marginTop: '25px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
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

              {/* LISTAGEM DE CURSOS ORIGINAL */}
              <section className="management-section" style={{ width: '100%' }}>
                <h2 style={{ color: '#fff', marginBottom: '20px', fontSize: '1.4rem' }}>Cursos Existentes</h2>
                <div style={{ overflowX: 'auto' }}>
                  <table className="course-list-table">
                    <thead>
                      <tr>
                        <th style={{ width: '120px' }}>Capa</th>
                        <th>Título do Curso</th>
                        <th style={{ textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                            Nenhum curso encontrado.
                          </td>
                        </tr>
                      ) : (
                        courses.map(course => (
                          <tr key={course.id}>
                            <td>
                              {course.thumbnailUrl ? (
                                <img src={course.thumbnailUrl} alt="capa" style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #2d323e' }} />
                              ) : (
                                <div style={{ width: '80px', height: '50px', background: '#2d323e', borderRadius: '6px', border: '1px solid #2d323e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#94a3b8' }}>Sem Capa</div>
                              )}
                            </td>
                            <td style={{ fontWeight: 500 }}>{course.title}</td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="actions-container">
                                {/* ADICIONADO: O BOTÃO DE AULAS QUE VOCÊ QUERIA */}
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