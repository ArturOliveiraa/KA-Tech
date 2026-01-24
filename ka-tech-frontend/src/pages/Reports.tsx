import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; 
import * as XLSX from "xlsx";

export default function Reports() {
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    
    // Estados de Dados Gerais
    const [platformStats, setPlatformStats] = useState({ totalStudents: 0, totalCourses: 0, totalLessonsFinished: 0 });
    const [allProfiles, setAllProfiles] = useState<any[]>([]);
    const [orphanTags, setOrphanTags] = useState<any[]>([]);

    // NOVOS ESTADOS PARA FILTRO (Sem alterar os anteriores)
    const [courses, setCourses] = useState<any[]>([]);
    const [tempCourseId, setTempCourseId] = useState(""); 
    const [selectedCourseId, setSelectedCourseId] = useState(""); 
    const [studentsByCourse, setStudentsByCourse] = useState<any[]>([]);
    const [loadingFilter, setLoadingFilter] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Estados de UI e Salvamento
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

            // Busca estatísticas e agora também a LISTA DE CURSOS para o select
            const [profilesRes, coursesRes, progressRes, listCoursesRes] = await Promise.all([
                supabase.from("profiles").select("id", { count: 'exact', head: true }),
                supabase.from("courses").select("id", { count: 'exact', head: true }),
                supabase.from("user_progress").select("id", { count: 'exact', head: true }).eq("is_completed", true),
                supabase.from("courses").select("id, title").order("title")
            ]);

            setPlatformStats({
                totalStudents: profilesRes.count || 0,
                totalCourses: coursesRes.count || 0,
                totalLessonsFinished: progressRes.count || 0
            });

            if (listCoursesRes.data) setCourses(listCoursesRes.data);

            const { data: profData } = await supabase.from("profiles").select("id, full_name, role").order('full_name');
            if (profData) setAllProfiles(profData);

            const { data: tagsData } = await supabase.from("tags").select(`id, name, course_tags (course_id)`);
            if (tagsData) {
                const orphans = tagsData.filter((t: any) => t.course_tags.length === 0);
                setOrphanTags(orphans);
            }
            setLoading(false);
        }
        loadData();
    }, []);

    // --- FUNÇÃO PARA APLICAR FILTRO CORRIGIDA (Baseada no seu Schema) ---
    const handleApplyFilter = async () => {
        if (!tempCourseId) return;

        setLoadingFilter(true);
        setHasSearched(true);
        setSelectedCourseId(tempCourseId);
        
        // Query usando course_enrollments e userId/courseId conforme seu SQL
        const { data, error } = await supabase
            .from("course_enrollments")
            .select(`
                userId,
                profiles:userId (
                    full_name,
                    role
                )
            `)
            .eq("courseId", Number(tempCourseId)); // Number é vital pois no banco é integer

        if (error) {
            console.error("Erro Supabase:", error.message);
            setStudentsByCourse([]);
        } else if (data) {
            const students = data
                .filter((item: any) => item.profiles)
                .map((item: any) => item.profiles);
            setStudentsByCourse(students);
        }
        setLoadingFilter(false);
    };

    // --- FUNÇÕES DE EXPORTAÇÃO (FILTRADO) ---
    const exportFilteredExcel = () => {
        const courseName = courses.find(c => c.id === Number(selectedCourseId))?.title || "Curso";
        const ws = XLSX.utils.json_to_sheet(studentsByCourse.map(s => ({ "Aluno": s.full_name, "Cargo": s.role?.toUpperCase() })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Lista");
        XLSX.writeFile(wb, `Alunos_${courseName.replace(/\s/g, "_")}.xlsx`);
        showSuccessToast("✅ Excel do curso gerado!");
    };

    const exportFilteredPDF = () => {
        const courseName = courses.find(c => c.id === Number(selectedCourseId))?.title || "Curso";
        const doc = new jsPDF();
        doc.text(`Alunos do Curso: ${courseName}`, 14, 15);
        autoTable(doc, {
            head: [["Nome do Aluno", "Cargo"]],
            body: studentsByCourse.map(s => [s.full_name, s.role?.toUpperCase()]),
            startY: 25,
            theme: 'grid',
            headStyles: { fillColor: [139, 92, 246] }
        });
        doc.save(`Alunos_${courseName.replace(/\s/g, "_")}.pdf`);
        showSuccessToast("✅ PDF do curso gerado!");
    };

    // --- FUNÇÕES DE EXPORTAÇÃO (GERAIS - MANTIDAS) ---
    const exportMembersExcel = () => {
        const data = allProfiles.map(p => ({ "Nome": p.full_name, "Cargo": p.role?.toUpperCase() }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Membros");
        XLSX.writeFile(wb, "KAtech_Membros.xlsx");
        showSuccessToast("✅ Excel de membros gerado!");
    };

    const exportMembersPDF = () => {
        const doc = new jsPDF();
        doc.text("Relatório de Membros - KAtech", 14, 15);
        autoTable(doc, {
            head: [["Nome", "Cargo"]],
            body: allProfiles.map(p => [p.full_name, p.role?.toUpperCase()]),
            startY: 25,
            theme: 'grid',
            headStyles: { fillColor: [139, 92, 246] }
        });
        doc.save("KAtech_Membros.pdf");
        showSuccessToast("✅ PDF de membros gerado!");
    };

    const exportTagsExcel = () => {
        const data = orphanTags.map(t => ({ "Tag Sem Uso": t.name }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Tags");
        XLSX.writeFile(wb, "KAtech_Tags_Orfas.xlsx");
        showSuccessToast("✅ Excel de tags gerado!");
    };

    const exportTagsPDF = () => {
        const doc = new jsPDF();
        doc.text("Tags Sem Uso - KAtech", 14, 15);
        autoTable(doc, {
            head: [["Nome da Tag"]],
            body: orphanTags.map(t => [t.name]),
            startY: 25,
            theme: 'grid',
            headStyles: { fillColor: [239, 68, 68] }
        });
        doc.save("KAtech_Tags_Orfas.pdf");
        showSuccessToast("✅ PDF de tags gerado!");
    };

    const showSuccessToast = (msg: string) => { setToastMsg(msg); setShowToast(true); setTimeout(() => setShowToast(false), 3000); };
    const trackChange = (userId: string, newRole: string) => setPendingChanges(prev => ({ ...prev, [userId]: newRole }));

    const handleSaveBatch = async () => {
        setIsSaving(true);
        const updates = Object.entries(pendingChanges).map(([id, role]) => supabase.from("profiles").update({ role }).eq("id", id));
        const results = await Promise.all(updates);
        if (!results.some(r => r.error)) {
            setAllProfiles(prev => prev.map(p => pendingChanges[p.id] ? { ...p, role: pendingChanges[p.id] } : p));
            setPendingChanges({});
            showSuccessToast("✅ Funções salvas com sucesso!");
        }
        setIsSaving(false);
    };

    const deleteOrphanTag = async (tagId: string) => {
        const { error } = await supabase.from("tags").delete().eq("id", tagId);
        if (!error) { setOrphanTags(prev => prev.filter(t => t.id !== tagId)); showSuccessToast("🗑️ Tag removida!"); }
    };

    return (
        <div className="dashboard-wrapper" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#020617', fontFamily: "'Sora', sans-serif" }}>
            <Sidebar userRole={userRole} />

            {showToast && <div className="toast-success"><span>{toastMsg}</span></div>}

            <main style={{ flex: 1, padding: '40px', marginLeft: '260px' }}>
                <h1 style={{ color: '#fff', fontSize: '2.2rem', fontWeight: 800, marginBottom: '30px' }}>Painel de Controle</h1>

                <div className="stats-grid">
                    <div className="stat-card"><span className="stat-label">TOTAL USUÁRIOS</span><h2 className="stat-value">{platformStats.totalStudents}</h2></div>
                    <div className="stat-card"><span className="stat-label">CURSOS ATIVOS</span><h2 className="stat-value">{platformStats.totalCourses}</h2></div>
                    <div className="stat-card"><span className="stat-label">MISSÕES CONCLUÍDAS</span><h2 className="stat-value">{platformStats.totalLessonsFinished}</h2></div>
                </div>

                {loading ? <p style={{ color: '#8b5cf6', textAlign: 'center' }}>Carregando dados...</p> : (
                    <div className="admin-sections">
                        
                        {/* NOVO CARD: RELATÓRIO POR CURSO (Inserido na estrutura Grid) */}
                        <section className="report-section" style={{ gridColumn: "1 / -1", marginBottom: "20px" }}>
                            <div className="card-header-flex">
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <h3 className="section-header">🔍 Relatório por Curso</h3>
                                    <select 
                                        className="gamer-select" 
                                        value={tempCourseId} 
                                        onChange={(e) => setTempCourseId(e.target.value)} 
                                        style={{ minWidth: "220px" }}
                                    >
                                        <option value="">Selecionar curso...</option>
                                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                    </select>
                                    
                                    <button 
                                        className="btn-apply-filter" 
                                        onClick={handleApplyFilter}
                                        disabled={loadingFilter}
                                    >
                                        {loadingFilter ? "..." : "APLICAR"}
                                    </button>

                                    <div className="card-export-group">
                                        <button className="mini-export pdf" onClick={exportFilteredPDF} disabled={studentsByCourse.length === 0}>PDF</button>
                                        <button className="mini-export excel" onClick={exportFilteredExcel} disabled={studentsByCourse.length === 0}>XLS</button>
                                    </div>
                                </div>
                            </div>
                            <div className="table-container" style={{ marginTop: "15px" }}>
                                {loadingFilter ? <p style={{ color: "#8b5cf6", padding: "10px" }}>Buscando...</p> : (
                                    !hasSearched ? (
                                        <p style={{ color: "#64748b", fontSize: "0.8rem", padding: "10px" }}>Selecione um curso e clique em Aplicar.</p>
                                    ) : studentsByCourse.length > 0 ? (
                                        <table className="admin-table">
                                            <thead><tr><th>NOME DO ALUNO</th><th>CARGO</th></tr></thead>
                                            <tbody>{studentsByCourse.map((s: any, i: number) => (<tr key={i}><td>{s.full_name}</td><td><span className={`role-badge ${s.role}`}>{s.role?.toUpperCase()}</span></td></tr>))}</tbody>
                                        </table>
                                    ) : (
                                        <div className="no-results-box">
                                            <span>⚠️ Nenhum resultado encontrado para este curso.</span>
                                        </div>
                                    )
                                )}
                            </div>
                        </section>

                        {/* GESTÃO DE MEMBROS (MANTIDO) */}
                        <section className="report-section">
                            <div className="card-header-flex">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <h3 className="section-header">🛡️ Gestão de Membros</h3>
                                    <div className="card-export-group">
                                        <button className="mini-export pdf" onClick={exportMembersPDF}>PDF</button>
                                        <button className="mini-export excel" onClick={exportMembersExcel}>XLS</button>
                                    </div>
                                </div>
                                <button className="btn-save-batch-top" onClick={handleSaveBatch} disabled={isSaving || Object.keys(pendingChanges).length === 0}>
                                    {isSaving ? "SALVANDO..." : "SALVAR"}
                                </button>
                            </div>
                            <div className="table-container" style={{ marginTop: '15px' }}>
                                <table className="admin-table">
                                    <thead><tr><th>NOME</th><th>CARGO</th><th>AJUSTAR</th></tr></thead>
                                    <tbody>
                                        {allProfiles.map(p => (
                                            <tr key={p.id} className={pendingChanges[p.id] ? "row-pending" : ""}>
                                                <td>{p.full_name}</td>
                                                <td><span className={`role-badge ${p.role}`}>{p.role?.toUpperCase()}</span></td>
                                                <td>
                                                    <select className="gamer-select" value={pendingChanges[p.id] || p.role} onChange={(e) => trackChange(p.id, e.target.value)}>
                                                        <option value="user">USER</option>
                                                        <option value="teacher">TEACHER</option>
                                                        <option value="admin">ADMIN</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* TAGS (MANTIDO) */}
                        <section className="report-section">
                            <div className="card-header-flex">
                                <h3 className="section-header">🧹 Tags Sem Uso</h3>
                                <div className="card-export-group">
                                    <button className="mini-export pdf" onClick={exportTagsPDF}>PDF</button>
                                    <button className="mini-export excel" onClick={exportTagsExcel}>XLS</button>
                                </div>
                            </div>
                            <div className="orphan-tag-container" style={{ marginTop: '15px' }}>
                                {orphanTags.length > 0 ? orphanTags.map(t => (
                                    <div key={t.id} className="tag-card"><span>{t.name}</span><button className="btn-delete-action" onClick={() => deleteOrphanTag(t.id)}>🗑️</button></div>
                                )) : <p className="success-msg">Base de dados higienizada!</p>}
                            </div>
                        </section>
                    </div>
                )}
            </main>

            <style>{`
                .no-results-box { padding: 25px; border: 1px dashed rgba(139, 92, 246, 0.2); border-radius: 12px; color: #94a3b8; text-align: center; font-size: 0.8rem; }
                .btn-apply-filter { background: #1e293b; color: #fff; border: 1px solid #8b5cf6; padding: 6px 14px; border-radius: 8px; font-weight: 700; font-size: 0.65rem; cursor: pointer; transition: 0.2s; }
                .btn-apply-filter:hover:not(:disabled) { background: #8b5cf6; }
                .card-export-group { display: flex; gap: 5px; margin-left: 10px; }
                .mini-export { padding: 4px 8px; border-radius: 6px; border: none; font-size: 0.6rem; font-weight: 800; cursor: pointer; opacity: 0.7; }
                .mini-export:hover:not(:disabled) { opacity: 1; transform: scale(1.05); }
                .mini-export.pdf { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }
                .mini-export.excel { background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3); }
                .mini-export:disabled { opacity: 0.1; cursor: not-allowed; }
                .toast-success { position: fixed; top: 30px; left: 50%; transform: translateX(-50%); background: #10b981; color: white; padding: 12px 30px; border-radius: 50px; font-weight: 800; z-index: 10000; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4); animation: popIn 0.4s ease-out; }
                @keyframes popIn { from { top: -50px; opacity: 0; } to { top: 30px; opacity: 1; } }
                .card-header-flex { display: flex; justify-content: space-between; align-items: center; }
                .btn-save-batch-top { background: #8b5cf6; color: white; border: none; padding: 6px 12px; border-radius: 10px; font-weight: 700; text-transform: uppercase; font-size: 0.65rem; cursor: pointer; }
                .btn-save-batch-top:disabled { background: #1e293b; color: #64748b; }
                .stats-grid { display: flex; gap: 15px; margin-bottom: 25px; } 
                .stat-card { background: #09090b; padding: 12px 18px; border-radius: 12px; flex: 1; border: 1px solid rgba(139, 92, 246, 0.1); }
                .stat-value { color: #fff; font-size: 1.3rem; font-weight: 900; }
                .stat-label { color: #94a3b8; font-size: 0.55rem; font-weight: 800; text-transform: uppercase; }
                .admin-sections { display: grid; grid-template-columns: 1.1fr 1fr; gap: 20px; }
                .report-section { background: #09090b; padding: 20px; border-radius: 18px; border: 1px solid rgba(139, 92, 246, 0.08); }
                .section-header { color: #fff; font-weight: 800; font-size: 0.85rem; }
                .admin-table { width: 100%; border-collapse: collapse; }
                .admin-table td { padding: 8px; border-bottom: 1px solid #111827; color: #fff; font-size: 0.75rem; }
                .role-badge { padding: 3px 6px; border-radius: 4px; font-size: 0.5rem; font-weight: 800; }
                .role-badge.admin { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                .role-badge.teacher { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
                .role-badge.user { background: rgba(148, 163, 184, 0.1); color: #94a3b8; }
                .gamer-select { background: #0f172a; color: #fff; border: 1px solid rgba(139, 92, 246, 0.25); padding: 4px 6px; border-radius: 6px; font-size: 0.65rem; }
                .tag-card { display: flex; justify-content: space-between; align-items: center; background: #0f172a; padding: 6px 12px; border-radius: 10px; margin-bottom: 6px; font-size: 0.75rem; color: #fff; }
                .btn-delete-action { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 0.8rem; }
            `}</style>
        </div>
    );
}