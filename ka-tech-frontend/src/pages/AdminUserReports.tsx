import { useEffect, useMemo, useState } from "react";
import { Award, BarChart3, Building2, CheckCircle2, FileDown, FileSpreadsheet, Search, Tag as TagIcon, Users, Zap } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import SEO from "../components/SEO";
import { Button, EmptyState, PageHeader, Select, Skeleton, useToast } from "../components/ui";

interface ReportUser {
  id: string;
  full_name: string;
  email?: string;
  role: string;
  created_at: string;
  total_xp: number;
  level: number;
  patent: string;
  profile_tags?: { tags: { id: string; name: string; type: string } }[];
  completedLessons?: number;
}

const UNIT_OPTIONS = [
  { value: "all", label: "Todas as unidades" },
  { value: "matriz", label: "Matriz" },
  { value: "franquia", label: "Franquia" },
  { value: "pev", label: "PEV" },
];

const UNITS: { key: "matriz" | "franquia" | "pev"; label: string; tone: string }[] = [
  { key: "matriz", label: "Matriz", tone: "var(--color-primary)" },
  { key: "franquia", label: "Franquias", tone: "var(--color-info)" },
  { key: "pev", label: "PEVs", tone: "var(--color-success)" },
];

const isStaffRole = (role: string) => ["admin", "teacher", "professor"].includes((role || "").toLowerCase());
const tagNames = (u: ReportUser) => u.profile_tags?.map((pt) => pt.tags?.name).filter(Boolean).join(", ") || "";
const hasUnit = (u: ReportUser, type: string) => !!u.profile_tags?.some((pt) => (pt.tags?.type || "").toLowerCase() === type);

/** Relatório dos alunos por unidade, com exportação para Excel e PDF. */
export default function AdminUserReports() {
  const toast = useToast();
  const [users, setUsers] = useState<ReportUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [tagSearchTerm, setTagSearchTerm] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [profilesRes, profileTagsRes, progressRes] = await Promise.all([
          supabase.from("admin_users_view").select("*").order("created_at", { ascending: false }),
          supabase.from("profile_tags").select("profile_id, tags(id, name, type)"),
          supabase.from("user_progress").select("user_id, is_completed").eq("is_completed", true),
        ]);
        if (profilesRes.error) throw profilesRes.error;

        const completed = new Map<string, number>();
        for (const p of progressRes.data || []) completed.set(p.user_id, (completed.get(p.user_id) || 0) + 1);

        setUsers((profilesRes.data || []).map((user: any) => ({
          ...user,
          profile_tags: (profileTagsRes.data || []).filter((pt: any) => pt.profile_id === user.id),
          completedLessons: completed.get(user.id) || 0,
        })));
      } catch (error) {
        console.error("Erro ao gerar relatório:", error);
        toast.error("Não foi possível carregar o relatório. Tente recarregar a página.");
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const tagTerm = tagSearchTerm.trim().toLowerCase();
    return users.filter((u) => {
      const matchesSearch = !term || u.full_name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term);
      const matchesType = typeFilter === "all" || hasUnit(u, typeFilter);
      const matchesTag = !tagTerm || !!u.profile_tags?.some((pt) => pt.tags?.name?.toLowerCase().includes(tagTerm));
      return matchesSearch && matchesType && matchesTag;
    });
  }, [users, searchTerm, typeFilter, tagSearchTerm]);

  const students = filteredUsers.filter((u) => !isStaffRole(u.role));
  const totalXP = filteredUsers.reduce((acc, u) => acc + (u.total_xp || 0), 0);
  const totalCompleted = filteredUsers.reduce((acc, u) => acc + (u.completedLessons || 0), 0);
  const avgXP = students.length ? Math.round(totalXP / students.length) : 0;
  const countByUnit = Object.fromEntries(UNITS.map((u) => [u.key, filteredUsers.filter((x) => hasUnit(x, u.key)).length])) as Record<string, number>;

  const exportRows = () => filteredUsers.map((u) => ({
    Nome: u.full_name || "Sem nome",
    "E-mail": u.email || "",
    "Unidade / setor": tagNames(u) || "Sem unidade",
    Tipo: u.profile_tags?.map((pt) => pt.tags?.type).filter(Boolean).join(", ") || "",
    Patente: u.patent || "Iniciante",
    Nível: u.level || 1,
    "XP total": u.total_xp || 0,
    "Aulas concluídas": u.completedLessons || 0,
    Cadastro: new Date(u.created_at).toLocaleDateString("pt-BR"),
  }));

  const exportToExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(exportRows());
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Alunos");
    XLSX.writeFile(book, "Relatorio_Alunos_KA_Academy.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF("landscape");
    doc.setFontSize(16);
    doc.text("Relatório de alunos - KA Academy", 14, 15);
    doc.setFontSize(10);
    doc.text(`Emitido em ${new Date().toLocaleDateString("pt-BR")} | ${filteredUsers.length} registros`, 14, 22);
    const rows = exportRows();
    autoTable(doc, {
      head: [["Nome", "E-mail", "Unidade / setor", "Tipo", "Patente", "Nível", "XP total", "Aulas concluídas"]],
      body: rows.map((r) => [r.Nome, r["E-mail"], r["Unidade / setor"], r.Tipo, r.Patente, String(r.Nível), r["XP total"].toLocaleString("pt-BR"), String(r["Aulas concluídas"])]),
      startY: 28,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [109, 40, 217] },
    });
    doc.save("Relatorio_Alunos_KA_Academy.pdf");
  };

  return (
    <div className="ui-shell">
      <SEO title="Relatório de alunos" description="Desempenho dos alunos por unidade" />
      <Sidebar />
      <main className="ui-main">
        <div className="ui-main__inner">
          <PageHeader
            eyebrow="Gestão"
            title="Relatório de alunos"
            subtitle="Desempenho, XP e aulas concluídas por aluno e por unidade. Os filtros valem também para a exportação."
            actions={
              <>
                <Button variant="secondary" onClick={exportToPDF} disabled={loading || !filteredUsers.length} icon={<FileDown size={15} />}>PDF</Button>
                <Button variant="secondary" onClick={exportToExcel} disabled={loading || !filteredUsers.length} icon={<FileSpreadsheet size={15} />}>Excel</Button>
              </>
            }
          />

          <div className="adm-stats">
            <div className="ui-card adm-stat"><span className="adm-stat__icon"><Users size={18} /></span><div><strong>{students.length}</strong><span>alunos</span></div></div>
            <div className="ui-card adm-stat"><span className="adm-stat__icon" style={{ background: "var(--color-success-soft)", color: "var(--color-success-text)" }}><CheckCircle2 size={18} /></span><div><strong>{totalCompleted.toLocaleString("pt-BR")}</strong><span>aulas concluídas</span></div></div>
            <div className="ui-card adm-stat"><span className="adm-stat__icon"><Zap size={18} /></span><div><strong>{totalXP.toLocaleString("pt-BR")}</strong><span>XP somado</span></div></div>
            <div className="ui-card adm-stat"><span className="adm-stat__icon"><Award size={18} /></span><div><strong>{avgXP.toLocaleString("pt-BR")}</strong><span>XP médio por aluno</span></div></div>
          </div>

          <section className="ui-card ui-card--padded rep-units" aria-labelledby="rep-units-title">
            <h2 id="rep-units-title" className="ui-section__title"><Building2 size={18} /> Alunos por tipo de unidade</h2>
            <ul className="rep-units__list">
              {UNITS.map((u) => {
                const pct = filteredUsers.length ? Math.round((countByUnit[u.key] / filteredUsers.length) * 100) : 0;
                return (
                  <li key={u.key}>
                    <span className="rep-units__label">{u.label}</span>
                    <div className="ui-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${u.label}: ${pct}%`}>
                      <div className="ui-progress__fill" style={{ width: `${pct}%`, background: u.tone }} />
                    </div>
                    <span className="rep-units__value">{countByUnit[u.key]} <span className="ui-hint">({pct}%)</span></span>
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="adm-toolbar">
            <div className="ui-input-group">
              <Search size={16} />
              <input type="search" className="ui-input" placeholder="Buscar por nome ou e-mail" aria-label="Buscar alunos" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select aria-label="Filtrar por tipo de unidade" value={typeFilter} onChange={setTypeFilter} minWidth={190} options={UNIT_OPTIONS} />
            <div className="ui-input-group">
              <TagIcon size={16} />
              <input type="search" className="ui-input" placeholder="Unidade ou cidade (ex.: Belo Horizonte)" aria-label="Filtrar por unidade ou cidade" value={tagSearchTerm} onChange={(e) => setTagSearchTerm(e.target.value)} />
            </div>
            <span className="adm-filter-count">{filteredUsers.length} registro{filteredUsers.length === 1 ? "" : "s"}</span>
          </div>

          {loading ? (
            <div style={{ display: "grid", gap: 8 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={56} />)}</div>
          ) : filteredUsers.length === 0 ? (
            <EmptyState icon={<BarChart3 size={28} />} title="Nenhum aluno encontrado" description="Ajuste a busca ou os filtros." />
          ) : (
            <div className="ui-card adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr><th>Aluno</th><th>Unidade / setor</th><th>Patente</th><th>Aulas concluídas</th><th>XP</th></tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="adm-cell-text">
                          <strong>{u.full_name || "Sem nome"}</strong>
                          <span className="ui-hint">{u.email}</span>
                        </div>
                      </td>
                      <td data-label="Unidade">
                        {u.profile_tags?.length ? (
                          <div className="adm-chips">
                            {u.profile_tags.map((pt, i) => <span key={i} className="ui-badge ui-badge--neutral">{pt.tags?.name}</span>)}
                          </div>
                        ) : <span className="ui-hint">Sem unidade</span>}
                      </td>
                      <td data-label="Patente">
                        <div className="adm-cell-text">
                          <strong>{u.patent || "Iniciante"}</strong>
                          <span className="ui-hint">Nível {u.level || 1}</span>
                        </div>
                      </td>
                      <td data-label="Aulas concluídas">{(u.completedLessons || 0).toLocaleString("pt-BR")}</td>
                      <td data-label="XP"><strong className="rep-xp">{(u.total_xp || 0).toLocaleString("pt-BR")}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
