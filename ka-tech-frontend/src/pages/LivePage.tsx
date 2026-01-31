import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import LiveView from "../components/LiveView";
import LiveChat from "../components/LiveChat";

export default function LivePage() {
  const [user, setUser] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [viewerCount, setViewerCount] = useState(0); // Estado para o contador

  // ID da live atualizada
  const LIVE_ID = "ZL4O6dmHRuc";

  useEffect(() => {
    // 1. Pegar dados do usuário
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2. Lógica do Contador em Tempo Real (Presence)
  useEffect(() => {
    if (!user) return;

    // Criar o canal da live
    const channel = supabase.channel(`live_status:${LIVE_ID}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // Sincronizar estado dos usuários online
    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        // Conta quantas chaves únicas (usuários) existem no canal
        setViewerCount(Object.keys(newState).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Começa a rastrear este usuário
          await channel.track({
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [user, LIVE_ID]);

  return (
    <div style={{ 
      display: 'flex', 
      width: '100%', 
      minHeight: '100vh', 
      backgroundColor: '#020617', 
      fontFamily: "'Sora', sans-serif",
      overflow: 'hidden' 
    }}>
      <Sidebar />
      
      <main style={{ 
        flex: 1, 
        display: 'flex',
        flexDirection: 'column',
        padding: isMobile ? '10px 10px 80px 10px' : '20px 40px', 
        marginLeft: isMobile ? '0' : '260px',
        width: '100%',
        height: '100vh',
        boxSizing: 'border-box'
      }}>
        
        {/* Header com Contador de Pessoas */}
        <header style={{ 
          marginBottom: isMobile ? '12px' : '24px', 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ 
            color: '#fff', 
            fontSize: isMobile ? '1.1rem' : '1.8rem', 
            fontWeight: 800,
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            as novidades do Novo MLP do Softcomshop na prática🚀
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '15px' }}>
            {/* Display do Contador */}
            <div style={{ 
              color: '#94a3b8', 
              fontSize: isMobile ? '0.7rem' : '0.85rem', 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <span style={{ color: '#22c55e' }}>●</span> {viewerCount} assistindo
            </div>

            <div style={{ 
              background: '#ef4444', 
              color: '#fff', 
              padding: isMobile ? '2px 8px' : '4px 12px', 
              borderRadius: '20px', 
              fontSize: isMobile ? '0.6rem' : '0.7rem', 
              fontWeight: 900,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span style={{ width: '6px', height: '6px', background: '#fff', borderRadius: '50%', display: 'inline-block' }}></span>
              LIVE
            </div>
          </div>
        </header>

        {/* Layout Principal */}
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row', 
          gap: isMobile ? '15px' : '30px',
          flex: 1,
          minHeight: 0 
        }}>
          
          <div style={{ 
            flex: isMobile ? 'none' : 1, 
            width: '100%',
            zIndex: 10 
          }}>
            <LiveView videoId={LIVE_ID} />
          </div>

          <div style={{ 
            width: isMobile ? '100%' : '380px', 
            height: isMobile ? '400px' : '100%', 
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0
          }}>
            {user && <LiveChat user={user} />}
          </div>
        </div>

      </main>
    </div>
  );
}