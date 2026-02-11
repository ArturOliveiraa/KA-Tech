import React, { useEffect } from "react";

interface LiveViewProps {
  videoId: string;
  isReplay?: boolean;
}

export default function LiveView({ videoId, isReplay }: LiveViewProps) {
  useEffect(() => {
    const initPlayer = () => {
      if (!(window as any).YT?.Player || !videoId) return;

      const playerContainer = document.getElementById('live-player');
      if (playerContainer) playerContainer.innerHTML = '';

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
    <div style={{ 
      width: '100%', 
      borderRadius: '24px', 
      overflow: 'hidden', 
      background: '#000', 
      aspectRatio: '16/9',
      boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
      border: isReplay ? '1px solid rgba(255, 255, 255, 0.05)' : 'none' 
    }}>
      <div id="live-player" style={{ width: '100%', height: '100%' }}></div>
    </div>
  );
}