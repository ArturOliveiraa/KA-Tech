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
  createdAt: string;
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

      const [coursesRes, catsRes, tagsRes] = await Promise.all([
        supabase.from("courses").select("*").order("createdAt", { ascending: false }),
        supabase.from("categories").select("*").order("name"),
        supabase.from("tags").select("*").order("name")
      ]);

      setCourses(coursesRes.data || []);
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
    if (uploadingThumb || uploadingBadge) return alert("Aguarde o upload das imagens terminar!");
    if (!selectedCategoryId) return alert("Selecione uma Trilha!");
    if (!courseThumb) return alert("Por favor, carregue uma capa para o curso!");

    const slug = generateSlug(courseTitle);
    const courseData = {
      title: courseTitle,
      slug,
      description: courseDesc,
      thumbnailUrl: courseThumb,
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
    if (!window.confirm("Tem certeza que deseja excluir este treinamento? Isso apagará todas as aulas vinculadas a ele!")) return;
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

  // Lógica de Filtro
  const filteredCourses = courses.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || contextLoading) return (
    <div className="dashboard-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <Sparkles size={40} color="#8b5cf6" style={{ animation: 'pulse 2s infinite', margin: '0 auto 15px' }} />
          <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800 }}>Sincronizando Plataforma...</h3>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.7; } }`}</style>
       </div>
    </div>
  );

  return (
    <div className="dashboard-wrapper">
      <Sidebar />

      <style>{`
        :root { 
          --primary: #8b5cf6; --primary-hover: #7c3aed;
          --bg-dark: #020617; /* Tom de fundo ultra-profundo (slate-950) */
          --card-glass: rgba(15, 23, 42, 0.4); 
          --border: rgba(255, 255, 255, 0.06); 
          --text-muted: #94a3b8;
        }
        * { box-sizing: border-box; }
        
        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

        .dashboard-wrapper { display: flex; width: 100%; min-height: 100vh; background: var(--bg-dark); font-family: 'Inter', system-ui, sans-serif; overflow-x: hidden; color: #f8fafc; }
        .main-content { flex: 1; margin-left: 260px; padding: 50px 60px; transition: 0.3s ease; width: calc(100% - 260px); }
        
        .brand-logo-mobile { display: none; width: 100%; justify-content: center; margin-bottom: 30px; }
        .brand-logo-mobile img { height: 60px; object-fit: contain; }
        
        /* Cabeçalho Premium */
        .header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; flex-wrap: wrap; gap: 20px; }
        .header-title { 
          font-size: 2.5rem; font-weight: 900; margin: 0; letter-spacing: -1px;
          background: linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .header-actions { display: flex; gap: 12px; flex-wrap: wrap; }
        
        .btn-header { 
          display: inline-flex; align-items: center; gap: 8px; padding: 12px 22px; 
          border-radius: 14px; font-weight: 600; font-size: 0.9rem; border: none; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); 
        }
        .btn-header:active { transform: scale(0.96); }
        .btn-header.ghost { background: rgba(255,255,255,0.03); color: var(--text-muted); border: 1px solid var(--border); backdrop-filter: blur(10px); }
        .btn-header.ghost:hover { background: rgba(255,255,255,0.08); color: #fff; border-color: rgba(255,255,255,0.15); }
        .btn-header.primary { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #fff; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3); }
        .btn-header.primary:hover { box-shadow: 0 8px 25px rgba(37, 99, 235, 0.4); transform: translateY(-2px); filter: brightness(1.1); }
        .btn-header.danger { background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }
        .btn-header.danger:hover { background: #ef4444; color: #fff; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3); transform: translateY(-2px); }
        
        /* Barra de Busca Refinada */
        .search-container { position: relative; width: 100%; margin-bottom: 50px; }
        .search-input {
          width: 100%; padding: 22px 22px 22px 60px; border-radius: 24px;
          background: rgba(255,255,255,0.02); border: 1px solid var(--border);
          color: #fff; font-size: 1.1rem; outline: none; transition: all 0.3s ease;
          backdrop-filter: blur(12px);
        }
        .search-input:focus {
          background: rgba(139, 92, 246, 0.03); border-color: var(--primary);
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1), 0 10px 40px -10px rgba(139, 92, 246, 0.15);
        }
        .search-input::placeholder { color: #475569; font-weight: 500; }
        .search-icon { position: absolute; left: 24px; top: 50%; transform: translateY(-50%); color: #64748b; transition: 0.3s; }
        .search-input:focus + .search-icon { color: var(--primary); }

        /* Animações de Entrada */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Grid de Cursos */
        .course-grid { 
          display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); 
          gap: 28px; padding-bottom: 50px;
        }
        
        .course-card { 
          display: flex; flex-direction: column; 
          background: linear-gradient(145deg, rgba(30,41,59,0.5) 0%, rgba(15,23,42,0.8) 100%);
          border: 1px solid var(--border); border-radius: 24px; overflow: hidden;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          animation: fadeUp 0.6s ease-out forwards;
          opacity: 0;
        }
        .course-card:hover { 
          transform: translateY(-8px); border-color: rgba(139, 92, 246, 0.5); 
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.5), 0 0 30px rgba(139, 92, 246, 0.15); 
        }
        
        .course-thumb-wrapper { position: relative; height: 200px; background: #000; overflow: hidden; }
        .course-thumb { width: 100%; height: 100%; object-fit: cover; opacity: 0.85; transition: 0.5s ease; }
        .course-card:hover .course-thumb { opacity: 1; transform: scale(1.08); }
        
        /* Overlay na imagem para dar leitura às badges */
        .course-thumb-overlay {
          position: absolute; inset: 0; z-index: 1; pointer-events: none;
          background: linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 40%, rgba(0,0,0,0.2) 100%);
        }

        .badge-xp { 
          position: absolute; top: 16px; left: 16px; z-index: 2; display: inline-flex; align-items: center; gap: 6px; 
          padding: 6px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; backdrop-filter: blur(12px);
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .xp-1 { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.2); }
        .xp-2 { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.2); }
        .xp-3 { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }

        .course-content { padding: 24px; flex: 1; display: flex; flex-direction: column; z-index: 2; }
        .course-title { font-size: 1.3rem; font-weight: 800; margin: 0 0 12px 0; line-height: 1.4; color: #fff; }
        .course-desc { color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 24px; }
        
        .course-actions { 
          display: flex; flex-direction: column; gap: 12px; margin-top: auto; 
        }
        .course-actions-top { display: flex; gap: 12px; }
        .btn-action { 
          flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; 
          padding: 14px; border-radius: 14px; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: 0.2s; border: none;
        }
        .btn-action:active { transform: scale(0.96); }
        .btn-action.manage { background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: #fff; flex: 2; }
        .btn-action.manage:hover { box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4); transform: translateY(-2px); }
        .btn-action.edit { background: rgba(255,255,255,0.04); color: #e2e8f0; flex: 1; border: 1px solid transparent; }
        .btn-action.edit:hover { background: rgba(56, 189, 248, 0.1); color: #38bdf8; border-color: rgba(56, 189, 248, 0.2); }
        .btn-action.delete { background: rgba(255,255,255,0.04); color: #e2e8f0; flex: 1; border: 1px solid transparent; }
        .btn-action.delete:hover { background: rgba(239, 68, 68, 0.1); color: #f87171; border-color: rgba(239, 68, 68, 0.2); }

        /* Painel Lateral (Drawer) */
        .side-panel-overlay { position: fixed; inset: 0; background: rgba(2, 6, 23, 0.6); backdrop-filter: blur(8px); z-index: 100; opacity: 0; pointer-events: none; transition: 0.4s ease; }
        .side-panel-overlay.open { opacity: 1; pointer-events: all; }
        
        .side-panel { 
          position: fixed; top: 0; right: -650px; width: 100%; max-width: 600px; height: 100vh; 
          background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(24px); 
          border-left: 1px solid rgba(255,255,255,0.08); z-index: 101; 
          padding: 40px; transition: right 0.5s cubic-bezier(0.16, 1, 0.3, 1); overflow-y: auto; 
          box-shadow: -30px 0 60px rgba(0,0,0,0.6); 
        }
        .side-panel.open { right: 0; }

        /* Form Controls Internos */
        .section-title { font-size: 1.15rem; color: #fff; font-weight: 800; display: flex; align-items: center; gap: 10px; margin: 35px 0 20px; border-bottom: 1px solid var(--border); padding-bottom: 12px; }
        .form-group { margin-bottom: 24px; }
        .form-label { display: flex; align-items: center; gap: 8px; color: var(--text-muted); margin-bottom: 10px; font-weight: 700; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .form-input { width: 100%; padding: 18px; border-radius: 16px; background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255,255,255,0.08); color: #fff; outline: none; transition: 0.3s; font-size: 0.95rem; }
        .form-input:focus { border-color: var(--primary); background: rgba(139, 92, 246, 0.05); box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1); }
        
        /* CORREÇÃO DO SELECT (TEMA ESCURO) */
        select.form-input option { background-color: #0f172a; color: #f8fafc; }
        
        .upload-zone { 
          border: 2px dashed rgba(255,255,255,0.15); padding: 40px 20px; border-radius: 20px; 
          text-align: center; cursor: pointer; transition: 0.3s; background: rgba(255,255,255,0.02);
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
        }
        .upload-zone:hover { border-color: var(--primary); background: rgba(139, 92, 246, 0.05); }
        .upload-zone.has-image { padding: 0; overflow: hidden; border-style: solid; height: 220px; position: relative; }
        .upload-zone img { width: 100%; height: 100%; object-fit: cover; }

        .btn-submit { 
          width: 100%; padding: 20px; border-radius: 16px; border: none; 
          background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); 
          color: white; font-weight: 800; font-size: 1.05rem; cursor: pointer; transition: 0.3s; 
          display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .btn-submit:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(139, 92, 246, 0.4); }

        @media (max-width: 1024px) { 
          .main-content { margin-left: 0; padding: 30px 20px; width: 100%; } 
          .brand-logo-mobile { display: flex; } 
          .header-actions { width: 100%; }
          .btn-header { flex: 1; justify-content: center; }
          .side-panel { padding: 25px; }
        }
      `}</style>

      <main className="main-content">
        <div className="brand-logo-mobile">
          <img src={logo} alt="KA Tech Logo" />
        </div>

        {manageLessonsCourse ? (
          <div style={{ background: 'var(--card-glass)', borderRadius: '24px', padding: '30px', border: '1px solid var(--border)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <ManageLessons
              courseId={manageLessonsCourse.id}
              courseTitle={manageLessonsCourse.title}
              onBack={() => {
                setManageLessonsCourse(null);
                loadData();
              }}
            />
          </div>
        ) : (
          <>
            <header className="header-flex">
              <div>
                <h1 className="header-title">Trilhas e Treinamentos</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '10px', fontSize: '1.05rem', fontWeight: 500 }}>
                  Domine o ecossistema organizando aulas, IA e gamificação.
                </p>
              </div>
              <div className="header-actions">
                <button onClick={() => navigate("/admin/quizzes")} className="btn-header ghost">
                  <LayoutList size={18} /> Quizzes
                </button>
                <button onClick={() => setShowStandaloneSetup(true)} className="btn-header primary">
                  <Brain size={18} /> Novo Quiz Mestre
                </button>
                <button onClick={() => navigate("/live-setup")} className="btn-header danger">
                  <MonitorPlay size={18} /> Setup Live
                </button>
                <button onClick={openNewForm} className="btn-header" style={{ background: '#fff', color: '#0f172a', boxShadow: '0 4px 20px rgba(255,255,255,0.2)' }}>
                  <Plus size={18} strokeWidth={3} /> Nova Trilha
                </button>
              </div>
            </header>

            {/* BARRA DE PESQUISA IMPONENTE */}
            <div className="search-container">
              <input 
                type="text" 
                className="search-input" 
                placeholder="Busque por trilhas, tópicos ou palavras-chave..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="search-icon" size={22} />
            </div>

            {/* GRID DE CURSOS COM ANIMAÇÃO STAGGER */}
            {filteredCourses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '100px 20px', background: 'rgba(255,255,255,0.01)', borderRadius: '30px', border: '2px dashed rgba(255,255,255,0.05)' }}>
                 <Layers size={64} style={{ opacity: 0.15, margin: '0 auto 20px', color: '#fff' }} />
                 <h3 style={{ fontSize: '1.5rem', marginBottom: '10px', fontWeight: 800 }}>Vazio por aqui</h3>
                 <p style={{ color: 'var(--text-muted)' }}>Crie a sua primeira trilha para começar a transformar a equipe.</p>
              </div>
            ) : (
              <div className="course-grid">
                {filteredCourses.map((c, index) => (
                  <div key={c.id} className="course-card" style={{ animationDelay: `${index * 0.1}s` }}>
                    
                    <div className="course-thumb-wrapper">
                      <div className="course-thumb-overlay"></div>
                      <img src={c.thumbnailUrl || 'https://via.placeholder.com/400x200/1e293b/8b5cf6?text=Sem+Capa'} alt={c.title} className="course-thumb" />
                      <span className={`badge-xp xp-${c.xp_weight}`}>
                        {c.xp_weight === 3 ? '🔴 Avançado' : c.xp_weight === 2 ? '🟡 Intermediário' : '🟢 Iniciante'}
                      </span>
                    </div>
                    
                    <div className="course-content">
                      <h3 className="course-title" title={c.title}>{c.title}</h3>
                      <p className="course-desc" title={c.description}>{c.description || "Sem descrição cadastrada."}</p>
                      
                      <div className="course-actions">
                        <div className="course-actions-top">
                          <button onClick={() => setManageLessonsCourse(c)} className="btn-action manage">
                            <MonitorPlay size={18}/> Aulas & Módulos
                          </button>
                          <button onClick={() => handleEditInit(c)} className="btn-action edit" title="Editar Trilha">
                            <Pencil size={18}/>
                          </button>
                          <button onClick={() => handleDeleteCourse(c.id)} className="btn-action delete" title="Excluir Trilha">
                            <Trash2 size={18}/>
                          </button>
                        </div>
                        
                        <div style={{ width: '100%', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
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
            )}
          </>
        )}

        {/* OVERLAY & GAVETA LATERAL DO FORMULÁRIO */}
        <div className={`side-panel-overlay ${isFormOpen ? 'open' : ''}`} onClick={closeForm}></div>
        <div className={`side-panel ${isFormOpen ? 'open' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px' }}>
            <h2 style={{ color: '#fff', margin: 0, fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
              {editingCourseId ? "✏️ Editar Trilha" : "✨ Nova Trilha"}
            </h2>
            <button onClick={closeForm} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }} onMouseOver={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }} onMouseOut={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}>
              <X size={20} strokeWidth={3} />
            </button>
          </div>
          
          <form onSubmit={handleSaveCourse}>
            {/* SESSÃO 1: BÁSICO */}
            <h3 className="section-title"><BookOpen size={20} color="var(--primary)" /> Dados Principais</h3>
            
            <div className="form-group">
              <label className="form-label">Título da Trilha</label>
              <input className="form-input" placeholder="Ex: Jornada da Liderança de Alta Performance" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label"><Layers size={16} /> Categoria</label>
                <select className="form-input" value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(Number(e.target.value))} required>
                  <option value="">Selecione...</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label"><Star size={16} /> Nível (XP)</label>
                <select className="form-input" value={xpWeight} onChange={(e) => setXpWeight(Number(e.target.value))} style={{ borderLeft: `4px solid ${xpWeight === 3 ? '#ef4444' : xpWeight === 2 ? '#fbbf24' : '#34d399'}` }}>
                  <option value={1}>Nv. 1 (Iniciante)</option>
                  <option value={2}>Nv. 2 (Intermediário)</option>
                  <option value={3}>Nv. 3 (Avançado)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label"><TagIcon size={16} /> Tags Relacionadas</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {tags.map(tag => (
                  <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                    style={{ 
                      padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--border)', 
                      background: selectedTags.includes(tag.id) ? 'var(--primary)' : 'rgba(255,255,255,0.03)', 
                      color: selectedTags.includes(tag.id) ? '#fff' : '#cbd5e1', 
                      cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s' 
                    }}>
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label"><FileText size={16} /> Resumo Executivo</label>
              <textarea className="form-input" style={{ height: '120px', resize: 'none', lineHeight: '1.5' }} placeholder="Descreva o impacto e os ganhos que o aluno terá ao finalizar esta trilha..." value={courseDesc} onChange={(e) => setCourseDesc(e.target.value)} required />
            </div>

            {/* SESSÃO 2: MÍDIA */}
            <h3 className="section-title"><ImageIcon size={20} color="var(--primary)" /> Mídia da Vitrine</h3>
            
            <div className="form-group">
              <label className="form-label">Capa Principal (Thumbnail)</label>
              <div className={`upload-zone ${courseThumb ? 'has-image' : ''}`} onClick={() => document.getElementById('file-thumb')?.click()}>
                <input id="file-thumb" type="file" hidden onChange={(e) => handleUpload(e, 'course-thumbs', setCourseThumb, setUploadingThumb)} />
                
                {uploadingThumb ? (
                  <span style={{ color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}><Sparkles size={18} className="animate-pulse" /> Subindo Imagem...</span>
                ) : courseThumb ? (
                  <img src={courseThumb} alt="Capa" />
                ) : (
                  <>
                    <UploadCloud size={36} color="#64748b" style={{ marginBottom: '5px' }} />
                    <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '1.1rem' }}>Clique ou arraste a arte final</span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Proporção sugerida: 16:9 (1920x1080px)</span>
                  </>
                )}
              </div>
            </div>

            {/* SESSÃO 3: GAMIFICAÇÃO */}
            <h3 className="section-title"><Award size={20} color="#fbbf24" /> Gamificação (Insígnia de Mestre)</h3>
            
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border)' }}>
              <div style={{ flex: 1 }}>
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label className="form-label">Título da Conquista</label>
                  <input className="form-input" placeholder="Ex: Mestre em Implantação" value={badgeName} onChange={(e) => setBadgeName(e.target.value)} style={{ padding: '14px', fontSize: '0.9rem' }} />
                </div>
                <button type="button" onClick={() => document.getElementById('file-badge')?.click()} className="btn-header ghost" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                  <input id="file-badge" type="file" hidden onChange={(e) => handleUpload(e, 'badges-icons', setBadgeThumb, setUploadingBadge)} />
                  {uploadingBadge ? "Sincronizando..." : <><UploadCloud size={16}/> Carregar Ícone 3D</>}
                </button>
              </div>
              
              <div style={{ width: '100px', height: '100px', borderRadius: '24px', background: 'rgba(0,0,0,0.5)', border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {badgeThumb ? (
                  <img src={badgeThumb} alt="Badge" style={{ width: '75%', height: '75%', objectFit: 'contain', filter: 'drop-shadow(0 4px 15px rgba(251, 191, 36, 0.5))' }} />
                ) : (
                  <Award size={36} color="#475569" />
                )}
              </div>
            </div>

            <div style={{ marginTop: '50px' }}>
              <button type="submit" className="btn-submit" disabled={uploadingThumb || uploadingBadge}>
                {editingCourseId ? <><Pencil size={20}/> Gravar Alterações</> : <><Sparkles size={20}/> Lançar Trilha na Plataforma</>}
              </button>
            </div>
          </form>
        </div>

        {/* MODAL DE SETUP DE QUIZ AVULSO */}
        {showStandaloneSetup && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(12px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <div style={{ width: '100%', maxWidth: '550px', background: 'linear-gradient(145deg, #0f172a 0%, #020617 100%)', borderRadius: '30px', padding: '40px', position: 'relative', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 40px rgba(139, 92, 246, 0.2)' }}>
              <button onClick={() => setShowStandaloneSetup(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-muted)', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#fff'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                <X size={20} />
              </button>
              
              <h2 style={{ color: '#fff', marginBottom: '10px', fontSize: '1.8rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Brain color="var(--primary)" size={32} /> Setup do Mestre
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '35px', lineHeight: '1.5' }}>Acione a IA para arquitetar um desafio personalizado baseado nas suas instruções.</p>
              
              <div className="form-group">
                <label className="form-label" style={{ color: '#e2e8f0' }}>Foco do Desafio</label>
                <input className="form-input" placeholder="Ex: Cultura Organizacional e Feedback..." value={standaloneTitle} onChange={(e) => setStandaloneTitle(e.target.value)} style={{ padding: '20px', fontSize: '1.05rem', borderRadius: '20px' }} />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#e2e8f0' }}>Prompt Base (Contexto para a IA)</label>
                <textarea className="form-input" style={{ height: '140px', resize: 'none', padding: '20px', borderRadius: '20px', lineHeight: '1.6' }} placeholder="Contextualize a inteligência: 'Gere 10 perguntas focadas em soft skills, com pegadinhas sobre...' " value={standaloneDesc} onChange={(e) => setStandaloneDesc(e.target.value)} />
              </div>

              <div style={{ width: '100%', marginTop: '40px' }}>
                <GenerateQuizButton 
                  courseId={undefined} lessonId={undefined}
                  title={standaloneTitle || "Quiz Avulso"} 
                  description={standaloneDesc || "Conhecimentos gerais"}
                  onQuizGenerated={(data: any) => {
                    setActiveQuiz(data);
                    setShowStandaloneSetup(false);
                    setStandaloneTitle(""); setStandaloneDesc("");
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* EDITOR DE QUIZ */}
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