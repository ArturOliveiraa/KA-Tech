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

  // Busca as aulas no banco
  const fetchLessons = useCallback(async () => {
    const { data } = await supabase
      .from("lessons")
      .select("*")
      .eq("course_id", courseId)
      .order("order", { ascending: true });
    if (data) setLessons(data);
  }, [courseId]);

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

    // 1. Busca a duração antes do insert
    const duration = await getVideoDuration(videoUrl);

    // 2. Insert com o campo duration incluído
    const { error } = await supabase.from("lessons").insert([
      { 
        title, 
        videoUrl, 
        content, 
        order, 
        course_id: courseId,
        duration: duration // Adicionado aqui
      }
    ]);

    if (error) {
      alert("Erro ao lançar aula: " + error.message);
    } else {
      alert(`Aula lançada com sucesso! (${duration} min)`);
      setTitle(""); 
      setVideoUrl(""); 
      setContent(""); 
      setOrder(order + 1);
      fetchLessons();
    }
    setLoading(false);
  };

  const handleDeleteLesson = async (id: number) => {
    if (!window.confirm("Deseja realmente excluir esta aula?")) return;
    
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) alert("Erro ao deletar: " + error.message);
    else fetchLessons();
  };

  return (
    <div className="ka-lessons-wrapper" style={{ maxWidth: '100%', marginTop: '20px' }}>
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
          Adicione conteúdo e organize a grade das aulas.
        </p>
      </header>

      <form onSubmit={handleCreateLesson}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '20px' }}>
          <div className="local-field">
            <label className="form-label">Título da Aula</label>
            <div className="input-with-icon">
              <span className="input-emoji">📝</span>
              <input 
                className="form-input" 
                type="text" 
                placeholder="Ex: Introdução ao Módulo" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
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
                value={order} 
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
              value={videoUrl} 
              onChange={(e) => setVideoUrl(e.target.value)} 
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
              value={content} 
              onChange={(e) => setContent(e.target.value)} 
              required 
              style={{ height: '120px', resize: 'none' }}
            />
          </div>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "PROCESSANDO..." : "PUBLICAR AULA"}
        </button>
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
            lessons.map(l => (
              <div 
                key={l.id} 
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}