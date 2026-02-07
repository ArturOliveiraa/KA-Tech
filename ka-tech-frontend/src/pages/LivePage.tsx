import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom"; 
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import LiveView from "../components/LiveView";
import LiveChat from "../components/LiveChat";

export default function LivePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [viewerCount, setViewerCount] = useState(0);

  // Captura dados do LiveHub
  const { videoId, isReplay } = location.state || {};

  useEffect(() => {
    if (!videoId) {
      navigate("/lives-hub");
      return;
    }

    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [videoId, navigate]);

  // Presence (Contador de usuários online) - Inativo em Replays
  useEffect(() => {
    if (!user || !videoId || isReplay) return;

    const channel = supabase.channel(`live_status:${videoId}`, {
      config: { presence: { key: user.id } },
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
  }, [user, videoId, isReplay]);

  // --------------------------------------------------------------------------
  // NOVO: Heartbeat de Watchtime (Conta minutos assistidos)
  // --------------------------------------------------------------------------
  useEffect(() => {
    // Só contabiliza se tiver usuário logado, tiver videoId e NÃO for replay
    if (!user || !videoId || isReplay) return;

    const WATCH_INTERVAL = 60000; // 60 segundos

    const trackWatchTime = async () => {
      // Chama a função RPC segura no banco de dados
      const { error } = await supabase.rpc('increment_live_watchtime', { 
        video_id_input: videoId 
      });

      if (error) {
        console.error("Erro ao computar watchtime:", error.message);
      }
    };

    // Executa imediatamente ao entrar para contar o primeiro minuto
    trackWatchTime();

    // Configura o intervalo para repetir a cada minuto
    const intervalId = setInterval(trackWatchTime, WATCH_INTERVAL);

    // Limpa o intervalo se o usuário sair da página
    return () => clearInterval(intervalId);
  }, [user, videoId, isReplay]);

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#020617', fontFamily: "'Sora', sans-serif" }}>
      <Sidebar />
      
      <main style={{ 
        flex: 1, 
        marginLeft: isMobile ? '0' : '260px', 
        padding: isMobile ? '15px 15px 100px 15px' : '30px 40px',
        width: isMobile ? '100%' : 'calc(100% - 260px)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        <header style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: '#fff', fontSize: isMobile ? '1.1rem' : '1.8rem', fontWeight: 800 }}>
            {isReplay ? "📚 Replay da Aula" : "🔴 Transmissão ao Vivo"}
          </h2>

          {!isReplay && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ color: '#22c55e' }}>●</span> {viewerCount} assistindo
              </div>
              <div style={{ background: '#ef4444', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 900 }}>LIVE</div>
            </div>
          )}
        </header>

        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row', 
          gap: isMobile ? '15px' : '30px',
          alignItems: 'flex-start'
        }}>
          
          {/* PLAYER CONTAINER */}
          <div style={{ 
            flex: 1, 
            width: '100%',
            maxWidth: isReplay ? '1200px' : '100%', 
            margin: '0', 
            zIndex: 10 
          }}>
            <LiveView videoId={videoId} isReplay={isReplay} />
          </div>

          {/* CHAT CONTAINER */}
          {!isReplay && user && (
            <div style={{ 
              width: isMobile ? '100%' : '380px', 
              height: isMobile ? '450px' : 'calc(100vh - 160px)', 
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: '24px',
              overflow: 'hidden'
            }}>
              <LiveChat user={user} youtubeVideoId={videoId} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}