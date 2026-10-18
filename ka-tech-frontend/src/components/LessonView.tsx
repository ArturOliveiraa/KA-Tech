import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";
import { parseVideoUrl } from "../utils/video";

/** Player da aula (YouTube), com retomada, bloqueio de avanço e conclusão automática. */
export default function LessonView({
  lessonId,
  initialTime = 0,
  onProgressUpdate,
  seekTo = null,
}: {
  lessonId: number;
  initialTime?: number;
  onProgressUpdate?: (time: number, completed?: boolean) => void;
  seekTo?: number | null;
}) {
  const [video, setVideo] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ytRef = useRef<any>(null);
  const lastValidTimeRef = useRef(initialTime);
  const lastReportRef = useRef(0);
  const onProgressUpdateRef = useRef(onProgressUpdate);
  const hasCompletedRef = useRef(false); // Evita disparar conclusão múltiplas vezes

  useEffect(() => {
    onProgressUpdateRef.current = onProgressUpdate;
  }, [onProgressUpdate]);

  const fetchLesson = useCallback(async () => {
    if (!lessonId) return;
    setLoading(true);
    setError(null);

    const { data, error: dbError } = await supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle();
    if (dbError || !data) {
      setError("Aula não encontrada.");
      setLoading(false);
      return;
    }

    const rawUrl = data.videoUrl || data.videourl || "";
    const parsed = parseVideoUrl(rawUrl);
    if (!parsed) setError("O vídeo desta aula não está disponível. Avise a equipe.");
    else setVideo(parsed);
    setLoading(false);
  }, [lessonId]);

  useEffect(() => { fetchLesson(); }, [fetchLesson]);

  // Conclusão, bloqueio de avanço e gravação do progresso
  const handleTick = useCallback((curr: number, duration: number, rewind: (to: number) => void) => {
    // Conclusão quando falta menos de 1 segundo
    if (duration > 0 && curr >= duration - 1 && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onProgressUpdateRef.current?.(duration, true);
      return;
    }
    // Bloqueio de avanço: volta para o último ponto assistido
    if (curr > lastValidTimeRef.current + 3) {
      rewind(lastValidTimeRef.current);
    } else if (curr > lastValidTimeRef.current) {
      lastValidTimeRef.current = curr;
      // Grava no máximo uma vez por segundo
      if (!hasCompletedRef.current && Date.now() - lastReportRef.current >= 900) {
        lastReportRef.current = Date.now();
        onProgressUpdateRef.current?.(curr, false);
      }
    }
  }, []);

  const handleEnded = useCallback((duration: number) => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    onProgressUpdateRef.current?.(duration, true);
  }, []);

  useEffect(() => {
    if (!video || loading || error) return;

    let intervalId: any;
    let isMounted = true;

    const initPlayer = () => {
      if (!isMounted) return;
      if (!(window as any).YT?.Player) {
        setTimeout(initPlayer, 200);
        return;
      }
      try {
        if (ytRef.current?.destroy) ytRef.current.destroy();
        ytRef.current = new (window as any).YT.Player("youtube-player", {
          videoId: video.id,
          playerVars: { rel: 0, modestbranding: 1, origin: window.location.origin, enablejsapi: 1, start: Math.floor(initialTime) },
          events: {
            onReady: (event: any) => {
              if (!isMounted) return;
              intervalId = setInterval(() => {
                if (!event.target?.getCurrentTime) return;
                handleTick(event.target.getCurrentTime(), event.target.getDuration(), (to) => event.target.seekTo(to, true));
              }, 1000);
            },
            onStateChange: (event: any) => {
              if (event.data === (window as any).YT.PlayerState.ENDED) handleEnded(event.target.getDuration());
            },
          },
        });
      } catch (e) {
        console.error("Player error:", e);
      }
    };

    if (!(window as any).YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    } else {
      initPlayer();
    }

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
      try { ytRef.current?.destroy?.(); } catch { /* já destruído */ }
      ytRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video, loading, error]);

  // Pular para o momento de uma anotação
  useEffect(() => {
    if (seekTo === null) return;
    lastValidTimeRef.current = seekTo;
    if (ytRef.current?.seekTo) ytRef.current.seekTo(seekTo, true);
  }, [seekTo]);

  if (loading) return <div style={{ display: "grid", placeItems: "center", aspectRatio: "16 / 9" }}><div className="ui-spinner" /></div>;
  if (error) return <div className="ui-alert ui-alert--danger" style={{ margin: 16 }} role="alert">{error}</div>;

  return (
    <div style={{ width: "100%", margin: 0 }}>
      <div style={{ position: "relative", paddingTop: "56.25%", background: "#000", overflow: "hidden" }}>
        <div id="youtube-player" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}
