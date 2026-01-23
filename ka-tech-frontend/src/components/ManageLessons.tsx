import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

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

  // CORREÇÃO: Função memorizada para evitar alertas do ESLint e loops infinitos
  const fetchLessons = useCallback(async () => {
    const { data } = await supabase
      .from("lessons")
      .select("*")
      .eq("courseId", courseId)
      .order("order", { ascending: true });
    if (data) setLessons(data);
  }, [courseId]); // Recria apenas se o ID do curso mudar

  // useEffect agora utiliza a função memorizada com segurança
  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("lessons").insert([
      { 
        title, 
        videoUrl, 
        content, 
        order, 
        courseId 
      }
    ]);

    if (error) {
      alert("Erro ao lançar aula: " + error.message);
    } else {
      alert("Aula lançada com sucesso!");
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
    <div className="admin-card-local" style={{ maxWidth: '100%', marginTop: '20px', flex: '1 1 100%' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <button 
            onClick={onBack} 
            style={{ 
              background: 'transparent', 
              color: '#00c9ff', 
              border: 'none', 
              cursor: 'pointer', 
              fontSize: '0.8rem', 
              padding: '0', 
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            ← Voltar para Cursos
          </button>
          <h2 style={{ color: '#fff', fontSize: '1.4rem' }}>Gerenciar Aulas: {courseTitle}</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Adicione conteúdo e organize a grade das aulas.</p>
        </div>
      </header>

      <form onSubmit={handleCreateLesson}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '15px' }}>
          <div className="local-field">
            <label>Título da Aula</label>
            <div className="local-input-wrapper">
              <span className="local-icon">📝</span>
              <input type="text" placeholder="Ex: Introdução ao Módulo" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
          </div>

          <div className="local-field">
            <label>Ordem</label>
            <div className="local-input-wrapper">
              <span className="local-icon">🔢</span>
              <input style={{ paddingLeft: '40px' }} type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} required />
            </div>
          </div>
        </div>

        <div className="local-field">
          <label>URL do Vídeo (YouTube/Vimeo/MP4)</label>
          <div className="local-input-wrapper">
            <span className="local-icon">🔗</span>
            <input type="text" placeholder="https://..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} required />
          </div>
        </div>

        <div className="local-field">
          <label>Descrição / Conteúdo da Aula</label>
          <div className="local-input-wrapper">
            <span className="local-icon" style={{ top: '12px' }}>📄</span>
            <textarea 
              placeholder="O que será abordado nesta aula?" 
              value={content} 
              onChange={(e) => setContent(e.target.value)} 
              required 
            />
          </div>
        </div>

        <button className="local-primary-button" type="submit" disabled={loading}>
          {loading ? "Lançando..." : "Publicar Aula"}
        </button>
      </form>

      <div style={{ marginTop: '40px' }}>
        <h4 style={{ color: '#fff', marginBottom: '15px', fontSize: '1.1rem' }}>Grade de Aulas Cadastradas</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {lessons.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '20px', border: '1px dashed #2d323e', borderRadius: '8px' }}>
              Nenhuma aula cadastrada para este curso ainda.
            </p>
          ) : (
            lessons.map(l => (
              <div 
                key={l.id} 
                style={{ 
                  padding: '12px 20px', 
                  background: '#1a1d23', 
                  borderRadius: '10px', 
                  border: '1px solid #2d323e',
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <span style={{ color: '#00c9ff', fontWeight: 'bold', marginRight: '10px' }}>#{l.order}</span>
                  <span style={{ color: '#fff' }}>{l.title}</span>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{l.videoUrl.substring(0, 20)}...</span>
                  <button 
                    onClick={() => handleDeleteLesson(l.id)}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
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