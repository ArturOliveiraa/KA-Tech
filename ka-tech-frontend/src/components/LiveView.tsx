import React, { useEffect } from "react";

export default function LiveView({ videoId }: { videoId: string }) {
  useEffect(() => {
    const initPlayer = () => {
      if (!(window as any).YT?.Player) return;
      new (window as any).YT.Player('live-player', {
        videoId: videoId,
        playerVars: { 
          autoplay: 1, 
          modestbranding: 1, 
          rel: 0, 
          origin: window.location.origin 
        },
      });
    };

    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    } else {
      initPlayer();
    }
  }, [videoId]);

  return (
    <div style={{ width: '100%', borderRadius: '16px', overflow: 'hidden', background: '#000', aspectRatio: '16/9' }}>
      <div id="live-player" style={{ width: '100%', height: '100%' }}></div>
    </div>
  );
}