import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../supabaseClient";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GenerateQuizButton } from "./GenerateQuizButton";
import { QuizEditor } from "./QuizEditor";

// --- TYPES & INTERFACES ---
interface Lesson {
  id: number;
  title: string;
  videoUrl: string;
  content: string;
  order: number;
  duration?: number;
  created_at?: string;
  course_id: number;
}

interface ValidationErrors {
  title?: string;
  videoUrl?: string;
  content?: string;
}

const YouTubeEngine = {
  extractId: (url: string | null | undefined) => {
    if (!url || typeof url !== 'string') return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([^&?/\s]{11})/);
    return match ? match[1] : null;
  },
  getHighResThumb: (url: string | null | undefined) => {
    const id = YouTubeEngine.extractId(url);
    return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null;
  }
};

export default function ManageLessons({ courseId, courseTitle, onBack }: any) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  const [formData, setFormData] = useState<Partial<Lesson>>({
    id: 0, title: "", videoUrl: "", content: "", order: 1
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const fetchLessons = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("course_id", Number(courseId)) // Garante que courseId seja número
      .order("order", { ascending: true });

    if (!error && data) {
      // Mapeia video_url do banco para videoUrl do componente
      setLessons(data.map(l => ({ ...l, videoUrl: l.video_url || "" })));
    }
    setLoading(false);
  }, [courseId]);

  useEffect(() => { fetchLessons(); }, [fetchLessons]);

  const handleExtractIntelligence = async () => {
    const videoId = YouTubeEngine.extractId(formData.videoUrl);
    if (!videoId) return alert("Insira uma URL válida do YouTube primeiro.");

    setIsExtracting(true);
    try {
      const { data } = await axios.post("/api/youtube-transcript", { videoId });
      const rawTranscript = data.transcript;

      const genAI = new GoogleGenerativeAI("SUA_API_KEY"); // Lembre-se de usar variáveis de ambiente
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const prompt = `Transforme esta transcrição bruta de aula em um conteúdo estruturado, técnico e rico para uma base de conhecimento. Remova vícios de linguagem e foque nos conceitos principais: ${rawTranscript}`;

      const result = await model.generateContent(prompt);
      const refinedText = result.response.text();

      setFormData(prev => ({ ...prev, content: refinedText }));
      setErrors(prev => ({ ...prev, content: undefined }));
    } catch (err) {
      console.error(err);
      alert("Falha ao capturar inteligência. Verifique se o vídeo possui legendas.");
    } finally {
      setIsExtracting(false);
    }
  };

  const validate = () => {
    const newErrors: ValidationErrors = {};
    if (!formData.title || formData.title.length < 5) newErrors.title = "Título muito curto";
    if (!formData.videoUrl || !YouTubeEngine.extractId(formData.videoUrl)) newErrors.videoUrl = "URL do YouTube inválida";
    if (!formData.content || formData.content.length < 20) newErrors.content = "Conteúdo insuficiente";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      // PAYLOAD CORRIGIDO: Forçando tipos e mapeando para snake_case do banco
      const payload = {
        title: formData.title,
        video_url: formData.videoUrl,
        content: formData.content,
        order: Number(formData.order),
        course_id: Number(courseId),
      };

      const isUpdate = formData.id && formData.id !== 0;

      const { error } = isUpdate
        ? await supabase.from("lessons").update(payload).eq("id", Number(formData.id))
        : await supabase.from("lessons").insert([payload]);

      if (error) {
        console.error("Erro detalhado do Supabase:", error);
        throw error;
      }

      setIsPanelOpen(false);
      fetchLessons();
    } catch (err: any) {
      alert(`Erro de sincronização: ${err.message || 'Verifique o console'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredLessons = useMemo(() => {
    return lessons.filter(l => l.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [lessons, searchQuery]);

  const totalDuration = useMemo(() => {
    return lessons.reduce((acc, curr) => acc + (curr.duration || 0), 0).toFixed(1);
  }, [lessons]);

  return (
    <div className="ka-new-world">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        :root {
          --accent: #8b5cf6;
          --accent-light: #c4b5fd;
          --bg-deep: #020617;
          --surface: rgba(15, 23, 42, 0.5);
          --border: rgba(255, 255, 255, 0.08);
          --text-primary: #f8fafc;
          --text-secondary: #94a3b8;
        }
        .ka-new-world {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: var(--bg-deep);
          color: var(--text-primary);
          min-height: 100vh;
          padding: 40px;
          background-image: 
            radial-gradient(circle at 50% -20%, rgba(139, 92, 246, 0.15), transparent 50%),
            radial-gradient(circle at 0% 100%, rgba(59, 130, 246, 0.05), transparent 40%);
        }
        .ka-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 60px; }
        .btn-back-minimal { background: none; border: none; color: var(--text-secondary); font-weight: 700; font-size: 0.75rem; letter-spacing: 1px; cursor: pointer; transition: 0.3s; }
        .btn-back-minimal:hover { color: var(--accent); transform: translateX(-5px); }
        .ka-title { font-size: 2.8rem; font-weight: 800; background: linear-gradient(180deg, #fff 30%, #64748b 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .ka-stats-bar { display: flex; gap: 15px; margin-top: 15px; }
        .ka-stat-chip { background: var(--surface); border: 1px solid var(--border); padding: 6px 14px; border-radius: 10px; font-size: 0.7rem; font-weight: 700; color: var(--text-secondary); }
        .ka-action-grid { display: flex; gap: 20px; margin-bottom: 50px; }
        .ka-search-field { width: 100%; background: var(--surface); border: 1px solid var(--border); padding: 18px 25px; border-radius: 20px; color: #fff; outline: none; transition: 0.4s; }
        .ka-search-field:focus { border-color: var(--accent); box-shadow: 0 0 30px rgba(139, 92, 246, 0.2); }
        .btn-mission-ultra { background: var(--accent); color: white; border: none; padding: 18px 35px; border-radius: 20px; font-weight: 800; cursor: pointer; transition: 0.4s; }
        .ka-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 32px; }
        .ka-card { background: var(--surface); border: 1px solid var(--border); border-radius: 32px; overflow: hidden; transition: 0.5s; backdrop-filter: blur(20px); }
        .ka-card:hover { transform: translateY(-12px); border-color: var(--accent); }
        .ka-card-thumb { height: 200px; background: #000; overflow: hidden; }
        .ka-card-thumb img { width: 100%; height: 100%; object-fit: cover; opacity: 0.7; }
        .ka-card-content { padding: 30px; }
        .ka-card-footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .ka-drawer { position: fixed; top: 0; right: -600px; width: 550px; height: 100vh; background: #070a13; z-index: 5000; padding: 60px; transition: 0.6s cubic-bezier(0.16, 1, 0.3, 1); border-left: 1px solid var(--border); overflow-y: auto; }
        .ka-drawer.open { right: 0; box-shadow: -100px 0 150px rgba(0,0,0,0.8); }
        .ka-overlay { position: fixed; inset: 0; background: rgba(2, 6, 23, 0.8); backdrop-filter: blur(10px); z-index: 4500; display: none; opacity: 0; transition: 0.3s; }
        .ka-overlay.active { display: block; opacity: 1; }
        .ka-form-label { display: block; font-size: 0.75rem; font-weight: 800; color: var(--accent); text-transform: uppercase; margin-bottom: 12px; }
        .ka-input { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 18px; border-radius: 16px; color: #fff; margin-bottom: 5px; }
        .ka-input.error { border-color: #ef4444; }
        .btn-capture-ai { background: rgba(139, 92, 246, 0.1); border: 1px solid var(--accent); color: var(--accent); padding: 8px 16px; border-radius: 12px; font-weight: 800; cursor: pointer; transition: 0.3s; }
        .ka-btn-save { width: 100%; background: var(--accent); color: #fff; border: none; padding: 22px; border-radius: 20px; font-weight: 800; cursor: pointer; margin-top: 30px; }
      `}</style>

      <header className="ka-header">
        <div>
          <button onClick={onBack} className="btn-back-minimal">&larr; VOLTAR AO DASHBOARD</button>
          <h1 className="ka-title">{courseTitle}</h1>
          <div className="ka-stats-bar">
            <div className="ka-stat-chip">⚡ {lessons.length} MISSÕES</div>
            <div className="ka-stat-chip">⏱ {totalDuration} MINUTOS</div>
            <div className="ka-stat-chip">💎 XP: {lessons.length * 120}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700 }}>Artur de Oliveira</div>
          <div style={{ color: 'var(--accent)', fontSize: '0.7rem', fontWeight: 800 }}>NÍVEL 19 • ARQUITETO DE CONTEÚDO</div>
        </div>
      </header>

      <div className="ka-action-grid">
        <input className="ka-search-field" placeholder="Qual missão deseja auditar?" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        <button className="btn-mission-ultra" onClick={() => { setFormData({ id: 0, title: "", videoUrl: "", content: "", order: lessons.length + 1 }); setErrors({}); setIsPanelOpen(true); }}>
          + NOVA MISSÃO
        </button>
      </div>

      <div className="ka-grid">
        {filteredLessons.map((l) => (
          <div key={l.id} className="ka-card">
            <div className="ka-card-thumb">
              <img src={YouTubeEngine.getHighResThumb(l.videoUrl) || ''} alt="Thumb" />
            </div>
            <div className="ka-card-content">
              <h3 className="ka-card-title">{l.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{l.content?.substring(0, 80)}...</p>
              <div className="ka-card-footer">
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: l.content ? '#10b981' : '#ef4444' }}>
                  {l.content ? '● IA READY' : '○ IA OFFLINE'}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <GenerateQuizButton
                    courseId={courseId}
                    lessonId={l.id}
                    title={l.title} // Adicione esta linha
                    description={l.content || ""} // Adicione esta linha
                    onQuizGenerated={(data: any) => setActiveQuiz(data)}
                  />
                  <button onClick={() => { setFormData({ ...l }); setErrors({}); setIsPanelOpen(true); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: '#fff', padding: '8px 15px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.7rem' }}>EDITAR</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={`ka-overlay ${isPanelOpen ? 'active' : ''}`} onClick={() => setIsPanelOpen(false)} />
      <div className={`ka-drawer ${isPanelOpen ? 'open' : ''}`}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{formData.id ? "EDITAR" : "NOVA"} MISSÃO</h2>
        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '20px' }}>
            <label className="ka-form-label">Título</label>
            <input className={`ka-input ${errors.title ? 'error' : ''}`} value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label className="ka-form-label">URL YouTube</label>
            <input className={`ka-input ${errors.videoUrl ? 'error' : ''}`} value={formData.videoUrl} onChange={e => setFormData({ ...formData, videoUrl: e.target.value })} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label className="ka-form-label">Conteúdo Base (IA)</label>
              <button type="button" className="btn-capture-ai" onClick={handleExtractIntelligence} disabled={isExtracting}>
                {isExtracting ? '...' : '⚡ CAPTURAR'}
              </button>
            </div>
            <textarea className={`ka-input ${errors.content ? 'error' : ''}`} style={{ height: '200px', resize: 'none' }} value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label className="ka-form-label">Ordem</label>
              <input type="number" className="ka-input" value={formData.order} onChange={e => setFormData({ ...formData, order: Number(e.target.value) })} />
            </div>
            <div>
            </div>
          </div>
          <button type="submit" className="ka-btn-save" disabled={isSaving}>
            {isSaving ? "SINCRONIZANDO..." : "SALVAR MISSÃO"}
          </button>
        </form>
      </div>

      {activeQuiz && (
        <QuizEditor initialData={activeQuiz} courseId={courseId} lessonId={activeQuiz.lessonId} onClose={() => setActiveQuiz(null)} onSaved={() => { setActiveQuiz(null); fetchLessons(); }} />
      )}
    </div>
  );
}