import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from 'xlsx'; 
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';

// --- INTERFACES ---
interface PlatformStats {
  totalStudents: number;
  totalCourses: number;
  totalLessonsFinished: number;
}

interface TagData {
  name: string;
  alunos: number;
}

interface Course {
  id: number;
  title: string;
}

interface Live {
    id: string;
    title: string;
    scheduled_at: string;
}

interface Tag {
    id: string;
    name: string;
}

interface Student {
  full_name: string;
  role: string;
  avatar_url?: string; 
  is_completed?: boolean; 
  userId?: string; 
  minutes_watched?: number; 
  last_seen_at?: string;    
}

// --- ICONS ---
const Icons = {
  TrendUp: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>,
  Users: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Layers: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>,
  Download: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
  Excel: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Video: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>,
  Book: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>,
  Alert: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
};

export default function Reports() {
  const [loading, setLoading] = useState<boolean>(true);
  const [reportType, setReportType] = useState<'COURSE' | 'LIVE'>('COURSE');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false); 

  const [platformStats, setPlatformStats] = useState<PlatformStats>({ totalStudents: 0, totalCourses: 0, totalLessonsFinished: 0 });
  const [tagPopularity, setTagPopularity] = useState<TagData[]>([]);
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [lives, setLives] = useState<Live[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedLiveId, setSelectedLiveId] = useState<string>("");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("");
  
  const [tableData, setTableData] = useState<Student[]>([]);
  const [absentTags, setAbsentTags] = useState<string[]>([]); 
  const [loadingFilter, setLoadingFilter] = useState<boolean>(false);

  // --- CARGA INICIAL ---
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [profilesRes, coursesRes, progressRes, listCoursesRes, listLivesRes, listTagsRes, tagPopRes] = await Promise.all([
          supabase.from("profiles").select("id", { count: 'exact', head: true }),
          supabase.from("courses").select("id", { count: 'exact', head: true }),
          supabase.from("user_progress").select("id", { count: 'exact', head: true }).eq("is_completed", true),
          supabase.from("courses").select("id, title").order("title"),
          supabase.from("lives").select("id, title, scheduled_at").order("scheduled_at", { ascending: false }),
          supabase.from("tags").select("id, name").order("name"),
          supabase.from("tag_popularity_report").select("*").limit(5)
        ]);

        setPlatformStats({
          totalStudents: profilesRes.count || 0,
          totalCourses: coursesRes.count || 0,
          totalLessonsFinished: progressRes.count || 0
        });

        if (listCoursesRes.data) setCourses(listCoursesRes.data);
        if (listLivesRes.data) setLives(listLivesRes.data);
        if (listTagsRes.data) setTags(listTagsRes.data);
        
        if (tagPopRes.data) {
          const formattedTags: TagData[] = tagPopRes.data.map((t: any) => ({
            name: t.tag_name,
            alunos: t.total_enrollments
          }));
          setTagPopularity(formattedTags);
        }

      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // --- HELPER: CALCULAR TAGS AUSENTES ---
  const calculateAbsentTags = async (activeStudentIds: string[]) => {
    if (activeStudentIds.length === 0) {
        setAbsentTags(tags.map(t => t.name));
        return;
    }

    const { data: presentTagsData } = await supabase
        .from("profile_tags")
        .select("tag_id")
        .in("profile_id", activeStudentIds);

    const presentTagIds = new Set(presentTagsData?.map((t: any) => t.tag_id));

    const missing = tags
        .filter(t => !presentTagIds.has(t.id))
        .map(t => t.name);

    setAbsentTags(missing);
  };

  // --- FILTROS ---
  const handleApplyCourseFilter = async (courseId: string) => {
    if (!courseId) return;
    setLoadingFilter(true);
    setSelectedCourseId(courseId);
    setTableData([]);
    setAbsentTags([]);

    const [enrollRes, progressRes] = await Promise.all([
      supabase.from("course_enrollments").select(`userId, profiles:userId (full_name, role, avatar_url)`).eq("courseId", Number(courseId)),
      supabase.from("user_progress").select("user_id, is_completed").eq("course_id", Number(courseId))
    ]);

    if (enrollRes.data) {
      const progressMap = new Map(progressRes.data?.map(p => [p.user_id, p.is_completed]) || []);
      const formattedStudents: Student[] = enrollRes.data
        .filter((item: any) => item.profiles) 
        .map((item: any) => ({
          full_name: item.profiles.full_name,
          role: item.profiles.role,
          avatar_url: item.profiles.avatar_url,
          is_completed: progressMap.get(item.userId) || false,
          userId: item.userId
        }));
      setTableData(formattedStudents);
      
      const userIds = formattedStudents.map(s => s.userId!).filter(Boolean);
      await calculateAbsentTags(userIds);
    }
    setLoadingFilter(false);
  };

  const handleApplyLiveFilter = async (liveId: string, tagId: string = "") => {
    if (!liveId) return;
    setLoadingFilter(true);
    setSelectedLiveId(liveId);
    setSelectedTagFilter(tagId);
    setTableData([]);
    setAbsentTags([]);

    let query = supabase.from("live_attendance").select(`minutes_watched, last_seen_at, user_id, profiles:user_id (full_name, role, avatar_url)`).eq("live_id", liveId);

    if (tagId) {
        const { data: taggedUsers } = await supabase.from("profile_tags").select("profile_id").eq("tag_id", tagId);
        if (taggedUsers) {
            const validUserIds = taggedUsers.map(u => u.profile_id);
            if (validUserIds.length > 0) query = query.in("user_id", validUserIds);
            else { 
                setTableData([]); 
                setAbsentTags(tags.map(t => t.name));
                setLoadingFilter(false); 
                return; 
            }
        }
    }

    const { data } = await query;
    if (data) {
        const formattedStudents: Student[] = data
            .filter((item: any) => item.profiles)
            .map((item: any) => ({
                full_name: item.profiles.full_name,
                role: item.profiles.role,
                avatar_url: item.profiles.avatar_url,
                minutes_watched: item.minutes_watched,
                last_seen_at: item.last_seen_at,
                userId: item.user_id
            }))
            .sort((a, b) => (b.minutes_watched || 0) - (a.minutes_watched || 0));
        setTableData(formattedStudents);

        const userIds = formattedStudents.map(s => s.userId!).filter(Boolean);
        await calculateAbsentTags(userIds);
    }
    setLoadingFilter(false);
  };

  const formatWatchTime = (minutes: number) => {
      if (!minutes) return "0min";
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  // --- TOTAIS ---
  const totalStudents = tableData.length;
  const totalMinutesWatched = useMemo(() => tableData.reduce((acc, curr) => acc + (curr.minutes_watched || 0), 0), [tableData]);
  const averageMinutes = useMemo(() => totalStudents > 0 ? Math.floor(totalMinutesWatched / totalStudents) : 0, [totalMinutesWatched, totalStudents]);
  const completionRate = totalStudents > 0 ? Math.round((tableData.filter(s => s.is_completed).length / totalStudents) * 100) : 0;

  // --- EXCEL ---
  const generateExcel = () => {
    const isLiveReport = reportType === 'LIVE';
    const titleText = isLiveReport 
        ? lives.find(l => l.id === selectedLiveId)?.title || "Relatorio_Live"
        : courses.find(c => c.id === Number(selectedCourseId))?.title || "Relatorio_Curso";

    const contextText = isLiveReport
        ? `Filtro: ${tags.find(t => t.id === selectedTagFilter)?.name || "Geral"}`
        : "Lista de Alunos";

    const absentString = absentTags.length > 0 ? absentTags.join(", ") : "Nenhuma (Todas presentes)";

    const headerInfo = [
        ["RELATÓRIO DE DESEMPENHO - KA ACADEMY"],
        ["Gerado em:", new Date().toLocaleString()],
        ["Contexto:", titleText],
        ["Filtro:", contextText],
        [""],
        ["RESUMO ESTATÍSTICO:"],
        [isLiveReport ? "Total de Espectadores:" : "Total de Alunos:", totalStudents],
        isLiveReport ? ["Tempo Total Consumido:", formatWatchTime(totalMinutesWatched)] : [],
        [isLiveReport ? "Tempo Médio por Aluno:" : "Taxa de Conclusão:", isLiveReport ? formatWatchTime(averageMinutes) : `${completionRate}%`],
        [""],
        ["TAGS AUSENTES (0% Presença):", absentString], 
        [""]
    ];

    let excelBody = [];
    if (isLiveReport) {
        excelBody.push(["Nome do Aluno", "Cargo", "Minutos (Raw)", "Tempo Formatado", "Última Interação"]);
        tableData.forEach(s => {
            excelBody.push([s.full_name, s.role?.toUpperCase(), s.minutes_watched || 0, formatWatchTime(s.minutes_watched || 0), s.last_seen_at ? new Date(s.last_seen_at).toLocaleString('pt-BR') : '-']);
        });
    } else {
        excelBody.push(["Nome do Aluno", "Cargo", "Status", "ID Usuário"]);
        tableData.forEach(s => {
            excelBody.push([s.full_name, s.role?.toUpperCase(), s.is_completed ? "CONCLUÍDO" : "PENDENTE", s.userId]);
        });
    }

    const worksheet = XLSX.utils.aoa_to_sheet([...headerInfo, ...excelBody]); 
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
    const fileName = `KA_${titleText.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const getBase64ImageFromUrl = async (imageUrl: string): Promise<string | null> => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch { return null; }
  };

  // --- PDF ---
  const generatePremiumPDF = async () => {
    setIsGeneratingPdf(true);
    const doc = new jsPDF();
    const isLiveReport = reportType === 'LIVE';
    
    const avatars: {[key: number]: string} = {};
    await Promise.all(tableData.map(async (student, index) => {
      if (student.avatar_url) {
        const base64 = await getBase64ImageFromUrl(student.avatar_url);
        if (base64) avatars[index] = base64;
      }
    }));

    const titleText = isLiveReport ? lives.find(l => l.id === selectedLiveId)?.title || "Relatório" : courses.find(c => c.id === Number(selectedCourseId))?.title || "Relatório";
    const contextText = isLiveReport ? `Tag: ${tags.find(t => t.id === selectedTagFilter)?.name || "Geral"}` : "Status";

    doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 50, 'F'); 
    doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.text("KA ACADEMY", 14, 20);
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text("LISTA DE PRESENÇA", 14, 27);
    doc.setTextColor(148, 163, 184); doc.text(new Date().toLocaleDateString(), 195, 20, { align: 'right' });

    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(139, 92, 246); doc.text(titleText.toUpperCase(), 14, 40);
    doc.setFontSize(10); doc.setTextColor(100, 116, 139); doc.text(contextText, 14, 46);

    // --- BLOCO TOTAIS ---
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, 52, 182, 18, 2, 2, 'F');
    doc.setFont("helvetica", "bold"); doc.setTextColor(15, 23, 42); doc.setFontSize(10);
    
    const labelTotal = isLiveReport ? `Alunos: ${totalStudents}` : `Total de Alunos: ${totalStudents}`;
    doc.text(labelTotal, 20, 63);

    if (isLiveReport) {
        doc.text(`Tempo Total: ${formatWatchTime(totalMinutesWatched)}`, 80, 63);
        doc.setTextColor(139, 92, 246);
        doc.text(`Média/Aluno: ${formatWatchTime(averageMinutes)}`, 150, 63);
    } else {
        doc.setTextColor(16, 185, 129);
        doc.text(`Taxa Conclusão: ${completionRate}%`, 150, 63);
    }
    
    // --- BLOCO: TAGS AUSENTES NO PDF ---
    let tableStartY = 80;
    if (absentTags.length > 0) {
        doc.setFontSize(9);
        doc.setTextColor(239, 68, 68); 
        doc.text("TAGS COM 0% DE PRESENÇA:", 14, 76);
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        const tagsText = doc.splitTextToSize(absentTags.join(", "), 180);
        doc.text(tagsText, 14, 82);
        tableStartY = 85 + (tagsText.length * 4);
    }

    const head = isLiveReport ? [['Foto', 'Aluno', 'Cargo', 'Tempo', 'Último Acesso']] : [['Foto', 'Aluno', 'Cargo', 'Status']];
    const body = tableData.map(s => {
        if (isLiveReport) return ['', s.full_name, s.role?.toUpperCase(), formatWatchTime(s.minutes_watched || 0), s.last_seen_at ? new Date(s.last_seen_at).toLocaleTimeString().slice(0,5) : '-'];
        else return ['', s.full_name, s.role?.toUpperCase(), s.is_completed ? 'CONCLUÍDO' : 'PENDENTE'];
    });

    autoTable(doc, {
        startY: tableStartY, head, body,
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        bodyStyles: { minCellHeight: 15, valign: 'middle', fontSize: 9 },
        columnStyles: { 0: { cellWidth: 15 } },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 0) {
                const img = avatars[data.row.index];
                if (img) doc.addImage(img, 'JPEG', data.cell.x + 2, data.cell.y + 2, 10, 10);
            }
        }
    });

    doc.save(`KA_Report.pdf`);
    setIsGeneratingPdf(false);
  };

  const completionChartData = useMemo(() => {
    if (reportType === 'LIVE' || tableData.length === 0) return [{ name: 'Aguardando', value: 1 }];
    const completed = tableData.filter(s => s.is_completed).length;
    return [ { name: 'Concluído', value: completed }, { name: 'Em Andamento', value: tableData.length - completed } ];
  }, [tableData, reportType]);

  return (
    <div className="pro-viewport">
      <Sidebar />
      {loading ? (
        <main className="pro-main-canvas" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
             <span className="system-status">SYSTEM INITIALIZING</span>
          </div>
        </main>
      ) : (
        <main className="pro-main-canvas">
          <div className="dashboard-container">
            <header className="pro-header">
              <div className="header-content">
                <span className="system-status"><span className="pulse-dot"></span> SYSTEM ONLINE</span>
                <h1>A VELOCIDADE É A NOVA ESTRATÉGIA!</h1>
                <p>Visão estratégica da <strong>KA Academy</strong></p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-export excel" onClick={generateExcel}><Icons.Excel /> <span className="btn-text">Excel</span></button>
                <button className="btn-export pdf" onClick={generatePremiumPDF} disabled={isGeneratingPdf}><Icons.Download /> <span className="btn-text">{isGeneratingPdf ? 'Gerando...' : 'PDF'}</span></button>
              </div>
            </header>

            <section className="kpi-grid">
              <div className="kpi-card glass-panel blue-hover">
                <div className="kpi-header"><div className="kpi-icon-box blue"><Icons.Users /></div></div>
                <div className="kpi-value"><h3>{platformStats.totalStudents}</h3><p>Alunos Totais</p></div>
              </div>
              <div className="kpi-card glass-panel purple-hover">
                <div className="kpi-header"><div className="kpi-icon-box purple"><Icons.Layers /></div></div>
                <div className="kpi-value"><h3>{platformStats.totalCourses}</h3><p>Cursos</p></div>
              </div>
              <div className="kpi-card glass-panel featured gold-hover">
                <div className="kpi-header"><div className="kpi-icon-box gold">⚡</div></div>
                <div className="kpi-value"><h3>{platformStats.totalLessonsFinished}</h3><p>Aulas Vistas</p></div>
              </div>
            </section>

            <div className="content-grid">
              <div className="main-panel glass-panel">
                <div className="panel-header">
                  <div>
                    <h3>Matriz de Dados</h3>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button onClick={() => { setReportType('COURSE'); setTableData([]); setAbsentTags([]); }} className={`tab-btn ${reportType === 'COURSE' ? 'active' : ''}`}><Icons.Book /> PROGRESSO</button>
                        <button onClick={() => { setReportType('LIVE'); setTableData([]); setAbsentTags([]); }} className={`tab-btn ${reportType === 'LIVE' ? 'active' : ''}`}><Icons.Video /> PRESENÇA LIVES</button>
                    </div>
                  </div>
                  <div className="filter-control" style={{ display: 'flex', gap: '10px', flexDirection: 'column', alignItems: 'flex-end' }}>
                    {reportType === 'COURSE' ? (
                        <select className="modern-select" onChange={(e) => handleApplyCourseFilter(e.target.value)} value={selectedCourseId} disabled={loadingFilter}>
                          <option value="">Selecione uma Trilha...</option>
                          {courses.map(c => <option key={c.id} value={c.id.toString()}>{c.title}</option>)}
                        </select>
                    ) : (
                        <>
                            <select className="modern-select" onChange={(e) => handleApplyLiveFilter(e.target.value, selectedTagFilter)} value={selectedLiveId} disabled={loadingFilter}>
                                <option value="">Selecione a Live...</option>
                                {lives.map(l => (<option key={l.id} value={l.id}>{new Date(l.scheduled_at).toLocaleDateString()} - {l.title}</option>))}
                            </select>
                            <select className="modern-select" onChange={(e) => handleApplyLiveFilter(selectedLiveId, e.target.value)} value={selectedTagFilter} disabled={loadingFilter || !selectedLiveId} style={{ borderColor: 'var(--primary)' }}>
                                <option value="">Todas as Tags</option>
                                {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </>
                    )}
                  </div>
                </div>
                
                {tableData.length > 0 && (
                    <div className="totals-bar">
                        <div className="total-item">
                            <span className="label">Total {reportType === 'LIVE' ? 'Visualizações' : 'Alunos'}:</span>
                            <span className="value">{totalStudents}</span>
                        </div>
                        {reportType === 'LIVE' ? (
                            <>
                                <div className="total-item">
                                    <span className="label">Tempo Total:</span>
                                    <span className="value">{formatWatchTime(totalMinutesWatched)}</span>
                                </div>
                                <div className="total-item">
                                    <span className="label">Média/Aluno:</span>
                                    <span className="value highlight">{formatWatchTime(averageMinutes)}</span>
                                </div>
                            </>
                        ) : (
                            <div className="total-item">
                                <span className="label">Taxa de Conclusão:</span>
                                <span className="value highlight">{completionRate}%</span>
                            </div>
                        )}
                    </div>
                )}

                {absentTags.length > 0 && (
                    <div className="absent-tags-wrapper">
                        <div className="absent-header">
                            <Icons.Alert />
                            <span>TAGS COM 0% DE PRESENÇA (AUSENTES):</span>
                        </div>
                        <div className="absent-tags-list">
                            {absentTags.map(tag => (
                                <span key={tag} className="absent-badge">{tag}</span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="table-responsive custom-scrollbar" style={{ opacity: loadingFilter ? 0.5 : 1 }}>
                  {tableData.length > 0 ? (
                    <table className="modern-table">
                      <thead>
                        <tr>
                          <th>Aluno</th><th>Perfil</th>
                          {reportType === 'COURSE' ? (<th>Status</th>) : (<><th>Tempo</th><th>Último Acesso</th></>)}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.map((s, i) => (
                          <tr key={i} className="fade-in-item" style={{animationDelay: `${i*0.02}s`}}>
                            <td>
                              <div className="user-info">
                                {s.avatar_url ? <img src={s.avatar_url} alt="" className="avatar-img" /> : <div className="avatar">{s.full_name?.[0]}</div>}
                                <span>{s.full_name}</span>
                              </div>
                            </td>
                            <td><span className={`badge ${s.role}`}>{s.role}</span></td>
                            {reportType === 'COURSE' ? (
                                <td><div className={`status-pill ${s.is_completed ? 'done' : 'wip'}`}>{s.is_completed ? 'Concluído' : 'Cursando'}</div></td>
                            ) : (
                                <>
                                    <td><div className="watch-time-pill">{formatWatchTime(s.minutes_watched || 0)}</div></td>
                                    <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{s.last_seen_at ? new Date(s.last_seen_at).toLocaleTimeString().slice(0,5) : '-'}</td>
                                </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="empty-state"><div className="empty-icon">📂</div><p>Sem dados.</p></div>
                  )}
                </div>
              </div>

              <div className="side-panel">
                <div className="chart-card glass-panel">
                  <h3>ALUNOS POR TAG</h3>
                  <div style={{ width: '100%', height: 200 }}>
                    <ResponsiveContainer>
                      <BarChart data={tagPopularity} layout="vertical" margin={{top: 5, right: 30, left: 40, bottom: 5}}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={80} tick={{fill: '#94a3b8', fontSize: 11}} />
                        <RechartsTooltip contentStyle={{backgroundColor: '#0f172a', border: 'none'}} />
                        <Bar dataKey="alunos" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {reportType === 'COURSE' && (
                    <div className="chart-card glass-panel">
                    <h3>Retenção</h3>
                    <div className="donut-chart-wrapper">
                        <div style={{ width: '100%', height: 180 }}>
                        <ResponsiveContainer>
                            <PieChart>
                            <Pie data={completionChartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                {completionChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : 'rgba(51, 65, 85, 0.5)'} />))}
                            </Pie>
                            <RechartsTooltip contentStyle={{backgroundColor: '#0f172a', border: 'none'}} />
                            </PieChart>
                        </ResponsiveContainer>
                        </div>
                        <div className="chart-overlay"><span className="big-number">{completionRate}%</span></div>
                    </div>
                    </div>
                )}
              </div>
            </div>
          </div>
        </main>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        :root {
          --bg-dark: #020617; --bg-gradient: radial-gradient(circle at 10% 20%, rgba(139, 92, 246, 0.12) 0%, transparent 40%), radial-gradient(circle at 90% 60%, rgba(16, 185, 129, 0.08) 0%, transparent 40%);
          --surface-1: rgba(30, 41, 59, 0.3); --surface-2: rgba(30, 41, 59, 0.5);
          --glass-border: rgba(255, 255, 255, 0.06); --glass-highlight: rgba(255, 255, 255, 0.08); --blur-strong: 20px;
          --primary: #8b5cf6; --success: #10b981; --warning: #f59e0b; --excel-green: #107c41; --danger: #ef4444;
          --text-main: #f8fafc; --text-secondary: #94a3b8; --text-tertiary: #64748b;
        }
        * { box-sizing: border-box; outline-color: var(--primary); }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        body { overflow-x: hidden; }
        .pro-viewport { display: flex; background-color: var(--bg-dark); background-image: var(--bg-gradient); min-height: 100vh; font-family: 'Plus Jakarta Sans', sans-serif; color: var(--text-main); }
        .pro-main-canvas { flex: 1; margin-left: 260px; padding: 2.5rem; width: calc(100% - 260px); max-width: 100%; transition: all 0.3s; }
        .dashboard-container { max-width: 1600px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; animation: fadeInUp 0.8s ease; }
        
        /* HEADER - Ajustado para mobile */
        .pro-header { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .system-status { display: inline-flex; align-items: center; gap: 8px; font-size: 0.7rem; color: var(--success); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 0.5rem; background: rgba(16, 185, 129, 0.08); padding: 6px 12px; border-radius: 30px; border: 1px solid rgba(16, 185, 129, 0.15); }
        .pulse-dot { width: 6px; height: 6px; background-color: var(--success); border-radius: 50%; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); animation: pulse-green 2s infinite; }
        .pro-header h1 { font-size: clamp(2rem, 5vw, 2.75rem); font-weight: 800; margin: 0; letter-spacing: -0.03em; background: linear-gradient(135deg, #fff 30%, #94a3b8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; line-height: 1.1; }
        .pro-header p { color: var(--text-secondary); margin-top: 0.5rem; font-size: 1.05rem; max-width: 650px; line-height: 1.6; }
        .btn-export { color: white; border: 1px solid rgba(255,255,255,0.15); padding: 0.85rem 1.75rem; border-radius: 12px; font-weight: 600; font-size: 0.95rem; display: inline-flex; align-items: center; gap: 0.75rem; cursor: pointer; transition: all 0.2s; }
        .btn-export.pdf { background: linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%); box-shadow: 0 4px 15px -3px rgba(139, 92, 246, 0.5); }
        .btn-export.excel { background: linear-gradient(135deg, var(--excel-green) 0%, #0c5e31 100%); box-shadow: 0 4px 15px -3px rgba(16, 124, 65, 0.5); }
        .btn-export:hover { transform: translateY(-2px); filter: brightness(1.1); } .btn-export:disabled { opacity: 0.6; cursor: wait; }
        
        .tab-btn { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); color: var(--text-secondary); padding: 8px 16px; border-radius: 10px; cursor: pointer; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
        .tab-btn:hover { background: rgba(255,255,255,0.08); } .tab-btn.active { background: var(--primary); color: white; border-color: var(--primary); box-shadow: 0 0 15px rgba(139, 92, 246, 0.3); }
        
        .glass-panel { background: var(--surface-1); backdrop-filter: blur(var(--blur-strong)); border: 1px solid var(--glass-border); border-top: 1px solid var(--glass-highlight); border-radius: 24px; padding: 2rem; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2); transition: all 0.3s ease; opacity: 0; animation: fadeInUp 0.6s ease forwards; }
        .glass-panel:hover { border-color: rgba(255,255,255,0.2); background: var(--surface-2); transform: translateY(-5px); box-shadow: 0 15px 35px rgba(0,0,0,0.3); }
        .glass-panel.blue-hover:hover { box-shadow: 0 15px 35px rgba(96, 165, 250, 0.2); border-color: rgba(96, 165, 250, 0.3); }
        .glass-panel.purple-hover:hover { box-shadow: 0 15px 35px rgba(139, 92, 246, 0.2); border-color: rgba(139, 92, 246, 0.3); }
        .glass-panel.gold-hover:hover { box-shadow: 0 15px 35px rgba(245, 158, 11, 0.2); border-color: rgba(245, 158, 11, 0.3); }
        
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; } .kpi-card { height: 220px; display: flex; flex-direction: column; } .kpi-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
        .kpi-icon-box { width: 64px; height: 64px; border-radius: 18px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background: rgba(255,255,255,0.03); box-shadow: inset 0 0 15px rgba(255,255,255,0.05); }
        .blue { color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); background: radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%); }
        .purple { color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.3); background: radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%); }
        .gold { color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); background: radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%); }
        .kpi-value h3 { font-size: 3.5rem; font-weight: 800; margin: 0; color: #fff; letter-spacing: -2px; margin-top: auto; line-height: 1; } .kpi-value p { margin: 8px 0 0; color: var(--text-tertiary); font-size: 1rem; font-weight: 600; letter-spacing: 0.02em; }
        
        .content-grid { display: grid; grid-template-columns: 2.2fr 1fr; gap: 1.5rem; align-items: start; }
        .panel-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem; } .panel-header h3 { font-size: 1.25rem; margin: 0 0 0.25rem 0; font-weight: 700; letter-spacing: -0.01em; }
        
        .modern-select { appearance: none; background: rgba(15, 23, 42, 0.6); border: 1px solid var(--glass-border); color: var(--text-main); padding: 0.75rem 2.5rem 0.75rem 1.25rem; border-radius: 12px; font-family: inherit; font-size: 0.9rem; font-weight: 500; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; background-size: 16px; transition: all 0.2s; min-width: 260px; }
        .modern-select:hover { border-color: rgba(255,255,255,0.2); background-color: rgba(15, 23, 42, 0.8); } .modern-select:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(139,92,246,0.15); }
        
        /* CORREÇÃO DO LAYOUT DA TABELA NO MOBILE (EVITA "EXTRAPOLAR") */
        .table-responsive { 
            overflow-x: auto; 
            margin: 0 -2rem -2rem -2rem; 
            padding: 0 2rem 2rem 2rem; 
            max-height: 500px; 
        } 
        
        .modern-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .modern-table th { text-align: left; padding: 1rem; color: var(--text-tertiary); font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid var(--glass-border); white-space: nowrap; position: sticky; top: 0; background: rgba(30, 41, 59, 0.95); backdrop-filter: blur(10px); z-index: 10; }
        .modern-table td { padding: 1.15rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.02); vertical-align: middle; font-size: 0.95rem; } .modern-table tr:hover td { background: rgba(255,255,255,0.03); } .fade-in-item { opacity: 0; animation: fadeIn 0.5s ease forwards; }
        .user-info { display: flex; align-items: center; gap: 1rem; font-weight: 500; }
        .avatar { width: 38px; height: 38px; background: linear-gradient(135deg, var(--primary), #6366f1); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700; color: white; border: 2px solid rgba(255,255,255,0.1); }
        .avatar-img { width: 38px; height: 38px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.1); object-fit: cover; }
        .badge { padding: 5px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; background: rgba(255,255,255,0.05); color: var(--text-secondary); border: 1px solid rgba(255,255,255,0.05); letter-spacing: 0.05em; }
        .status-pill { display: inline-flex; align-items: center; padding: 6px 14px; border-radius: 30px; font-size: 0.8rem; font-weight: 700; gap: 8px; } .status-pill::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; } .status-pill.done { background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.15); } .status-pill.wip { background: rgba(245, 158, 11, 0.1); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.15); }
        .watch-time-pill { display: inline-block; background: rgba(139, 92, 246, 0.15); color: #c4b5fd; padding: 4px 10px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; border: 1px solid rgba(139, 92, 246, 0.2); }
        .side-panel { display: flex; flex-direction: column; gap: 1.5rem; } .donut-chart-wrapper { position: relative; display: flex; justify-content: center; align-items: center; padding: 1rem 0; } .chart-overlay { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: none; } .big-number { font-size: 2.2rem; font-weight: 800; color: white; line-height: 1; display: block; letter-spacing: -1px; } .label { font-size: 0.8rem; color: var(--text-tertiary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; } .empty-state { padding: 5rem 2rem; text-align: center; border: 2px dashed rgba(255,255,255,0.05); border-radius: 20px; margin: 1rem; background: rgba(0,0,0,0.1); } .empty-icon { font-size: 3.5rem; margin-bottom: 1rem; display: block; opacity: 0.3; filter: grayscale(1); }
        
        .totals-bar { display: flex; gap: 20px; margin-bottom: 20px; padding: 15px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }
        .total-item { display: flex; align-items: center; gap: 10px; font-size: 0.9rem; }
        .total-item .label { color: var(--text-secondary); font-weight: 600; text-transform: uppercase; font-size: 0.75rem; }
        .total-item .value { color: white; font-weight: 800; font-size: 1.1rem; }
        .total-item .value.highlight { color: var(--primary); }

        /* ABSENT TAGS */
        .absent-tags-wrapper { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; padding: 1rem; margin-bottom: 20px; }
        .absent-header { display: flex; align-items: center; gap: 10px; color: var(--danger); font-weight: 800; font-size: 0.8rem; margin-bottom: 10px; }
        .absent-tags-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .absent-badge { background: rgba(239, 68, 68, 0.2); color: #fca5a5; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; border: 1px solid rgba(239, 68, 68, 0.3); }

        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); } 70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
        
        /* RESPONSIVIDADE POLIDA */
        @media (max-width: 1200px) { .content-grid { grid-template-columns: 1fr; } .side-panel { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; } } 
        @media (max-width: 900px) { .pro-main-canvas { margin-left: 0; width: 100%; padding: 1.5rem; } .side-panel { grid-template-columns: 1fr; } } 
        
        /* MOBILE OTIMIZADO */
        @media (max-width: 600px) { 
            .pro-header { flex-direction: column; gap: 1.5rem; align-items: center; text-align: center; } 
            .header-content { width: 100%; display: flex; flex-direction: column; align-items: center; }
            .btn-export { width: 100%; justify-content: center; } 
            .kpi-grid { grid-template-columns: 1fr; } 
            
            /* Ajuste para não quebrar alinhamento dos filtros */
            .panel-header { flex-direction: column; align-items: stretch; gap: 1.5rem; text-align: center; } 
            .panel-header > div { width: 100%; }
            .panel-header div[style*="display: flex"] { justify-content: center; } /* Centraliza botões de toggle */
            
            .filter-control { width: 100%; align-items: stretch !important; }
            .modern-select { width: 100%; margin-bottom: 10px; } 
            
            .totals-bar { flex-direction: column; gap: 12px; text-align: center; width: 100%; }
            .total-item { justify-content: center; width: 100%; }
            .absent-header, .absent-tags-list { justify-content: center; }

            /* CORREÇÃO DO EXTRAPOLAR NO MOBILE */
            .glass-panel { padding: 1.5rem; overflow: hidden; }
            .table-responsive { 
                margin: 0 -1.5rem -1.5rem -1.5rem; 
                padding: 0 1.5rem 1.5rem 1.5rem; 
                width: calc(100% + 3rem); /* Garante que ocupa a largura total permitida */
            }
        }
      `}</style>
    </div>
  );
}