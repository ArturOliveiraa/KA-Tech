import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import ManageLessons from "../components/ManageLessons";
import { useUser } from "../components/UserContext";
import { 
  X, LayoutList, BookOpen, Layers, Star, Tag as TagIcon, 
  FileText, Image as ImageIcon, Award, UploadCloud, 
  Home, Brain, Pencil, Trash2, MonitorPlay, Search, Plus, Sparkles
} from "lucide-react";

// Imports da IA e do Editor de Quiz
import { GenerateQuizButton } from "../components/GenerateQuizButton"; 
import { QuizEditor } from "../components/QuizEditor"; 

// Import da logo para o cabeçalho mobile
import logo from "../assets/ka-tech-logo.png";

interface Tag { id: string; name: string; }
interface Category { id: number; name: string; }
interface Course {
  id: number;
  title: string;
  slug: string;
  description: string;
  thumbnailUrl: string;
  category_id: number | null;
  xp_weight: number; 
  created_at: string;
  total_duration?: number;
}

const generateSlug = (text: string) => {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, "-").trim();
};

export default function ContentManagement() {
  const navigate = useNavigate();
  const { loading: contextLoading } = useUser();

  const [loading, setLoading] = useState(true);

  // Estados de Busca e UI
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Estados do Formulário
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [courseThumb, setCourseThumb] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "">("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [xpWeight, setXpWeight] = useState<number>(1);
  const [badgeName, setBadgeName] = useState("");
  const [badgeThumb, setBadgeThumb] = useState("");
  
  // Estados de Upload
  const [uploadingBadge, setUploadingBadge] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  // Listas
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  // Controles de Tela
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [manageLessonsCourse, setManageLessonsCourse] = useState<Course | null>(null);

  // Estados de Quiz
  const [showStandaloneSetup, setShowStandaloneSetup] = useState(false);
  const [standaloneTitle, setStandaloneTitle] = useState("");
  const [standaloneDesc, setStandaloneDesc] = useState("");
  const [activeQuiz, setActiveQuiz] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate("/");

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== 'admin' && profile?.role !== 'teacher') {
        return navigate("/dashboard");
      }

      // CORREÇÃO: created_at
      const [coursesRes, catsRes, tagsRes] = await Promise.all([
        supabase.from("courses").select("*").order("created_at", { ascending: false }),
        supabase.from("categories").select("*").order("name"),
        supabase.from("tags").select("*").order("name")
      ]);

      // MAPEAMENTO: thumbnail_url para thumbnailUrl
      const formattedCourses = (coursesRes.data || []).map((c: any) => ({
        ...c,
        thumbnailUrl: c.thumbnail_url
      }));

      setCourses(formattedCourses);
      setCategories(catsRes.data || []);
      setTags(tagsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { loadData(); }, [loadData]);

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
    if (uploadingThumb || uploadingBadge) return alert("Aguarde o upload das imagens!");
    if (!selectedCategoryId) return alert("Selecione uma Trilha!");

    const slug = generateSlug(courseTitle);
    const courseData = {
      title: courseTitle,
      slug,
      description: courseDesc,
      thumbnail_url: courseThumb, // CORREÇÃO: snake_case
      category_id: selectedCategoryId,
      xp_weight: xpWeight 
    };

    try {
      let currentCourseId = editingCourseId;
      if (editingCourseId) {
        await supabase.from("courses").update(courseData).eq("id", editingCourseId);
        await supabase.from("course_tags").delete().eq("course_id", editingCourseId);
      } else {
        const { data, error: insError } = await supabase.from("courses").insert([courseData]).select().single();
        if (insError) throw insError;
        currentCourseId = data.id;
      }

      if (currentCourseId && selectedTags.length > 0) {
        await supabase.from("course_tags").insert(selectedTags.map(tId => ({ course_id: currentCourseId, tag_id: tId })));
      }

      if (currentCourseId && badgeName && badgeThumb) {
        await supabase.from("badges").upsert([{ name: badgeName, image_url: badgeThumb, course_id: currentCourseId }], { onConflict: 'course_id' });
      }

      closeForm();
      loadData();
    } catch (err: any) { alert(err.message); }
  };

  const handleDeleteCourse = async (id: number) => {
    if (!window.confirm("Deseja excluir este treinamento?")) return;
    try {
      await supabase.from("course_tags").delete().eq("course_id", id);
      await supabase.from("badges").delete().eq("course_id", id);
      await supabase.from("lessons").delete().eq("course_id", id);
      await supabase.from("courses").delete().eq("id", id);
      setCourses(courses.filter(c => c.id !== id));
    } catch (err: any) { alert(err.message); }
  };

  const openNewForm = () => {
    setCourseTitle(""); setCourseDesc(""); setCourseThumb(""); setEditingCourseId(null);
    setSelectedTags([]); setSelectedCategoryId(""); setBadgeName(""); setBadgeThumb("");
    setXpWeight(1);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
  };

  const handleEditInit = async (course: Course) => {
    setEditingCourseId(course.id); 
    setCourseTitle(course.title); 
    setCourseDesc(course.description);
    setCourseThumb(course.thumbnailUrl); 
    setSelectedCategoryId(course.category_id || "");
    setXpWeight(course.xp_weight || 1);

    const { data: linkedTags } = await supabase.from("course_tags").select("tag_id").eq("course_id", course.id);
    if (linkedTags) setSelectedTags(linkedTags.map(t => t.tag_id));
    
    const { data: badge } = await supabase.from("badges").select("*").eq("course_id", course.id).maybeSingle();
    if (badge) { setBadgeName(badge.name); setBadgeThumb(badge.image_url); }
    
    setIsFormOpen(true);
  };

  const filteredCourses = courses.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || contextLoading) return (
    <div className="dashboard-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
       <Sparkles size={40} color="#8b5cf6" className="animate-pulse" />
    </div>
  );

  return (
    <div className="dashboard-wrapper">
      <Sidebar />

      <style>{`
        :root { 
          --primary: #8b5cf6; --primary-hover: #7c3aed;
          --bg-dark: #020617; 
          --card-glass: rgba(15, 23, 42, 0.4); 
          --border: rgba(255, 255, 255, 0.06); 
          --text-muted: #94a3b8;
        }
        * { box-sizing: border-box; }
        
        .dashboard-wrapper { display: flex; width: 100%; min-height: 100vh; background: var(--bg-dark); font-family: 'Inter', sans-serif; color: #f8fafc; }
        .main-content { flex: 1; margin-left: 260px; padding: 50px 60px; width: calc(100% - 260px); position: relative; }
        
        .header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
        .header-title { font-size: 2.5rem; font-weight: 900; background: linear-gradient(135deg, #fff, #c4b5fd); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; }
        
        .btn-header { display: inline-flex; align-items: center; gap: 8px; padding: 12px 22px; border-radius: 14px; font-weight: 600; cursor: pointer; border: none; transition: 0.2s; }
        .btn-header.ghost { background: rgba(255,255,255,0.03); color: var(--text-muted); border: 1px solid var(--border); }
        .btn-header.primary { background: var(--primary); color: #fff; }

        .search-container { position: relative; width: 100%; margin-bottom: 50px; }
        .search-input { width: 100%; padding: 20px 20px 20px 60px; border-radius: 20px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); color: #fff; outline: none; font-size: 1.1rem; }
        .search-icon { position: absolute; left: 24px; top: 50%; transform: translateY(-50%); color: #64748b; }

        .course-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 28px; }
        .course-card { background: var(--card-glass); border: 1px solid var(--border); border-radius: 24px; overflow: hidden; transition: 0.3s; display: flex; flex-direction: column; min-height: 400px; }
        .course-card:hover { transform: translateY(-5px); border-color: var(--primary); }
        
        .course-thumb-wrapper { height: 200px; position: relative; background: #0f172a; flex-shrink: 0; }
        .course-thumb { width: 100%; height: 100%; object-fit: cover; }
        
        .badge-xp { position: absolute; top: 16px; left: 16px; padding: 6px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; z-index: 5; }
        .xp-1 { background: #10b981; color: #fff; } 
        .xp-2 { background: #fbbf24; color: #000; } 
        .xp-3 { background: #ef4444; color: #fff; }

        .course-content { padding: 24px; flex: 1; display: flex; flex-direction: column; gap: 10px; }
        .course-title { font-size: 1.3rem; font-weight: 800; color: #fff; margin: 0; }
        .course-desc { color: var(--text-muted); font-size: 0.9rem; line-height: 1.5; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }

        .course-actions { margin-top: auto; display: flex; flex-direction: column; gap: 10px; padding-top: 15px; }
        .btn-action { padding: 12px; border-radius: 12px; border: none; cursor: pointer; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; }
        .btn-action.manage { background: var(--primary); color: #fff; width: 100%; }
        .btn-row { display: flex; gap: 10px; }

        .side-panel { position: fixed; top: 0; right: -650px; width: 600px; height: 100vh; background: #0f172a; border-left: 1px solid var(--border); z-index: 101; padding: 40px; transition: 0.4s; overflow-y: auto; box-shadow: -20px 0 40px rgba(0,0,0,0.5); }
        .side-panel.open { right: 0; }
        .side-panel-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 100; opacity: 0; pointer-events: none; transition: 0.3s; backdrop-filter: blur(4px); }
        .side-panel-overlay.open { opacity: 1; pointer-events: all; }

        .form-input { width: 100%; padding: 16px; border-radius: 12px; background: #020617; border: 1px solid var(--border); color: #fff; margin-bottom: 20px; outline: none; }
        .form-input:focus { border-color: var(--primary); }
        .section-title { font-size: 1.1rem; font-weight: 800; margin: 30px 0 20px; border-bottom: 1px solid var(--border); padding-bottom: 10px; display: flex; align-items: center; gap: 10px; }
        
        .upload-zone { border: 2px dashed rgba(255,255,255,0.1); padding: 30px; border-radius: 20px; text-align: center; cursor: pointer; background: rgba(255,255,255,0.01); }
        .upload-zone.has-image { padding: 0; height: 200px; overflow: hidden; border-style: solid; }
        .upload-zone img { width: 100%; height: 100%; object-fit: cover; }

        @media (max-width: 1024px) { .main-content { margin-left: 0; padding: 20px; width: 100%; } .side-panel { width: 100%; } }
      `}</style>

      <main className="main-content">
        {manageLessonsCourse ? (
          <ManageLessons
            courseId={manageLessonsCourse.id}
            courseTitle={manageLessonsCourse.title}
            onBack={() => { setManageLessonsCourse(null); loadData(); }}
          />
        ) : (
          <>
            <header className="header-flex">
              <div>
                <h1 className="header-title">Gestão de Conteúdo</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>Organize suas trilhas, aulas e gamificação.</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => navigate("/admin/quizzes")} className="btn-header ghost">
                  <LayoutList size={18} /> Quizzes
                </button>
                <button onClick={openNewForm} className="btn-header primary">
                  <Plus size={20} /> Nova Trilha
                </button>
              </div>
            </header>

            <div className="search-container">
              <input 
                type="text" 
                className="search-input" 
                placeholder="Busque por trilhas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="search-icon" size={22} />
            </div>

            <div className="course-grid">
              {filteredCourses.map((c, index) => (
                <div key={c.id} className="course-card">
                  <div className="course-thumb-wrapper">
                    <img src={c.thumbnailUrl || 'https://via.placeholder.com/400x200/1e293b/8b5cf6?text=Sem+Capa'} className="course-thumb" alt={c.title} />
                    <span className={`badge-xp xp-${c.xp_weight}`}>
                        {c.xp_weight === 3 ? '🔴 Avançado' : c.xp_weight === 2 ? '🟡 Intermediário' : '🟢 Iniciante'}
                    </span>
                  </div>
                  <div className="course-content">
                    <h3 className="course-title">{c.title}</h3>
                    <p className="course-desc">{c.description || "Sem descrição cadastrada."}</p>
                    
                    <div className="course-actions">
                      <button onClick={() => setManageLessonsCourse(c)} className="btn-action manage">
                        <MonitorPlay size={18}/> Aulas & Módulos
                      </button>
                      <div className="btn-row">
                        <button onClick={() => handleEditInit(c)} className="btn-action" style={{ background: '#334155', color: '#fff', flex: 1 }}><Pencil size={16}/> Editar</button>
                        <button onClick={() => handleDeleteCourse(c.id)} className="btn-action" style={{ background: '#7f1d1d', color: '#fff', flex: 1 }}><Trash2 size={16}/> Excluir</button>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '14px' }}>
                        <GenerateQuizButton 
                            courseId={c.id} title={c.title} description={c.description}
                            onQuizGenerated={(data: any) => setActiveQuiz(data)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className={`side-panel-overlay ${isFormOpen ? 'open' : ''}`} onClick={closeForm}></div>
        <div className={`side-panel ${isFormOpen ? 'open' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px' }}>
            <h2 style={{ color: '#fff', margin: 0, fontWeight: 900 }}>{editingCourseId ? "✏️ Editar Trilha" : "✨ Nova Trilha"}</h2>
            <button onClick={closeForm} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={24} /></button>
          </div>
          
          <form onSubmit={handleSaveCourse}>
            <h3 className="section-title"><BookOpen size={20} color="var(--primary)" /> Dados Principais</h3>
            <input className="form-input" placeholder="Título da Trilha" value={courseTitle} onChange={e => setCourseTitle(e.target.value)} required />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <select className="form-input" value={selectedCategoryId} onChange={e => setSelectedCategoryId(Number(e.target.value))} required>
                <option value="">Categoria</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              <select className="form-input" value={xpWeight} onChange={e => setXpWeight(Number(e.target.value))}>
                <option value={1}>Iniciante</option>
                <option value={2}>Intermediário</option>
                <option value={3}>Avançado</option>
              </select>
            </div>

            <textarea className="form-input" style={{ height: '120px' }} placeholder="Descrição do treinamento" value={courseDesc} onChange={e => setCourseDesc(e.target.value)} required />

            <h3 className="section-title"><ImageIcon size={20} color="var(--primary)" /> Mídia</h3>
            <div className={`upload-zone ${courseThumb ? 'has-image' : ''}`} onClick={() => document.getElementById('file-thumb')?.click()}>
              <input id="file-thumb" type="file" hidden onChange={e => handleUpload(e, 'course-thumbs', setCourseThumb, setUploadingThumb)} />
              {uploadingThumb ? <span>Enviando...</span> : courseThumb ? <img src={courseThumb} alt="Capa" /> : <><UploadCloud size={32} /><div>Carregar Thumbnail</div></>}
            </div>

            <h3 className="section-title"><Award size={20} color="#fbbf24" /> Gamificação</h3>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border)' }}>
              <input className="form-input" placeholder="Título da Insígnia (Ex: Especialista Softshop)" value={badgeName} onChange={e => setBadgeName(e.target.value)} />
              <button type="button" onClick={() => document.getElementById('file-badge')?.click()} className="btn-action" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', width: '100%' }}>
                <input id="file-badge" type="file" hidden onChange={e => handleUpload(e, 'badges-icons', setBadgeThumb, setUploadingBadge)} />
                {uploadingBadge ? "Enviando..." : "Subir Ícone Badge"}
              </button>
            </div>

            <button type="submit" className="btn-submit" style={{ width: '100%', padding: '20px', borderRadius: '15px', background: 'var(--primary)', color: '#fff', fontWeight: 900, border: 'none', cursor: 'pointer', marginTop: '40px' }} disabled={uploadingThumb || uploadingBadge}>
              {editingCourseId ? "GRAVAR ALTERAÇÕES" : "PUBLICAR TRILHA"}
            </button>
          </form>
        </div>

        {activeQuiz && (
          <QuizEditor 
            initialData={activeQuiz} courseId={null} 
            onClose={() => setActiveQuiz(null)} 
            onSaved={() => setActiveQuiz(null)} 
          />
        )}
      </main>
    </div>
  );
}