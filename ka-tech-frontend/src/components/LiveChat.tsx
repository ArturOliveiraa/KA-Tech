import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import Avatar from "./Avatar";

export default function LiveChat({ user }: { user: any }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("live_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => data && setMessages(data));

    const channel = supabase.channel('chat-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_messages' }, 
      (payload) => setMessages((prev) => [...prev, payload.new]))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
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

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      background: '#09090b', 
      borderRadius: '20px', 
      border: '1px solid rgba(139, 92, 246, 0.1)', 
      overflow: 'hidden' 
    }}>
      <div style={{ 
        padding: '12px 16px', 
        background: 'rgba(139, 92, 246, 0.05)', 
        borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ fontSize: '1rem' }}>💬</span>
        <span style={{ 
          color: '#a78bfa', 
          fontSize: '0.75rem', 
          fontWeight: 800, 
          letterSpacing: '1px' 
        }}>
          CONVERSA AO VIVO
        </span>
      </div>

      <div 
        ref={scrollRef}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '15px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px' // Aumentei o gap entre as mensagens para 16px
        }} 
      >
        {messages.map((msg) => (
          <div key={msg.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
             {/* FOTO AMPLIADA E PROPORCIONAL */}
             <div style={{ 
               width: '42px', // Aumentado de 32px para 42px
               height: '42px', // Aumentado de 32px para 42px
               flexShrink: 0, 
               borderRadius: '50%', 
               overflow: 'hidden',
               border: '2px solid rgba(139, 92, 246, 0.3)', // Borda levemente mais grossa para destacar
               boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)' // Sombra para dar profundidade
             }}>
               <Avatar src={msg.avatar_url} name={msg.user_name} />
             </div>

             <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '2px' }}>
               <span style={{ 
                 color: '#8b5cf6', 
                 fontSize: '0.75rem', // Aumentado levemente para acompanhar a foto
                 fontWeight: 800, 
                 marginBottom: '3px' 
               }}>
                 {msg.user_name}
               </span>
               <span style={{ 
                 color: '#e2e8f0', 
                 fontSize: '0.85rem', 
                 lineHeight: '1.4',
                 wordBreak: 'break-word' 
               }}>
                 {msg.content}
               </span>
             </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} style={{ padding: '15px', background: '#020617' }}>
        <input 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Participe da conversa..."
          style={{ 
            width: '100%', 
            background: '#09090b', 
            border: '1px solid rgba(139, 92, 246, 0.2)', 
            borderRadius: '12px', 
            padding: '12px 16px', 
            color: '#fff',
            fontSize: '0.9rem',
            outline: 'none'
          }}
        />
      </form>
    </div>
  );
}