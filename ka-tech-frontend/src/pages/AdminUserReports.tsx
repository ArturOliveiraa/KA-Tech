import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportUser {
  id: string;
  full_name: string;
  email?: string; 
  role: string;
  created_at: string;
  total_xp: number;
  level: number;
  patent: string;
  profile_tags?: { tags: { id: string, name: string, type: string } }[];
  completedCoursesCount?: number;
}

interface Tag {
  id: string;
  name: string;
  type: string;
}

const AdminUserReports: React.FC = () => {
  const [users, setUsers] = useState<ReportUser[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); 
  const [tagSearchTerm, setTagSearchTerm] = useState(''); // Filtro livre por descrição da tag

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('admin_users_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: profileTagsData } = await supabase
        .from('profile_tags')
        .select('profile_id, tags(id, name, type)');

      const { data: tagsData } = await supabase
        .from('tags')
        .select('*')
        .order('name', { ascending: true });

      if (tagsData) setAvailableTags(tagsData);

      const { data: progressData } = await supabase
        .from('user_progress')
        .select('user_id, course_id, is_completed');

      if (profilesData) {
        const enhancedUsers = profilesData.map(user => {
          const userTags = profileTagsData?.filter(pt => pt.profile_id === user.id) || [];
          const completedCount = progressData?.filter(p => p.user_id === user.id && p.is_completed).length || 0;

          return { 
            ...user, 
            profile_tags: userTags,
            completedCoursesCount: completedCount
          };
        });
        setUsers(enhancedUsers as ReportUser[]);
      }
    } catch (error) {
      console.error('Erro ao gerar relatório analítico:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtragem avançada de usuários
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (user.full_name && user.full_name.toLowerCase().includes(searchLower)) ||
      (user.email && user.email.toLowerCase().includes(searchLower));

    // Filtro por tipo de unidade (matriz, franquia, pev)
    let matchesType = true;
    if (typeFilter !== 'all') {
      matchesType = user.profile_tags?.some(pt => (pt.tags?.type || '').toLowerCase() === typeFilter.toLowerCase()) || false;
    }

    // Filtro livre por descrição/nome da Tag
    let matchesTagSearch = true;
    if (tagSearchTerm.trim() !== '') {
      const query = tagSearchTerm.toLowerCase();
      matchesTagSearch = user.profile_tags?.some(pt => pt.tags?.name?.toLowerCase().includes(query)) || false;
    }

    return matchesSearch && matchesType && matchesTagSearch;
  });

  // Métricas do Relatório
  const totalStudents = filteredUsers.filter(u => (u.role || '').toLowerCase() !== 'admin' && (u.role || '').toLowerCase() !== 'teacher').length;
  const totalXP = filteredUsers.reduce((acc, curr) => acc + (curr.total_xp || 0), 0);
  const totalConcluded = filteredUsers.reduce((acc, curr) => acc + (curr.completedCoursesCount || 0), 0);
  const avgXP = totalStudents > 0 ? Math.round(totalXP / totalStudents) : 0;

  const countByUnit = {
    matriz: filteredUsers.filter(u => u.profile_tags?.some(pt => pt.tags?.type?.toLowerCase() === 'matriz')).length,
    franquia: filteredUsers.filter(u => u.profile_tags?.some(pt => pt.tags?.type?.toLowerCase() === 'franquia')).length,
    pev: filteredUsers.filter(u => u.profile_tags?.some(pt => pt.tags?.type?.toLowerCase() === 'pev')).length,
  };

  const exportToExcel = () => {
    const dataToExport = filteredUsers.map(user => ({
      'Nome do Aluno': user.full_name || 'Sem nome',
      'E-mail': user.email || 'Sem e-mail',
      'Unidade / Franquia': user.profile_tags?.map(pt => pt.tags?.name).join(', ') || 'Geral',
      'Tipo': user.profile_tags?.map(pt => pt.tags?.type).join(', ') || 'N/A',
      'Patente': user.patent || 'Sem Patente',
      'Nível': user.level || 1,
      'XP Total': user.total_xp || 0,
      'Cursos Concluídos': user.completedCoursesCount || 0,
      'Data Cadastro': new Date(user.created_at).toLocaleDateString('pt-BR')
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatorio_Gerencial");
    XLSX.writeFile(workbook, "Relatorio_Analitico_KATech.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text("Relatório Executivo de Alunos e Unidades - KA Tech", 14, 15);
    doc.setFontSize(10);
    doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')} | Total Registros: ${filteredUsers.length}`, 14, 22);

    const tableColumn = ["Nome", "E-mail", "Unidade / Franquia", "Tipo", "Patente", "Nível", "XP Total", "Concluídos"];
    const tableRows = filteredUsers.map(user => [
      user.full_name || 'Sem nome',
      user.email || 'Sem e-mail',
      user.profile_tags?.map(pt => pt.tags?.name).join(', ') || 'Geral',
      user.profile_tags?.map(pt => pt.tags?.type).join(', ') || 'N/A',
      user.patent || 'Sem Patente',
      (user.level || 1).toString(),
      (user.total_xp || 0).toLocaleString('pt-BR'),
      (user.completedCoursesCount || 0).toString()
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [245, 124, 0] }
    });

    doc.save("Relatorio_Executivo_KATech.pdf");
  };

  return (
    <div className="admin-layout">
      <Sidebar />

      <style>{`
        .admin-layout { display: flex; min-height: 100vh; background-color: #030712; font-family: 'Segoe UI', Roboto, sans-serif; }
        .admin-main-content { flex: 1; margin-left: 270px; padding: 40px; color: #F3F4F6; width: calc(100% - 270px); box-sizing: border-box; }
        
        /* CABEÇALHO DO RELATÓRIO */
        .report-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 35px; flex-wrap: wrap; gap: 20px; background: linear-gradient(135deg, rgba(245,124,0,0.08) 0%, rgba(15,23,42,0.6) 100%); padding: 24px 30px; border-radius: 20px; border: 1px solid rgba(245,124,0,0.2); }
        .report-title h1 { font-size: 1.8rem; font-weight: 800; margin: 0 0 6px 0; color: #FFFFFF; display: flex; align-items: center; gap: 12px; }
        .report-title p { color: #94A3B8; margin: 0; font-size: 0.92rem; }

        .export-actions { display: flex; gap: 12px; }
        .btn-export { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); padding: 0 18px; height: 44px; border-radius: 10px; font-weight: 600; font-size: 0.88rem; cursor: pointer; transition: all 0.25s; display: flex; align-items: center; gap: 8px; color: #FFF; }
        .btn-export.pdf:hover { background: rgba(239, 68, 68, 0.25); border-color: #EF4444; color: #FCA5A5; }
        .btn-export.excel:hover { background: rgba(34, 197, 94, 0.25); border-color: #22C55E; color: #86EFAC; }

        /* KPIS MODERNOS */
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .kpi-card { background: #0B0F19; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 22px; display: flex; flex-direction: column; gap: 8px; position: relative; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
        .kpi-card::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: #F57C00; }
        .kpi-card.green::before { background: #22C55E; }
        .kpi-card.blue::before { background: #38BDF8; }
        .kpi-card.purple::before { background: #A855F7; }

        .kpi-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #94A3B8; letter-spacing: 0.8px; }
        .kpi-value { font-size: 2.2rem; font-weight: 800; color: #FFFFFF; line-height: 1; }

        /* SEÇÃO DE ESTATÍSTICAS E GRÁFICO DE BARRAS */
        .stats-section { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 30px; }
        .stats-box { background: #0B0F19; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
        .stats-box h3 { font-size: 1.05rem; font-weight: 700; color: #FFF; margin: 0 0 20px 0; display: flex; align-items: center; gap: 8px; }

        .unit-bars { display: flex; flex-direction: column; gap: 14px; }
        .unit-bar-row { display: flex; align-items: center; justify-content: space-between; font-size: 0.9rem; color: #CBD5E1; }
        .unit-bar-bg { flex: 1; margin: 0 20px; background: rgba(255,255,255,0.04); height: 10px; border-radius: 6px; overflow: hidden; }
        .unit-bar-fill { height: 100%; background: linear-gradient(90deg, #F57C00, #FFB74D); border-radius: 6px; transition: width 0.5s ease; }
        .unit-bar-fill.franquia { background: linear-gradient(90deg, #0284C7, #38BDF8); }
        .unit-bar-fill.pev { background: linear-gradient(90deg, #16A34A, #4ADE80); }

        /* BARRA DE FILTROS SUPER LIMPA */
        .filters-panel { display: flex; gap: 14px; margin-bottom: 25px; flex-wrap: wrap; background: #0B0F19; padding: 18px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.06); }
        .filter-input, .filter-select { height: 46px; background: #030712; border: 1px solid rgba(255,255,255,0.1); color: #F3F4F6; border-radius: 10px; padding: 0 16px; font-size: 0.93rem; outline: none; transition: border-color 0.2s; }
        .filter-input { flex: 1; min-width: 240px; }
        .filter-select { cursor: pointer; }
        .filter-input:focus, .filter-select:focus { border-color: #F57C00; box-shadow: 0 0 0 3px rgba(245,124,0,0.15); }

        /* TABELA PREMIUM DO RELATÓRIO */
        .report-table-wrapper { background: #0B0F19; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
        .report-table { width: 100%; border-collapse: collapse; text-align: left; }
        .report-table th { padding: 18px 24px; background: rgba(0,0,0,0.4); color: #94A3B8; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .report-table td { padding: 16px 24px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 0.9rem; color: #E2E8F0; }
        .report-table tbody tr:hover { background: rgba(255,255,255,0.02); }

        .badge-tag { background: rgba(245,124,0,0.12); color: #FDBA74; border: 1px solid rgba(245,124,0,0.25); padding: 4px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 600; display: inline-block; }

        @media (max-width: 1024px) {
          .admin-main-content { margin-left: 0; padding: 16px; padding-bottom: 90px; width: 100%; }
          .stats-section { grid-template-columns: 1fr; }
          .filters-panel { flex-direction: column; }
          .filter-input, .filter-select { width: 100%; }
        }
      `}</style>

      <main className="admin-main-content">
        {/* CABEÇALHO */}
        <div className="report-header">
          <div className="report-title">
            <h1>📑 Central de Inteligência de Alunos</h1>
            <p>Relatório gerencial consolidado de desempenho, pontuação em XP e engajamento institucional.</p>
          </div>
          <div className="export-actions">
            <button className="btn-export pdf" onClick={exportToPDF}>
              📄 Baixar PDF Executivo
            </button>
            <button className="btn-export excel" onClick={exportToExcel}>
              📊 Baixar Planilha Excel
            </button>
          </div>
        </div>

        {/* 1. CARDS DE KPI */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <span className="kpi-title">Alunos Filtrados</span>
            <span className="kpi-value">{totalStudents}</span>
          </div>

          <div className="kpi-card green">
            <span className="kpi-title">Cursos Concluídos (Total)</span>
            <span className="kpi-value" style={{ color: '#4ADE80' }}>{totalConcluded}</span>
          </div>

          <div className="kpi-card blue">
            <span className="kpi-title">XP Total Acumulado</span>
            <span className="kpi-value" style={{ color: '#38BDF8' }}>{totalXP.toLocaleString('pt-BR')}</span>
          </div>

          <div className="kpi-card purple">
            <span className="kpi-title">Média de XP por Aluno</span>
            <span className="kpi-value" style={{ color: '#C084FC' }}>{avgXP.toLocaleString('pt-BR')}</span>
          </div>
        </div>

        {/* 2. ESTATÍSTICAS E DISTRIBUIÇÃO VISUAL */}
        <div className="stats-section">
          <div className="stats-box">
            <h3>📊 Participação por Tipo de Unidade</h3>
            <div className="unit-bars">
              <div className="unit-bar-row">
                <span style={{ width: '90px', fontWeight: 600 }}>Matriz</span>
                <div className="unit-bar-bg">
                  <div className="unit-bar-fill" style={{ width: `${filteredUsers.length ? (countByUnit.matriz / filteredUsers.length) * 100 : 0}%` }}></div>
                </div>
                <span style={{ fontWeight: 700, color: '#FFF' }}>{countByUnit.matriz} aluno(s)</span>
              </div>

              <div className="unit-bar-row">
                <span style={{ width: '90px', fontWeight: 600 }}>Franquias</span>
                <div className="unit-bar-bg">
                  <div className="unit-bar-fill franquia" style={{ width: `${filteredUsers.length ? (countByUnit.franquia / filteredUsers.length) * 100 : 0}%` }}></div>
                </div>
                <span style={{ fontWeight: 700, color: '#FFF' }}>{countByUnit.franquia} aluno(s)</span>
              </div>

              <div className="unit-bar-row">
                <span style={{ width: '90px', fontWeight: 600 }}>PEVs</span>
                <div className="unit-bar-bg">
                  <div className="unit-bar-fill pev" style={{ width: `${filteredUsers.length ? (countByUnit.pev / filteredUsers.length) * 100 : 0}%` }}></div>
                </div>
                <span style={{ fontWeight: 700, color: '#FFF' }}>{countByUnit.pev} aluno(s)</span>
              </div>
            </div>
          </div>

          <div className="stats-box" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3 style={{ marginBottom: '10px' }}>💡 Dica Gerencial</h3>
            <p style={{ color: '#94A3B8', fontSize: '0.88rem', lineHeight: '1.6', margin: 0 }}>
              Utilize o campo de busca por descrição da tag para extrair relatórios cirúrgicos de cidades ou unidades específicas (ex: <strong style={{ color: '#E2E8F0' }}>Belo Horizonte</strong>).
            </p>
          </div>
        </div>

        {/* 3. PAINEL DE FILTROS AVANÇADOS (COM BUSCA LIVRE POR TAG) */}
        <div className="filters-panel">
          <input 
            type="text" 
            placeholder="Pesquisar por nome ou e-mail do aluno..." 
            className="filter-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select 
            className="filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">Todas as Unidades (Tipos)</option>
            <option value="matriz">Matriz</option>
            <option value="franquia">Franquia</option>
            <option value="pev">PEV</option>
          </select>

          {/* BUSCA LIVRE DA TAG POR DESCRIÇÃO */}
          <input 
            type="text" 
            placeholder="Filtrar tag por descrição (ex: cidade)..." 
            className="filter-input"
            style={{ flex: 1, minWidth: '220px' }}
            value={tagSearchTerm}
            onChange={(e) => setTagSearchTerm(e.target.value)}
          />
        </div>

        {/* 4. TABELA EXECUTIVA DO RELATÓRIO */}
        <div className="report-table-wrapper">
          <table className="report-table">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Unidade / Franquia</th>
                <th>Patente / Nível</th>
                <th>Cursos Concluídos</th>
                <th>XP Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '50px', color: '#94A3B8' }}>Compilando dados analíticos...</td></tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#FFFFFF', fontSize: '0.95rem' }}>{user.full_name || 'Sem nome'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{user.email}</div>
                    </td>
                    <td>
                      {user.profile_tags && user.profile_tags.length > 0 ? (
                        user.profile_tags.map((pt, idx) => (
                          <span key={idx} className="badge-tag">
                            {pt.tags?.name} {pt.tags?.type ? `(${pt.tags.type})` : ''}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: '#64748B', fontSize: '0.85rem' }}>Geral / Sem Unidade</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#F57C00' }}>{user.patent || 'Iniciante'}</div>
                      <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Nível {user.level || 1}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#4ADE80' }}>
                        {user.completedCoursesCount || 0} concluído(s)
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38BDF8', fontSize: '0.95rem' }}>
                        {user.total_xp ? user.total_xp.toLocaleString('pt-BR') : 0} XP
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '50px', color: '#94A3B8' }}>Nenhum registro encontrado para os critérios informados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default AdminUserReports;