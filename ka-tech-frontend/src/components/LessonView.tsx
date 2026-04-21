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
  
  const playerRef = useRef<any>(null);
  const lastValidTimeRef = useRef(initialTime); 
  const onProgressUpdateRef = useRef(onProgressUpdate);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onProgressUpdateRef.current = onProgressUpdate;
  }, [onProgressUpdate]);

  const extractVideoId = (url: string) => {
    if (!url) return null;
    // Se já for um ID de 11 caracteres
    if (url.length === 11 && !url.includes("/")) return url;
    
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const fetchLesson = useCallback(async () => {
    if (!lessonId) return;
    setLoading(true);
    setError(null);

    // Buscamos explicitamente a coluna video_url
    const { data, error: dbError } = await supabase
      .from("lessons")
      .select("id, title, video_url, content")
      .eq("id", lessonId)
      .maybeSingle();
    
    if (dbError || !data) {
      setError("Aula não encontrada.");
      setLoading(false);
      return;
    }

    // CORREÇÃO: Usando video_url (snake_case) vindo do banco
    const rawUrl = data.video_url || "";
    const vId = extractVideoId(rawUrl);

    if (!vId) {
      setError(`URL ou ID de vídeo inválido: ${rawUrl}`);
    } else {
      setLesson({ ...data, videoId: vId });
      // Resetar flags de controle para a nova aula
      hasCompletedRef.current = false;
      lastValidTimeRef.current = initialTime;
    }
    setLoading(false);
  }, [lessonId, initialTime]);

  useEffect(() => { fetchLesson(); }, [fetchLesson]);

  useEffect(() => {
    if (!lesson?.videoId || loading || error) return;

    let intervalId: any;
    let isMounted = true;

    const initPlayer = () => {
      if (!isMounted) return;
      
      // Verifica se a API do YouTube já carregou
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
            start: Math.floor(initialTime)
          },
          events: {
            onReady: (event: any) => {
              if (!isMounted) return;
              intervalId = setInterval(() => {
                if (event.target?.getCurrentTime) {
                  const curr = event.target.getCurrentTime();
                  const duration = event.target.getDuration();

                  // Conclusão antecipada (1 segundo antes do fim)
                  if (duration > 0 && curr >= (duration - 1) && !hasCompletedRef.current) {
                    hasCompletedRef.current = true;
                    onProgressUpdateRef.current?.(duration, true);
                  }

                  // Lógica anti-skip (pula para o último tempo válido se o usuário tentar avançar)
                  if (curr > lastValidTimeRef.current + 3) {
                    event.target.seekTo(lastValidTimeRef.current, true);
                  } else if (curr > lastValidTimeRef.current) {
                    lastValidTimeRef.current = curr;
                    if (!hasCompletedRef.current) {
                        onProgressUpdateRef.current?.(curr, false);
                    }
                  }
                }
              }, 1000);
            },
            onStateChange: (event: any) => {
              if (event.data === (window as any).YT.PlayerState.ENDED && !hasCompletedRef.current) {
                hasCompletedRef.current = true;
                onProgressUpdateRef.current?.(event.target.getDuration(), true);
              }
            }
          }
        });
      } catch (e) {
        console.error("Erro ao inicializar o player:", e);
      }
    };

    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
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
  }, [lesson?.videoId, loading, error, initialTime]); 

  // Efeito para anotações (seekTo)
  useEffect(() => {
    if (seekTo !== null && playerRef.current?.seekTo) {
      playerRef.current.seekTo(seekTo, true);
      lastValidTimeRef.current = seekTo; 
    }
  }, [seekTo]);

  if (loading) return <div style={{ color: '#8b5cf6', padding: '40px', textAlign: 'center' }}>Sincronizando arquitetura de vídeo...</div>;
  if (error) return <div style={{ color: '#ef4444', padding: '40px', textAlign: 'center' }}>⚠️ {error}</div>;

  return (
    <div style={{ width: '100%', margin: '0' }}>
      <div style={{ 
        position: 'relative', paddingTop: '56.25%', background: '#000', 
        borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' 
      }}>
        <div id="youtube-player" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}></div>
      </div>
    </div>
  );
}