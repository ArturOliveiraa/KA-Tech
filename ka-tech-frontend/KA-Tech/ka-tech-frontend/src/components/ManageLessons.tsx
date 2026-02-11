import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import axios from "axios";

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

export default function ManageLessons({ courseId, courseTitle, onBack }: ManageLessonsProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [content, setContent] = useState("");
  const [order, setOrder] = useState(1);
  const [loading, setLoading] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

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

  // --- FUNÇÃO AUXILIAR PARA DURAÇÃO ATUALIZADA ---
  const getVideoDuration = async (url: string): Promise<number> => {
    try {
      // Regex atualizado para suportar /shorts/ e /live/
      const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([^&?/\s]{11})/);
      
      if (!videoIdMatch) {
        alert("⚠️ Link do YouTube inválido ou formato não suportado.");
        return 0;
      }

      const videoId = videoIdMatch[1];
      const apiKey = (import.meta as any).env?.VITE_YOUTUBE_API_KEY || (process.env as any).REACT_APP_YOUTUBE_API_KEY;

      if (!apiKey) {
        console.error("ERRO: Chave da API do YouTube não configurada.");
        alert("❌ Erro Técnico: API Key do YouTube não encontrada no arquivo .env");
        return 0;
      }

      const { data } = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${apiKey}`
      );

      if (!data.items || data.items.length === 0) {
        alert("⚠️ Vídeo não encontrado. Verifique se o vídeo é PÚBLICO ou se o link está correto.");
        return 0;
      }

      const durationISO = data.items[0].contentDetails.duration;
      
      // Conversão robusta de ISO 8601 (PT10M30S) para minutos decimais
      const hours = durationISO.match(/(\d+)H/)?.[1] || "0";
      const minutes = durationISO.match(/(\d+)M/)?.[1] || "0";
      const seconds = durationISO.match(/(\d+)S/)?.[1] || "0";

      const totalMinutes = (parseInt(hours) * 60) + parseInt(minutes) + (parseInt(seconds) / 60);
      return parseFloat(totalMinutes.toFixed(2));

    } catch (err: any) {
      console.error("Erro na requisição YouTube API:", err);
      if (err.response?.status === 403) {
        alert("❌ Erro 403: Limite de uso da API do YouTube atingido ou chave inválida.");
      } else {
        alert("❌ Erro ao buscar duração: " + (err.message || "Erro desconhecido"));
      }
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

    if (responses.some(res => res.error)) {
      console.error("Erro ao reordenar");
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
      <style>{`
        .lesson-form-grid { display: grid; grid-template-columns: 1fr 140px; gap: 20px; }
        .input-with-icon { position: relative; }
        .input-emoji { position: absolute; left: 12px; top: 12px; font-size: 1.2rem; }
        .form-input { 
          width: 100%; padding: 12px 12px 12px 45px; border-radius: 12px; 
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff;
          font-size: 1rem; outline: none; transition: 0.3s;
        }
        .form-input:focus { border-color: #8b5cf6; background: rgba(255,255,255,0.08); }
        .form-label { display: block; color: #94a3b8; font-size: 0.8rem; font-weight: 700; margin-bottom: 8px; text-transform: uppercase; }
        button { 
          background: #8b5cf6; color: #fff; border: none; padding: 14px 25px; 
          border-radius: 12px; font-weight: 800; cursor: pointer; transition: 0.3s;
        }
        button:hover { transform: translateY(-2px); filter: brightness(1.1); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }

        @media (max-width: 768px) {
          .lesson-form-grid { grid-template-columns: 1fr !important; }
          .lesson-item-row { flex-direction: column !important; align-items: flex-start !important; gap: 15px !important; }
          .lesson-actions-group { width: 100% !important; justify-content: space-between !important; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px; }
        }
      `}</style>

      <header style={{ marginBottom: '30px' }}>
        <button onClick={onBack} style={{ background: 'transparent', color: '#8b5cf6', padding: 0, marginBottom: '15px' }}>
          ← Voltar para Cursos
        </button>
        <h2 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 900, margin: 0 }}>
          Gerenciar Aulas: <span style={{ color: '#8b5cf6' }}>{courseTitle}</span>
        </h2>
      </header>

      <form onSubmit={editingLesson ? handleUpdateLesson : handleCreateLesson}>
        <div className="lesson-form-grid">
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
          <label className="form-label">URL do Vídeo (YouTube)</label>
          <div className="input-with-icon">
            <span className="input-emoji">🔗</span>
            <input
              className="form-input"
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={editingLesson ? editingLesson.videoUrl : videoUrl}
              onChange={(e) => editingLesson ? setEditingLesson({ ...editingLesson, videoUrl: e.target.value }) : setVideoUrl(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="local-field" style={{ marginTop: '20px' }}>
          <label className="form-label">Descrição</label>
          <div className="input-with-icon">
            <span className="input-emoji" style={{ top: '22px' }}>📄</span>
            <textarea
              className="form-input"
              value={editingLesson ? editingLesson.content : content}
              onChange={(e) => editingLesson ? setEditingLesson({ ...editingLesson, content: e.target.value }) : setContent(e.target.value)}
              required
              style={{ height: '100px', resize: 'none' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
          <button type="submit" disabled={loading} style={{ flex: 2 }}>
            {loading ? "PROCESSANDO..." : editingLesson ? "SALVAR ALTERAÇÕES" : "PUBLICAR AULA"}
          </button>
          {editingLesson && (
            <button
              type="button"
              onClick={() => setEditingLesson(null)}
              style={{ flex: 1, background: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}
            >
              CANCELAR
            </button>
          )}
        </div>
      </form>

      <div style={{ marginTop: '50px' }}>
        <h4 style={{ color: '#fff', marginBottom: '20px', fontWeight: 900 }}>Grade de Aulas</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {lessons.map((l, index) => (
            <div key={l.id} className="lesson-item-row" style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ color: '#8b5cf6', fontWeight: 900 }}>#{l.order}</span>
                <span style={{ color: '#fff' }}>{l.title}</span>
                {l.duration !== undefined && l.duration > 0 && (
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>({l.duration} min)</span>
                )}
              </div>
              <div className="lesson-actions-group" style={{ display: 'flex', gap: '15px' }}>
                <button onClick={() => moveLesson(index, 'up')} disabled={index === 0} style={{ padding: '5px 10px' }}>↑</button>
                <button onClick={() => moveLesson(index, 'down')} disabled={index === lessons.length - 1} style={{ padding: '5px 10px' }}>↓</button>
                <button onClick={() => handleEditInit(l)} style={{ background: 'transparent', color: '#8b5cf6' }}>EDITAR</button>
                <button onClick={() => handleDeleteLesson(l.id)} style={{ background: 'transparent', color: '#ef4444' }}>EXCLUIR</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}