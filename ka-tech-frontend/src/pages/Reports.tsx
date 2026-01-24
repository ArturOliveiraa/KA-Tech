import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";

export default function Reports() {
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    
    // Estados para os Dados
    const [platformStats, setPlatformStats] = useState({ totalStudents: 0, totalCourses: 0, totalLessonsFinished: 0 });
    const [allProfiles, setAllProfiles] = useState<any[]>([]);
    const [orphanTags, setOrphanTags] = useState<any[]>([]);

    // Estados para o Pop-up (Toast) e Alterações Pendentes
    const [showToast, setShowToast] = useState(false);
    const [toastMsg, setToastMsg] = useState(""); 
    const [pendingChanges, setPendingChanges] = useState<{ [key: string]: string }>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
                setUserRole(prof?.role || 'user');
            }

            const [profilesRes, coursesRes, progressRes] = await Promise.all([
                supabase.from("profiles").select("id", { count: 'exact', head: true }),
                supabase.from("courses").select("id", { count: 'exact', head: true }),
                supabase.from("user_progress").select("id", { count: 'exact', head: true }).eq("is_completed", true)
            ]);

            setPlatformStats({
                totalStudents: profilesRes.count || 0,
                totalCourses: coursesRes.count || 0,
                totalLessonsFinished: progressRes.count || 0
            });

            const { data: profData } = await supabase.from("profiles").select("id, full_name, role").order('full_name');
            if (profData) setAllProfiles(profData);

            // Apenas Admin carrega tags órfãs
            const { data: tagsData } = await supabase.from("tags").select(`id, name, course_tags (course_id)`);
            if (tagsData) {
                const orphans = tagsData.filter((t: any) => t.course_tags.length === 0);
                setOrphanTags(orphans);
            }
            setLoading(false);
        }
        loadData();
    }, []);

    const trackChange = (userId: string, newRole: string) => {
        if (userRole !== 'admin') return; // Bloqueio de segurança
        setPendingChanges(prev => ({ ...prev, [userId]: newRole }));
    };

    const handleSaveBatch = async () => {
        if (userRole !== 'admin' || Object.keys(pendingChanges).length === 0) return;

        setIsSaving(true);
        const updates = Object.entries(pendingChanges).map(([id, role]) =>
            supabase.from("profiles").update({ role }).eq("id", id)
        );

        const results = await Promise.all(updates);
        const hasError = results.some(r => r.error);

        if (hasError) {
            alert("Erro ao salvar alterações.");
        } else {
            setAllProfiles(prev => prev.map(p => pendingChanges[p.id] ? { ...p, role: pendingChanges[p.id] } : p));
            setPendingChanges({});
            setToastMsg("✅ Funções ajustadas com sucesso!");
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }
        setIsSaving(false);
    };

    const deleteOrphanTag = async (tagId: string) => {
        if (userRole !== 'admin') return;
        const { error } = await supabase.from("tags").delete().eq("id", tagId);
        if (!error) {
            setOrphanTags(prev => prev.filter(t => t.id !== tagId));
            setToastMsg("🗑️ Tag excluída com sucesso!");
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }
    };

    return (
        <div className="dashboard-wrapper" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#020617', fontFamily: "'Sora', sans-serif" }}>
            <Sidebar userRole={userRole} />

            {showToast && (
                <div className="toast-success">
                    <span>{toastMsg}</span>
                </div>
            )}

            <main style={{ flex: 1, padding: '40px', marginLeft: '260px' }}>
                <header style={{ marginBottom: '30px' }}>
                    <h1 style={{ color: '#fff', fontSize: '2.2rem', fontWeight: 800 }}>{userRole === 'admin' ? "Painel de Controle" : "Relatórios da Plataforma"}</h1>
                </header>

                <div className="stats-grid">
                    <div className="stat-card">
                        <span className="stat-label">USUÁRIOS</span>
                        <h2 className="stat-value">{platformStats.totalStudents}</h2>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">CURSOS</span>
                        <h2 className="stat-value">{platformStats.totalCourses}</h2>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">CONCLUÍDAS</span>
                        <h2 className="stat-value">{platformStats.totalLessonsFinished}</h2>
                    </div>
                </div>

                {loading ? <p style={{ color: '#8b5cf6', textAlign: 'center', marginTop: '50px' }}>Carregando dados...</p> : (
                    <div className="admin-sections" style={{ gridTemplateColumns: userRole === 'admin' ? '1.1fr 1fr' : '1fr' }}>
                        
                        {/* GESTÃO DE MEMBROS */}
                        <section className="report-section">
                            <div className="card-header-flex">
                                <h3 className="section-header" style={{ marginBottom: 0 }}>🛡️ Lista de Membros</h3>
                                {userRole === 'admin' && (
                                    <button 
                                        className="btn-save-batch-top" 
                                        onClick={handleSaveBatch} 
                                        disabled={isSaving || Object.keys(pendingChanges).length === 0}
                                    >
                                        {isSaving ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
                                    </button>
                                )}
                            </div>

                            <div className="table-container" style={{ marginTop: '20px' }}>
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>NOME</th>
                                            <th>CARGO</th>
                                            {userRole === 'admin' && <th>AJUSTAR</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allProfiles.map(p => (
                                            <tr key={p.id} className={pendingChanges[p.id] ? "row-pending" : ""}>
                                                <td className="user-name">{p.full_name}</td>
                                                <td>
                                                    <span className={`role-badge ${p.role}`}>
                                                        {p.role.toUpperCase()}
                                                    </span>
                                                </td>
                                                {userRole === 'admin' && (
                                                    <td>
                                                        <select 
                                                            className="gamer-select"
                                                            value={pendingChanges[p.id] || p.role}
                                                            onChange={(e) => trackChange(p.id, e.target.value)}
                                                        >
                                                            <option value="user">USER</option>
                                                            <option value="teacher">TEACHER</option>
                                                            <option value="admin">ADMIN</option>
                                                        </select>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* TAGS (APENAS ADMIN VÊ) */}
                        {userRole === 'admin' && (
                            <section className="report-section">
                                <h3 className="section-header">🧹 Tags Sem Uso</h3>
                                <div className="orphan-tag-container">
                                    {orphanTags.length > 0 ? orphanTags.map(t => (
                                        <div key={t.id} className="tag-card">
                                            <span className="tag-name">{t.name}</span>
                                            <button className="btn-delete-action" onClick={() => deleteOrphanTag(t.id)}>
                                                🗑️
                                            </button>
                                        </div>
                                    )) : <p className="success-msg">Base de dados higienizada!</p>}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </main>

            <style>{`
                /* Reutilização do seu CSS anterior com ajustes de visibilidade */
                .toast-success { position: fixed; top: 30px; left: 50%; transform: translateX(-50%); background: #10b981; color: white; padding: 12px 30px; border-radius: 50px; font-weight: 800; z-index: 10000; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4); animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                @keyframes popIn { from { top: -50px; opacity: 0; } to { top: 30px; opacity: 1; } }
                .card-header-flex { display: flex; justify-content: space-between; align-items: center; }
                .btn-save-batch-top { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; border: 1px solid #8b5cf6; padding: 8px 16px; border-radius: 10px; font-weight: 700; cursor: pointer; text-transform: uppercase; font-size: 0.7rem; transition: 0.3s; }
                .btn-save-batch-top:hover:not(:disabled) { background: #8b5cf6; color: white; box-shadow: 0 0 15px rgba(139, 92, 246, 0.4); }
                .btn-save-batch-top:disabled { opacity: 0.3; cursor: not-allowed; border-color: #334155; color: #64748b; }
                .admin-sections { display: grid; gap: 30px; }
                .stats-grid { display: flex; gap: 15px; margin-bottom: 35px; } 
                .stat-card { background: #09090b; padding: 16px 20px; border-radius: 15px; flex: 1; border: 1px solid rgba(139, 92, 246, 0.1); }
                .stat-value { color: #fff; font-size: 1.5rem; margin-top: 4px; font-weight: 900; }
                .stat-label { color: #94a3b8; font-size: 0.6rem; font-weight: 800; text-transform: uppercase; }
                .report-section { background: #09090b; padding: 25px; border-radius: 20px; border: 1px solid rgba(139, 92, 246, 0.08); }
                .section-header { color: #fff; font-weight: 800; font-size: 1rem; }
                .admin-table { width: 100%; border-collapse: collapse; }
                .admin-table td { padding: 12px; border-bottom: 1px solid #111827; color: #fff; font-size: 0.85rem; }
                .row-pending { background: rgba(139, 92, 246, 0.04); }
                .role-badge { padding: 4px 8px; border-radius: 6px; font-size: 0.6rem; font-weight: 800; text-transform: uppercase; }
                .role-badge.admin { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                .role-badge.teacher { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
                .role-badge.user { background: rgba(148, 163, 184, 0.1); color: #94a3b8; }
                .gamer-select { background: #0f172a; color: #fff; border: 1px solid rgba(139, 92, 246, 0.25); padding: 8px 14px; border-radius: 8px; font-size: 0.75rem; font-weight: 600; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238b5cf6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 8px center; background-size: 12px; padding-right: 30px; }
                .tag-card { display: flex; justify-content: space-between; align-items: center; background: #0f172a; padding: 10px 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03); margin-bottom: 8px; }
                .tag-name { color: #f1f5f9; font-weight: 700; font-size: 0.8rem; }
                .btn-delete-action { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; padding: 6px; border-radius: 8px; cursor: pointer; transition: 0.2s; }
                .success-msg { color: #4ade80; font-size: 0.8rem; font-weight: 700; text-align: center; }
            `}</style>
        </div>
    );
}