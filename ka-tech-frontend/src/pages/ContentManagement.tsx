import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import ManageLessons from "../components/ManageLessons";
import { useUser } from "../components/UserContext";

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
    // userName removido para limpar o warning de 'never used'
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

    if (loading || contextLoading) return <div className="loading-box" style={{ color: 'white', padding: '100px', textAlign: 'center', fontFamily: 'Sora' }}>Sincronizando conteúdos...</div>;

    return (
        <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#020617', fontFamily: "'Sora', sans-serif", overflowX: 'hidden' }}>
            <Sidebar />

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
                .file-upload-box { border: 2px dashed rgba(139, 92, 246, 0.3); padding: 30px; border-radius: 20px; text-align: center; cursor: pointer; transition: 0.3s; background: rgba(139, 92, 246, 0.02); }
                .local-primary-button { 
                    background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%) !important;
                    border: none !important; padding: 18px 32px !important; border-radius: 16px !important;
                    color: white !important; font-weight: 800 !important; cursor: pointer !important;
                }
                .tag-btn { padding: 10px 18px; border-radius: 10px; border: 1px solid rgba(139, 92, 246, 0.2); background: rgba(2, 6, 23, 0.5); color: #fff; cursor: pointer; font-size: 0.8rem; transition: 0.2s; }
                .tag-btn.active { background: #8b5cf6; border-color: #8b5cf6; font-weight: 700; }
            `}</style>

            <main className="dashboard-content" style={{ flex: 1, padding: '40px', marginLeft: '260px' }}>
                {manageLessonsCourse ? (
                    <ManageLessons courseId={manageLessonsCourse.id} courseTitle={manageLessonsCourse.title} onBack={() => setManageLessonsCourse(null)} />
                ) : (
                    <>
                        <header style={{ marginBottom: '50px', display: 'flex', justifyContent: 'space-between' }}>
                            <h1 style={{ color: '#fff', fontSize: '2.5rem', fontWeight: 900 }}>Gestão de Conteúdo</h1>
                            <button onClick={() => navigate("/dashboard")} className="local-primary-button" style={{ padding: '12px 24px', fontSize: '0.8rem' }}>Painel Inicial</button>
                        </header>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '40px' }}>
                            <div style={{ background: '#09090b', padding: '40px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <form onSubmit={handleSaveCourse}>
                                    <div style={{ marginBottom: '25px' }}>
                                        <label className="form-label">Nome do Curso</label>
                                        <input className="form-input" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} required />
                                    </div>

                                    <div style={{ marginBottom: '25px' }}>
                                        <label className="form-label">Trilha</label>
                                        <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(Number(e.target.value))} required>
                                            <option value="">Selecionar...</option>
                                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                        </select>
                                    </div>

                                    <div style={{ marginBottom: '25px' }}>
                                        <label className="form-label">Tags (Habilidades)</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                            {tags.map(tag => (
                                                <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)} className={`tag-btn ${selectedTags.includes(tag.id) ? 'active' : ''}`}>{tag.name}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '25px' }}>
                                        <label className="form-label">Descrição</label>
                                        <textarea className="form-input" style={{ height: '100px', paddingLeft: '16px' }} value={courseDesc} onChange={(e) => setCourseDesc(e.target.value)} required />
                                    </div>

                                    <div style={{ marginBottom: '25px' }}>
                                        <label className="form-label">Capa</label>
                                        <div className="file-upload-box" onClick={() => document.getElementById('file-thumb')?.click()}>
                                            <input id="file-thumb" type="file" hidden onChange={(e) => handleUpload(e, 'course-thumbs', setCourseThumb, setUploadingThumb)} />
                                            {uploadingThumb ? "Subindo..." : "Clique para alterar"}
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '40px', borderTop: '1px solid #1f2937', paddingTop: '30px' }}>
                                        <label className="form-label">Insignia do Curso</label>
                                        <input className="form-input" placeholder="Nome da Medalha" value={badgeName} onChange={(e) => setBadgeName(e.target.value)} />
                                        <div className="file-upload-box" style={{ marginTop: '15px' }} onClick={() => document.getElementById('file-badge')?.click()}>
                                            <input id="file-badge" type="file" hidden onChange={(e) => handleUpload(e, 'badges-icons', setBadgeThumb, setUploadingBadge)} />
                                            {uploadingBadge ? "Carregando..." : "Foto da Insígnia"}
                                        </div>
                                    </div>

                                    <button type="submit" className="local-primary-button" style={{ width: '100%', marginTop: '40px' }}>{editingCourseId ? "Salvar Alterações" : "Criar Curso"}</button>
                                </form>
                            </div>

                            <div style={{ background: '#09090b', padding: '30px', borderRadius: '32px' }}>
                                <h2 style={{ color: '#fff', marginBottom: '20px' }}>Cursos Existentes</h2>
                                {courses.map(c => (
                                    <div key={c.id} style={{ padding: '15px', background: '#020617', borderRadius: '15px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#fff', fontSize: '0.9rem' }}>{c.title}</span>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <button onClick={() => setManageLessonsCourse(c)} style={{ background: '#1e293b', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer' }}>Aulas</button>
                                            <button onClick={() => handleEditInit(c)} style={{ background: '#334155', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer' }}>Edit</button>
                                            <button onClick={() => handleDeleteCourse(c.id)} style={{ background: '#450a0a', border: 'none', color: '#ef4444', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer' }}>X</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}