import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useUser } from '../components/UserContext';
import Sidebar from '../components/Sidebar';

export default function MeetingHub() {
    const { userRole } = useUser();
    const navigate = useNavigate();
    const [meetings, setMeetings] = useState<any[]>([]);
    const [newTitle, setNewTitle] = useState('');
    const [newSlug, setNewSlug] = useState(''); 
    const [loading, setLoading] = useState(true);

    const fetchMeetings = async () => {
        const { data } = await supabase
            .from('meetings')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        if (data) setMeetings(data);
        setLoading(false);
    };

    useEffect(() => { fetchMeetings(); }, []);

    const handleCreateMeeting = async () => {
        if (!newTitle || !newSlug) {
            alert("Por favor, preencha o Título e a URL personalizada!");
            return;
        }

        try {
            const { data: userData } = await supabase.auth.getUser();
            const sanitizedSlug = newSlug.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

            const { error } = await supabase.from('meetings').insert([
                {
                    title: newTitle,
                    room_id: sanitizedSlug,
                    created_by: userData.user?.id,
                    is_active: true
                }
            ]);

            if (error) {
                alert(`Erro no banco: ${error.message}`);
            } else {
                setNewTitle('');
                setNewSlug('');
                fetchMeetings();
                alert("Reunião criada com sucesso!");
            }
        } catch (err) {
            console.error(err);
            alert("Erro interno ao processar criação.");
        }
    };

    const handleDeleteMeeting = async (meetingId: string) => {
        if (!window.confirm("Deseja realmente encerrar esta reunião?")) return;
        const { error } = await supabase.from('meetings').delete().eq('id', meetingId);
        if (error) alert("Erro ao encerrar: " + error.message);
        else fetchMeetings();
    };

    return (
        <div className="hub-container">
            <style>{`
                .hub-container { 
                    display: flex; 
                    background-color: #020617; 
                    min-height: 100vh; 
                    color: #fff; 
                    box-sizing: border-box; 
                }
                
                /* Reset global para evitar que padding quebre o layout */
                .hub-container *, .hub-container *::before, .hub-container *::after {
                    box-sizing: border-box;
                }

                .hub-main { 
                    flex: 1; 
                    margin-left: 260px; 
                    padding: 40px; 
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    width: 100%;
                }

                .hub-content-wrapper {
                    width: 100%;
                    max-width: 1200px;
                }
                
                .creation-grid { 
                    display: grid; 
                    grid-template-columns: 1fr 380px; 
                    gap: 40px; 
                    margin-bottom: 25px;
                    align-items: flex-end;
                    width: 100%;
                }

                .input-group { 
                    display: flex; 
                    flex-direction: column; 
                    gap: 8px; 
                    width: 100%;
                }

                .input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                    width: 100%;
                }

                /* Mobile: Ajuste fino para não exceder o campo */
                @media (max-width: 1200px) {
                    .creation-grid { 
                        grid-template-columns: 1fr; 
                        gap: 20px; 
                    }
                    .hub-main { 
                        margin-left: 0; 
                        padding: 20px; 
                        margin-bottom: 85px; 
                    }
                    .hub-content-wrapper { 
                        max-width: 100%; 
                    }
                }

                @media (max-width: 480px) {
                    .hub-main { padding: 15px; }
                    header h1 { font-size: 1.6rem !important; }
                }
            `}</style>

            <Sidebar />

            <main className="hub-main">
                <div className="hub-content-wrapper">
                    <header style={{ marginBottom: '40px' }}>
                        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>🤝 Central de Reuniões</h1>
                        <p style={{ color: '#9ca3af', fontSize: '1rem', marginTop: '10px' }}>Gerencie suas salas de mentoria e encontros ao vivo.</p>
                    </header>

                    {(userRole === 'admin' || userRole === 'teacher') && (
                        <section style={styles.card}>
                            <h3 style={{ marginBottom: '25px', fontSize: '1.2rem', color: '#f8fafc' }}>🚀 Criar Nova Reunião</h3>
                            
                            <div className="creation-grid">
                                <div className="input-group">
                                    <label style={styles.label}>Título da Reunião</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Alinhamento de Indicadores."
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        style={styles.input}
                                    />
                                </div>

                                <div className="input-group">
                                    <label style={styles.label}>URL Personalizada (Slug)</label>
                                    <div className="input-wrapper">
                                        <span style={styles.urlPrefix}>/meet/</span>
                                        <input
                                            type="text"
                                            placeholder="ex: indicadores-softcom"
                                            value={newSlug}
                                            onChange={(e) => setNewSlug(e.target.value)}
                                            style={{ ...styles.input, paddingLeft: '65px' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button onClick={handleCreateMeeting} style={styles.button}>Criar e Ativar Sala</button>
                        </section>
                    )}

                    <section style={{ width: '100%' }}>
                        <h3 style={{ marginBottom: '20px', color: '#f8fafc', fontSize: '1.2rem' }}>Salas Disponíveis</h3>
                        {loading ? <p>Carregando...</p> : (
                            <div style={styles.grid}>
                                {meetings.length > 0 ? meetings.map(m => (
                                    <div key={m.id} style={styles.meetingCard}>
                                        <div style={{ flex: 1, marginRight: '15px', overflow: 'hidden' }}>
                                            <h4 style={{ 
                                                margin: '0 0 5px 0', 
                                                whiteSpace: 'nowrap', 
                                                overflow: 'hidden', 
                                                textOverflow: 'ellipsis', 
                                                color: '#fff' 
                                            }}>{m.title}</h4>
                                            <span style={{ fontSize: '0.85rem', color: '#8b5cf6', fontWeight: 600 }}>/meet/{m.room_id}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button 
                                                onClick={() => navigate(`/meet/${m.room_id}`)} 
                                                style={styles.joinButton}
                                            >
                                                Entrar
                                            </button>

                                            {(userRole === 'admin' || userRole === 'teacher') && (
                                                <button 
                                                    onClick={() => handleDeleteMeeting(m.id)} 
                                                    style={styles.deleteButton}
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )) : <p style={{ color: '#64748b' }}>Nenhuma reunião ativa no momento.</p>}
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}

const styles = {
    card: { 
        backgroundColor: '#0f172a', 
        padding: '25px', 
        borderRadius: '16px', 
        border: '1px solid rgba(139, 92, 246, 0.2)', 
        marginBottom: '40px',
        width: '100%',
        overflow: 'hidden' 
    },
    label: { fontSize: '0.9rem', color: '#9ca3af', fontWeight: 600, marginBottom: '2px' },
    input: { 
        width: '100%', 
        padding: '14px', 
        borderRadius: '8px', 
        border: '1px solid #334155', 
        backgroundColor: '#020617', 
        color: '#fff', 
        outline: 'none', 
        fontSize: '1rem' 
    },
    urlPrefix: { 
        position: 'absolute' as 'absolute', 
        left: '12px', 
        color: '#64748b', 
        fontSize: '0.9rem', 
        fontWeight: 700, 
        pointerEvents: 'none' as 'none' 
    },
    button: { 
        width: '100%', 
        padding: '16px', 
        backgroundColor: '#8b5cf6', 
        color: '#fff', 
        border: 'none', 
        borderRadius: '8px', 
        fontWeight: 700, 
        cursor: 'pointer', 
        fontSize: '1rem', 
        marginTop: '10px' 
    },
    grid: { 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
        gap: '20px',
        width: '100%' 
    },
    meetingCard: { 
        backgroundColor: '#1e293b', 
        padding: '20px', 
        borderRadius: '14px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        border: '1px solid #334155' 
    },
    joinButton: { 
        padding: '10px 22px', 
        backgroundColor: '#10b981', 
        color: '#fff', 
        border: 'none', 
        borderRadius: '8px', 
        cursor: 'pointer', 
        fontWeight: 700, 
        fontSize: '0.9rem' 
    },
    deleteButton: { 
        padding: '10px 14px', 
        backgroundColor: '#ef4444', 
        color: '#fff', 
        border: 'none', 
        borderRadius: '8px', 
        cursor: 'pointer', 
        display: 'flex', 
        alignItems: 'center' 
    }
};