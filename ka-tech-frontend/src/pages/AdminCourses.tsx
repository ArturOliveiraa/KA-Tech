import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import axios from 'axios';

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Tag {
  id: string;
  name: string;
}

interface Lesson {
  id: number;
  title: string;
  videoUrl: string;
  content: string;
  order: number;
  duration?: number;
}

interface Course {
  id: number;
  title: string;
  description: string;
  thumbnailUrl?: string;
  category_id?: number;
  xp_weight: number;
  categories?: { name: string };
  course_tags?: { tag_id: string; tags: { name: string } }[];
}

const getYouTubeId = (url: string) => {
  const match = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([^&?/\s]{11})/);
  return match ? match[1] : null;
};

const AdminCourses: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Inputs de Categorias e Tags
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Modal de Curso
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [courseThumbnail, setCourseThumbnail] = useState('');
  const [courseCategoryId, setCourseCategoryId] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [courseXpWeight, setCourseXpWeight] = useState<number>(1);
  const [isSavingCourse, setIsSavingCourse] = useState(false);

  // Modal de Gestão de Aulas
  const [isLessonsModalOpen, setIsLessonsModalOpen] = useState(false);
  const [selectedCourseForLessons, setSelectedCourseForLessons] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [isSavingLesson, setIsSavingLesson] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: catData } = await supabase.from('categories').select('*').order('name', { ascending: true });
      if (catData) setCategories(catData);

      const { data: tagData } = await supabase.from('tags').select('*').order('name', { ascending: true });
      if (tagData) setTags(tagData);

      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`
          *,
          categories:category_id (name),
          course_tags (
            tag_id,
            tags (name)
          )
        `)
        .order('createdAt', { ascending: false });

      if (courseError) throw courseError;
      if (courseData) setCourses(courseData);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsAddingCategory(true);
    const slug = generateSlug(newCategoryName);
    try {
      const { data, error } = await supabase.from('categories').insert([{ name: newCategoryName.trim(), slug }]).select().single();
      if (error) throw error;
      if (data) {
        setCategories([...categories, data].sort((a, b) => a.name.localeCompare(b.name)));
        setNewCategoryName('');
      }
    } catch (error: any) {
      alert('Erro ao adicionar categoria: ' + error.message);
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    setIsAddingTag(true);
    try {
      const { data, error } = await supabase.from('tags').insert([{ name: newTagName.trim().toUpperCase() }]).select().single();
      if (error) throw error;
      if (data) {
        setTags([...tags, data].sort((a, b) => a.name.localeCompare(b.name)));
        setNewTagName('');
      }
    } catch (error: any) {
      alert('Erro ao adicionar setor: ' + error.message);
    } finally {
      setIsAddingTag(false);
    }
  };

  const handleOpenCourseModal = async (course?: Course) => {
    if (course) {
      setEditingCourseId(course.id);
      setCourseTitle(course.title);
      setCourseDescription(course.description);
      setCourseThumbnail(course.thumbnailUrl || '');
      setCourseCategoryId(course.category_id ? course.category_id.toString() : '');
      setCourseXpWeight(course.xp_weight || 1);

      const { data: cTags } = await supabase
        .from('course_tags')
        .select('tag_id')
        .eq('course_id', course.id);
      
      setSelectedTagIds(cTags ? cTags.map(t => t.tag_id) : []);
    } else {
      setEditingCourseId(null);
      setCourseTitle('');
      setCourseDescription('');
      setCourseThumbnail('');
      setCourseCategoryId('');
      setSelectedTagIds([]);
      setCourseXpWeight(1);
    }
    setIsCourseModalOpen(true);
  };

  const handleCloseCourseModal = () => setIsCourseModalOpen(false);

  const handleTagCheckboxChange = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      setSelectedTagIds(selectedTagIds.filter(id => id !== tagId));
    } else {
      setSelectedTagIds([...selectedTagIds, tagId]);
    }
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim() || !courseDescription.trim()) return;

    setIsSavingCourse(true);
    const slug = generateSlug(courseTitle);
    const payload = {
      title: courseTitle.trim(),
      description: courseDescription.trim(),
      thumbnailUrl: courseThumbnail.trim() || null,
      category_id: courseCategoryId ? Number(courseCategoryId) : null,
      xp_weight: Number(courseXpWeight) || 1,
      slug,
      updatedAt: new Date().toISOString()
    };

    try {
      let courseId = editingCourseId;

      if (courseId) {
        const { error } = await supabase.from('courses').update(payload).eq('id', courseId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('courses').insert([payload]).select().single();
        if (error) throw error;
        if (data) courseId = data.id;
      }

      if (courseId) {
        await supabase.from('course_tags').delete().eq('course_id', courseId);
        if (selectedTagIds.length > 0) {
          const tagInserts = selectedTagIds.map(tagId => ({
            course_id: courseId,
            tag_id: tagId
          }));
          await supabase.from('course_tags').insert(tagInserts);
        }
      }

      fetchData();
      handleCloseCourseModal();
    } catch (error: any) {
      alert('Erro ao salvar curso: ' + error.message);
    } finally {
      setIsSavingCourse(false);
    }
  };

  const handleDeleteCourse = async (id: number, title: string) => {
    if (!window.confirm(`Excluir o curso "${title}"?`)) return;
    try {
      await supabase.from('course_tags').delete().eq('course_id', id);
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) throw error;
      setCourses(courses.filter(c => c.id !== id));
    } catch (error: any) {
      alert('Erro ao excluir curso.');
    }
  };

  // --- GESTÃO DE AULAS NO MODAL ---
  const handleOpenLessonsModal = async (course: Course) => {
    setSelectedCourseForLessons(course);
    setIsLessonsModalOpen(true);
    setLoadingLessons(true);
    resetLessonForm();
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', course.id)
        .order('order', { ascending: true });
      if (error) throw error;
      if (data) setLessons(data);
    } catch (error) {
      console.error('Erro ao buscar aulas:', error);
    } finally {
      setLoadingLessons(false);
    }
  };

  const handleCloseLessonsModal = () => {
    setIsLessonsModalOpen(false);
    setSelectedCourseForLessons(null);
    setLessons([]);
    resetLessonForm();
  };

  const resetLessonForm = () => {
    setEditingLessonId(null);
    setLessonTitle('');
    setLessonVideoUrl('');
    setLessonContent('');
  };

  const fetchYoutubeDuration = async (url: string): Promise<number> => {
    try {
      const videoId = getYouTubeId(url);
      if (!videoId) return 3;
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
      if (!apiKey) return 3;
      
      const { data } = await axios.get(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${apiKey}`);
      if (!data.items?.length) return 3;
      
      const durationISO = data.items[0].contentDetails.duration;
      const hours = durationISO.match(/(\d+)H/)?.[1] || "0";
      const minutes = durationISO.match(/(\d+)M/)?.[1] || "0";
      const seconds = durationISO.match(/(\d+)S/)?.[1] || "0";
      return parseFloat(((parseInt(hours) * 60) + parseInt(minutes) + (parseInt(seconds) / 60)).toFixed(2));
    } catch (err) {
      return 3;
    }
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForLessons || !lessonTitle.trim()) return;

    setIsSavingLesson(true);
    let duration = 0;
    if (lessonVideoUrl.trim()) {
      duration = await fetchYoutubeDuration(lessonVideoUrl.trim());
    }

    try {
      if (editingLessonId) {
        const updatePayload: any = {
          title: lessonTitle.trim(),
          videoUrl: lessonVideoUrl.trim() || null,
          content: lessonContent.trim() || null,
        };
        if (duration > 0) updatePayload.duration = duration;

        const { error } = await supabase
          .from('lessons')
          .update(updatePayload)
          .eq('id', editingLessonId);

        if (error) throw error;
      } else {
        const nextOrder = lessons.length > 0 ? Math.max(...lessons.map(l => l.order || 0)) + 1 : 1;
        const { error } = await supabase
          .from('lessons')
          .insert([{
            title: lessonTitle.trim(),
            videoUrl: lessonVideoUrl.trim() || null,
            content: lessonContent.trim() || null,
            duration: duration > 0 ? duration : 3,
            order: nextOrder,
            course_id: selectedCourseForLessons.id
          }]);

        if (error) throw error;
      }

      const { data } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', selectedCourseForLessons.id)
        .order('order', { ascending: true });
      if (data) setLessons(data);

      resetLessonForm();
    } catch (error: any) {
      alert('Erro ao salvar aula: ' + error.message);
    } finally {
      setIsSavingLesson(false);
    }
  };

  const handleEditLessonClick = (lesson: Lesson) => {
    setEditingLessonId(lesson.id);
    setLessonTitle(lesson.title);
    setLessonVideoUrl(lesson.videoUrl || '');
    setLessonContent(lesson.content || '');
  };

  const handleDeleteLesson = async (lessonId: number) => {
    if (!window.confirm('Excluir esta aula?')) return;
    try {
      const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
      if (error) throw error;
      setLessons(lessons.filter(l => l.id !== lessonId));
      if (editingLessonId === lessonId) resetLessonForm();
    } catch (error: any) {
      alert('Erro ao excluir aula.');
    }
  };

  // Filtragem por termo de busca e por Categoria
  const filteredCourses = courses.filter(c => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = c.title?.toLowerCase().includes(term) || c.description?.toLowerCase().includes(term);
    
    let matchesCategory = true;
    if (selectedCategoryFilter !== 'all') {
      matchesCategory = c.category_id?.toString() === selectedCategoryFilter;
    }

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="admin-layout">
      <Sidebar />

      <style>{`
        .admin-layout { display: flex; min-height: 100vh; background-color: #060913; font-family: 'Segoe UI', Roboto, sans-serif; position: relative; }
        .admin-main-content { flex: 1; margin-left: 270px; padding: 40px; padding-bottom: 140px; color: #E2E8F0; width: calc(100% - 270px); box-sizing: border-box; }
        
        .admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; flex-wrap: wrap; gap: 20px; }
        .header-text h1 { font-size: 2.2rem; font-weight: 800; margin: 0 0 8px 0; color: #FFFFFF; }
        .header-text p { color: #8BA0B8; margin: 0; font-size: 1rem; }

        .btn-primary { background: #FF9800; border: none; color: #FFF; padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
        .btn-primary:hover { background: #F57C00; box-shadow: 0 4px 15px rgba(255, 152, 0, 0.3); }

        .management-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-bottom: 40px; }
        .manage-card { background: #0B0E17; border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 20px; }
        .manage-card-header h2 { font-size: 1.2rem; font-weight: 800; color: #FFF; margin: 0; }

        .manage-input { width: 100%; box-sizing: border-box; height: 48px; background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.05); color: #FFF; border-radius: 12px; padding: 0 16px; font-size: 0.95rem; outline: none; transition: 0.3s; }
        .manage-input:focus { border-color: rgba(255, 255, 255, 0.15); }
        .manage-input::placeholder { color: #475569; }

        .btn-manage { width: 100%; height: 48px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); color: #FFF; border-radius: 12px; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-manage:hover:not(:disabled) { background: rgba(255, 255, 255, 0.08); }
        .btn-manage:disabled { opacity: 0.5; cursor: not-allowed; }

        .badges-container { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 4px; }
        .badge-item { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); color: #E2E8F0; padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; }
        .badge-empty { color: #475569; font-size: 0.9rem; font-weight: 500; }

        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px; }
        .section-header h2 { font-size: 1.5rem; font-weight: 800; color: #FFF; margin: 0; }
        
        .filters-toolbar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; width: 100%; max-width: 600px; }
        .search-bar { background: #0B0E17; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 0 15px 0 40px; height: 42px; color: #FFF; flex: 1; min-width: 220px; font-size: 0.9rem; outline: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238BA0B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'%3E%3C/circle%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'%3E%3C/line%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: 12px center; }
        .filter-select { background: #0B0E17; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 0 15px; height: 42px; color: #E2E8F0; font-size: 0.9rem; outline: none; cursor: pointer; }

        .table-container { background: rgba(255, 255, 255, 0.02); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.05); overflow-x: auto; width: 100%; }
        .admin-table { width: 100%; border-collapse: collapse; text-align: left; min-width: 750px; }
        .admin-table th { padding: 16px 20px; color: #8BA0B8; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid rgba(255, 255, 255, 0.05); background: rgba(0, 0, 0, 0.2); }
        .admin-table td { padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.03); font-size: 0.9rem; vertical-align: middle; }
        .admin-table tbody tr:hover { background: rgba(255, 255, 255, 0.03); }

        .course-info { display: flex; align-items: center; gap: 12px; }
        .course-thumb { width: 50px; height: 35px; border-radius: 6px; object-fit: cover; background: #1a233a; border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0; }
        
        .action-actions-cell { display: flex; gap: 6px; justify-content: center; }
        .action-btn { background: none; border: none; color: #8BA0B8; cursor: pointer; font-size: 1rem; padding: 6px; border-radius: 8px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .action-btn:hover { color: #FF9800; background: rgba(255, 152, 0, 0.1); }
        .action-btn.lessons:hover { color: #38BDF8; background: rgba(56, 189, 248, 0.1); }
        .action-btn.delete:hover { color: #EF4444; background: rgba(239, 68, 68, 0.1); }

        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); display: flex; justify-content: center; align-items: center; z-index: 2000; padding: 15px; box-sizing: border-box; }
        .modal-content { background: #111625; width: 100%; max-width: 600px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 40px rgba(0,0,0,0.5); padding: 24px; display: flex; flex-direction: column; gap: 16px; max-height: 90vh; overflow-y: auto; box-sizing: border-box; }
        .modal-title { font-size: 1.3rem; font-weight: 700; color: #FFF; margin: 0; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
        
        .modal-group { display: flex; flex-direction: column; gap: 6px; }
        .modal-label { color: #8BA0B8; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; }
        .modal-input, .modal-select, .modal-textarea { box-sizing: border-box; width: 100%; background: #0B0E17; border: 1px solid rgba(255,255,255,0.1); color: #E2E8F0; border-radius: 10px; font-size: 0.95rem; outline: none; padding: 12px 15px; }
        .modal-textarea { resize: vertical; min-height: 80px; }
        .modal-input:focus, .modal-select:focus, .modal-textarea:focus { border-color: #FF9800; box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.15); }

        .checkbox-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; background: #0B0E17; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 12px; max-height: 140px; overflow-y: auto; }
        .checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #E2E8F0; cursor: pointer; }

        .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 10px; }
        .btn-cancel { background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #8BA0B8; padding: 10px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; }
        .btn-save { background: #FF9800; border: none; color: #FFF; padding: 10px 24px; border-radius: 10px; font-weight: 700; cursor: pointer; }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

        .lesson-row { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 12px 16px; border-radius: 10px; margin-bottom: 8px; gap: 10px; flex-wrap: wrap; }

        /* RESPONSIVIDADE MOBILE BLINDADA */
        @media (max-width: 1024px) { 
          .admin-main-content { margin-left: 0; padding: 16px; padding-bottom: 160px; width: 100%; box-sizing: border-box; } 
          .admin-header { flex-direction: column; align-items: flex-start; gap: 15px; }
          .btn-primary { width: 100%; justify-content: center; }
          .management-grid { grid-template-columns: 1fr; }
          .section-header { flex-direction: column; align-items: stretch; gap: 12px; }
          .filters-toolbar { width: 100%; max-width: 100%; flex-direction: column; }
          .search-bar, .filter-select { width: 100%; max-width: 100%; box-sizing: border-box; }
          .checkbox-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <main className="admin-main-content">
        <div className="admin-header">
          <div className="header-text">
            <h1>Cursos e Trilhas</h1>
            <p>Gerencie categorias, setores, o catálogo de cursos e suas respectivas aulas.</p>
          </div>
          <button className="btn-primary" onClick={() => handleOpenCourseModal()}>
            + Novo Curso
          </button>
        </div>

        {/* GESTÃO DE CATEGORIAS E SETORES */}
        <div className="management-grid">
          <div className="manage-card">
            <div className="manage-card-header"><h2>Categorias</h2></div>
            <div className="input-wrapper">
              <input type="text" className="manage-input" placeholder="Nova Categoria (Ex: Vendas)" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()} />
            </div>
            <button className="btn-manage" onClick={handleAddCategory} disabled={isAddingCategory || !newCategoryName.trim()}>+ Adicionar Categoria</button>
            <div className="badges-container">
              {loading ? <span className="badge-empty">Carregando...</span> : categories.map(cat => <div key={cat.id} className="badge-item">{cat.name}</div>)}
            </div>
          </div>

          <div className="manage-card">
            <div className="manage-card-header"><h2>Setores (Tags)</h2></div>
            <div className="input-wrapper">
              <input type="text" className="manage-input" placeholder="Novo Setor (Ex: COMERCIAL)" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTag()} />
            </div>
            <button className="btn-manage" onClick={handleAddTag} disabled={isAddingTag || !newTagName.trim()}>+ Adicionar Setor</button>
            <div className="badges-container">
              {loading ? <span className="badge-empty">Carregando...</span> : tags.map(tag => <div key={tag.id} className="badge-item">{tag.name}</div>)}
            </div>
          </div>
        </div>

        {/* LISTAGEM DE CURSOS COM FILTRO POR CATEGORIA */}
        <div className="section-header">
          <h2>Cursos Cadastrados</h2>
          <div className="filters-toolbar">
            <select 
              className="filter-select"
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            >
              <option value="all">Todas as Categorias</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <input 
              type="text" 
              className="search-bar" 
              placeholder="Buscar por título ou descrição..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>

        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Curso</th>
                <th>Categoria</th>
                <th>Setores (Tags)</th>
                <th>Peso XP</th>
                <th style={{ textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#8BA0B8' }}>Carregando cursos...</td></tr>
              ) : filteredCourses.length > 0 ? (
                filteredCourses.map((course) => (
                  <tr key={course.id}>
                    <td>
                      <div className="course-info">
                        <img src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100&auto=format&fit=crop&q=60'} alt={course.title} className="course-thumb" />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: '#FFF' }}>{course.title}</span>
                          <span style={{ fontSize: '0.8rem', color: '#8BA0B8', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.description}</span>
                        </div>
                      </div>
                    </td>
                    <td><span style={{ color: '#E2E8F0', fontWeight: 500 }}>{course.categories?.name || '-'}</span></td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {course.course_tags?.map((ct, idx) => (
                          <span key={idx} className="badge-item" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>{ct.tags?.name}</span>
                        )) || '-'}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#FF9800' }}>{course.xp_weight || 1}x</td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="action-actions-cell">
                        <button className="action-btn lessons" title="Gerenciar Aulas" onClick={() => handleOpenLessonsModal(course)}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                        </button>
                        <button className="action-btn" title="Editar Curso" onClick={() => handleOpenCourseModal(course)}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button className="action-btn delete" title="Excluir Curso" onClick={() => handleDeleteCourse(course.id, course.title)}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#8BA0B8' }}>Nenhum curso encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* MODAL DE CURSO */}
      {isCourseModalOpen && (
        <div className="modal-overlay" onClick={handleCloseCourseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">
              <span>{editingCourseId ? 'Editar Curso' : 'Cadastrar Novo Curso'}</span>
              <button onClick={handleCloseCourseModal} style={{ background: 'none', border: 'none', color: '#8BA0B8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </h2>

            <form onSubmit={handleSaveCourse} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="modal-group">
                <label className="modal-label">Título do Curso *</label>
                <input type="text" className="modal-input" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} required />
              </div>

              <div className="modal-group">
                <label className="modal-label">Descrição *</label>
                <textarea className="modal-textarea" value={courseDescription} onChange={(e) => setCourseDescription(e.target.value)} required />
              </div>

              <div className="modal-group">
                <label className="modal-label">URL da Thumbnail (Capa)</label>
                <input type="url" className="modal-input" value={courseThumbnail} onChange={(e) => setCourseThumbnail(e.target.value)} />
              </div>

              <div className="modal-group">
                <label className="modal-label">Categoria</label>
                <select className="modal-select modal-input" value={courseCategoryId} onChange={(e) => setCourseCategoryId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>

              <div className="modal-group">
                <label className="modal-label">Setores / Tags</label>
                <div className="checkbox-grid">
                  {tags.map(tag => (
                    <label key={tag.id} className="checkbox-label">
                      <input type="checkbox" checked={selectedTagIds.includes(tag.id)} onChange={() => handleTagCheckboxChange(tag.id)} />
                      {tag.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-group">
                <label className="modal-label">Peso de XP</label>
                <input type="number" min="1" max="10" className="modal-input" value={courseXpWeight} onChange={(e) => setCourseXpWeight(Number(e.target.value))} />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={handleCloseCourseModal} disabled={isSavingCourse}>Cancelar</button>
                <button type="submit" className="btn-save" disabled={isSavingCourse}>{isSavingCourse ? 'Salvando...' : 'Salvar Curso'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE GESTÃO E EDIÇÃO DE AULAS */}
      {isLessonsModalOpen && selectedCourseForLessons && (
        <div className="modal-overlay" onClick={handleCloseLessonsModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <h2 className="modal-title">
              <span>Gerenciar Aulas: {selectedCourseForLessons.title}</span>
              <button onClick={handleCloseLessonsModal} style={{ background: 'none', border: 'none', color: '#8BA0B8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </h2>

            <form onSubmit={handleSaveLesson} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '14px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FF9800', textTransform: 'uppercase' }}>
                  {editingLessonId ? 'Editando Aula' : 'Adicionar Nova Aula (Duração Automática)'}
                </span>
                {editingLessonId && (
                  <button type="button" onClick={resetLessonForm} style={{ background: 'transparent', border: 'none', color: '#38BDF8', fontSize: '0.8rem', cursor: 'pointer' }}>
                    Cancelar Edição
                  </button>
                )}
              </div>
              
              <input type="text" className="modal-input" placeholder="Título da Aula *" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} required />
              <input type="url" className="modal-input" placeholder="URL do Vídeo do YouTube (Ex: https://youtube.com/watch?v=...)" value={lessonVideoUrl} onChange={(e) => setLessonVideoUrl(e.target.value)} required />
              <textarea className="modal-textarea" placeholder="Transcrição ou base de conteúdo para IA..." value={lessonContent} onChange={(e) => setLessonContent(e.target.value)} />

              <button type="submit" className="btn-save" style={{ alignSelf: 'flex-end', padding: '8px 16px' }} disabled={isSavingLesson || !lessonTitle.trim()}>
                {isSavingLesson ? 'Salvando...' : editingLessonId ? 'Atualizar Aula' : '+ Adicionar Aula'}
              </button>
            </form>

            <div style={{ maxHeight: '250px', overflowY: 'auto', marginTop: '10px' }}>
              {loadingLessons ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#8BA0B8' }}>Carregando aulas...</div>
              ) : lessons.length > 0 ? (
                lessons.map((lesson, idx) => (
                  <div key={lesson.id} className="lesson-row" style={{ borderColor: editingLessonId === lesson.id ? '#FF9800' : 'rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                      <span style={{ color: '#FF9800', fontWeight: 'bold', fontSize: '0.85rem' }}>#{idx + 1}</span>
                      <span style={{ color: '#FFF', fontWeight: 500, fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{lesson.title}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                      <span style={{ color: '#8BA0B8', fontSize: '0.8rem' }}>{lesson.duration ? `${lesson.duration} min` : '0 min'}</span>
                      <button className="action-btn" title="Editar Aula" onClick={() => handleEditLessonClick(lesson)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                      <button className="action-btn delete" title="Excluir Aula" onClick={() => handleDeleteLesson(lesson.id)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#8BA0B8' }}>Nenhuma aula cadastrada neste curso.</div>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-save" onClick={handleCloseLessonsModal}>Fechar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminCourses;