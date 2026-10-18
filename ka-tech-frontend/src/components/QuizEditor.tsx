import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Trash2, Plus, Save, CheckCircle2, X, XCircle } from "lucide-react";

interface Option { content: string; is_correct: boolean; }
interface Question { content: string; options: Option[]; }
interface QuizData { quiz_title: string; description: string; questions: Question[]; }

export function QuizEditor({ courseId, lessonId, initialData, onClose, onSaved }: any) {
  const [quiz, setQuiz] = useState<QuizData>({ quiz_title: "", description: "", questions: [] });
  const [saving, setSaving] = useState(false);

  // Gera o slug para a URL amigável
  const createSlug = (text: string) => 
    text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, "-").trim();

  // Função de redimensionamento com buffer para não cortar o final das letras
  const handleResize = (target: HTMLTextAreaElement) => {
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight + 4}px`;
  };

  const autoResizeAll = () => {
    setTimeout(() => {
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach(ta => handleResize(ta as HTMLTextAreaElement));
    }, 100);
  };

  useEffect(() => {
    if (initialData) {
      const regex = new RegExp('`{3}json|`{3}', 'g');
      let parsed = typeof initialData === 'string' ? JSON.parse(initialData.replace(regex, '')) : initialData;
      setQuiz({
        quiz_title: parsed.quiz_title || "Novo Quiz IA",
        description: parsed.description || "",
        questions: parsed.questions || []
      });
      autoResizeAll();
    }
  }, [initialData]);

  const handleSaveToDb = async () => {
    if (quiz.questions.length === 0) return alert("O quiz precisa de perguntas.");
    setSaving(true);
    try {
      const slug = createSlug(quiz.quiz_title);
      const finalUrl = `${window.location.origin}/quizzes/${slug}`; // Gera a URL completa
      
      // SALVANDO NO SUPABASE (Incluindo Slug e a URL completa)
      const { data: quizEntry, error: qError } = await supabase.from("quizzes").insert({
        course_id: courseId || null,
        lesson_id: lessonId || null,
        title: quiz.quiz_title,
        description: quiz.description,
        slug: slug,
        url: finalUrl // <--- Salvando a URL aqui
      }).select().single();

      if (qError) throw qError;

      const questionsPayload = quiz.questions.map(q => ({ quiz_id: quizEntry.id, content: q.content }));
      const { data: insQ, error: iqError } = await supabase.from("questions").insert(questionsPayload).select();
      if (iqError) throw iqError;

      const optionsPayload: any[] = [];
      quiz.questions.forEach((q, i) => {
        q.options.forEach(opt => optionsPayload.push({ question_id: insQ[i].id, content: opt.content, is_correct: opt.is_correct }));
      });
      await supabase.from("options").insert(optionsPayload);

      alert(`✅ Publicado!\n\nLink salvo: ${finalUrl}`);
      
      onSaved();
      onClose();
    } catch (e: any) { alert(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="qe-wrapper">
      <div className="qe-container">
        <header className="qe-header">
          <div className="qe-title-area">
            <h1>Editor de Quiz IA</h1>
            <p>Revise as perguntas e publique</p>
          </div>
          <div className="qe-actions">
            <button onClick={handleSaveToDb} disabled={saving} className="btn-publish">
              <Save size={18} /> <span>{saving ? "Salvando..." : "Publicar"}</span>
            </button>
            <button onClick={onClose} className="btn-close"><X size={22} /></button>
          </div>
        </header>

        <div className="qe-scroll-body">
          <div className="qe-section">
            <label className="qe-label">TÍTULO DO EXAME</label>
            <input 
              className="qe-main-input"
              value={quiz.quiz_title} 
              onChange={e => setQuiz({...quiz, quiz_title: e.target.value})} 
            />
          </div>

          {quiz.questions.map((q, qIdx) => (
            <div key={qIdx} className="qe-card">
              <div className="qe-card-header">
                <span>QUESTÃO {qIdx + 1}</span>
                <button className="btn-del-q" onClick={() => setQuiz({...quiz, questions: quiz.questions.filter((_, i) => i !== qIdx)})}>
                  <Trash2 size={18}/>
                </button>
              </div>
              
              <textarea 
                className="qe-question-textarea"
                value={q.content} 
                onChange={e => {
                  const newQ = [...quiz.questions];
                  newQ[qIdx].content = e.target.value;
                  setQuiz({...quiz, questions: newQ});
                  handleResize(e.target);
                }}
              />

              <div className="qe-options-grid">
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} className={`qe-opt-box ${opt.is_correct ? 'is-correct' : ''}`}>
                    <CheckCircle2 
                        className="qe-check-icon"
                        size={20} 
                        onClick={() => {
                            const newQ = [...quiz.questions];
                            newQ[qIdx].options.forEach((o, i) => o.is_correct = i === oIdx);
                            setQuiz({...quiz, questions: newQ});
                        }}
                    />
                    
                    <textarea 
                      className="qe-opt-textarea"
                      value={opt.content} 
                      rows={1}
                      onChange={e => {
                        const newQ = [...quiz.questions];
                        newQ[qIdx].options[oIdx].content = e.target.value;
                        setQuiz({...quiz, questions: newQ});
                        handleResize(e.target);
                      }}
                    />

                    {q.options.length > 2 && (
                        <XCircle 
                          className="qe-del-icon"
                          size={18} 
                          onClick={() => {
                            const newQ = [...quiz.questions];
                            newQ[qIdx].options = newQ[qIdx].options.filter((_, i) => i !== oIdx);
                            setQuiz({...quiz, questions: newQ});
                          }} 
                        />
                    )}
                  </div>
                ))}
                
                <button className="btn-add-opt" onClick={() => {
                    const newQ = [...quiz.questions];
                    newQ[qIdx].options.push({ content: `Nova Opção`, is_correct: false });
                    setQuiz({...quiz, questions: newQ});
                    autoResizeAll();
                }}>+ Adicionar Alternativa</button>
              </div>
            </div>
          ))}
          
          <button className="btn-add-q" onClick={() => {
            setQuiz({...quiz, questions: [...quiz.questions, {content: "Nova Pergunta", options: [{content: "Opção 1", is_correct: true}, {content: "Opção 2", is_correct: false}]}]});
            autoResizeAll();
          }}>
            <Plus size={20}/> Adicionar Pergunta
          </button>
        </div>
      </div>

      <style>{`
        .qe-wrapper { position: fixed; inset: 0; background: var(--color-surface-1); z-index: 9999; display: flex; justify-content: center; padding: 20px; overflow: hidden; font-family: var(--font-sans); }
        .qe-container { background: var(--color-surface-1); width: 100%; max-width: 750px; border-radius: 24px; display: flex; flex-direction: column; border: 1px solid var(--color-border-strong); box-shadow: var(--shadow-md); }
        
        .qe-header { padding: 20px 24px; border-bottom: 1px solid var(--color-border-strong); display: flex; justify-content: space-between; align-items: center; }
        .qe-title-area h1 { font-size: 1.2rem; font-weight: 800; color: var(--color-text); margin: 0; }
        .qe-title-area p { font-size: 0.8rem; color: var(--color-text-subtle); margin: 0; }
        .qe-actions { display: flex; align-items: center; gap: 12px; }
        
        .btn-publish { background: var(--color-success); border: none; color: #fff; padding: 10px 18px; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.2s; }
        .btn-publish:hover { background: var(--color-success); transform: translateY(-1px); }
        .btn-close { background: var(--color-surface-3); border: none; color: var(--color-text-muted); padding: 8px; border-radius: 10px; cursor: pointer; transition: 0.2s; display: flex; }

        .qe-scroll-body { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 24px; }
        
        .qe-label { display: block; color: var(--color-text-muted); font-size: 0.7rem; font-weight: 800; margin-bottom: 10px; letter-spacing: 0.5px; }
        .qe-main-input { width: 100%; background: var(--color-surface-3); border: 1px solid var(--color-border-strong); padding: 14px 18px; border-radius: 14px; color: var(--color-text); font-size: 1rem; outline: none; }

        .qe-card { background: var(--color-surface-3); border-radius: 20px; padding: 20px; border: 1px solid var(--color-border-strong); }
        .qe-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .qe-card-header span { color: var(--color-primary-text); font-weight: 900; font-size: 0.75rem; letter-spacing: 1px; }
        .btn-del-q { background: var(--color-danger-soft); border: none; color: var(--color-danger-text); padding: 8px; border-radius: 8px; cursor: pointer; }

        .qe-question-textarea { width: 100%; background: var(--color-surface-1); border: 1px solid var(--color-border-strong); padding: 15px; border-radius: 14px; color: var(--color-text); min-height: 50px; resize: none; margin-bottom: 20px; font-family: inherit; font-size: 0.95rem; line-height: 1.5; outline: none; overflow: hidden; box-sizing: border-box; }

        .qe-options-grid { display: flex; flex-direction: column; gap: 10px; }
        
        .qe-opt-box { 
          display: flex; 
          align-items: flex-start; 
          gap: 6px; 
          background: var(--color-surface-1); 
          padding: 10px 12px; 
          border-radius: 14px; 
          border: 1px solid var(--color-border-strong); 
          transition: 0.2s; 
          width: 100%;
        }
        .qe-opt-box.is-correct { border-color: var(--color-success); background: var(--color-success-soft); }
        
        .qe-check-icon { color: #334155; cursor: pointer; flex-shrink: 0; margin-top: 4px; }
        .is-correct .qe-check-icon { color: var(--color-success-text); }
        
        /* FIX DO CORTE LATERAL (INICIO) E FINAL 👇 */
        .qe-opt-textarea { 
          flex: 1; 
          background: transparent; 
          border: none; 
          color: var(--color-text-secondary); 
          outline: none; 
          font-size: 0.9rem; 
          resize: none; 
          min-height: 22px; 
          font-family: inherit; 
          line-height: 1.5; 
          padding: 4px 10px; /* Padding nas laterais e topo/fundo */
          margin: 0; 
          overflow: hidden; 
          white-space: pre-wrap; 
          word-break: break-word; 
          box-sizing: border-box; 
        }
        
        .qe-del-icon { color: var(--color-text-subtle); cursor: pointer; flex-shrink: 0; margin-top: 6px; }
        .qe-del-icon:hover { color: var(--color-danger-text); }

        .btn-add-opt { background: transparent; border: 1px dashed var(--color-border-strong); color: var(--color-text-subtle); padding: 12px; border-radius: 12px; cursor: pointer; font-weight: 700; font-size: 0.8rem; }
        .btn-add-q { width: 100%; padding: 18px; background: var(--color-primary-soft); border: 2px dashed var(--color-border-strong); border-radius: 16px; color: var(--color-text-muted); font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: var(--color-surface-3); border-radius: 10px; }
      `}</style>
    </div>
  );
}