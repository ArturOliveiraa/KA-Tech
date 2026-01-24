import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";

export default function LessonView({ 
  lessonId, 
  initialTime = 0, 
  onProgressUpdate,
  seekTo = null 
}: { 
  lessonId: number; 
  initialTime?: number; 
  onProgressUpdate?: (time: number, completed?: boolean) => void;
  seekTo?: number | null; 
}) {
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const playerRef = useRef<any>(null);
  const lastValidTimeRef = useRef(initialTime); 
  const onProgressUpdateRef = useRef(onProgressUpdate);

  // --- FIX PARA ESLINT: Sincroniza o ref do progresso ---
  useEffect(() => {
    onProgressUpdateRef.current = onProgressUpdate;
  }, [onProgressUpdate]);

  const extractVideoId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    const id = (match && match[7].length === 11) ? match[7] : url.trim();
    return id.length === 11 ? id : null;
  };

  const fetchLesson = useCallback(async () => {
    if (!lessonId) return;
    setLoading(true);
    setError(null);

    const { data, error: dbError } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .maybeSingle();
    
    if (dbError || !data) {
      setError("Aula não encontrada.");
      setLoading(false);
      return;
    }

    const rawUrl = data.videoUrl || data.videourl || "";
    const vId = extractVideoId(rawUrl);

    if (!vId) {
      setError(`URL Inválida: ${rawUrl}`);
    } else {
      setLesson({ ...data, videoId: vId });
    }
    setLoading(false);
  }, [lessonId]);

  useEffect(() => { fetchLesson(); }, [fetchLesson]);

  // --- LÓGICA DO PLAYER (Com correção de dependências) ---
  useEffect(() => {
    if (!lesson?.videoId || loading || error) return;

    let intervalId: any;
    let isMounted = true;

    const initPlayer = () => {
      if (!isMounted) return;
      
      if (!(window as any).YT?.Player) {
        setTimeout(initPlayer, 200);
        return;
      }

      try {
        if (playerRef.current?.destroy) playerRef.current.destroy();

        playerRef.current = new (window as any).YT.Player('youtube-player', {
          videoId: lesson.videoId,
          playerVars: {
            rel: 0,
            modestbranding: 1,
            origin: window.location.origin,
            enablejsapi: 1,
            // Usamos o initialTime aqui. O ESLint vai reclamar se não estiver no array,
            // mas como queremos que ele rode apenas quando o videoId mudar,
            // vamos desabilitar a linha específica ou garantir que o videoId controle isso.
            start: Math.floor(initialTime)
          },
          events: {
            onReady: (event: any) => {
              if (!isMounted) return;
              intervalId = setInterval(() => {
                if (event.target?.getCurrentTime) {
                  const curr = event.target.getCurrentTime();
                  if (curr > lastValidTimeRef.current + 2.5) {
                    event.target.seekTo(lastValidTimeRef.current, true);
                  } else if (curr > lastValidTimeRef.current) {
                    lastValidTimeRef.current = curr;
                    onProgressUpdateRef.current?.(curr, false);
                  }
                }
              }, 1000);
            },
            onStateChange: (event: any) => {
              if (event.data === (window as any).YT.PlayerState.ENDED) {
                onProgressUpdateRef.current?.(event.target.getDuration(), true);
                setIsCompleted(true);
              }
            }
          }
        });
      } catch (e) {
        console.error("Player error:", e);
      }
    };

    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    } else {
      initPlayer();
    }

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy(); } catch(e){}
      }
    };
    // Adicionamos initialTime aqui para satisfazer o ESLint. 
    // Como o LessonView é desmontado/remontado ao trocar de aula, isso não causará loops.
  }, [lesson?.videoId, loading, error, initialTime]); 

  useEffect(() => {
    if (seekTo !== null && playerRef.current?.seekTo) {
      playerRef.current.seekTo(seekTo, true);
      lastValidTimeRef.current = seekTo; 
    }
  }, [seekTo]);

  if (loading) return <div style={{ color: '#8b5cf6', padding: '40px' }}>Carregando vídeo...</div>;
  if (error) return <div style={{ color: '#ef4444', padding: '40px' }}>{error}</div>;

  return (
    <div style={{ width: '100%', margin: '0' }}>
      <div style={{ 
        position: 'relative', paddingTop: '56.25%', background: '#000', 
        borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' 
      }}>
        <div id="youtube-player" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}></div>
      </div>
      
      <div style={{ marginTop: '20px', padding: '24px', background: '#09090b', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{lesson?.title}</h1>
          {isCompleted && <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.8rem', padding: '6px 12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>✓ CONCLUÍDA</span>}
        </div>
        <p style={{ color: '#94a3b8', lineHeight: '1.6', fontSize: '0.95rem' }}>{lesson?.content}</p>
      </div>
    </div>
  );
}