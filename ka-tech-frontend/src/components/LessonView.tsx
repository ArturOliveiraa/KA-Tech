import React, { useEffect, useState } from "react";
// Importação com cast para evitar o erro TS2322
import BaseReactPlayer from "react-player";
import { supabase } from "../supabaseClient";

// Forçando o TypeScript a reconhecer o componente como 'any' 
// Isso resolve o erro de 'Property url does not exist'
const ReactPlayer = BaseReactPlayer as any;

interface Lesson {
  id: number;
  title: string;
  videoUrl: string; // Coluna exata do seu banco
  content: string;  // Coluna exata do seu banco
}

export default function LessonView({ lessonId }: { lessonId: number }) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLesson() {
      setLoading(true);
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", lessonId)
        .single();

      if (error) {
        console.error("Erro ao buscar aula:", error.message);
      } else {
        setLesson(data);
      }
      setLoading(false);
    }

    if (lessonId) fetchLesson();
  }, [lessonId]);

  if (loading) return <div style={{ color: '#00c9ff', padding: '20px' }}>Carregando vídeo...</div>;
  if (!lesson) return <div style={{ color: '#ef4444', padding: '20px' }}>Aula não encontrada.</div>;

  return (
    <div className="lesson-container" style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
      <style>{`
        .player-wrapper {
          position: relative;
          padding-top: 56.25%; /* Proporção 16:9 */
          background: #000;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid #2d323e;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .react-player-fix {
          position: absolute;
          top: 0;
          left: 0;
        }
        .lesson-info { 
          margin-top: 30px; 
          padding: 24px;
          background: #121418;
          border-radius: 16px;
          border: 1px solid #2d323e;
        }
        .lesson-info h1 { font-size: 1.8rem; color: #fff; margin-bottom: 15px; }
        .lesson-content { color: #94a3b8; line-height: 1.8; font-size: 1rem; }
      `}</style>

      <div className="player-wrapper">
        <ReactPlayer
          url={lesson.videoUrl} // Agora o TS aceita sem reclamar
          width="100%"
          height="100%"
          className="react-player-fix"
          controls={true}
          playing={false}
        />
      </div>

      <div className="lesson-info">
        <h1>{lesson.title}</h1>
        <div className="lesson-content">
          <p>{lesson.content}</p>
        </div>
      </div>
    </div>
  );
}