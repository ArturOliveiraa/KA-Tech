import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";

export default function LessonView({ lessonId }: { lessonId: number }) {
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const playerRef = useRef<any>(null);
  const lastValidTimeRef = useRef(0);
  
  // Criamos um Ref para a função de salvar para que o useEffect 
  // do player sempre tenha acesso à versão mais recente sem precisar reiniciar o player
  const saveProgressRef = useRef<() => Promise<void>>();

  const fetchLesson = useCallback(async () => {
    if (!lessonId) return;
    setLoading(true);
    setIsCompleted(false);
    lastValidTimeRef.current = 0;

    const { data } = await supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle();
    
    if (data) {
      const rawUrl = data.videoUrl || data.videourl;
      const videoId = rawUrl?.split('v=')[1]?.split('&')[0];
      setLesson({ ...data, videoId });
    }
    setLoading(false);
  }, [lessonId]);

  useEffect(() => { fetchLesson(); }, [fetchLesson]);

  // Função de salvar real
  const saveProgress = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || !lesson) return;

    const { error } = await supabase.from("user_progress").upsert({
      user_id: session.user.id,
      lesson_id: lesson.id,
      course_id: lesson.courseId || lesson.courseid,
      completed_at: new Date().toISOString()
    }, { onConflict: 'user_id,lesson_id' });

    if (!error) {
      setIsCompleted(true);
      window.dispatchEvent(new Event("progressUpdated"));
    }
  }, [lesson]);

  // Atualiza o Ref toda vez que a função saveProgress mudar
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
          }
        }
      }, 500);
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
          origin: window.location.origin
        },
        events: {
          onReady: (event: any) => {
            intervalId = monitorProgress(event.target);
          },
          onStateChange: (event: any) => {
            if (event.data === (window as any).YT.PlayerState.ENDED) {
              // Chama a função através do Ref
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
    // Agora o saveProgressRef não causa reinicialização do player,
    // e o ESLint não reclama porque Refs não precisam estar no array.
  }, [lesson, loading]);

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