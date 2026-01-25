import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import ManageLessons from "../components/ManageLessons";

interface Tag { id: string; name: string; }
interface Category { id: number; name: string; }
interface Course {
  id: number;
  title: string;
  slug: string;
  description: string;
  thumbnailUrl: string;
  category_id: number | null;
  createdAt: string;
}

const generateSlug = (text: string) => {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, "-").trim();
};

export default function ContentManagement() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [courseThumb, setCourseThumb] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "">("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const [badgeName, setBadgeName] = useState("");
  const [badgeThumb, setBadgeThumb] = useState("");
  const [uploadingBadge, setUploadingBadge] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [manageLessonsCourse, setManageLessonsCourse] = useState<Course | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate("/");
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== 'admin' && profile?.role !== 'teacher') return navigate("/dashboard");
      setUserRole(profile.role);
      const [coursesRes, catsRes, tagsRes] = await Promise.all([
        supabase.from("courses").select("*").order("createdAt", { ascending: false }),
        supabase.from("categories").select("*").order("name"),
        supabase.from("tags").select("*").order("name")
      ]);
      setCourses(coursesRes.data || []);
      setCategories(catsRes.data || []);
      setTags(tagsRes.data || []);
      setLoading(false);
    }
    loadData();
  }, [navigate]);

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);
  };

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>, bucket: string, setter: (url: string) => void, setLoadingFlag: (val: boolean) => void) {
    try {
      setLoadingFlag(true);
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      const fileName = `${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from(bucket).upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
      setter(publicUrl);
    } catch (e: any) { alert(e.message); } finally { setLoadingFlag(false); }
  }

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId) return alert("Selecione uma Trilha!");
    const slug = generateSlug(courseTitle);
    const courseData = { title: courseTitle, slug, description: courseDesc, thumbnailUrl: courseThumb, category_id: selectedCategoryId };
    try {
      let currentCourseId = editingCourseId;
      if (editingCourseId) {
        await supabase.from("courses").update(courseData).eq("id", editingCourseId);
        await supabase.from("course_tags").delete().eq("course_id", editingCourseId);
      } else {
        const { data, error } = await supabase.from("courses").insert([courseData]).select().single();
        if (error) throw error;
        currentCourseId = data.id;
      }
      if (currentCourseId && selectedTags.length > 0) {
        await supabase.from("course_tags").insert(selectedTags.map(tId => ({ course_id: currentCourseId, tag_id: tId })));
      }
      if (currentCourseId && badgeName && badgeThumb) {
        await supabase.from("badges").upsert([{ name: badgeName, image_url: badgeThumb, course_id: currentCourseId }], { onConflict: 'course_id' });
      }
      alert("Dados salvos com sucesso!");
      resetForm();
      const { data } = await supabase.from("courses").select("*").order("createdAt", { ascending: false });
      setCourses(data || []);
    } catch (err: any) { alert(err.message); }
  };

  // --- FUNÇÃO DE EXCLUSÃO ---
  const handleDeleteCourse = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja excluir este curso? Todas as aulas e dados vinculados serão perdidos.")) return;
    
    try {
      // Deleta dependências primeiro (Tags e Insígnias)
      await supabase.from("course_tags").delete().eq("course_id", id);
      await supabase.from("badges").delete().eq("course_id", id);
      await supabase.from("lessons").delete().eq("course_id", id);
      
      // Deleta o curso
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;

      alert("Curso excluído com sucesso!");
      setCourses(courses.filter(c => c.id !== id));
    } catch (err: any) {
      alert("Erro ao excluir: " + err.message);
    }
  };

  const resetForm = () => {
    setCourseTitle(""); setCourseDesc(""); setCourseThumb(""); setEditingCourseId(null);
    setSelectedTags([]); setSelectedCategoryId(""); setBadgeName(""); setBadgeThumb("");
  };

  const handleEditInit = async (course: Course) => {
    setEditingCourseId(course.id); setCourseTitle(course.title); setCourseDesc(course.description);
    setCourseThumb(course.thumbnailUrl); setSelectedCategoryId(course.category_id || "");
    const { data: linkedTags } = await supabase.from("course_tags").select("tag_id").eq("course_id", course.id);
    if (linkedTags) setSelectedTags(linkedTags.map(t => t.tag_id));
    const { data: badge } = await supabase.from("badges").select("*").eq("course_id", course.id).maybeSingle();
    if (badge) { setBadgeName(badge.name); setBadgeThumb(badge.image_url); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return <div className="loading-box" style={{color: 'white', padding: '100px', textAlign: 'center', fontFamily: 'Sora'}}>Sincronizando conteúdos...</div>;

  return (
    <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#020617', fontFamily: "'Sora', sans-serif", overflowX: 'hidden' }}>
      <Sidebar/>
      
      <style>{`
        .form-label { color: #f3f4f6; display: block; margin-bottom: 12px; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; }
        .input-with-icon { position: relative; display: flex; align-items: center; width: 100%; box-sizing: border-box; }
        .input-emoji { position: absolute; left: 16px; font-size: 1.25rem; z-index: 10; pointer-events: none; }
        .form-input, select, textarea { 
          width: 100% !important; padding: 16px 16px 16px 52px !important; border-radius: 14px !important; 
          background: rgba(15, 23, 42, 0.6) !important; border: 1px solid rgba(139, 92, 246, 0.2) !important; 
          color: #fff !important; outline: none !important; transition: all 0.3s ease !important;
          backdrop-filter: blur(10px); font-family: 'Sora'; box-sizing: border-box;
        }
        .form-input:focus, select:focus, textarea:focus { border-color: #8b5cf6 !important; box-shadow: 0 0 20px rgba(139, 92, 246, 0.15) !important; background: rgba(15, 23, 42, 0.8) !important; }
        .file-upload-box { border: 2px dashed rgba(139, 92, 246, 0.3); padding: 30px; border-radius: 20px; text-align: center; cursor: pointer; transition: 0.3s; background: linear-gradient(145deg, rgba(139, 92, 246, 0.02), rgba(2, 6, 23, 0.5)); }
        .image-preview { border-radius: 16px; border: 1px solid rgba(139, 92, 246, 0.4); object-fit: cover; margin-top: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .badge-preview { border-radius: 20px; width: 100px; height: 100px; border: 2px solid #8b5cf6; object-fit: contain; background: #000; }
        .local-primary-button { 
           background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%) !important;
           border: none !important; padding: 18px 32px !important; border-radius: 16px !important;
           color: white !important; font-weight: 800 !important; cursor: pointer !important;
           transition: 0.3s !important; box-shadow: 0 8px 20px rgba(124, 58, 237, 0.3) !important;
        }
      `}</style>

      <main className="dashboard-content" style={{ flex: 1, padding: '40px', marginLeft: '260px', boxSizing: 'border-box' }}>
        {manageLessonsCourse ? (
          <div className="manage-lessons-wrapper">
             <header style={{ marginBottom: '30px' }}>
                <h1 style={{ color: '#fff', fontSize: '2.5rem', fontWeight: 900 }}>Gerenciar Aulas</h1>
                <p style={{ color: '#9ca3af' }}>Curso: <strong style={{color:'#8b5cf6'}}>{manageLessonsCourse.title}</strong></p>
             </header>
             <ManageLessons courseId={manageLessonsCourse.id} courseTitle={manageLessonsCourse.title} onBack={() => setManageLessonsCourse(null)} />
          </div>
        ) : (
          <>
            <header style={{ marginBottom: '50px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1 style={{ color: '#fff', fontSize: '2.8rem', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: '10px' }}>Gestão de Conteúdo</h1>
                <p style={{ color: '#9ca3af', fontSize: '1.2rem' }}>Configure seus treinamentos e <strong style={{ color: '#8b5cf6' }}>insígnias</strong>.</p>
              </div>
              <button onClick={() => navigate("/admin")} style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.2)', padding: '14px 28px', borderRadius: '14px', cursor: 'pointer', fontWeight: 700, transition: '0.3s' }}>← Estrutura Global</button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '40px', alignItems: 'start' }}>
              
              <div style={{ background: 'rgba(9, 9, 11, 0.8)', padding: '45px', borderRadius: '32px', border: '1px solid rgba(139,92,246,0.1)', backdropFilter: 'blur(20px)', boxShadow: '0 25px 60px rgba(0,0,0,0.7)' }}>
                <h2 style={{ color: '#fff', marginBottom: '35px', fontSize: '1.8rem', fontWeight: 800 }}>{editingCourseId ? "✏️ Editar Curso" : "✨ Criar Novo Curso"}</h2>
                <form onSubmit={handleSaveCourse}>
                  
                  <div style={{ marginBottom: '30px' }}>
                    <label className="form-label">Nome do Curso</label>
                    <div className="input-with-icon">
                      <span className="input-emoji">📝</span>
                      <input className="form-input" placeholder="Ex: Especialista Softcom" type="text" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} required />
                    </div>
                  </div>

                  <div style={{ marginBottom: '30px' }}>
                    <label className="form-label">Trilha do Conhecimento</label>
                    <div className="input-with-icon">
                      <span className="input-emoji">📂</span>
                      <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(Number(e.target.value))} required>
                        <option value="">Selecione o caminho...</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '30px' }}>
                    <label className="form-label">Tags de Especialidade</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                      {tags.map(tag => (
                        <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)} style={{ padding: '12px 20px', borderRadius: '12px', fontSize: '0.85rem', border: '1px solid rgba(139, 92, 246, 0.2)', backgroundColor: selectedTags.includes(tag.id) ? '#8b5cf6' : 'rgba(2, 6, 23, 0.5)', color: '#fff', cursor: 'pointer', fontWeight: 700, transition: '0.2s' }}>{tag.name}</button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: '30px' }}>
                    <label className="form-label">Resumo do Curso</label>
                    <div className="input-with-icon align-top">
                      <textarea style={{ height: '140px' }} placeholder="O que o aluno aprenderá?" value={courseDesc} onChange={(e) => setCourseDesc(e.target.value)} required />
                    </div>
                  </div>

                  <div style={{ marginBottom: '40px' }}>
                    <label className="form-label">Capa</label>
                    <div className="file-upload-box" onClick={() => document.getElementById('thumb-upload')?.click()}>
                      <input type="file" style={{display: 'none'}} id="thumb-upload" onChange={(e) => handleUpload(e, 'course-thumbs', setCourseThumb, setUploadingThumb)} />
                      <span style={{color: '#8b5cf6', fontWeight: 800}}>{uploadingThumb ? "Processando..." : "📤 Escolher Imagem"}</span>
                    </div>
                    {courseThumb && <img src={courseThumb} alt="Capa" className="image-preview" style={{ width: '100%', height: '200px' }} />}
                  </div>

                  <div style={{ borderTop: '1px solid rgba(139,92,246,0.1)', paddingTop: '40px', marginTop: '40px' }}>
                    <h3 style={{ color: '#8b5cf6', fontSize: '1.4rem', marginBottom: '25px', fontWeight: 900 }}>🏅 Insígnia</h3>
                    <div style={{ marginBottom: '25px' }}>
                      <label className="form-label">Nome da Insignia/Conquista</label>
                      <div className="input-with-icon">
                        <span className="input-emoji">🏆</span>
                        <input className="form-input" placeholder="Ex: Mestre Softcom" value={badgeName} onChange={(e) => setBadgeName(e.target.value)} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '30px', alignItems: 'center', background: 'rgba(139,92,246,0.03)', padding: '25px', borderRadius: '20px', border: '1px solid rgba(139,92,246,0.05)' }}>
                        <div className="file-upload-box" style={{ flex: 1 }} onClick={() => document.getElementById('badge-upload')?.click()}>
                          <input type="file" style={{display: 'none'}} id="badge-upload" onChange={(e) => handleUpload(e, 'badges-icons', setBadgeThumb, setUploadingBadge)} />
                          <span style={{color: '#8b5cf6', fontWeight: 800}}>📸 Carregar Foto</span>
                        </div>
                        {badgeThumb && <img src={badgeThumb} alt="Insignia" className="badge-preview" />}
                    </div>
                  </div>

                  <button type="submit" disabled={uploadingThumb || uploadingBadge} className="local-primary-button" style={{ width: '100%', marginTop: '50px', fontSize: '1.1rem' }}>
                    {editingCourseId ? "Confirmar Atualizações" : "Lançar Novo Treinamento"}
                  </button>
                  {editingCourseId && <button onClick={resetForm} style={{ width: '100%', marginTop: '20px', background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}>Descartar alterações</button>}
                </form>
              </div>

              <div style={{ background: '#09090b', padding: '40px', borderRadius: '32px', border: '1px solid rgba(139,92,246,0.1)', boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }}>
                <h2 style={{ color: '#fff', marginBottom: '35px', fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{width: '8px', height: '30px', background: '#8b5cf6', borderRadius: '4px'}}></span>
                  Biblioteca Ativa
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {courses.map(course => (
                    <div key={course.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '25px', background: 'linear-gradient(145deg, #020617, #09090b)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)', transition: '0.3s' }}>
                      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div style={{width: '60px', height: '40px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(139,92,246,0.2)'}}>
                           <img src={course.thumbnailUrl || "https://via.placeholder.com/80x50"} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>{course.title}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setManageLessonsCourse(course)} style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}>Aulas</button>
                        <button onClick={() => handleEditInit(course)} style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.2)', padding: '10px 14px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}>Editar</button>
                        {/* BOTÃO DE DELETAR */}
                        <button 
                          onClick={() => handleDeleteCourse(course.id)} 
                          style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px 14px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
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