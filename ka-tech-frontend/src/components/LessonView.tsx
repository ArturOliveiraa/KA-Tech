import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";

export default function LessonView({ 
  lessonId, 
  initialTime = 0, 
  onProgressUpdate,
  seekTo = null // ADICIONADO: Nova prop para o caderno de notas
}: { 
  lessonId: number; 
  initialTime?: number; 
  onProgressUpdate?: (time: number, completed?: boolean) => void;
  seekTo?: number | null; // ADICIONADO: Definição do tipo
}) {
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const playerRef = useRef<any>(null);
  const lastValidTimeRef = useRef(initialTime); 
  
  const saveProgressRef = useRef<(() => Promise<void>) | null>(null);
  const onProgressUpdateRef = useRef(onProgressUpdate);

  useEffect(() => {
    onProgressUpdateRef.current = onProgressUpdate;
  }, [onProgressUpdate]);

  // --- NOVO: LÓGICA PARA PULAR NO VÍDEO VIA NOTA ---
  useEffect(() => {
    if (seekTo !== null && playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(seekTo, true);
      // Importante: atualizamos o lastValidTime para o anti-cheat permitir o pulo
      lastValidTimeRef.current = seekTo; 
    }
  }, [seekTo]);

  const fetchLesson = useCallback(async () => {
    if (!lessonId) return;
    setLoading(true);
    setIsCompleted(false);
    lastValidTimeRef.current = initialTime; 

    const { data } = await supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle();
    
    if (data) {
      const rawUrl = data.videoUrl || data.videourl;
      const videoId = rawUrl?.split('v=')[1]?.split('&')[0];
      setLesson({ ...data, videoId });
    }
    setLoading(false);
  }, [lessonId, initialTime]);

  useEffect(() => { fetchLesson(); }, [fetchLesson]);

  const saveProgress = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || !lesson) return;

    const { error } = await supabase.from("user_progress").upsert({
      user_id: session.user.id,
      lesson_id: lesson.id,
      course_id: lesson.courseId || lesson.courseid,
      is_completed: true, 
      completed_at: new Date().toISOString()
    }, { onConflict: 'user_id,lesson_id' });

    if (!error) {
      setIsCompleted(true);
      window.dispatchEvent(new Event("progressUpdated"));
      if (onProgressUpdateRef.current) {
        onProgressUpdateRef.current(playerRef.current?.getCurrentTime() || 0, true);
      }
    }
  }, [lesson]);

  useEffect(() => {
    saveProgressRef.current = saveProgress;
  }, [saveProgress]);

  useEffect(() => {
    if (!lesson?.videoId || loading) return;

    let intervalId: any;

    const monitorProgress = (player: any) => {
      return setInterval(() => {
        if (player && player.getCurrentTime) {
          const currentTime = player.getCurrentTime();
          
          if (currentTime > lastValidTimeRef.current + 2) {
            player.seekTo(lastValidTimeRef.current, true);
          } else if (currentTime > lastValidTimeRef.current) {
            lastValidTimeRef.current = currentTime;
            
            if (onProgressUpdateRef.current) {
              onProgressUpdateRef.current(currentTime, false);
            }
          }
        }
      }, 1000); 
    };

    const initPlayer = () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }

      playerRef.current = new (window as any).YT.Player('youtube-player', {
        videoId: lesson.videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          controls: 1,
          start: Math.floor(initialTime), 
          origin: window.location.origin
        },
        events: {
          onReady: (event: any) => {
            if (initialTime > 0) {
              event.target.seekTo(initialTime, true);
            }
            intervalId = monitorProgress(event.target);
          },
          onStateChange: (event: any) => {
            if (event.data === (window as any).YT.PlayerState.ENDED) {
              if (saveProgressRef.current) saveProgressRef.current();
            }
          }
        }
      });
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
      if (intervalId) clearInterval(intervalId);
    };
  }, [lesson, loading, initialTime]);

  if (loading) return <div style={{ color: '#00c9ff', padding: '40px' }}>Carregando Aula...</div>;

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
        <div id="youtube-player" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}></div>
      </div>

      <div style={{ marginTop: '30px', padding: '24px', background: '#121418', borderRadius: '16px', border: '1px solid #2d323e' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ color: '#fff', fontSize: '1.8rem' }}>{lesson.title || lesson.titulo}</h1>
          {isCompleted && (
            <span style={{ 
              background: '#00e5ff33', color: '#00e5ff', padding: '5px 15px', 
              borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold', border: '1px solid #00e5ff'
            }}>
              ✓ Aula Concluída
            </span>
          )}
        </div>
        <div style={{ color: '#94a3b8', lineHeight: '1.8', marginTop: '15px' }}>
          {lesson.content || lesson.conteudo}
        </div>
      </div>
    </div>
  );
}