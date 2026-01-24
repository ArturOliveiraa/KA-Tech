import React, { useEffect, useState, useCallback } from "react";
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

  // CORREÇÃO 1: Alterado de "courseId" para "course_id" para bater com o SQL
  const fetchLessons = useCallback(async () => {
    const { data } = await supabase
      .from("lessons")
      .select("*")
      .eq("course_id", courseId) // <--- Nome da coluna no banco é course_id
      .order("order", { ascending: true });
    if (data) setLessons(data);
  }, [courseId]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // CORREÇÃO 2: Alterado o campo no insert para "course_id"
    const { error } = await supabase.from("lessons").insert([
      { 
        title, 
        videoUrl, 
        content, 
        order, 
        course_id: courseId // <--- Chave correta para a coluna do banco
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
              color: '#8b5cf6', // Ajustado para combinar com seu novo tema roxo
              border: 'none', 
              cursor: 'pointer', 
              fontSize: '0.8rem', 
              padding: '0', 
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontWeight: 700
            }}
          >
            ← Voltar para Cursos
          </button>
          <h2 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 800 }}>Gerenciar Aulas: {courseTitle}</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Adicione conteúdo e organize a grade das aulas.</p>
        </div>
      </header>

      <form onSubmit={handleCreateLesson}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '15px' }}>
          <div className="local-field">
            <label className="form-label">Título da Aula</label>
            <div className="input-with-icon">
              <span className="input-emoji">📝</span>
              <input className="form-input" type="text" placeholder="Ex: Introdução ao Módulo" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
          </div>

          <div className="local-field">
            <label className="form-label">Ordem</label>
            <div className="input-with-icon">
              <span className="input-emoji">🔢</span>
              <input className="form-input" style={{ paddingLeft: '52px' }} type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} required />
            </div>
          </div>
        </div>

        <div className="local-field" style={{ marginTop: '20px' }}>
          <label className="form-label">URL do Vídeo</label>
          <div className="input-with-icon">
            <span className="input-emoji">🔗</span>
            <input className="form-input" type="text" placeholder="Link do YouTube" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} required />
          </div>
        </div>

        <div className="local-field" style={{ marginTop: '20px' }}>
          <label className="form-label">Descrição / Conteúdo</label>
          <div className="input-with-icon">
            <span className="input-emoji" style={{ top: '16px' }}>📄</span>
            <textarea 
              placeholder="O que será abordado nesta aula?" 
              value={content} 
              onChange={(e) => setContent(e.target.value)} 
              required 
              style={{ height: '100px' }}
            />
          </div>
        </div>

        <button className="local-primary-button" type="submit" disabled={loading} style={{ width: '100%', marginTop: '30px' }}>
          {loading ? "Processando..." : "Publicar Aula"}
        </button>
      </form>

      <div style={{ marginTop: '50px' }}>
        <h4 style={{ color: '#fff', marginBottom: '20px', fontSize: '1.1rem', fontWeight: 700 }}>Grade de Aulas Cadastradas</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {lessons.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '30px', border: '1px dashed rgba(139,92,246,0.2)', borderRadius: '16px' }}>
              Nenhuma aula cadastrada ainda.
            </p>
          ) : (
            lessons.map(l => (
              <div 
                key={l.id} 
                style={{ 
                  padding: '16px 24px', 
                  background: 'rgba(15, 23, 42, 0.4)', 
                  borderRadius: '14px', 
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ color: '#8b5cf6', fontWeight: 800 }}>#{l.order}</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{l.title}</span>
                </div>
                <button 
                  onClick={() => handleDeleteLesson(l.id)}
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
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