import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar"; // Ajuste o caminho se necessário
import { supabase } from "../supabaseClient";
import SEO from "../components/SEO"; // Ajuste ou remova se não usar
import { MessageSquare, CheckCircle, Clock, Trash2 } from "lucide-react";

interface Feedback {
  id: string;
  user_name: string;
  contact_info: string;
  type: string;
  message: string;
  status: string;
  created_at: string;
}

export default function AdminFeedbacks() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setFeedbacks(data);
    } catch (err) {
      console.error("Erro ao buscar feedbacks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('feedbacks')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      // Atualiza o estado local para refletir a mudança imediatamente
      setFeedbacks(prev => prev.map(fb => fb.id === id ? { ...fb, status: newStatus } : fb));
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      alert("Falha ao atualizar o status. Verifique as permissões (RLS) no Supabase.");
    }
  };

  const deleteFeedback = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja deletar este feedback?")) return;
    
    try {
      const { error } = await supabase.from('feedbacks').delete().eq('id', id);
      if (error) throw error;
      
      setFeedbacks(prev => prev.filter(fb => fb.id !== id));
    } catch (err) {
      console.error("Erro ao deletar feedback:", err);
      alert("Falha ao deletar. Verifique as permissões (RLS) no Supabase.");
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'resolvido') return <span className="badge badge-success">Resolvido</span>;
    if (status === 'em_analise') return <span className="badge badge-warning">Em Análise</span>;
    return <span className="badge badge-pending">Pendente</span>;
  };

  const getTypeIcon = (type: string) => {
    if (type === 'bug') return '🐛';
    if (type === 'melhoria') return '💡';
    if (type === 'elogio') return '⭐';
    return '🤔';
  };

  return (
    <div className="dashboard-wrapper">
      <SEO title="Gestão de Feedbacks" description="Administre os feedbacks dos usuários" />
      <Sidebar />

      <main className="dashboard-content">
        <header style={{ marginBottom: '30px' }}>
          <h1 style={{ fontSize: '2rem', color: 'var(--color-text)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquare size={28} className="text-primary" />
            Caixa de Feedbacks
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '8px' }}>
            Acompanhe bugs, sugestões e elogios enviados pelos alunos.
          </p>
        </header>

        <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px' }}>
          {loading ? (
            <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '40px 0' }}>Carregando feedbacks...</div>
          ) : feedbacks.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '40px 0' }}>Nenhum feedback recebido ainda.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--color-text-secondary)', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '15px' }}>Data</th>
                  <th style={{ padding: '15px' }}>Usuário / Contato</th>
                  <th style={{ padding: '15px' }}>Tipo</th>
                  <th style={{ padding: '15px' }}>Mensagem</th>
                  <th style={{ padding: '15px' }}>Status</th>
                  <th style={{ padding: '15px', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.map((fb) => (
                  <tr key={fb.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '15px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {new Date(fb.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '15px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{fb.user_name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{fb.contact_info}</div>
                    </td>
                    <td style={{ padding: '15px' }}>
                      {getTypeIcon(fb.type)} <span style={{ textTransform: 'capitalize' }}>{fb.type}</span>
                    </td>
                    <td style={{ padding: '15px', maxWidth: '300px' }}>
                      <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>{fb.message}</p>
                    </td>
                    <td style={{ padding: '15px' }}>
                      {getStatusBadge(fb.status || 'pendente')}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {fb.status !== 'resolvido' && (
                          <button 
                            onClick={() => updateStatus(fb.id, 'resolvido')}
                            title="Marcar como Resolvido"
                            className="action-btn success-btn"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        {fb.status !== 'em_analise' && (
                          <button 
                            onClick={() => updateStatus(fb.id, 'em_analise')}
                            title="Marcar Em Análise"
                            className="action-btn warning-btn"
                          >
                            <Clock size={16} />
                          </button>
                        )}
                        <button 
                          onClick={() => deleteFeedback(fb.id)}
                          title="Deletar"
                          className="action-btn danger-btn"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      <style>{`
        /* FORÇA O FUNDO ESCURO E IMPEDE O VAZAMENTO HORIZONTAL NO MOBILE */
        .dashboard-wrapper {
          display: flex;
          width: 100%;
          min-height: 100vh;
          background-color: var(--color-bg); 
          font-family: var(--font-sans);
          overflow-x: hidden; 
        }

        .dashboard-content {
          flex: 1;
          margin-left: var(--sidebar-width); /* Espaço exato da sidebar */
          width: calc(100% - var(--sidebar-width));
          max-width: 100vw;
          padding: 40px 60px;
        }

        .glass-panel {
          background: var(--color-surface-1); 
          border: 1px solid var(--color-border);
          width: 100%;
          overflow-x: auto; /* Cria barra de rolagem horizontal só na tabela */
          -webkit-overflow-scrolling: touch;
        }

        .text-primary { color: var(--color-primary-text); }

        /* ESTILOS DAS TAGS E BOTÕES */
        .badge {
          padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .badge-pending { background: rgba(148, 163, 184, 0.2); color: var(--color-text-muted); }
        .badge-warning { background: var(--color-warning-soft); color: var(--color-warning-text); }
        .badge-success { background: var(--color-success-soft); color: var(--color-success-text); }

        .action-btn {
          background: var(--color-surface-2); border: 1px solid var(--color-border); 
          color: var(--color-text); width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;
          flex-shrink: 0;
        }
        .action-btn:hover { transform: translateY(-2px); }
        .success-btn:hover { background: var(--color-success-soft); border-color: #34d399; color: var(--color-success-text); }
        .warning-btn:hover { background: var(--color-warning-soft); border-color: #fcd34d; color: var(--color-warning-text); }
        .danger-btn:hover { background: var(--color-danger-soft); border-color: #f87171; color: var(--color-danger-text); }
        
        /* RESPONSIVIDADE BÁSICA */
        @media (max-width: 1024px) {
          .dashboard-content { 
            margin-left: 0; 
            width: 100%; 
            padding: 30px 15px; 
          }
        }
      `}</style>
    </div>
  );
}