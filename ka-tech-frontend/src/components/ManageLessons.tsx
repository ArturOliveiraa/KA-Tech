import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- IMPORTAÇÕES DA IA E EDITOR DE QUIZ ---
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

// Helper para extrair ID do YouTube e pegar a Thumbnail
const getYouTubeId = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([^&?/\s]{11})/);
  return match ? match[1] : null;
};

export default function ManageLessons({ courseId, courseTitle, onBack }: ManageLessonsProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  
  // Estado unificado para o formulário
  const [formData, setFormData] = useState({
    id: 0,
    title: "",
    videoUrl: "",
    content: "",
    order: 1,
  });

  const [activeQuiz, setActiveQuiz] = useState<any>(null);

  // --- LÓGICA DE NEGÓCIO MANTIDA INTACTA ---
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
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
      const result = await model.embedContent(text);
      const vector = result.embedding.values;

      if (vector) {
        await supabase.from("aula_embeddings").upsert({ lesson_id, content: text, embedding: vector }, { onConflict: 'lesson_id' });
      }
    } catch (err: any) {
      console.error("Fallback ativado...", err.message);
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

  // --- ACTIONS ---
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
    if (!window.confirm("Deseja realmente excluir esta aula? Isso removerá a IA associada.")) return;
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (!error) { await syncCourseDuration(); fetchLessons(); }
  };

  // --- UI CONTROLS ---
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
    }, 300); // Aguarda a animação fechar para limpar
  };

  return (
    <div className="ka-dashboard-layout">
      <style>{`
        .ka-dashboard-layout { 
          position: relative; color: #f8fafc; min-height: 80vh; 
          font-family: 'Inter', system-ui, sans-serif;
        }
        
        /* Cabeçalho */
        .header-actions { 
          display: flex; justify-content: space-between; align-items: flex-end; 
          margin-bottom: 40px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 24px;
        }
        .btn-back { 
          background: transparent; color: #94a3b8; padding: 0; border: none; 
          cursor: pointer; transition: 0.2s; font-weight: 600; font-size: 0.9rem;
          display: inline-flex; align-items: center; gap: 6px;
        }
        .btn-back:hover { color: #8b5cf6; transform: translateX(-4px); }
        
        .btn-primary { 
          background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); 
          color: #fff; border: none; padding: 12px 28px; border-radius: 12px; 
          font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: 0.3s; 
          box-shadow: 0 4px 15px rgba(139, 92, 246, 0.2); display: flex; align-items: center; gap: 8px;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(139, 92, 246, 0.4); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Lista e Cards */
        .lesson-grid { display: flex; flex-direction: column; gap: 16px; }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .lesson-card { 
          display: flex; background: rgba(30, 41, 59, 0.4); 
          backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.05); 
          border-radius: 16px; padding: 16px 24px; align-items: center; gap: 24px; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: slideIn 0.4s ease-out forwards;
        }
        .lesson-card:hover { 
          border-color: rgba(139, 92, 246, 0.4); 
          background: rgba(30, 41, 59, 0.7);
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          transform: translateY(-2px);
        }
        
        /* Controles de Ordem */
        .order-controls { display: flex; flex-direction: column; gap: 4px; }
        .btn-order {
          background: transparent; border: none; color: #475569; width: 24px; height: 24px;
          display: flex; align-items: center; justify-content: center; border-radius: 6px;
          cursor: pointer; transition: 0.2s; font-size: 0.8rem;
        }
        .btn-order:hover:not(:disabled) { background: rgba(255,255,255,0.05); color: #f8fafc; }
        .btn-order:disabled { opacity: 0.2; cursor: not-allowed; }

        .lesson-thumb { 
          width: 140px; height: 78px; border-radius: 10px; background: #0f172a; 
          object-fit: cover; border: 1px solid rgba(255,255,255,0.08); 
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
        
        .lesson-info { flex: 1; display: flex; flex-direction: column; gap: 8px; }
        .lesson-title { font-size: 1.15rem; font-weight: 700; color: #f8fafc; letter-spacing: -0.3px; }
        
        .lesson-meta { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .badge { 
          padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; 
          display: inline-flex; align-items: center; gap: 4px;
        }
        .badge-duration { background: rgba(139, 92, 246, 0.15); color: #c4b5fd; border: 1px solid rgba(139, 92, 246, 0.2); }
        .badge-success { background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.2); }
        .badge-warning { background: rgba(245, 158, 11, 0.1); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.2); }

        .lesson-actions { display: flex; gap: 8px; align-items: center; }
        .btn-icon { 
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
          color: #94a3b8; width: 40px; height: 40px; border-radius: 10px; 
          cursor: pointer; transition: 0.2s; display: flex; justify-content: center; align-items: center; 
          font-size: 1.1rem;
        }
        .btn-icon:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .btn-icon.edit:hover { background: rgba(56, 189, 248, 0.1); color: #38bdf8; border-color: rgba(56, 189, 248, 0.3); }
        .btn-icon.danger:hover { background: rgba(239, 68, 68, 0.1); color: #f87171; border-color: rgba(239, 68, 68, 0.3); }

        /* Empty State */
        .empty-state {
          border: 2px dashed rgba(255,255,255,0.1); border-radius: 20px;
          text-align: center; padding: 80px 20px; background: rgba(30, 41, 59, 0.2);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
        }

        /* Side Panel (Gaveta Lateral) - Glassmorphism */
        .side-panel-overlay { 
          position: fixed; inset: 0; background: rgba(2, 6, 23, 0.7); 
          backdrop-filter: blur(8px); z-index: 40; opacity: 0; pointer-events: none; transition: 0.3s; 
        }
        .side-panel-overlay.open { opacity: 1; pointer-events: all; }
        
        .side-panel { 
          position: fixed; top: 0; right: -500px; width: 100%; max-width: 480px; height: 100vh; 
          background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(20px);
          border-left: 1px solid rgba(255,255,255,0.08); z-index: 50; padding: 40px 30px; 
          transition: right 0.4s cubic-bezier(0.16, 1, 0.3, 1); overflow-y: auto; 
          box-shadow: -20px 0 50px rgba(0,0,0,0.5); 
        }
        .side-panel.open { right: 0; }

        .form-group { margin-bottom: 24px; position: relative; }
        .form-label { 
          display: block; color: #cbd5e1; font-size: 0.85rem; font-weight: 600; 
          margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; 
        }
        .form-input { 
          width: 100%; padding: 16px; border-radius: 12px; background: rgba(0,0,0,0.2); 
          border: 1px solid rgba(255,255,255,0.1); color: #fff; font-size: 1rem; 
          outline: none; transition: all 0.3s; 
        }
        .form-input:focus { 
          border-color: #8b5cf6; background: rgba(139, 92, 246, 0.05); 
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
        }
        
        .helper-text { font-size: 0.8rem; color: #64748b; margin-top: 8px; display: flex; align-items: center; gap: 4px; }

        @media (max-width: 768px) {
          .lesson-card { flex-direction: column; align-items: stretch; padding: 20px; gap: 16px; }
          .order-controls { flex-direction: row; justify-content: center; }
          .lesson-thumb { width: 100%; height: auto; aspect-ratio: 16/9; }
          .lesson-actions { border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px; justify-content: space-between; }
        }
      `}</style>

      {/* CABEÇALHO */}
      <header className="header-actions">
        <div>
          <button className="btn-back" onClick={onBack}>← Voltar aos Cursos</button>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, margin: '15px 0 0 0', letterSpacing: '-0.5px' }}>
            Trilha: <span style={{ color: '#8b5cf6', background: 'linear-gradient(to right, #8b5cf6, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{courseTitle}</span>
          </h2>
        </div>
        <button className="btn-primary" onClick={openNewLessonPanel}>
          <span style={{ fontSize: '1.2rem' }}>+</span> Nova Aula
        </button>
      </header>

      {/* LISTA DE AULAS */}
      {lessons.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '4rem', marginBottom: '20px', opacity: 0.8 }}>🗂️</div>
          <h3 style={{ color: '#f8fafc', fontSize: '1.5rem', marginBottom: '8px' }}>Trilha Vazia</h3>
          <p style={{ color: '#94a3b8', maxWidth: '300px' }}>Esta trilha ainda não possui conteúdo. Adicione a primeira aula para começar.</p>
          <button className="btn-primary" style={{ marginTop: '24px' }} onClick={openNewLessonPanel}>Adicionar Primeira Aula</button>
        </div>
      ) : (
        <div className="lesson-grid">
          {lessons.map((l, index) => {
            const ytId = getYouTubeId(l.videoUrl);
            const thumbUrl = ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : `https://via.placeholder.com/140x78/1e293b/8b5cf6?text=Video`;

            return (
              <div key={l.id} className="lesson-card" style={{ animationDelay: `${index * 0.05}s` }}>
                
                {/* Drag and Drop feel */}
                <div className="order-controls">
                  <button className="btn-order" onClick={() => moveLesson(index, 'up')} disabled={index === 0}>▲</button>
                  <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center' }}>{l.order}</span>
                  <button className="btn-order" onClick={() => moveLesson(index, 'down')} disabled={index === lessons.length - 1}>▼</button>
                </div>

                <img src={thumbUrl} alt="Thumbnail" className="lesson-thumb" onError={(e) => (e.currentTarget.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`)} />
                
                <div className="lesson-info">
                  <span className="lesson-title">{l.title}</span>
                  <div className="lesson-meta">
                    {l.duration ? <span className="badge badge-duration">⏱ {l.duration} min</span> : null}
                    {l.content ? (
                      <span className="badge badge-success">✨ IA Treinada</span>
                    ) : (
                      <span className="badge badge-warning">⚠️ Sem Base p/ IA</span>
                    )}
                  </div>
                </div>

                <div className="lesson-actions">
                  <div title="Gerar Quiz com IA">
                    <GenerateQuizButton 
                      courseId={courseId} lessonId={l.id} 
                      title={`Quiz: ${l.title}`} 
                      description={l.content || `Quiz da aula: ${l.title}`}
                      onQuizGenerated={(data: any) => setActiveQuiz(data)}
                    />
                  </div>
                  <button className="btn-icon edit" onClick={() => openEditPanel(l)} title="Editar Aula">✏️</button>
                  <button className="btn-icon danger" onClick={() => handleDeleteLesson(l.id)} title="Excluir Aula">🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* OVERLAY & GAVETA LATERAL */}
      <div className={`side-panel-overlay ${isPanelOpen ? 'open' : ''}`} onClick={closePanel}></div>
      <div className={`side-panel ${isPanelOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>
            {formData.id ? "Editar Aula" : "Nova Aula"}
          </h3>
          <button onClick={closePanel} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }}>
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>✕</span>
          </button>
        </div>

        <form onSubmit={handleSaveLesson}>
          <div className="form-group">
            <label className="form-label">Título da Aula</label>
            <input 
              className="form-input" type="text" placeholder="Ex: Introdução ao Módulo 1" required
              value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Link do YouTube</label>
            <input 
              className="form-input" type="url" placeholder="https://youtube.com/watch?v=..." required
              value={formData.videoUrl} onChange={(e) => setFormData({...formData, videoUrl: e.target.value})}
            />
            {formData.videoUrl && getYouTubeId(formData.videoUrl) && (
              <div className="helper-text" style={{ color: '#34d399' }}>✓ Link válido identificado</div>
            )}
          </div>

          <div className="form-group">
             <label className="form-label">Ordem de Exibição (Posição)</label>
             <input 
               className="form-input" type="number" required min="1"
               value={formData.order} onChange={(e) => setFormData({...formData, order: Number(e.target.value)})}
             />
          </div>

          <div className="form-group">
            <label className="form-label">Transcrição / Material Base (IA)</label>
            <textarea 
              className="form-input" placeholder="Cole aqui a transcrição do vídeo, apostila ou resumo detalhado. Isso alimentará o gerador de Quiz e o Chat com IA..." required
              style={{ height: '220px', resize: 'vertical', lineHeight: '1.5' }}
              value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})}
            />
            <div className="helper-text">
              <span>🤖</span> Quanto mais rico o texto, melhores serão os quizzes gerados.
            </div>
          </div>

          <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '16px' }} disabled={loading}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg className="animate-spin" viewBox="0 0 24 24" style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeOpacity="0.3"></circle>
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando...
                </span>
              ) : formData.id ? "Salvar Alterações" : "Publicar Nova Aula"}
            </button>
          </div>
          
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </form>
      </div>

      {/* EDITOR DE QUIZ */}
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