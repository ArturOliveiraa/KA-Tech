import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GenerateQuizButton } from "./GenerateQuizButton";
import { QuizEditor } from "./QuizEditor";

interface Lesson {
  id: number;
  title: string;
  videoUrl: string;
  content: string;
  order: number;
  duration?: number;
}

interface ManageLessonsProps {
  courseId: number;
  courseTitle: string;
  onBack: () => void;
}

const getYouTubeId = (url: string) => {
  const match = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([^&?/\s]{11})/);
  return match ? match[1] : null;
};

export default function ManageLessons({ courseId, courseTitle, onBack }: ManageLessonsProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    id: 0,
    title: "",
    videoUrl: "",
    content: "",
    order: 1,
  });

  const [activeQuiz, setActiveQuiz] = useState<any>(null);

  const syncCourseDuration = async () => {
    try {
      const { data: allLessons } = await supabase.from("lessons").select("duration").eq("course_id", courseId);
      if (allLessons) {
        const total = allLessons.reduce((acc, curr) => acc + (curr.duration || 0), 0);
        await supabase.from("courses").update({ total_duration: parseFloat(total.toFixed(2)) }).eq("id", courseId);
      }
    } catch (err) {
      console.error("Erro ao sincronizar tempo do curso:", err);
    }
  };

  const saveLessonEmbedding = async (lesson_id: number, text: string) => {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) return;
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
      const result = await model.embedContent(text);
      const vector = result.embedding.values;

      if (vector) {
        await supabase.from("aula_embeddings").upsert({ lesson_id, content: text, embedding: vector }, { onConflict: 'lesson_id' });
      }
    } catch (err: any) {
      console.error("Embedding fallback...", err.message);
    }
  };

  const fetchLessons = useCallback(async () => {
    const { data } = await supabase.from("lessons").select("*").eq("course_id", courseId).order("order", { ascending: true });
    if (data) {
      setLessons(data);
      if (data.length > 0 && !formData.id) {
        const maxOrder = Math.max(...data.map(l => l.order));
        setFormData(prev => ({ ...prev, order: maxOrder + 1 }));
      }
    }
  }, [courseId, formData.id]);

  useEffect(() => { fetchLessons(); }, [fetchLessons]);

  const getVideoDuration = async (url: string): Promise<number> => {
    try {
      const videoId = getYouTubeId(url);
      if (!videoId) return 0;
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
      if (!apiKey) return 0;
      
      const { data } = await axios.get(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${apiKey}`);
      if (!data.items?.length) return 0;
      
      const durationISO = data.items[0].contentDetails.duration;
      const hours = durationISO.match(/(\d+)H/)?.[1] || "0";
      const minutes = durationISO.match(/(\d+)M/)?.[1] || "0";
      const seconds = durationISO.match(/(\d+)S/)?.[1] || "0";
      return parseFloat(((parseInt(hours) * 60) + parseInt(minutes) + (parseInt(seconds) / 60)).toFixed(2));
    } catch (err) {
      return 0;
    }
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const duration = await getVideoDuration(formData.videoUrl);
      const lessonPayload = {
        title: formData.title,
        videoUrl: formData.videoUrl,
        content: formData.content,
        order: formData.order,
        course_id: courseId,
        duration
      };

      let lessonIdToEmbed = formData.id;

      if (formData.id) {
        const { error } = await supabase.from("lessons").update(lessonPayload).eq("id", formData.id);
        if (error) throw error;
      } else {
        const { data: newLesson, error } = await supabase.from("lessons").insert([lessonPayload]).select().single();
        if (error) throw error;
        lessonIdToEmbed = newLesson.id;
      }

      await syncCourseDuration();
      if (formData.content) await saveLessonEmbedding(lessonIdToEmbed, formData.content);
      
      closePanel();
      fetchLessons();
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const moveLesson = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;
    const current = lessons[index];
    const target = lessons[targetIndex];
    await Promise.all([
      supabase.from("lessons").update({ order: target.order }).eq("id", current.id),
      supabase.from("lessons").update({ order: current.order }).eq("id", target.id)
    ]);
    fetchLessons();
  };

  const handleDeleteLesson = async (id: number) => {
    if (!window.confirm("Deseja realmente excluir esta aula?")) return;
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (!error) { await syncCourseDuration(); fetchLessons(); }
  };

  const openNewLessonPanel = () => {
    const nextOrder = lessons.length > 0 ? Math.max(...lessons.map(l => l.order)) + 1 : 1;
    setFormData({ id: 0, title: "", videoUrl: "", content: "", order: nextOrder });
    setIsPanelOpen(true);
  };

  const openEditPanel = (lesson: Lesson) => {
    setFormData({
      id: lesson.id,
      title: lesson.title,
      videoUrl: lesson.videoUrl,
      content: lesson.content,
      order: lesson.order,
    });
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setTimeout(() => {
      setFormData({ id: 0, title: "", videoUrl: "", content: "", order: 1 });
    }, 300);
  };

  return (
    <div style={{ color: '#f8fafc', minHeight: '80vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <button onClick={onBack} style={{ background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            ← Voltar aos Cursos
          </button>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0, color: '#fff' }}>
            Gerenciar Aulas: <span style={{ color: '#FF9800' }}>{courseTitle}</span>
          </h2>
        </div>
        <button onClick={openNewLessonPanel} style={{ background: '#FF9800', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          + Nova Aula
        </button>
      </header>

      {lessons.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '16px', background: 'rgba(255,255,255,0.01)' }}>
          <p style={{ color: '#8BA0B8', marginBottom: '16px' }}>Nenhuma aula cadastrada nesta trilha.</p>
          <button onClick={openNewLessonPanel} style={{ background: '#FF9800', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Adicionar Primeira Aula</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {lessons.map((l, index) => {
            const ytId = getYouTubeId(l.videoUrl);
            const thumbUrl = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=140&auto=format&fit=crop&q=60`;

            return (
              <div key={l.id} style={{ display: 'flex', background: '#0B0E17', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px', padding: '14px 20px', alignItems: 'center', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <button onClick={() => moveLesson(index, 'up')} disabled={index === 0} style={{ background: 'transparent', border: 'none', color: '#8BA0B8', cursor: 'pointer' }}>▲</button>
                  <span style={{ color: '#8BA0B8', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center' }}>{l.order}</span>
                  <button onClick={() => moveLesson(index, 'down')} disabled={index === lessons.length - 1} style={{ background: 'transparent', border: 'none', color: '#8BA0B8', cursor: 'pointer' }}>▼</button>
                </div>

                <img src={thumbUrl} alt="Thumb" style={{ width: '120px', height: '68px', borderRadius: '8px', objectFit: 'cover', background: '#000' }} />

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>{l.title}</span>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {l.duration ? <span style={{ fontSize: '0.75rem', background: 'rgba(255,152,0,0.1)', color: '#FF9800', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>⏱ {l.duration} min</span> : null}
                    {l.content ? <span style={{ fontSize: '0.75rem', background: 'rgba(34,197,94,0.1)', color: '#4ADE80', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>✨ IA Treinada</span> : <span style={{ fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#EF4444', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>⚠️ Sem Base IA</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <GenerateQuizButton 
                    courseId={courseId} lessonId={l.id} 
                    title={`Quiz: ${l.title}`} 
                    description={l.content || `Quiz da aula: ${l.title}`}
                    onQuizGenerated={(data: any) => setActiveQuiz(data)}
                  />
                  <button onClick={() => openEditPanel(l)} title="Editar" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#38BDF8', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer' }}>✏️</button>
                  <button onClick={() => handleDeleteLesson(l.id)} title="Excluir" style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#EF4444', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer' }}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Gaveta Lateral */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', zIndex: 40, opacity: isPanelOpen ? 1 : 0, pointerEvents: isPanelOpen ? 'all' : 'none', transition: '0.3s' }} onClick={closePanel}></div>
      <div style={{ position: 'fixed', top: 0, right: isPanelOpen ? 0 : '-500px', width: '100%', maxWidth: '480px', height: '100vh', background: '#111625', zIndex: 50, padding: '30px', transition: 'right 0.4s ease', overflowY: 'auto', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>{formData.id ? "Editar Aula" : "Nova Aula"}</h3>
          <button onClick={closePanel} style={{ background: 'none', border: 'none', color: '#8BA0B8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        <form onSubmit={handleSaveLesson} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ color: '#8BA0B8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Título da Aula</label>
            <input type="text" style={{ width: '100%', boxSizing: 'border-box', background: '#0B0E17', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px', borderRadius: '10px', marginTop: '6px' }} required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
          </div>

          <div>
            <label style={{ color: '#8BA0B8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Link do YouTube (Duração automática)</label>
            <input type="url" style={{ width: '100%', boxSizing: 'border-box', background: '#0B0E17', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px', borderRadius: '10px', marginTop: '6px' }} required placeholder="https://youtube.com/watch?v=..." value={formData.videoUrl} onChange={(e) => setFormData({...formData, videoUrl: e.target.value})} />
          </div>

          <div>
            <label style={{ color: '#8BA0B8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Ordem de Exibição</label>
            <input type="number" style={{ width: '100%', boxSizing: 'border-box', background: '#0B0E17', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px', borderRadius: '10px', marginTop: '6px' }} required min="1" value={formData.order} onChange={(e) => setFormData({...formData, order: Number(e.target.value)})} />
          </div>

          <div>
            <label style={{ color: '#8BA0B8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Transcrição / Base para IA</label>
            <textarea style={{ width: '100%', boxSizing: 'border-box', background: '#0B0E17', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px', borderRadius: '10px', marginTop: '6px', minHeight: '150px' }} required value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} />
          </div>

          <button type="submit" disabled={loading} style={{ background: '#FF9800', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', marginTop: '10px' }}>
            {loading ? 'Buscando duração & Salvando...' : formData.id ? 'Salvar Alterações' : 'Publicar Aula'}
          </button>
        </form>
      </div>

      {activeQuiz && (
        <QuizEditor 
          initialData={activeQuiz} courseId={courseId} lessonId={activeQuiz.lessonId}
          onClose={() => setActiveQuiz(null)} 
          onSaved={() => { setActiveQuiz(null); alert("Quiz salvo com sucesso!"); }} 
        />
      )}
    </div>
  );
}