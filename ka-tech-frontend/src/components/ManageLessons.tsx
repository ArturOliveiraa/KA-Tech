import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import axios from "axios";

interface Lesson {
  id: number;
  title: string;
  videoUrl: string;
  content: string;
  order: number;
}

interface ManageLessonsProps {
  courseId: number;
  courseTitle: string;
  onBack: () => void;
}

export default function ManageLessons({ courseId, courseTitle, onBack }: ManageLessonsProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [content, setContent] = useState("");
  const [order, setOrder] = useState(1);
  const [loading, setLoading] = useState(false);

  // --- ESTADO PARA EDIÇÃO ---
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  // Busca as aulas no banco
  const fetchLessons = useCallback(async () => {
    const { data } = await supabase
      .from("lessons")
      .select("*")
      .eq("course_id", courseId)
      .order("order", { ascending: true });
    if (data) {
      setLessons(data);
      if (data.length > 0 && !editingLesson) {
        const maxOrder = Math.max(...data.map(l => l.order));
        setOrder(maxOrder + 1);
      }
    }
  }, [courseId, editingLesson]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  // --- FUNÇÃO AUXILIAR PARA DURAÇÃO ---
  const getVideoDuration = async (url: string): Promise<number> => {
    try {
      const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?/\s]{11})/);
      if (!videoIdMatch) return 0;

      const videoId = videoIdMatch[1];
      const apiKey = process.env.REACT_APP_YOUTUBE_API_KEY;

      const { data } = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${apiKey}`
      );

      const durationISO = data.items[0]?.contentDetails?.duration;
      if (!durationISO) return 0;

      const match = durationISO.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const hours = parseInt(match?.[1] || "0");
      const minutes = parseInt(match?.[2] || "0");
      const seconds = parseInt(match?.[3] || "0");

      return parseFloat(((hours * 60) + minutes + (seconds / 60)).toFixed(2));
    } catch (err) {
      console.error("Erro YouTube API:", err);
      return 0;
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const duration = await getVideoDuration(videoUrl);

    const { error } = await supabase.from("lessons").insert([
      {
        title,
        videoUrl,
        content,
        order,
        course_id: courseId,
        duration: duration
      }
    ]);

    if (error) {
      alert("Erro ao lançar aula: " + error.message);
    } else {
      alert(`Aula lançada com sucesso! (${duration} min)`);
      setTitle("");
      setVideoUrl("");
      setContent("");
      fetchLessons();
    }
    setLoading(false);
  };

  const handleUpdateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson) return;
    setLoading(true);

    const duration = await getVideoDuration(editingLesson.videoUrl);

    const { error } = await supabase
      .from("lessons")
      .update({
        title: editingLesson.title,
        videoUrl: editingLesson.videoUrl,
        content: editingLesson.content,
        duration: duration
      })
      .eq("id", editingLesson.id);

    if (error) {
      alert("Erro ao atualizar aula: " + error.message);
    } else {
      alert("Aula atualizada com sucesso!");
      setEditingLesson(null);
      fetchLessons();
    }
    setLoading(false);
  };

  const moveLesson = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    const current = lessons[index];
    const target = lessons[targetIndex];

    const responses = await Promise.all([
      supabase.from("lessons").update({ order: target.order }).eq("id", current.id),
      supabase.from("lessons").update({ order: current.order }).eq("id", target.id)
    ]);

    const hasError = responses.some(res => res.error);

    if (hasError) {
      console.error("Erro ao reordenar:", responses.map(r => r.error).filter(Boolean));
    } else {
      fetchLessons();
    }
  };

  const handleDeleteLesson = async (id: number) => {
    if (!window.confirm("Deseja realmente excluir esta aula?")) return;

    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) alert("Erro ao deletar: " + error.message);
    else fetchLessons();
  };

  const handleEditInit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="ka-lessons-wrapper" style={{ maxWidth: '100%', marginTop: '20px' }}>
      {/* CORREÇÃO DE RESPONSIVIDADE MOBILE */}
      <style>{`
        @media (max-width: 768px) {
          .lesson-form-grid { grid-template-columns: 1fr !important; }
          .lesson-item-row { flex-direction: column !important; align-items: flex-start !important; gap: 15px !important; }
          .lesson-actions-group { width: 100% !important; justify-content: space-between !important; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px; }
          .ka-lessons-wrapper h2 { font-size: 1.3rem !important; }
        }
      `}</style>

      <header style={{ marginBottom: '30px' }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            color: '#8b5cf6',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.85rem',
            marginBottom: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 700,
            padding: 0
          }}
        >
          ← Voltar para Cursos
        </button>
        <h2 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 900, margin: 0 }}>
          Gerenciar Aulas: <span style={{ color: '#8b5cf6' }}>{courseTitle}</span>
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '5px' }}>
          {editingLesson ? "Modifique os detalhes da aula selecionada." : "Adicione conteúdo e organize a grade das aulas."}
        </p>
      </header>

      <form onSubmit={editingLesson ? handleUpdateLesson : handleCreateLesson}>
        <div className="lesson-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '20px' }}>
          <div className="local-field">
            <label className="form-label">Título da Aula</label>
            <div className="input-with-icon">
              <span className="input-emoji">📝</span>
              <input
                className="form-input"
                type="text"
                placeholder="Ex: Introdução ao Módulo"
                value={editingLesson ? editingLesson.title : title}
                onChange={(e) => editingLesson ? setEditingLesson({ ...editingLesson, title: e.target.value }) : setTitle(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="local-field">
            <label className="form-label">Ordem</label>
            <div className="input-with-icon">
              <span className="input-emoji">🔢</span>
              <input
                className="form-input"
                type="number"
                value={editingLesson ? editingLesson.order : order}
                disabled={!!editingLesson}
                onChange={(e) => setOrder(Number(e.target.value))}
                required
              />
            </div>
          </div>
        </div>

        <div className="local-field" style={{ marginTop: '20px' }}>
          <label className="form-label">URL do Vídeo</label>
          <div className="input-with-icon">
            <span className="input-emoji">🔗</span>
            <input
              className="form-input"
              type="text"
              placeholder="Link do YouTube"
              value={editingLesson ? editingLesson.videoUrl : videoUrl}
              onChange={(e) => editingLesson ? setEditingLesson({ ...editingLesson, videoUrl: e.target.value }) : setVideoUrl(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="local-field" style={{ marginTop: '20px' }}>
          <label className="form-label">Descrição / Conteúdo</label>
          <div className="input-with-icon">
            <span className="input-emoji" style={{ top: '22px' }}>📄</span>
            <textarea
              className="form-input"
              placeholder="O que será abordado nesta aula?"
              value={editingLesson ? editingLesson.content : content}
              onChange={(e) => editingLesson ? setEditingLesson({ ...editingLesson, content: e.target.value }) : setContent(e.target.value)}
              required
              style={{ height: '120px', resize: 'none' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
          <button type="submit" disabled={loading} style={{ flex: 2 }}>
            {loading ? "PROCESSANDO..." : editingLesson ? "SALVAR ALTERAÇÕES" : "PUBLICAR AULA"}
          </button>
          {editingLesson && (
            <button
              type="button"
              onClick={() => setEditingLesson(null)}
              style={{ flex: 1, background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }}
            >
              CANCELAR
            </button>
          )}
        </div>
      </form>

      <div style={{ marginTop: '50px' }}>
        <h4 style={{ color: '#fff', marginBottom: '20px', fontSize: '1.2rem', fontWeight: 900 }}>
          Grade de Aulas Cadastradas
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {lessons.length === 0 ? (
            <p style={{
              color: '#64748b',
              textAlign: 'center',
              padding: '40px',
              border: '2px dashed rgba(139, 92, 246, 0.1)',
              borderRadius: '20px'
            }}>
              Nenhuma aula cadastrada ainda.
            </p>
          ) : (
            lessons.map((l, index) => (
              <div
                key={l.id}
                className="lesson-item-row"
                style={{
                  padding: '18px 25px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '18px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: '0.3s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{
                    color: '#8b5cf6',
                    fontWeight: 900,
                    background: 'rgba(139, 92, 246, 0.1)',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    fontSize: '0.8rem'
                  }}>
                    #{l.order}
                  </span>
                  <span style={{ color: '#fff', fontWeight: 700 }}>{l.title}</span>
                </div>

                <div className="lesson-actions-group" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                      onClick={() => moveLesson(index, 'up')}
                      disabled={index === 0}
                      style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '5px 10px', borderRadius: '5px', cursor: index === 0 ? 'not-allowed' : 'pointer' }}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveLesson(index, 'down')}
                      disabled={index === lessons.length - 1}
                      style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '5px 10px', borderRadius: '5px', cursor: index === lessons.length - 1 ? 'not-allowed' : 'pointer' }}
                    >
                      ↓
                    </button>
                  </div>

                  <button
                    onClick={() => handleEditInit(l)}
                    style={{ background: 'transparent', border: 'none', color: '#8b5cf6', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => handleDeleteLesson(l.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}