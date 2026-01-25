import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; 
import * as XLSX from "xlsx";

// Import da logo para o cabeçalho mobile
import logo from "../assets/ka-tech-logo.png";

export default function Reports() {
    const [loading, setLoading] = useState(true);
    
    // Estados de Dados Gerais
    const [platformStats, setPlatformStats] = useState({ totalStudents: 0, totalCourses: 0, totalLessonsFinished: 0 });
    const [allProfiles, setAllProfiles] = useState<any[]>([]);
    const [orphanTags, setOrphanTags] = useState<any[]>([]);
    const [tagPopularity, setTagPopularity] = useState<any[]>([]); 

    // ESTADOS PARA FILTRO
    const [courses, setCourses] = useState<any[]>([]);
    const [tempCourseId, setTempCourseId] = useState(""); 
    const [tempStatusFilter, setTempStatusFilter] = useState("all");
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
            
            const [profilesRes, coursesRes, progressRes, listCoursesRes, tagPopRes] = await Promise.all([
                supabase.from("profiles").select("id", { count: 'exact', head: true }),
                supabase.from("courses").select("id", { count: 'exact', head: true }),
                supabase.from("user_progress").select("id", { count: 'exact', head: true }).eq("is_completed", true),
                supabase.from("courses").select("id, title").order("title"),
                supabase.from("tag_popularity_report").select("*") 
            ]);

            setPlatformStats({
                totalStudents: profilesRes.count || 0,
                totalCourses: coursesRes.count || 0,
                totalLessonsFinished: progressRes.count || 0
            });

            if (listCoursesRes.data) setCourses(listCoursesRes.data);
            if (tagPopRes.data) setTagPopularity(tagPopRes.data);

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

    const handleApplyFilter = async () => {
        if (!tempCourseId) return;
        setLoadingFilter(true);
        setHasSearched(true);
        setSelectedCourseId(tempCourseId);
        
        const [enrollmentsRes, progressRes] = await Promise.all([
            supabase.from("course_enrollments").select(`userId, profiles:userId (full_name, role)`).eq("courseId", Number(tempCourseId)),
            supabase.from("user_progress").select("user_id, is_completed").eq("course_id", Number(tempCourseId))
        ]);

        if (enrollmentsRes.error) {
            setStudentsByCourse([]);
        } else if (enrollmentsRes.data) {
            const progressMap = new Map(progressRes.data?.map(p => [p.user_id, p.is_completed]) || []);
            let students = enrollmentsRes.data.filter((item: any) => item.profiles).map((item: any) => ({
                ...item.profiles,
                is_completed: progressMap.get(item.userId) || false
            }));

            if (tempStatusFilter === "completed") students = students.filter(s => s.is_completed === true);
            else if (tempStatusFilter === "pending") students = students.filter(s => s.is_completed === false);
                
            setStudentsByCourse(students);
        }
        setLoadingFilter(false);
    };

    const CoursePieChart = () => {
        const total = studentsByCourse.length;
        const concluidos = studentsByCourse.filter(s => s.is_completed).length;
        if (total === 0) return null;
        const percentage = Math.round((concluidos / total) * 100);
        const strokeDasharray = `${percentage} ${100 - percentage}`;

        return (
            <div className="chart-container-inner">
                <div className="pie-wrapper">
                    <svg viewBox="0 0 36 36" className="circular-chart purple">
                        <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="circle" strokeDasharray={strokeDasharray} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <text x="18" y="20.35" className="percentage">{percentage}%</text>
                    </svg>
                </div>
            </div>
        );
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

    // --- FUNÇÕES DE EXPORTAÇÃO ---
    const exportTagRankingExcel = () => {
        const data = tagPopularity.slice(0, 5).map((tag, index) => ({ "Ranking": `#${index + 1}`, "Categoria": tag.tag_name, "Alunos": tag.total_enrollments }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Ranking_Tags");
        XLSX.writeFile(wb, "KAtech_Top5_Tags.xlsx");
        showSuccessToast("✅ Excel do ranking gerado!");
    };

    const exportTagRankingPDF = () => {
        const doc = new jsPDF();
        doc.text("Top 5 Categorias mais Populares - KAtech", 14, 15);
        autoTable(doc, {
            head: [["Rank", "Categoria", "Alunos"]],
            body: tagPopularity.slice(0, 5).map((tag, index) => [`#${index + 1}`, tag.tag_name, tag.total_enrollments]),
            startY: 25,
            theme: 'grid',
            headStyles: { fillColor: [139, 92, 246] }
        });
        doc.save("KAtech_Top5_Tags.pdf");
        showSuccessToast("✅ PDF do ranking gerado!");
    };

    const exportFilteredExcel = () => {
        const courseName = courses.find(c => c.id === Number(selectedCourseId))?.title || "Curso";
        const ws = XLSX.utils.json_to_sheet(studentsByCourse.map(s => ({ "Aluno": s.full_name, "Cargo": s.role?.toUpperCase(), "Status": s.is_completed ? "CONCLUÍDO" : "EM ANDAMENTO" })));
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
            head: [["Nome do Aluno", "Cargo", "Status"]],
            body: studentsByCourse.map(s => [s.full_name, s.role?.toUpperCase(), s.is_completed ? "CONCLUÍDO" : "EM ANDAMENTO"]),
            startY: 25,
            theme: 'grid',
            headStyles: { fillColor: [139, 92, 246] }
        });
        doc.save(`Alunos_${courseName.replace(/\s/g, "_")}.pdf`);
        showSuccessToast("✅ PDF do curso gerado!");
    };

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

    return (
        <div className="dashboard-wrapper">
            <Sidebar/>

            {showToast && <div className="toast-success"><span>{toastMsg}</span></div>}

            <main className="report-main-content">
                {/* LOGO MOBILE */}
                <div className="brand-logo-mobile">
                    <img src={logo} alt="KA Tech Logo" />
                </div>

                <h1 className="report-title">Painel de Controle</h1>

                <div className="stats-grid">
                    <div className="stat-card"><span className="stat-label">TOTAL USUÁRIOS</span><h2 className="stat-value">{platformStats.totalStudents}</h2></div>
                    <div className="stat-card"><span className="stat-label">CURSOS ATIVOS</span><h2 className="stat-value">{platformStats.totalCourses}</h2></div>
                    <div className="stat-card"><span className="stat-label">MISSÕES CONCLUÍDAS</span><h2 className="stat-value">{platformStats.totalLessonsFinished}</h2></div>
                </div>

                {loading ? <p style={{ color: '#8b5cf6', textAlign: 'center', padding: '50px' }}>Carregando dados...</p> : (
                    <div className="admin-sections">
                        
                        {/* RELATÓRIO POR CURSO */}
                        <section className="report-section full-width">
                            <div className="card-header-flex">
                                <div className="filter-controls">
                                    <h3 className="section-header">🔍 Relatório por Curso</h3>
                                    <div className="select-group">
                                        <select className="gamer-select" value={tempCourseId} onChange={(e) => setTempCourseId(e.target.value)}>
                                            <option value="">Selecionar curso...</option>
                                            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                        </select>
                                        <select className="gamer-select" value={tempStatusFilter} onChange={(e) => setTempStatusFilter(e.target.value)}>
                                            <option value="all">Todos os Status</option>
                                            <option value="completed">Concluídos</option>
                                            <option value="pending">Em Andamento</option>
                                        </select>
                                        <button className="btn-apply-filter" onClick={handleApplyFilter} disabled={loadingFilter}>
                                            {loadingFilter ? "..." : "APLICAR"}
                                        </button>
                                    </div>
                                    <div className="card-export-group">
                                        <button className="mini-export pdf" onClick={exportFilteredPDF} disabled={studentsByCourse.length === 0}>PDF</button>
                                        <button className="mini-export excel" onClick={exportFilteredExcel} disabled={studentsByCourse.length === 0}>XLS</button>
                                    </div>
                                </div>
                            </div>
                            <div className="report-content-layout">
                                <div className="table-container">
                                    {hasSearched && studentsByCourse.length > 0 ? (
                                        <table className="admin-table">
                                            <thead><tr><th>ALUNO</th><th>CARGO</th><th>STATUS</th></tr></thead>
                                            <tbody>{studentsByCourse.map((s: any, i: number) => (
                                                <tr key={i}>
                                                    <td>{s.full_name}</td>
                                                    <td><span className={`role-badge ${s.role}`}>{s.role?.toUpperCase()}</span></td>
                                                    <td><span style={{ fontSize: '0.6rem', padding: '3px 8px', borderRadius: '4px', fontWeight: 800, backgroundColor: s.is_completed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: s.is_completed ? '#10b981' : '#f59e0b', border: `1px solid ${s.is_completed ? '#10b98140' : '#f59e0b40'}` }}>{s.is_completed ? "CONCLUÍDO" : "EM ANDAMENTO"}</span></td>
                                                </tr>
                                            ))}</tbody>
                                        </table>
                                    ) : <p style={{ color: "#64748b", fontSize: "0.8rem", padding: "10px" }}>Selecione um curso e aplique o filtro.</p>}
                                </div>
                                {hasSearched && studentsByCourse.length > 0 && (
                                    <div className="visual-summary-aside">
                                        <h4 style={{ color: '#ffffff', fontSize: '0.7rem', fontWeight: 900, marginBottom: '15px', textAlign: 'center' }}>TAXA DE CONCLUSÃO</h4>
                                        <CoursePieChart />
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* MINI TABELA: TOP 5 CATEGORIAS */}
                        <section className="report-section full-width">
                            <div className="card-header-flex">
                                <h3 className="section-header">🏆 Top 5 Categorias (Popularidade)</h3>
                                <div className="card-export-group">
                                    <button className="mini-export pdf" onClick={exportTagRankingPDF}>PDF</button>
                                    <button className="mini-export excel" onClick={exportTagRankingExcel}>XLS</button>
                                </div>
                            </div>
                            <div className="table-container">
                                {tagPopularity.length > 0 ? (
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '80px' }}>RANK</th>
                                                <th>TAG / CATEGORIA</th>
                                                <th style={{ textAlign: 'right' }}>ALUNOS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tagPopularity.slice(0, 5).map((tag, index) => (
                                                <tr key={index}>
                                                    <td style={{ fontWeight: 800, color: '#8b5cf6' }}>#{index + 1}</td>
                                                    <td style={{ fontWeight: 700, color: '#fff' }}>{tag.tag_name.toUpperCase()}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#10b981' }}>{tag.total_enrollments}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : <p style={{ color: "#64748b", fontSize: "0.8rem", padding: '10px' }}>Nenhum dado disponível.</p>}
                            </div>
                        </section>

                        {/* GESTÃO DE MEMBROS */}
                        <section className="report-section">
                            <div className="card-header-flex">
                                <div className="filter-controls">
                                    <h3 className="section-header">🛡️ Gestão de Membros</h3>
                                    <div className="card-export-group">
                                        <button className="mini-export pdf" onClick={exportMembersPDF}>PDF</button>
                                        <button className="mini-export excel" onClick={exportMembersExcel}>XLS</button>
                                    </div>
                                </div>
                                <button className="btn-save-batch-top" onClick={handleSaveBatch} disabled={isSaving || Object.keys(pendingChanges).length === 0}>
                                    {isSaving ? "..." : "SALVAR"}
                                </button>
                            </div>
                            <div className="table-container">
                                <table className="admin-table">
                                    <thead><tr><th>NOME</th><th>CARGO</th><th>AJUSTAR</th></tr></thead>
                                    <tbody>{allProfiles.map(p => (
                                        <tr key={p.id}>
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
                                    ))}</tbody>
                                </table>
                            </div>
                        </section>

                        {/* TAGS SEM USO */}
                        <section className="report-section">
                            <div className="card-header-flex">
                                <h3 className="section-header">🧹 Tags Sem Uso</h3>
                                <div className="card-export-group">
                                    <button className="mini-export pdf" onClick={exportTagsPDF}>PDF</button>
                                    <button className="mini-export excel" onClick={exportTagsExcel}>XLS</button>
                                </div>
                            </div>
                            <div className="orphan-tag-container">
                                {orphanTags.length > 0 ? orphanTags.map(t => (
                                    <div key={t.id} className="tag-card"><span>{t.name}</span><button className="btn-delete-action" onClick={() => deleteOrphanTag(t.id)}>🗑️</button></div>
                                )) : <p className="success-msg">Base de dados higienizada!</p>}
                            </div>
                        </section>
                    </div>
                )}
            </main>

            <style>{`
                .dashboard-wrapper { display: flex; width: 100%; min-height: 100vh; background: #020617; }
                
                .report-main-content { 
                    flex: 1; 
                    padding: 40px; 
                    margin-left: 260px; 
                    transition: 0.3s;
                    box-sizing: border-box;
                }

                .brand-logo-mobile { display: none; width: 100%; justify-content: center; margin-bottom: 30px; }
                .brand-logo-mobile img { height: 180px; filter: drop-shadow(0 0 20px rgba(139, 92, 246, 0.4)); object-fit: contain; }

                .report-title { color: #fff; font-size: 2.2rem; fontWeight: 800; margin-bottom: 30px; }

                .stats-grid { display: flex; gap: 15px; margin-bottom: 25px; } 
                .stat-card { background: #09090b; padding: 18px; border-radius: 12px; flex: 1; border: 1px solid rgba(139, 92, 246, 0.1); }
                .stat-value { color: #fff; font-size: 1.3rem; font-weight: 900; margin: 0; }
                .stat-label { color: #94a3b8; font-size: 0.55rem; font-weight: 800; text-transform: uppercase; }

                .admin-sections { display: grid; grid-template-columns: 1.1fr 1fr; gap: 20px; width: 100%; }
                .report-section { background: #09090b; padding: 20px; border-radius: 18px; border: 1px solid rgba(139, 92, 246, 0.08); box-sizing: border-box; }
                .report-section.full-width { grid-column: 1 / -1; }
                
                /* TÍTULOS DOS CARDS (CORRIGIDO PARA BRANCO VÍVIDO) */
                .section-header { color: #ffffff !important; font-weight: 900; font-size: 1rem; margin: 0; }

                .card-header-flex { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 15px; }
                .filter-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; width: 100%; }
                .select-group { display: flex; gap: 10px; flex-wrap: wrap; flex: 1; }

                .report-content-layout { display: flex; gap: 30px; align-items: flex-start; }
                .table-container { flex: 2; overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch; }
                
                /* CABEÇALHOS DAS TABELAS (CORRIGIDO PARA BRANCO) */
                .admin-table { width: 100%; border-collapse: collapse; min-width: 400px; }
                .admin-table th { color: #ffffff; font-size: 0.7rem; font-weight: 700; text-align: left; padding: 12px 8px; border-bottom: 1px solid #1f2937; }
                .admin-table td { padding: 12px 8px; border-bottom: 1px solid #111827; color: #fff; font-size: 0.75rem; }

                .visual-summary-aside { background: rgba(139, 92, 246, 0.03); padding: 20px; border-radius: 16px; border: 1px solid rgba(139, 92, 246, 0.1); min-width: 150px; }
                .circular-chart { display: block; margin: 10px auto; max-width: 100px; }
                .circle-bg { fill: none; stroke: rgba(139, 92, 246, 0.1); stroke-width: 3.8; }
                .circle { fill: none; stroke-width: 3.8; stroke-linecap: round; stroke: #8b5cf6; transition: stroke-dasharray 0.3s ease; }
                .percentage { fill: #fff; font-size: 0.5rem; text-anchor: middle; font-weight: 800; }

                .role-badge { padding: 3px 6px; border-radius: 4px; font-size: 0.5rem; font-weight: 800; }
                .role-badge.admin { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                .role-badge.teacher { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
                .role-badge.user { background: rgba(148, 163, 184, 0.1); color: #94a3b8; }

                .gamer-select { background: #0f172a; color: #fff; border: 1px solid rgba(139, 92, 246, 0.25); padding: 8px; border-radius: 6px; font-size: 0.7rem; outline: none; }
                .btn-apply-filter, .btn-save-batch-top { background: #8b5cf6; color: white; border: none; padding: 8px 16px; border-radius: 10px; font-weight: 700; font-size: 0.65rem; cursor: pointer; transition: 0.2s; }
                .btn-apply-filter:disabled { background: #1e293b; opacity: 0.5; }
                
                .card-export-group { display: flex; gap: 5px; }
                .mini-export { padding: 6px 10px; border-radius: 6px; border: none; font-size: 0.6rem; font-weight: 800; cursor: pointer; }
                .mini-export.pdf { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
                .mini-export.excel { background: rgba(34, 197, 94, 0.15); color: #22c55e; }

                .orphan-tag-container { display: flex; flex-direction: column; gap: 8px; }
                .tag-card { display: flex; justify-content: space-between; align-items: center; background: #0f172a; padding: 10px 15px; border-radius: 10px; font-size: 0.75rem; color: #fff; }
                .btn-delete-action { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 0.8rem; }
                .toast-success { position: fixed; top: 30px; left: 50%; transform: translateX(-50%); background: #10b981; color: white; padding: 12px 30px; border-radius: 50px; font-weight: 800; z-index: 10000; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }

                @media (max-width: 1024px) {
                    .report-main-content { margin-left: 0; padding: 20px; padding-bottom: 150px; }
                    .brand-logo-mobile { display: flex; }
                    .report-title { text-align: center; font-size: 1.8rem; }
                    .admin-sections { grid-template-columns: 1fr; }
                    .stats-grid { flex-wrap: wrap; }
                    .stat-card { min-width: 140px; }
                }

                @media (max-width: 768px) {
                    .report-content-layout { flex-direction: column; align-items: center; }
                    .visual-summary-aside { width: 100%; box-sizing: border-box; margin-top: 20px; }
                    .filter-controls { flex-direction: column; align-items: stretch; }
                    .select-group { flex-direction: column; }
                    .gamer-select, .btn-apply-filter { width: 100%; }
                    .card-header-flex { flex-direction: column; align-items: flex-start; }
                    .btn-save-batch-top { width: 100%; margin-top: 10px; }
                }
            `}</style>
        </div>
    );
}