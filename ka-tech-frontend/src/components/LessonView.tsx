import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

export default function LessonView({ lessonId }: { lessonId: number }) {
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchLesson = useCallback(async () => {
    if (!lessonId) return;
    setLoading(true);
    const { data } = await supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle();
    setLesson(data);
    setLoading(false);
  }, [lessonId]);

  useEffect(() => {
    fetchLesson();
  }, [fetchLesson]);

  if (loading) return <div style={{ color: '#00c9ff', padding: '20px' }}>Carregando...</div>;
  if (!lesson) return <div style={{ color: '#ef4444', padding: '20px' }}>Aula não encontrada.</div>;

  // LÓGICA DE DETECÇÃO: YouTube ou MP4 Direto
  const url = lesson.videoUrl?.trim() || "";
  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");

  // Converte link comum do YouTube para link de "embed" (necessário para Iframes)
  const getEmbedUrl = (link: string) => {
    const id = link.split("v=")[1]?.split("&")[0] || link.split("/").pop();
    return `https://www.youtube.com/embed/${id}`;
  };

  return (
    <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ 
        position: 'relative', 
        paddingTop: '56.25%', 
        background: '#000', 
        borderRadius: '16px', 
        overflow: 'hidden',
        border: '1px solid #2d323e'
      }}>
        {isYouTube ? (
          <iframe
            key={url}
            src={getEmbedUrl(url)}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video 
            key={url}
            controls 
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          >
            <source src={url} type="video/mp4" />
            Seu navegador não suporta vídeos.
          </video>
        )}
      </div>

      <div style={{ marginTop: '30px', padding: '24px', background: '#121418', borderRadius: '16px', border: '1px solid #2d323e' }}>
        <h1 style={{ color: '#fff', fontSize: '1.8rem', marginBottom: '15px' }}>{lesson.title}</h1>
        <p style={{ color: '#94a3b8', lineHeight: '1.8' }}>{lesson.content}</p>
      </div>
    </div>
  );
}