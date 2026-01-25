import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import ManageLessons from "../components/ManageLessons";
import { useUser } from "../components/UserContext";

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
    createdAt: string;
}

const generateSlug = (text: string) => {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, "-").trim();
};

export default function ContentManagement() {
    const navigate = useNavigate();
    const { loading: contextLoading } = useUser();
    
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

    useEffect(() => {
        async function loadData() {
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

    const handleDeleteCourse = async (id: number) => {
        if (!window.confirm("Tem certeza que deseja excluir este curso?")) return;
        try {
            await supabase.from("course_tags").delete().eq("course_id", id);
            await supabase.from("badges").delete().eq("course_id", id);
            await supabase.from("lessons").delete().eq("course_id", id);
            const { error } = await supabase.from("courses").delete().eq("id", id);
            if (error) throw error;
            alert("Curso excluído!");
            setCourses(courses.filter(c => c.id !== id));
        } catch (err: any) { alert("Erro ao excluir: " + err.message); }
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

    if (loading || contextLoading) return <div className="loading-box" style={{ color: '#8b5cf6', padding: '100px', textAlign: 'center', fontFamily: 'Sora', fontWeight: 800 }}>Sincronizando conteúdos...</div>;

    return (
        <div className="dashboard-wrapper">
            <Sidebar />

            <style>{`
                :root { 
                    --primary: #8b5cf6; 
                    --primary-glow: rgba(139, 92, 246, 0.5);
                    --bg-dark: #020617; 
                    --card-glass: rgba(15, 23, 42, 0.75); 
                    --border: rgba(255, 255, 255, 0.08);
                }
                * { box-sizing: border-box; }

                .dashboard-wrapper { display: flex; width: 100%; min-height: 100vh; background: var(--bg-dark); font-family: 'Sora', sans-serif; overflow-x: hidden; color: #fff; }

                .main-content { 
                    flex: 1; 
                    margin-left: 260px; 
                    padding: 40px; 
                    transition: 0.3s ease; 
                    width: calc(100% - 260px);
                }

                .brand-logo-mobile { display: none; width: 100%; justify-content: center; margin-bottom: 30px; }
                .brand-logo-mobile img { height: 80px; filter: drop-shadow(0 0 10px var(--primary)); object-fit: contain; }

                .header-flex { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; flex-wrap: wrap; gap: 20px; }
                .header-flex h1 { font-size: 2.2rem; font-weight: 900; margin: 0; color: #fff; letter-spacing: -1px; }

                .management-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 30px; align-items: start; }

                .glass-card { 
                    background: var(--card-glass); 
                    backdrop-filter: blur(20px); 
                    border-radius: 30px; 
                    padding: 40px; 
                    border: 1px solid var(--border); 
                    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                }

                .input-with-icon {
                    position: relative;
                    display: flex;
                    align-items: center;
                    width: 100%;
                }

                .input-emoji {
                    position: absolute;
                    left: 20px;
                    font-size: 1.2rem;
                    z-index: 10;
                    pointer-events: none;
                    display: flex;
                    align-items: center;
                }

                .form-label { 
                    display: flex !important; 
                    flex-direction: row !important;
                    align-items: center !important; 
                    gap: 10px !important; 
                    color: #94a3b8; 
                    margin-bottom: 12px; 
                    font-weight: 700; 
                    font-size: 0.85rem; 
                    text-transform: uppercase; 
                    letter-spacing: 1px;
                }

                .form-input, select, textarea { 
                    width: 100%; 
                    padding: 18px 22px; 
                    border-radius: 18px; 
                    background: rgba(0, 0, 0, 0.4); 
                    border: 1px solid var(--border); 
                    color: #fff; 
                    outline: none; 
                    transition: 0.3s; 
                    font-family: 'Sora'; 
                    font-size: 1rem;
                }

                .input-with-icon .form-input, 
                .input-with-icon textarea {
                    padding-left: 55px !important;
                }

                .form-input:focus { border-color: var(--primary); background: #000; box-shadow: 0 0 15px rgba(139, 92, 246, 0.2); }

                .btn-submit { 
                    width: 100%; padding: 20px; border-radius: 20px; border: none; 
                    background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); 
                    color: white; font-weight: 900; cursor: pointer; transition: 0.4s;
                    box-shadow: 0 10px 25px rgba(124, 58, 237, 0.4); font-size: 1rem;
                    text-transform: uppercase; letter-spacing: 1.5px;
                }
                .btn-submit:hover { transform: translateY(-3px); filter: brightness(1.1); box-shadow: 0 15px 35px rgba(124, 58, 237, 0.6); }

                .course-item { 
                    padding: 25px; background: rgba(255,255,255,0.02); border-radius: 24px; 
                    margin-bottom: 20px; border: 1px solid var(--border); transition: 0.3s;
                }
                .action-btn { 
                    flex: 1; padding: 12px; border-radius: 14px; border: none; cursor: pointer; 
                    font-weight: 800; font-size: 0.75rem; text-transform: uppercase; transition: 0.2s;
                }
                .action-btn.aulas { background: #1e293b; color: #fff; border: 1px solid rgba(255,255,255,0.1); }
                .action-btn.edit { background: rgba(139, 92, 246, 0.15); color: #c4b5fd; border: 1px solid rgba(139, 92, 246, 0.2); }
                .action-btn.delete { background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }

                .ka-lessons-wrapper button[type="submit"] {
                    background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%) !important;
                    color: #fff !important;
                    margin-top: 20px;
                    padding: 20px !important;
                    border-radius: 18px !important;
                    font-weight: 900 !important;
                    cursor: pointer !important;
                    border: none !important;
                    width: 100% !important;
                }

                @media (max-width: 1024px) {
                    .main-content { margin-left: 0; padding: 20px; width: 100%; }
                    .brand-logo-mobile { display: flex; }
                    .management-grid { grid-template-columns: 1fr; }
                }
            `}</style>

            <main className="main-content">
                <div className="brand-logo-mobile">
                    <img src={logo} alt="KA Tech Logo" />
                </div>

                {manageLessonsCourse ? (
                    <div className="glass-card">
                         <div className="ka-lessons-wrapper">
                            <ManageLessons 
                                courseId={manageLessonsCourse.id} 
                                courseTitle={manageLessonsCourse.title} 
                                onBack={() => setManageLessonsCourse(null)} 
                            />
                         </div>
                    </div>
                ) : (
                    <>
                        <header className="header-flex">
                            <div>
                                <h1>Gestão de Conteúdo</h1>
                                <p style={{ color: '#64748b', marginTop: '5px' }}>Administre treinamentos e gamificação da KA Tech</p>
                            </div>
                            <button onClick={() => navigate("/dashboard")} className="action-btn edit" style={{ padding: '15px 30px', flex: 'none', borderRadius: '18px', fontWeight: 900 }}>
                                🏠 VOLTAR AO PAINEL
                            </button>
                        </header>

                        <div className="management-grid">
                            <div className="glass-card">
                                <h2 style={{ color: '#fff', marginBottom: '35px', fontSize: '1.5rem', fontWeight: 900 }}>
                                    {editingCourseId ? "✏️ Editar Treinamento" : "✨ Novo Treinamento"}
                                </h2>
                                <form onSubmit={handleSaveCourse}>
                                    <div style={{ marginBottom: '25px' }}>
                                        <label className="form-label">📖 Título do Curso</label>
                                        <input className="form-input" placeholder="Ex: Faturamento Softcomshop" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} required />
                                    </div>

                                    {/* --- TRILHA --- */}
                                    <div style={{ marginBottom: '25px' }}>
                                        <label className="form-label">🎯 Trilha</label>
                                        <select className="form-input" value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(Number(e.target.value))} required>
                                            <option value="">Selecione...</option>
                                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                        </select>
                                    </div>

                                    {/* --- TAGS (ABAIXO DA TRILHA) --- */}
                                    <div style={{ marginBottom: '25px' }}>
                                        <label className="form-label">🏷️ Tags</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {tags.map(tag => (
                                                <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)} 
                                                    style={{ 
                                                        padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)',
                                                        background: selectedTags.includes(tag.id) ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                                        color: '#fff', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800
                                                    }}>{tag.name}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '25px' }}>
                                        <label className="form-label">📝 Descrição do Curso</label>
                                        <textarea className="form-input" style={{ height: '120px', resize: 'none' }} placeholder="O que o aluno aprenderá?" value={courseDesc} onChange={(e) => setCourseDesc(e.target.value)} required />
                                    </div>

                                    <div style={{ marginBottom: '35px' }}>
                                        <label className="form-label">🖼️ Capa do Curso</label>
                                        <div onClick={() => document.getElementById('file-thumb')?.click()} style={{ border: '2px dashed var(--border)', padding: '30px', borderRadius: '20px', textAlign: 'center', cursor: 'pointer', color: 'var(--primary)', fontWeight: 800, background: 'rgba(139, 92, 246, 0.03)' }}>
                                            <input id="file-thumb" type="file" hidden onChange={(e) => handleUpload(e, 'course-thumbs', setCourseThumb, setUploadingThumb)} />
                                            {uploadingThumb ? "✨ Subindo imagem..." : "📤 Clique para Carregar Capa"}
                                        </div>
                                        {courseThumb && <div style={{marginTop: '15px', borderRadius: '20px', overflow: 'hidden', height: '200px', border: '1px solid var(--primary)'}}><img src={courseThumb} alt="Preview" style={{width: '100%', height: '100%', objectFit: 'cover'}} /></div>}
                                    </div>

                                    <div style={{ background: 'rgba(139, 92, 246, 0.05)', padding: '30px', borderRadius: '25px', border: '1px solid rgba(139, 92, 246, 0.1)' }}>
                                        <h3 style={{ color: '#8b5cf6', fontSize: '1.1rem', marginBottom: '20px', fontWeight: 900 }}>🏅 Gamificação: Insígnia</h3>
                                        <div style={{ marginBottom: '20px' }}>
                                            <label className="form-label">🏅 Nome da Insignia</label>
                                            <input className="form-input" placeholder="Ex: Especialista" value={badgeName} onChange={(e) => setBadgeName(e.target.value)} />
                                        </div>
                                        <button type="button" onClick={() => document.getElementById('file-badge')?.click()} className="form-input" style={{ fontSize: '0.8rem', fontWeight: 900, background: 'rgba(255,255,255,0.05)' }}>
                                            <input id="file-badge" type="file" hidden onChange={(e) => handleUpload(e, 'badges-icons', setBadgeThumb, setUploadingBadge)} />
                                            {uploadingBadge ? "Carregando..." : "📸 Upload Ícone da Medalha"}
                                        </button>
                                        {badgeThumb && <div style={{marginTop: '20px', textAlign: 'center'}}><img src={badgeThumb} alt="Badge" style={{width: '70px', height: '70px', objectFit: 'contain', filter: 'drop-shadow(0 0 10px gold)'}} /></div>}
                                    </div>

                                    <button type="submit" className="btn-submit" style={{ marginTop: '40px' }}>
                                        {editingCourseId ? "💾 Salvar Atualizações" : "🚀 Publicar na Plataforma"}
                                    </button>
                                    {editingCourseId && <button type="button" onClick={resetForm} style={{ width: '100%', marginTop: '20px', background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontWeight: 900, textDecoration: 'underline', fontSize: '0.8rem' }}>CANCELAR EDIÇÃO</button>}
                                </form>
                            </div>

                            <div className="glass-card">
                                <h2 style={{ color: '#fff', marginBottom: '35px', fontSize: '1.5rem', fontWeight: 900 }}>📚 Biblioteca Viva</h2>
                                <div style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: '10px' }}>
                                    {courses.length === 0 && <p style={{color: '#64748b', textAlign: 'center'}}>Nenhum curso disponível.</p>}
                                    {courses.map(c => (
                                        <div key={c.id} className="course-item">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                                                <div style={{ width: '5px', height: '30px', background: 'var(--primary)', borderRadius: '10px', boxShadow: '0 0 10px var(--primary)' }}></div>
                                                <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff' }}>{c.title}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button onClick={() => setManageLessonsCourse(c)} className="action-btn aulas">📺 Aulas</button>
                                                <button onClick={() => handleEditInit(c)} className="action-btn edit">✏️ Editar</button>
                                                <button onClick={() => handleDeleteCourse(c.id)} className="action-btn delete">🗑️ Excluir</button>
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