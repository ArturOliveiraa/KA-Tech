import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import { useUser } from '../components/UserContext';

export default function MeetPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { userRole, loading: userLoading } = useUser();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const safeRoomId = roomId?.toLowerCase().trim() || "";
  const formattedRoomName = safeRoomId.replace(/\s+/g, '-');

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate('/login');
      } else {
        setUser(data.user);
        setLoading(false);
      }
    };
    checkUser();
  }, [navigate]);

  const archiveMeetingRecord = async () => {
    console.log("🚀 ARQUIVANDO REUNIÃO:", safeRoomId);
    try {
      const { error } = await supabase
        .from('meetings')
        .update({ 
          is_active: false, 
          finished_at: new Date().toISOString() 
        })
        .eq('room_id', safeRoomId);

      if (error) console.error("❌ ERRO AO ARQUIVAR:", error.message);
    } catch (err) {
      console.error("🔥 ERRO CRÍTICO:", err);
    } finally {
      navigate('/reunioes');
    }
  };

  if (loading || userLoading) return <div style={styles.loading}>Carregando meet...</div>;

  return (
    <div className="meet-external-wrapper" style={{ backgroundColor: '#020617', minHeight: '100vh' }}>
      <style>{`
        .meet-external-wrapper { display: block; width: 100%; }
        .meet-main-content { margin-left: 260px; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        .meet-header { 
          flex-shrink: 0; 
          height: 70px; 
          padding: 0 30px; 
          display: flex; 
          align-items: center; 
          border-bottom: 1px solid rgba(139, 92, 246, 0.1); 
          background-color: #020617; 
        }
        .video-container-full { flex-grow: 1; min-height: 0; margin: 15px; display: flex; flex-direction: column; background-color: #000; border-radius: 12px; overflow: hidden; }
        @media (max-width: 1024px) {
          .meet-main-content { margin-left: 0; height: calc(100vh - 75px); }
          .video-container-full { margin: 0; border-radius: 0; }
        }
      `}</style>

      <Sidebar />

      <main className="meet-main-content">
        <header className="meet-header">
          <h2 style={{ color: '#fff', fontSize: '1.1rem', margin: 0 }}>
            Aula Ao Vivo: <span style={{ color: '#8b5cf6' }}>{roomId}</span>
          </h2>
          <span style={{color: '#444', fontSize: '0.7rem', marginLeft: '10px'}}>Role: {userRole}</span>
        </header>

        <div className="video-container-full">
          <JitsiMeeting
            domain="meet.element.io"
            roomName={formattedRoomName}
            configOverwrite={{
              startWithAudioMuted: true,
              startWithVideoMuted: true,
              enableWelcomePage: false,
              prejoinPageEnabled: false,
              disableDeepLinking: true,
            }}
            userInfo={{
              displayName: user?.user_metadata?.full_name || user?.email,
              email: user?.email
            }}
            
            /* USAMOS O onApiReady PARA ADICIONAR O LISTENER SEM ERRO DE TYPESCRIPT */
            onApiReady={(externalApi) => {
                externalApi.on('videoConferenceTerminated', async () => {
                    console.log("🛑 Evento nativo detectado via API");
                    if (userRole === 'admin' || userRole === 'teacher') {
                        await archiveMeetingRecord();
                    } else {
                        navigate('/reunioes');
                    }
                });
            }}

            onReadyToClose={() => navigate('/reunioes')}
            containerStyles={{ flex: 1, display: 'flex', height: '100%', width: '100%' }}
          />
        </div>
      </main>
    </div>
  );
}

const styles = {
  loading: { display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617', color: '#8b5cf6' }
};