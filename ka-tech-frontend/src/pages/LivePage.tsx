import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import LiveView from "../components/LiveView";
import LiveChat from "../components/LiveChat";

export default function LivePage() {
  const [user, setUser] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

  // ID da live atualizada
  const LIVE_ID = "vI9EhIlvNAg"; 

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      width: '100%', 
      minHeight: '100vh', 
      backgroundColor: '#020617', 
      fontFamily: "'Sora', sans-serif",
      overflow: 'hidden' // Evita scroll duplo na página inteira
    }}>
      <Sidebar />
      
      <main style={{ 
        flex: 1, 
        display: 'flex',
        flexDirection: 'column',
        // No mobile, removemos a margem da sidebar e ajustamos o padding inferior para não cobrir o menu
        padding: isMobile ? '10px 10px 80px 10px' : '20px 40px', 
        marginLeft: isMobile ? '0' : '260px',
        width: '100%',
        height: '100vh',
        boxSizing: 'border-box'
      }}>
        
        {/* Header Adaptado: Mais compacto no Mobile */}
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
            Aula Inaugural - Ao Vivo
          </h2>
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
        </header>

        {/* Layout Principal: Coluna no Mobile, Linha no Desktop */}
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row', 
          gap: isMobile ? '15px' : '30px',
          flex: 1,
          minHeight: 0 // Importante para o scroll interno do chat funcionar no desktop
        }}>
          
          {/* Seção do Vídeo */}
          <div style={{ 
            flex: isMobile ? 'none' : 1, 
            width: '100%',
            zIndex: 10 // Garante que o player fique sobre outros elementos se necessário
          }}>
            <LiveView videoId={LIVE_ID} />
          </div>

          {/* Seção do Chat: No mobile fica abaixo do vídeo e ocupa o resto da tela */}
          <div style={{ 
            width: isMobile ? '100%' : '380px', 
            // No mobile, definimos uma altura fixa para o chat ou deixamos flexível
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