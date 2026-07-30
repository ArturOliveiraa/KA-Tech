import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Profile {
  id: string;
  full_name: string;
  email?: string; 
  role: string;
  avatar_url: string;
  created_at: string;
  total_xp: number;
  level: number;
  patent: string;
  profile_tags?: { tags: { id: string, name: string } }[]; 
}

interface Tag {
  id: string;
  name: string;
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('admin_users_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: profileTagsData } = await supabase
        .from('profile_tags')
        .select('profile_id, tags(id, name)');

      const { data: tagsData } = await supabase
        .from('tags')
        .select('*')
        .order('name', { ascending: true });

      if (tagsData) setAvailableTags(tagsData);

      if (profilesData) {
        const usersWithTags = profilesData.map(user => {
          const userTags = profileTagsData?.filter(pt => pt.profile_id === user.id) || [];
          return { ...user, profile_tags: userTags };
        });
        setUsers(usersWithTags as unknown as Profile[]);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do Supabase:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user: Profile) => {
    setEditingUser(user);
    setEditName(user.full_name || '');
    setEditRole((user.role || 'student').toLowerCase());
    setIsEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setEditingUser(null);
  };

  const handleSaveChanges = async () => {
    if (!editingUser) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: editName, 
          role: editRole
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      setUsers(users.map(u => u.id === editingUser.id ? { 
        ...u, 
        full_name: editName, 
        role: editRole
      } : u));

      handleCloseModal();
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (user.full_name && user.full_name.toLowerCase().includes(searchLower)) ||
      (user.email && user.email.toLowerCase().includes(searchLower));

    const userRole = (user.role || '').toLowerCase().trim();
    let matchesRole = true;
    if (roleFilter !== 'all') {
      const filterLower = roleFilter.toLowerCase();
      if (filterLower === 'student') {
        matchesRole = userRole === 'student' || userRole === 'aluno';
      } else if (filterLower === 'teacher') {
        matchesRole = userRole === 'teacher' || userRole === 'professor';
      } else if (filterLower === 'admin') {
        matchesRole = userRole === 'admin';
      }
    }

    const hasTag = user.profile_tags?.some(pt => pt.tags?.id === tagFilter);
    const matchesTag = tagFilter === 'all' || hasTag;

    return matchesSearch && matchesRole && matchesTag;
  });

  // EXPORTAÇÃO EXCEL COM TOTAL NO FINAL
  const exportToExcel = () => {
    const dataToExport = filteredUsers.map(user => ({
      Nome: user.full_name || 'Sem nome',
      Email: user.email || 'Sem e-mail',
      Cargo: user.role === 'admin' ? 'Administrador' : user.role === 'teacher' ? 'Professor' : 'Aluno',
      Patente: user.patent || 'Sem Patente',
      Nível: user.level || 1,
      'XP Total': user.total_xp || 0,
      'Data de Cadastro': formatDate(user.created_at)
    }));

    // Adiciona linha de total no final do array de dados
    dataToExport.push({
      Nome: `TOTAL DE REGISTROS: ${filteredUsers.length}`,
      Email: '',
      Cargo: '',
      Patente: '',
      Nível: '' as any,
      'XP Total': filteredUsers.reduce((acc, curr) => acc + (curr.total_xp || 0), 0),
      'Data de Cadastro': ''
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Usuários");
    XLSX.writeFile(workbook, "Relatorio_Usuarios_KATech.xlsx");
  };

  // EXPORTAÇÃO PDF COM TOTAL NO RODAPÉ DA TABELA
  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(16);
    doc.text("Relatório de Usuários - KA Tech", 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 22);

    const tableColumn = ["Nome", "E-mail", "Cargo", "Patente", "Nível", "XP Total", "Cadastro"];
    const tableRows = filteredUsers.map(user => [
      user.full_name || 'Sem nome',
      user.email || 'Sem e-mail',
      user.role === 'admin' ? 'Admin' : user.role === 'teacher' ? 'Professor' : 'Aluno',
      user.patent || 'Sem Patente',
      (user.level || 1).toString(),
      (user.total_xp || 0).toLocaleString('pt-BR'),
      formatDate(user.created_at)
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [255, 152, 0], textColor: [255, 255, 255] },
      // Adiciona a linha de totalizador ao final da tabela no PDF
      foot: [[
        `Total de Usuários Listados: ${filteredUsers.length}`, 
        '', 
        '', 
        '', 
        '', 
        `XP Total: ${filteredUsers.reduce((acc, curr) => acc + (curr.total_xp || 0), 0).toLocaleString('pt-BR')}`, 
        ''
      ]],
      footStyles: { fillColor: [17, 22, 37], textColor: [255, 255, 255], fontStyle: 'bold' }
    });

    doc.save("Relatorio_Usuarios_KATech.pdf");
  };

  const totalUsers = filteredUsers.length;
  const totalStudents = filteredUsers.filter(u => {
    const r = (u.role || '').toLowerCase().trim();
    return r === 'aluno' || r === 'student';
  }).length;
  const totalTeachers = filteredUsers.filter(u => {
    const r = (u.role || '').toLowerCase().trim();
    return r === 'teacher' || r === 'admin' || r === 'professor';
  }).length;

  const formatDate = (dateString: string) => {
    if (!dateString) return '--/--/----';
    return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="admin-layout">
      <Sidebar />

      <style>{`
        .admin-layout { display: flex; min-height: 100vh; background-color: #060913; font-family: 'Segoe UI', Roboto, sans-serif; }
        .admin-main-content { flex: 1; margin-left: 270px; padding: 40px; color: #E2E8F0; width: calc(100% - 270px); box-sizing: border-box; }
        
        .admin-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 30px; 
          flex-wrap: wrap;
          gap: 20px;
        }
        .header-text h1 { font-size: 2.2rem; font-weight: 800; margin: 0 0 8px 0; color: #FFFFFF; }
        .header-text p { color: #8BA0B8; margin: 0; font-size: 1rem; }

        .action-buttons { display: flex; gap: 12px; flex-wrap: wrap; }
        
        .btn-export {
          background: transparent;
          padding: 0 16px;
          height: 46px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-pdf { color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.4); }
        .btn-pdf:hover { color: #FFF; border-color: #EF4444; background: rgba(239, 68, 68, 0.2); box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2); }

        .btn-excel { color: #4ADE80; border: 1px solid rgba(74, 222, 128, 0.4); }
        .btn-excel:hover { color: #FFF; border-color: #4ADE80; background: rgba(74, 222, 128, 0.2); box-shadow: 0 4px 15px rgba(74, 222, 128, 0.2); }

        /* CARDS */
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 20px; display: flex; align-items: center; box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2); transition: transform 0.3s ease; }
        .metric-card:hover { transform: translateY(-3px); }
        .metric-icon-wrapper { width: 50px; height: 50px; border-radius: 12px; background: rgba(255, 255, 255, 0.03); display: flex; align-items: center; justify-content: center; margin-right: 16px; border: 1px solid rgba(255,255,255,0.05); flex-shrink: 0; }
        .metric-card.orange .metric-icon-wrapper { background: rgba(255, 152, 0, 0.1); border-color: rgba(255, 152, 0, 0.2); }
        .metric-info { display: flex; flex-direction: column; overflow: hidden; }
        .metric-title { color: #8BA0B8; font-size: 0.75rem; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
        .metric-value { font-size: 1.8rem; font-weight: 800; color: #FFFFFF; line-height: 1; }
        .metric-card.orange .metric-value { color: #FF9800; }

        /* TOOLBAR */
        .toolbar { display: flex; align-items: center; background: rgba(255, 255, 255, 0.02); padding: 16px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.05); margin-bottom: 24px; gap: 16px; flex-wrap: wrap; backdrop-filter: blur(10px); }
        .search-filters { display: flex; gap: 16px; flex: 1; align-items: center; flex-wrap: wrap; width: 100%; }
        .search-input-wrapper { position: relative; flex: 1; min-width: 220px; width: 100%; }
        .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #8BA0B8; width: 18px; height: 18px; }
        .admin-input, .admin-select { box-sizing: border-box; height: 46px; background: #0B0E17; border: 1px solid rgba(255,255,255,0.1); color: #E2E8F0; border-radius: 10px; font-size: 0.95rem; outline: none; transition: all 0.3s; width: 100%; }
        .admin-input { padding: 12px 15px 12px 40px; }
        .admin-select { padding: 0 15px; cursor: pointer; }
        .admin-input:focus, .admin-select:focus { border-color: #FF9800; box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.15); }

        /* TABELA RESPONSIVA */
        .table-container { background: rgba(255, 255, 255, 0.02); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.05); overflow-x: auto; width: 100%; }
        .admin-table { width: 100%; border-collapse: collapse; text-align: left; min-width: 750px; }
        .admin-table th { padding: 16px 20px; color: #8BA0B8; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); background: rgba(0, 0, 0, 0.2); }
        .admin-table td { padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.03); font-size: 0.9rem; vertical-align: middle; }
        .admin-table tbody tr:hover { background: rgba(255, 255, 255, 0.03); }
        
        .user-info { display: flex; align-items: center; gap: 12px; }
        .user-avatar { width: 38px; height: 38px; border-radius: 10px; background: #2C3B4C; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #FFF; object-fit: cover; border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0; }

        .role-tag { padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
        .role-admin { background: rgba(239, 68, 68, 0.1); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.2); }
        .role-teacher, .role-professor { background: rgba(139, 92, 246, 0.1); color: #A78BFA; border: 1px solid rgba(139, 92, 246, 0.2); }
        .role-student, .role-aluno { background: rgba(34, 197, 94, 0.1); color: #4ADE80; border: 1px solid rgba(34, 197, 94, 0.2); }

        .tag-badge { background: rgba(255, 255, 255, 0.1); color: #E2E8F0; padding: 3px 6px; border-radius: 4px; font-size: 0.7rem; margin-right: 4px; display: inline-block; margin-bottom: 2px; }

        .action-btn { background: none; border: none; color: #8BA0B8; cursor: pointer; font-size: 1rem; padding: 6px; border-radius: 8px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .action-btn:hover { color: #FF9800; background: rgba(255, 152, 0, 0.1); }

        /* MODAL DE EDIÇÃO */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(5px); display: flex; justify-content: center; align-items: center; z-index: 2000; padding: 15px; }
        .modal-content { background: #111625; width: 100%; max-width: 420px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 40px rgba(0,0,0,0.5); padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .modal-title { font-size: 1.3rem; font-weight: 700; color: #FFF; margin: 0; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 12px; }
        .modal-group { display: flex; flex-direction: column; gap: 6px; }
        .modal-label { color: #8BA0B8; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; }
        .btn-cancel { background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #8BA0B8; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .btn-cancel:hover { background: rgba(255,255,255,0.05); color: #FFF; }
        .btn-save { background: #FF9800; border: none; color: #FFF; padding: 8px 20px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .btn-save:hover { background: #F57C00; }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

        @media (max-width: 1024px) { 
          .admin-main-content { margin-left: 0; padding: 16px; padding-bottom: 90px; width: 100%; } 
          .admin-header { flex-direction: column; align-items: flex-start; gap: 12px; margin-bottom: 24px; }
          .header-text h1 { font-size: 1.7rem; }
          .action-buttons { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .btn-export { width: 100%; justify-content: center; }
          .metrics-grid { grid-template-columns: 1fr; gap: 12px; margin-bottom: 20px; } 
          .toolbar { padding: 12px; gap: 10px; }
          .search-filters { flex-direction: column; gap: 10px; }
          .search-input-wrapper, .admin-select { width: 100%; min-width: 100%; }
        }
      `}</style>

      <main className="admin-main-content">
        <div className="admin-header">
          <div className="header-text">
            <h1>Gestão de Usuários</h1>
            <p>Gerencie alunos, professores e administradores da plataforma.</p>
          </div>
          <div className="action-buttons">
            <button className="btn-export btn-pdf" onClick={exportToPDF} title="Exportar para PDF">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              PDF
            </button>
            <button className="btn-export btn-excel" onClick={exportToExcel} title="Exportar para Excel">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M8 13h2v4H8z"></path><path d="M14 13h2v4h-2z"></path></svg>
              Excel
            </button>
          </div>
        </div>

        {/* CARDS DE RESUMO */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon-wrapper">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8BA0B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <div className="metric-info">
              <span className="metric-title">Total Filtrado</span>
              <span className="metric-value">{totalUsers}</span>
            </div>
          </div>
          
          <div className="metric-card orange">
            <div className="metric-icon-wrapper">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF9800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
            </div>
            <div className="metric-info">
              <span className="metric-title">Alunos Matriculados</span>
              <span className="metric-value">{totalStudents}</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon-wrapper">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8BA0B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </div>
            <div className="metric-info">
              <span className="metric-title">Professores & Admins</span>
              <span className="metric-value">{totalTeachers}</span>
            </div>
          </div>
        </div>

        {/* BARRA DE FERRAMENTAS COM FILTROS */}
        <div className="toolbar">
          <div className="search-filters">
            <div className="search-input-wrapper">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input 
                type="text" 
                placeholder="Buscar por nome ou e-mail..." 
                className="admin-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <select 
              className="admin-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">Todos os Cargos</option>
              <option value="student">Alunos</option>
              <option value="teacher">Professores</option>
              <option value="admin">Administradores</option>
            </select>

            <select 
              className="admin-select"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
            >
              <option value="all">Todas as Tags/Franquias</option>
              {availableTags.map(tag => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* TABELA DE USUÁRIOS */}
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Cargo</th>
                <th>Franquia / Tags</th>
                <th>Patente / Nível</th>
                <th>XP Total</th>
                <th>Cadastrado em</th>
                <th style={{ textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#8BA0B8' }}>Carregando base de dados...</td></tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const role = (user.role || 'student').toLowerCase();
                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="user-info">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.full_name} className="user-avatar" />
                          ) : (
                            <div className="user-avatar">
                              {user.full_name ? user.full_name.charAt(0).toUpperCase() : '?'}
                            </div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <span style={{ fontWeight: 600, color: '#FFFFFF', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.full_name || 'Usuário sem nome'}</span>
                            {user.email && <span style={{ fontSize: '0.8rem', color: '#8BA0B8', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.email}</span>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`role-tag role-${role}`}>
                          {role === 'admin' ? 'Admin' : role === 'teacher' || role === 'professor' ? 'Professor' : 'Aluno'}
                        </span>
                      </td>
                      <td>
                        {user.profile_tags && user.profile_tags.length > 0 ? (
                          user.profile_tags.map((pt, idx) => (
                            <span key={idx} className="tag-badge">{pt.tags?.name}</span>
                          ))
                        ) : (
                          <span style={{ color: '#8BA0B8', fontSize: '0.85rem' }}>-</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600, color: '#FF9800' }}>{user.patent || 'Sem Patente'}</span>
                          <span style={{ fontSize: '0.8rem', color: '#8BA0B8' }}>Lvl {user.level || 1}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '1rem', color: '#E2E8F0' }}>
                        {user.total_xp ? user.total_xp.toLocaleString('pt-BR') : 0}
                      </td>
                      <td style={{ color: '#8BA0B8' }}>{formatDate(user.created_at)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="action-btn" title="Editar Usuário" onClick={() => handleEditClick(user)}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#8BA0B8' }}>Nenhum usuário encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* MODAL DE EDIÇÃO */}
      {isEditModalOpen && editingUser && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Editar Usuário</h2>
            
            <div className="modal-group">
              <label className="modal-label">Nome Completo</label>
              <input 
                type="text" 
                className="admin-input" 
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div className="modal-group">
              <label className="modal-label">Cargo (Permissão)</label>
              <select 
                className="admin-select"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
              >
                <option value="student">Aluno</option>
                <option value="teacher">Professor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={handleCloseModal} disabled={isSaving}>
                Cancelar
              </button>
              <button className="btn-save" onClick={handleSaveChanges} disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminUsers;