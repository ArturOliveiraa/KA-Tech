import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';

// --- INTERFACES TYPESCRIPT ---
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

interface Student {
  full_name: string;
  role: string;
  is_completed: boolean;
  userId?: string; 
}

// --- ICONS ---
const Icons = {
  TrendUp: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>,
  Users: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Layers: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>,
  Download: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
};

export default function Reports() {
  // --- ESTADOS TIPADOS ---
  const [loading, setLoading] = useState<boolean>(true);
  const [platformStats, setPlatformStats] = useState<PlatformStats>({ totalStudents: 0, totalCourses: 0, totalLessonsFinished: 0 });
  
  const [tagPopularity, setTagPopularity] = useState<TagData[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  
  const [studentsByCourse, setStudentsByCourse] = useState<Student[]>([]);
  const [loadingFilter, setLoadingFilter] = useState<boolean>(false);

  // --- CARGA DE DADOS ---
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [profilesRes, coursesRes, progressRes, listCoursesRes, tagPopRes] = await Promise.all([
          supabase.from("profiles").select("id", { count: 'exact', head: true }),
          supabase.from("courses").select("id", { count: 'exact', head: true }),
          supabase.from("user_progress").select("id", { count: 'exact', head: true }).eq("is_completed", true),
          supabase.from("courses").select("id, title").order("title"),
          supabase.from("tag_popularity_report").select("*").limit(5)
        ]);

        setPlatformStats({
          totalStudents: profilesRes.count || 0,
          totalCourses: coursesRes.count || 0,
          totalLessonsFinished: progressRes.count || 0
        });

        if (listCoursesRes.data) setCourses(listCoursesRes.data);
        
        // Transformar dados para o gráfico
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

  // Tipagem explícita do parâmetro courseId
  const handleApplyFilter = async (courseId: string) => {
    if (!courseId) return;
    setLoadingFilter(true);
    setSelectedCourseId(courseId);

    const [enrollRes, progressRes] = await Promise.all([
      supabase.from("course_enrollments").select(`userId, profiles:userId (full_name, role)`).eq("courseId", Number(courseId)),
      supabase.from("user_progress").select("user_id, is_completed").eq("course_id", Number(courseId))
    ]);

    if (enrollRes.data) {
      const progressMap = new Map(progressRes.data?.map(p => [p.user_id, p.is_completed]) || []);
      
      const formattedStudents: Student[] = enrollRes.data
        .filter((item: any) => item.profiles) // Garante que tem perfil
        .map((item: any) => ({
          full_name: item.profiles.full_name,
          role: item.profiles.role,
          is_completed: progressMap.get(item.userId) || false,
          userId: item.userId
        }));

      setStudentsByCourse(formattedStudents);
    }
    setLoadingFilter(false);
  };

  // --- CÁLCULOS PARA GRÁFICOS ---
  const completionData = useMemo(() => {
    if (studentsByCourse.length === 0) return [{ name: 'Aguardando', value: 1 }];
    const completed = studentsByCourse.filter(s => s.is_completed).length;
    const inProgress = studentsByCourse.length - completed;
    return [
      { name: 'Concluído', value: completed },
      { name: 'Em Andamento', value: inProgress }
    ];
  }, [studentsByCourse]);

  const completionRate = studentsByCourse.length > 0
    ? Math.round((studentsByCourse.filter(s => s.is_completed).length / studentsByCourse.length) * 100)
    : 0;

  // --- PDF GENERATOR ---
  const generatePremiumPDF = () => {
    const doc = new jsPDF();
    const courseName = courses.find(c => c.id === Number(selectedCourseId))?.title || "Relatório Geral";
    
    // --- 1. HEADER & BACKGROUND ---
    doc.setFillColor(15, 23, 42); // Cor Dark Blue (Brand)
    doc.rect(0, 0, 210, 50, 'F'); // Cabeçalho maior
    
    // Título Principal
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("KA ACADEMY", 14, 20);
    
    // Subtítulo
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Intelligence & Analytics Report", 14, 27);

    // Data (Alinhada à direita)
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 195, 20, { align: 'right' });

    // --- 2. NOME DO CURSO (DESTAQUE) ---
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(139, 92, 246); // Primary Purple
    doc.text(`CURSO: ${courseName.toUpperCase()}`, 14, 40);

    // --- 3. GRÁFICO DE PROGRESSO NO PDF ---
    // Cálculos
    const total = studentsByCourse.length;
    const completed = studentsByCourse.filter(s => s.is_completed).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Área do Painel de Resumo
    doc.setFillColor(248, 250, 252); // Fundo Cinza Claro
    doc.setDrawColor(226, 232, 240); // Borda suave
    doc.roundedRect(14, 60, 182, 30, 3, 3, 'FD');

    // Texto: Taxa de Conclusão
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Taxa de Conclusão da Turma", 20, 72);

    // Texto: Porcentagem Grande
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`${rate}%`, 185, 74, { align: 'right' });

    // Barra de Fundo (Cinza)
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(20, 80, 170, 6, 2, 2, 'F');

    // Barra de Progresso (Verde ou Roxo dependendo do status)
    if (rate > 0) {
      doc.setFillColor(16, 185, 129); // Success Green
      // Calcula largura proporcional (max 170)
      const fillWidth = (170 * rate) / 100;
      doc.roundedRect(20, 80, fillWidth, 6, 2, 2, 'F');
    }

    // Legenda Pequena abaixo da barra
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`${completed} alunos concluíram de ${total} matriculados.`, 20, 93);

    // --- 4. TABELA DE DADOS ---
    autoTable(doc, {
      startY: 105, // Empurrada para baixo para caber o gráfico
      head: [['Aluno', 'Cargo', 'Status']],
      body: studentsByCourse.map(s => [
        s.full_name,
        s.role?.toUpperCase() || 'ALUNO',
        s.is_completed ? 'CONCLUÍDO' : 'PENDENTE'
      ]),
      headStyles: { 
        fillColor: [15, 23, 42], // Header Escuro
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left'
      },
      bodyStyles: { 
        textColor: [51, 65, 85],
        fontSize: 10
      },
      alternateRowStyles: { 
        fillColor: [248, 250, 252] // Zebra Striping sutil
      },
      columnStyles: {
        0: { cellWidth: 'auto' }, // Nome
        1: { cellWidth: 40 },     // Cargo
        2: { fontStyle: 'bold' }  // Status em negrito
      },
      didParseCell: function(data) {
        // Customização de cor para Status
        if (data.section === 'body' && data.column.index === 2) {
          if (data.cell.raw === 'CONCLUÍDO') {
            data.cell.styles.textColor = [16, 185, 129]; // Verde
          } else {
            data.cell.styles.textColor = [245, 158, 11]; // Laranja
          }
        }
      }
    });

    doc.save(`KA_Report_${courseName.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="pro-viewport">
      <Sidebar />

      {/* CONDICIONAL: TELA DE CARREGAMENTO OU DASHBOARD */}
      {loading ? (
        <main className="pro-main-canvas" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', minWidth: '300px' }}>
             <span className="system-status" style={{ justifyContent: 'center', marginBottom: '1.5rem', fontSize: '0.8rem' }}>
                <span className="pulse-dot"></span> SYSTEM INITIALIZING
             </span>
             <p style={{ color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>Carregando módulos de análise...</p>
          </div>
        </main>
      ) : (
        <main className="pro-main-canvas">
          <div className="dashboard-container">
            
            {/* HEADER */}
            <header className="pro-header">
              <div className="header-content">
                <span className="system-status">
                  <span className="pulse-dot"></span> SYSTEM ONLINE
                </span>
                <h1>Analytics Center</h1>
                <p>Visão estratégica de engajamento e performance da <strong>KA Academy</strong></p>
              </div>
              <button className="btn-export" onClick={generatePremiumPDF}>
                <Icons.Download />
                <span className="btn-text">Exportar Dados</span>
              </button>
            </header>

            {/* KPI GRID */}
            <section className="kpi-grid">
              <div className="kpi-card glass-panel blue-hover" style={{animationDelay: '0.1s'}}>
                <div className="kpi-header">
                  <div className="kpi-icon-box blue"><Icons.Users /></div>
                  <span className="trend positive"><Icons.TrendUp /> +12%</span>
                </div>
                <div className="kpi-value">
                  <h3>{platformStats.totalStudents}</h3>
                  <p>Alunos Ativos</p>
                </div>
              </div>

              <div className="kpi-card glass-panel purple-hover" style={{animationDelay: '0.2s'}}>
                <div className="kpi-header">
                  <div className="kpi-icon-box purple"><Icons.Layers /></div>
                  <span className="trend neutral">Estável</span>
                </div>
                <div className="kpi-value">
                  <h3>{platformStats.totalCourses}</h3>
                  <p>Cursos Disponíveis</p>
                </div>
              </div>

              <div className="kpi-card glass-panel featured gold-hover" style={{animationDelay: '0.3s'}}>
                <div className="kpi-header">
                  <div className="kpi-icon-box gold">⚡</div>
                </div>
                <div className="kpi-value">
                  <h3>{platformStats.totalLessonsFinished}</h3>
                  <p>Aulas Finalizadas</p>
                </div>
                <div className="mini-chart">
                  <div className="bar" style={{width: '70%'}}></div>
                </div>
              </div>
            </section>

            {/* MAIN CONTENT GRID */}
            <div className="content-grid">
              
              {/* LEFT COLUMN: DATA TABLE & FILTER */}
              <div className="main-panel glass-panel" style={{animationDelay: '0.4s'}}>
                <div className="panel-header">
                  <div>
                    <h3>Matriz de Desempenho</h3>
                    <p>Acompanhamento granular por trilha</p>
                  </div>
                  <div className="filter-control">
                    {/* USO DA VARIÁVEL loadingFilter PARA FEEDBACK VISUAL */}
                    <select 
                      className="modern-select" 
                      onChange={(e) => handleApplyFilter(e.target.value)} 
                      value={selectedCourseId}
                      disabled={loadingFilter}
                      style={{ opacity: loadingFilter ? 0.7 : 1, cursor: loadingFilter ? 'wait' : 'pointer' }}
                    >
                      <option value="">Selecione uma Trilha...</option>
                      {courses.map(c => <option key={c.id} value={c.id.toString()}>{c.title}</option>)}
                    </select>
                  </div>
                </div>

                {/* OPACIDADE DURANTE FILTRAGEM */}
                <div 
                  className="table-responsive custom-scrollbar"
                  style={{ transition: 'opacity 0.3s', opacity: loadingFilter ? 0.5 : 1, pointerEvents: loadingFilter ? 'none' : 'auto' }}
                >
                  {studentsByCourse.length > 0 ? (
                    <table className="modern-table">
                      <thead>
                        <tr>
                          <th>Aluno</th>
                          <th>Perfil</th>
                          <th>Progresso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentsByCourse.map((s, i) => (
                          <tr key={i} style={{animationDelay: `${i * 0.05}s`}} className="fade-in-item">
                            <td>
                              <div className="user-info">
                                <div className="avatar">{s.full_name[0]}</div>
                                <span>{s.full_name}</span>
                              </div>
                            </td>
                            <td><span className={`badge ${s.role}`}>{s.role}</span></td>
                            <td>
                              <div className={`status-pill ${s.is_completed ? 'done' : 'wip'}`}>
                                {s.is_completed ? 'Concluído' : 'Cursando'}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">📂</div>
                      <p>Selecione um curso acima para carregar os dados.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: CHARTS & INSIGHTS */}
              <div className="side-panel">
                
                {/* CHART: TOP TAGS */}
                <div className="chart-card glass-panel" style={{animationDelay: '0.5s'}}>
                  <h3>Interesse por Tecnologia</h3>
                  <div style={{ width: '100%', height: 200 }}>
                    <ResponsiveContainer>
                      <BarChart data={tagPopularity} layout="vertical" margin={{top: 5, right: 30, left: 40, bottom: 5}}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={80} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 500}} />
                        <RechartsTooltip 
                          contentStyle={{backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'}}
                          cursor={{fill: 'rgba(255,255,255,0.05)', radius: 4}}
                        />
                        <Bar dataKey="alunos" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24} animationDuration={1500} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* CHART: RETENTION */}
                <div className="chart-card glass-panel" style={{animationDelay: '0.6s'}}>
                  <h3>Taxa de Conclusão (Filtro)</h3>
                  <div className="donut-chart-wrapper">
                    <div style={{ width: '100%', height: 180 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={completionData}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                            animationDuration={1500}
                          >
                            {completionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : 'rgba(51, 65, 85, 0.5)'} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            contentStyle={{backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px'}} 
                            itemStyle={{color: '#f1f5f9'}} 
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="chart-overlay">
                      <span className="big-number">{completionRate}%</span>
                      <span className="label">Retenção</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </main>
      )}

      {/* --- ESTILOS CSS SUPER OTIMIZADOS --- */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        :root {
          /* --- Color Palette --- */
          --bg-dark: #020617; /* Slate 950+ */
          --bg-gradient: radial-gradient(circle at 10% 20%, rgba(139, 92, 246, 0.12) 0%, transparent 40%), 
                         radial-gradient(circle at 90% 60%, rgba(16, 185, 129, 0.08) 0%, transparent 40%);
          
          /* --- Glass Surfaces --- */
          --surface-1: rgba(30, 41, 59, 0.3);
          --surface-2: rgba(30, 41, 59, 0.5);
          --surface-hover: rgba(51, 65, 85, 0.5);
          
          /* --- Borders & Glows --- */
          --glass-border: rgba(255, 255, 255, 0.06);
          --glass-highlight: rgba(255, 255, 255, 0.08);
          --blur-strong: 20px;

          /* --- Brand Colors --- */
          --primary: #8b5cf6;
          --primary-hover: #7c3aed;
          --primary-glow: rgba(139, 92, 246, 0.5);
          --success: #10b981;
          --success-glow: rgba(16, 185, 129, 0.4);
          --warning: #f59e0b;
          --warning-glow: rgba(245, 158, 11, 0.4);
          --info-glow: rgba(96, 165, 250, 0.4);
          
          /* --- Text --- */
          --text-main: #f8fafc;
          --text-secondary: #94a3b8;
          --text-tertiary: #64748b;

          /* --- Transitions --- */
          --ease-elastic: cubic-bezier(0.175, 0.885, 0.32, 1.275);
          --ease-smooth: cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        /* --- GLOBAL RESET & SCROLL --- */
        * { box-sizing: border-box; outline-color: var(--primary); }
        
        ::selection {
          background: rgba(139, 92, 246, 0.3);
          color: white;
        }

        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

        body { overflow-x: hidden; }

        .pro-viewport {
          display: flex;
          background-color: var(--bg-dark);
          background-image: var(--bg-gradient);
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: var(--text-main);
          -webkit-font-smoothing: antialiased;
        }

        .pro-main-canvas {
          flex: 1;
          margin-left: 260px;
          padding: 2.5rem;
          width: calc(100% - 260px);
          max-width: 100%;
          transition: all 0.3s var(--ease-smooth);
        }

        .dashboard-container {
          max-width: 1600px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 2rem;
          /* Entry Animation */
          animation: fadeInUp 0.8s var(--ease-smooth);
        }

        /* --- HEADER & STATUS --- */
        .pro-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          position: relative;
        }

        .system-status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.7rem;
          color: var(--success);
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
          background: rgba(16, 185, 129, 0.08);
          padding: 6px 12px;
          border-radius: 30px;
          border: 1px solid rgba(16, 185, 129, 0.15);
        }

        .pulse-dot {
          width: 6px; height: 6px;
          background-color: var(--success);
          border-radius: 50%;
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          animation: pulse-green 2s infinite;
        }

        .pro-header h1 {
          font-size: clamp(2rem, 5vw, 2.75rem);
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #fff 30%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          line-height: 1.1;
        }

        .pro-header p {
          color: var(--text-secondary);
          margin-top: 0.5rem;
          font-size: 1.05rem;
          max-width: 650px;
          line-height: 1.6;
        }

        /* --- BUTTONS --- */
        .btn-export {
          background: linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%);
          color: white;
          border: 1px solid rgba(255,255,255,0.15);
          padding: 0.85rem 1.75rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.95rem;
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: all 0.2s var(--ease-elastic);
          box-shadow: 0 4px 15px -3px var(--primary-glow);
        }

        .btn-export:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px -5px var(--primary-glow);
          filter: brightness(1.1);
        }
        
        .btn-export:active { transform: scale(0.96); }
        .btn-export:focus-visible { outline: 2px solid white; outline-offset: 2px; }

        /* --- GLASS PANEL SYSTEM --- */
        .glass-panel {
          background: var(--surface-1);
          backdrop-filter: blur(var(--blur-strong));
          -webkit-backdrop-filter: blur(var(--blur-strong));
          border: 1px solid var(--glass-border);
          border-top: 1px solid var(--glass-highlight);
          border-radius: 24px;
          padding: 2rem; /* Aumentado padding */
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          transition: transform 0.3s var(--ease-smooth), border-color 0.3s, box-shadow 0.3s, background 0.3s;
          /* Animation setup */
          opacity: 0;
          animation: fadeInUp 0.6s var(--ease-smooth) forwards;
        }

        .glass-panel:hover {
          border-color: rgba(255,255,255,0.2);
          background: var(--surface-2);
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(0,0,0,0.3);
        }
        
        /* Colored Hovers for KPI Cards */
        .glass-panel.blue-hover:hover { box-shadow: 0 15px 35px rgba(96, 165, 250, 0.2); border-color: rgba(96, 165, 250, 0.3); }
        .glass-panel.purple-hover:hover { box-shadow: 0 15px 35px rgba(139, 92, 246, 0.2); border-color: rgba(139, 92, 246, 0.3); }
        .glass-panel.gold-hover:hover { box-shadow: 0 15px 35px rgba(245, 158, 11, 0.2); border-color: rgba(245, 158, 11, 0.3); }

        /* --- KPI GRID --- */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .kpi-card {
          height: 220px; /* Aumentada a altura */
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .kpi-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }

        .kpi-icon-box {
          width: 64px; height: 64px; /* Aumentado tamanho */
          border-radius: 18px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem; /* Aumentado ícone */
          transition: transform 0.4s var(--ease-elastic);
          /* Glass inside glass */
          background: rgba(255,255,255,0.03);
          box-shadow: inset 0 0 15px rgba(255,255,255,0.05);
        }

        .kpi-card:hover .kpi-icon-box { transform: scale(1.1) rotate(5deg); }

        .blue { color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); background: radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%); }
        .purple { color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.3); background: radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%); }
        .gold { color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); background: radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%); }

        .trend { font-size: 0.9rem; font-weight: 700; display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 10px; }
        .trend.positive { background: rgba(16, 185, 129, 0.15); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.2); }
        .trend.neutral { background: rgba(148, 163, 184, 0.15); color: var(--text-main); border: 1px solid rgba(148, 163, 184, 0.2); }

        .kpi-value h3 { font-size: 3.5rem; font-weight: 800; margin: 0; color: #fff; letter-spacing: -2px; margin-top: auto; line-height: 1; }
        .kpi-value p { margin: 8px 0 0; color: var(--text-tertiary); font-size: 1rem; font-weight: 600; letter-spacing: 0.02em; }

        .mini-chart { margin-top: 1.5rem; height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; width: 100%; }
        .mini-chart .bar { height: 100%; background: linear-gradient(90deg, #f59e0b, #fcd34d); border-radius: 4px; animation: slideIn 1.5s var(--ease-elastic); box-shadow: 0 0 10px var(--warning-glow); }

        /* --- CONTENT GRID --- */
        .content-grid {
          display: grid;
          grid-template-columns: 2.2fr 1fr;
          gap: 1.5rem;
          align-items: start;
        }

        /* --- TABLE SECTION --- */
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .panel-header h3 { font-size: 1.25rem; margin: 0 0 0.25rem 0; font-weight: 700; letter-spacing: -0.01em; }

        .modern-select {
          appearance: none;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--glass-border);
          color: var(--text-main);
          padding: 0.75rem 2.5rem 0.75rem 1.25rem;
          border-radius: 12px;
          font-family: inherit;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 16px;
          transition: all 0.2s;
          min-width: 260px;
        }
        .modern-select:hover { border-color: rgba(255,255,255,0.2); background-color: rgba(15, 23, 42, 0.8); }
        .modern-select:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(139,92,246,0.15); }

        .table-responsive {
          overflow-x: auto;
          margin: 0 -2rem -2rem -2rem;
          padding: 0 2rem 2rem 2rem;
          max-height: 500px;
        }

        .modern-table { width: 100%; border-collapse: separate; border-spacing: 0; }

        .modern-table th {
          text-align: left;
          padding: 1rem;
          color: var(--text-tertiary);
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border-bottom: 1px solid var(--glass-border);
          white-space: nowrap;
          /* Sticky Header Magic */
          position: sticky;
          top: 0;
          background: rgba(30, 41, 59, 0.95);
          backdrop-filter: blur(10px);
          z-index: 10;
        }

        .modern-table td {
          padding: 1.15rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.02);
          vertical-align: middle;
          transition: background 0.2s;
          font-size: 0.95rem;
        }

        .modern-table tr { transition: transform 0.2s; }
        .modern-table tr:hover td { background: rgba(255,255,255,0.03); }
        .modern-table tr:last-child td { border-bottom: none; }

        /* Animation for table rows */
        .fade-in-item {
          opacity: 0;
          animation: fadeIn 0.5s ease forwards;
        }

        .user-info { display: flex; align-items: center; gap: 1rem; font-weight: 500; }
        .avatar {
          width: 38px; height: 38px;
          background: linear-gradient(135deg, var(--primary), #6366f1);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.85rem;
          font-weight: 700;
          color: white;
          border: 2px solid rgba(255,255,255,0.1);
        }

        .badge {
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          background: rgba(255,255,255,0.05);
          color: var(--text-secondary);
          border: 1px solid rgba(255,255,255,0.05);
          letter-spacing: 0.05em;
        }
        .badge.admin { background: rgba(139, 92, 246, 0.15); color: #c4b5fd; border-color: rgba(139, 92, 246, 0.2); }

        .status-pill {
          display: inline-flex; align-items: center; padding: 6px 14px;
          border-radius: 30px; font-size: 0.8rem; font-weight: 700; gap: 8px;
        }
        .status-pill::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; }
        .status-pill.done { background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.15); }
        .status-pill.wip { background: rgba(245, 158, 11, 0.1); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.15); }

        /* --- SIDE PANEL & CHARTS --- */
        .side-panel { display: flex; flex-direction: column; gap: 1.5rem; }
        .chart-card h3 { margin: 0 0 1.5rem 0; font-size: 1rem; color: var(--text-secondary); font-weight: 600; }

        .donut-chart-wrapper {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 1rem 0;
        }
        .chart-overlay {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          pointer-events: none;
        }
        .big-number { font-size: 2.2rem; font-weight: 800; color: white; line-height: 1; display: block; letter-spacing: -1px; }
        .label { font-size: 0.8rem; color: var(--text-tertiary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }

        /* --- EMPTY STATE --- */
        .empty-state {
          padding: 5rem 2rem;
          text-align: center;
          border: 2px dashed rgba(255,255,255,0.05);
          border-radius: 20px;
          margin: 1rem;
          background: rgba(0,0,0,0.1);
        }
        .empty-icon { font-size: 3.5rem; margin-bottom: 1rem; display: block; opacity: 0.3; filter: grayscale(1); animation: float 6s ease-in-out infinite; }
        .empty-state p { color: var(--text-tertiary); }

        /* --- KEYFRAMES --- */
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn { from { width: 0; } }
        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }

        /* --- RESPONSIVE --- */
        @media (max-width: 1200px) {
          .content-grid { grid-template-columns: 1fr; }
          .side-panel { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        }

        @media (max-width: 900px) {
          .pro-main-canvas { margin-left: 0; width: 100%; padding: 1.5rem; }
          .side-panel { grid-template-columns: 1fr; }
          .pro-header h1 { font-size: 2rem; }
          .kpi-value h3 { font-size: 2.75rem; } /* Ajuste para mobile */
        }

        @media (max-width: 600px) {
          .pro-main-canvas { padding: 1rem; }
          .pro-header { flex-direction: column; gap: 1.5rem; align-items: flex-start; }
          .btn-export { width: 100%; justify-content: center; }
          .kpi-grid { grid-template-columns: 1fr; }
          .panel-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
          .modern-select { width: 100%; }
          .kpi-card { height: auto; min-height: 200px; } /* Altura flexível no mobile */
        }
      `}</style>
    </div>
  );
}