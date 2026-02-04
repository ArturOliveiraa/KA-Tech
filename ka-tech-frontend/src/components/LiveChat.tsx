import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import Avatar from "./Avatar";

interface LiveChatProps {
  user: any;
  youtubeVideoId?: string | null;
}

export default function LiveChat({ user, youtubeVideoId }: LiveChatProps) {
  // Estados apenas para o Chat Interno (Supabase)
  const [internalMessages, setInternalMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- LÓGICA DO CHAT INTERNO (Supabase) ---
  // Só roda se NÃO tiver vídeo do YouTube
  useEffect(() => {
    if (youtubeVideoId) return; 

    const fetchInternal = async () => {
      const { data } = await supabase.from("live_messages").select("*").order("created_at", { ascending: true }).limit(50);
      if (data) setInternalMessages(data);
    };

    fetchInternal();

    const channel = supabase.channel('live_chat_update')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_messages' }, (payload) => {
        setInternalMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [youtubeVideoId]);

  const handleInternalSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    await supabase.from("live_messages").insert({
        content: newMessage,
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email,
        avatar_url: user.user_metadata?.avatar_url
    });
    setNewMessage("");
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [internalMessages]);

  if (youtubeVideoId) {
    const domain = window.location.hostname;
    // URL Mágica do YouTube Chat Embed
    const src = `https://www.youtube.com/live_chat?v=${youtubeVideoId}&embed_domain=${domain}&dark_theme=1`;

    return (
      <div style={{ width: '100%', height: '100%', borderRadius: '24px', overflow: 'hidden', background: '#000', border: '1px solid rgba(139, 92, 246, 0.1)' }}>
        <iframe 
            src={src}
            width="100%" 
            height="100%" 
            frameBorder="0" 
            title="Live Chat"
            style={{ width: '100%', height: '100%' }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#09090b', borderRadius: '24px', border: '1px solid rgba(139, 92, 246, 0.1)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', background: 'rgba(139, 92, 246, 0.05)', borderBottom: '1px solid rgba(139, 92, 246, 0.1)' }}>
        <span style={{ color: '#a78bfa', fontWeight: 800 }}>CHAT INTERNO</span>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {internalMessages.map((msg, idx) => (
          <div key={msg.id || idx} style={{ display: 'flex', gap: '12px' }}>
             <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden' }}>
               <Avatar src={msg.avatar_url} name={msg.user_name} />
             </div>
             <div>
               <div style={{ color: '#8b5cf6', fontWeight: 800, fontSize: '0.8rem' }}>{msg.user_name}</div>
               <div style={{ color: '#fff', fontSize: '0.9rem' }}>{msg.content}</div>
             </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleInternalSend} style={{ padding: '15px', background: '#020617' }}>
        <input 
            value={newMessage} onChange={(e) => setNewMessage(e.target.value)} 
            placeholder="Digite..." 
            style={{ width: '100%', background: '#09090b', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '12px', padding: '12px', color: '#fff' }} 
        />
      </form>
    </div>
  );
}