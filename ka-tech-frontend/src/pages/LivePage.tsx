import { useEffect, useState } from "react";
import { PlaySquare, Radio } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import LiveView from "../components/LiveView";
import LiveChat from "../components/LiveChat";
import SEO from "../components/SEO";
import styles from "./LivePage.module.css"; 

export default function LivePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // CORREÇÃO: Estado local em vez de Contexto para evitar erro de Tipagem
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [viewerCount, setViewerCount] = useState(0);

  // Recupera ID e Status
  const videoId = location.state?.videoId || searchParams.get('v');
  const isReplay = location.state?.isReplay || searchParams.get('replay') === 'true';

  useEffect(() => {
    if (!videoId) {
      navigate("/lives-hub");
    }
  }, [videoId, navigate]);

  // --- CARREGAR USUÁRIO ---
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setCurrentUser(data.user);
      }
    };
    getUser();
  }, []);

  // Presence
  useEffect(() => {
    if (!currentUser || !videoId || isReplay) return;

    const channel = supabase.channel(`live_status:${videoId}`, {
      config: { presence: { key: currentUser.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        setViewerCount(Object.keys(newState).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => { channel.unsubscribe(); };
  }, [currentUser, videoId, isReplay]);

  // Watchtime
  useEffect(() => {
    if (!currentUser || !videoId || isReplay) return;
    
    const incrementWatchTime = async () => {
      // Verifica se a página está visível para não contar tempo à toa
      if (document.visibilityState === 'visible') {
         await supabase.rpc('increment_live_watchtime', { video_id_input: videoId });
      }
    };

    incrementWatchTime(); 
    const intervalId = setInterval(incrementWatchTime, 60000);
    return () => clearInterval(intervalId);
  }, [currentUser, videoId, isReplay]);

  if (!videoId) return null; 

  return (
    <div className={styles.container}>
      <SEO title={isReplay ? "Replay da live" : "Ao vivo"} description="Participe da transmissão." />
      <Sidebar />
      
      <main className={styles.mainContent}>
        
        <header className={styles.header}>
          <h2 className={styles.title}>
            {isReplay ? <><PlaySquare size={22} aria-hidden="true" /> Replay da live</> : <><Radio size={22} aria-hidden="true" /> Transmissão ao vivo</>}
          </h2>

          {!isReplay && (
            <div className={styles.liveBadgeContainer}>
              <div className={styles.viewerCount}>
                <span className={styles.pulseIcon} aria-hidden="true">●</span> 
                {viewerCount} assistindo
              </div>
              <div className={styles.liveTag}>AO VIVO</div>
            </div>
          )}
        </header>

        <div className={styles.contentGrid}>
          {/* VÍDEO */}
          <div className={styles.videoWrapper}>
            <LiveView videoId={videoId} isReplay={isReplay} />
          </div>

          {/* CHAT */}
          {!isReplay && (
            <div className={styles.chatWrapper}>
              {currentUser ? (
                <LiveChat user={currentUser} youtubeVideoId={videoId} />
              ) : (
                <div className="ui-loading-inline" style={{ height: "100%", justifyContent: "center", flexDirection: "column" }}>
                  <div className="ui-spinner ui-spinner--sm" />
                  <span>Conectando ao chat...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}