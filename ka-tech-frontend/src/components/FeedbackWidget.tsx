import React, { useState } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState('melhoria');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);

    try {
      // Pega o usuário logado de forma segura
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert("Você precisa estar logado para enviar feedback.");
        return;
      }

      const { error } = await supabase
        .from('feedbacks')
        .insert([
          { 
            user_id: user.id, 
            type, 
            message 
          }
        ]);

      if (error) throw error;

      // Sucesso! Limpa o form e mostra mensagem
      setSuccess(true);
      setMessage('');
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
      }, 3000);

    } catch (error) {
      console.error("Erro ao enviar feedback:", error);
      alert("Ocorreu um erro ao enviar seu feedback. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999 }}>
      {/* O Popover do Formulário */}
      {isOpen && (
        <div style={{
          position: 'absolute', bottom: '70px', right: '0', width: '320px',
          background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px', padding: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          color: '#fff', animation: 'fadeUp 0.3s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Enviar Feedback</h3>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {success ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#10b981' }}>
              <p>Obrigado pelo seu feedback! 🚀</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value)}
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', outline: 'none'
                }}
              >
                <option value="melhoria" style={{ color: '#000' }}>💡 Sugestão de Melhoria</option>
                <option value="bug" style={{ color: '#000' }}>🐛 Reportar um Bug</option>
                <option value="elogio" style={{ color: '#000' }}>⭐ Elogio</option>
                <option value="outro" style={{ color: '#000' }}>🤔 Outro</option>
              </select>

              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Conte-nos em detalhes..."
                rows={4}
                required
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', outline: 'none', resize: 'none'
                }}
              />

              <button 
                type="submit" 
                disabled={isSubmitting}
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px',
                  background: '#8b5cf6', color: '#fff', border: 'none',
                  fontWeight: 700, cursor: isSubmitting ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                {isSubmitting ? 'Enviando...' : <><Send size={16} /> Enviar</>}
              </button>
            </form>
          )}
        </div>
      )}

      {/* O Botão Flutuante */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: '#8b5cf6', color: '#fff', border: 'none',
          boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </div>
  );
}