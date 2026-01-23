import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";

export default function LessonView({ lessonId }: { lessonId: number }) {
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const playerRef = useRef<any>(null);
  // Ref para guardar o tempo exato e evitar resets indesejados
  const lastValidTimeRef = useRef(0); 

  const fetchLesson = useCallback(async () => {
    if (!lessonId) return;
    setLoading(true);
    const { data } = await supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle();
    
    if (data) {
      const rawUrl = data.videoUrl || data.videourl;
      const videoId = rawUrl?.split('v=')[1]?.split('&')[0];
      setLesson({ ...data, videoId });
    }
    setLoading(false);
    // Reinicia o contador para a nova aula
    lastValidTimeRef.current = 0;
  }, [lessonId]);

  useEffect(() => { fetchLesson(); }, [fetchLesson]);

  const saveProgress = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || !lesson) return;

    const { error } = await supabase.from("user_progress").upsert({
      user_id: session.user.id,
      lesson_id: lesson.id,
      course_id: lesson.courseId || lesson.courseid,
      completed_at: new Date().toISOString()
    }, { onConflict: 'user_id,lesson_id' });

    if (!error) console.log("Progresso salvo!");
  };

  useEffect(() => {
    if (!lesson?.videoId || loading) return;

    const monitorProgress = (player: any) => {
      return setInterval(() => {
        if (player && player.getCurrentTime) {
          const currentTime = player.getCurrentTime();

          // LÓGICA DE BLOQUEIO REFINADA
          // Se o tempo atual for maior que o último tempo válido + 2 segundos (margem de lag)
          if (currentTime > lastValidTimeRef.current + 2) {
            // Volta para o último segundo que ele REALMENTE assistiu
            player.seekTo(lastValidTimeRef.current, true);
          } else {
            // Se ele estiver assistindo normalmente ou voltando o vídeo, atualizamos o marco
            // Mas só atualizamos se ele estiver avançando (para não "travar" quem volta o vídeo)
            if (currentTime > lastValidTimeRef.current) {
              lastValidTimeRef.current = currentTime;
            }
          }
        }
      }, 500); // Checagem mais rápida (meio segundo) para maior precisão
    };

    let intervalId: any;

    const initPlayer = () => {
      // Limpa player anterior se existir para evitar bugs de memória
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
              saveProgress();
              alert("Aula concluída!");
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
  }, [lesson, loading]);

  if (loading) return <div style={{ color: '#00c9ff', padding: '40px' }}>Carregando...</div>;

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

      <div style={{ marginTop: '30px', padding: '24px', background: '#121418', borderRadius: '16px' }}>
        <h1 style={{ color: '#fff' }}>{lesson.title || lesson.titulo}</h1>
        <p style={{ color: '#94a3b8' }}>{lesson.content || lesson.conteudo}</p>
        
        <button 
          onClick={saveProgress}
          style={{
            marginTop: '20px', padding: '12px 25px', background: '#00e5ff',
            border: 'none', borderRadius: '8px', color: '#000', fontWeight: 'bold', cursor: 'pointer'
          }}
        >
          Concluir Aula
        </button>
      </div>
    </div>
  );
}