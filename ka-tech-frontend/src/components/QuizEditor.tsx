import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Trash2, Plus, Save, CheckCircle2, X } from "lucide-react";

interface Option { content: string; is_correct: boolean; }
interface Question { content: string; options: Option[]; }
interface QuizData { quiz_title: string; description: string; questions: Question[]; }

export function QuizEditor({ courseId, initialData, onClose, onSaved }: any) {
  const [quiz, setQuiz] = useState<QuizData>({ quiz_title: "", description: "", questions: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      let parsed = typeof initialData === 'string' ? JSON.parse(initialData.replace(/```json|```/g, '')) : initialData;
      setQuiz({
        quiz_title: parsed.quiz_title || "Novo Quiz IA",
        description: parsed.description || "",
        questions: parsed.questions || []
      });
    }
  }, [initialData]);

  const handleSaveToDb = async () => {
    if (quiz.questions.length === 0) return alert("O quiz precisa de perguntas.");
    setSaving(true);
    try {
      const { data: quizEntry, error: qError } = await supabase.from("quizzes").insert({
        course_id: courseId,
        title: quiz.quiz_title,
        description: quiz.description,
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

      alert("✅ Publicado!");
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
            <p>Revise as perguntas geradas</p>
          </div>
          <div className="qe-actions">
            <button onClick={onClose} className="btn-close"><X size={20} /></button>
            <button onClick={handleSaveToDb} disabled={saving} className="btn-publish">
              <Save size={18} /> <span>{saving ? "Salvando..." : "Publicar"}</span>
            </button>
          </div>
        </header>

        <div className="qe-scroll-body">
          <div className="qe-group">
            <label>TÍTULO DO EXAME</label>
            <input 
              value={quiz.quiz_title} 
              onChange={e => setQuiz({...quiz, quiz_title: e.target.value})} 
            />
          </div>

          {quiz.questions.map((q, qIdx) => (
            <div key={qIdx} className="qe-card">
              <div className="qe-card-header">
                <span>QUESTÃO {qIdx + 1}</span>
                <button onClick={() => setQuiz({...quiz, questions: quiz.questions.filter((_, i) => i !== qIdx)})}><Trash2 size={18}/></button>
              </div>
              <textarea 
                value={q.content} 
                onChange={e => {
                  const newQ = [...quiz.questions];
                  newQ[qIdx].content = e.target.value;
                  setQuiz({...quiz, questions: newQ});
                }}
              />
              <div className="qe-options">
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} className={`qe-opt ${opt.is_correct ? 'correct' : ''}`}>
                    <CheckCircle2 
                        size={20} 
                        onClick={() => {
                            const newQ = [...quiz.questions];
                            newQ[qIdx].options.forEach((o, i) => o.is_correct = i === oIdx);
                            setQuiz({...quiz, questions: newQ});
                        }}
                        style={{cursor: 'pointer'}}
                    />
                    <input 
                      value={opt.content} 
                      onChange={e => {
                        const newQ = [...quiz.questions];
                        newQ[qIdx].options[oIdx].content = e.target.value;
                        setQuiz({...quiz, questions: newQ});
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          <button className="btn-add" onClick={() => setQuiz({...quiz, questions: [...quiz.questions, {content: "Nova Pergunta", options: [{content: "Opção 1", is_correct: true}, {content: "Opção 2", is_correct: false}]}]})}>
            <Plus size={20}/> Adicionar Pergunta
          </button>
        </div>
      </div>

      <style>{`
        .qe-wrapper { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; justify-content: center; padding: 15px; overflow: hidden; }
        .qe-container { background: #0f172a; width: 100%; max-width: 800px; border-radius: 20px; display: flex; flex-direction: column; border: 1px solid #1e293b; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
        
        .qe-header { padding: 20px; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; }
        .qe-title-area h1 { font-size: 1.25rem; font-weight: 800; color: #fff; margin: 0; }
        .qe-title-area p { font-size: 0.85rem; color: #94a3b8; margin: 0; }
        
        .qe-actions { display: flex; gap: 10px; align-items: center; }
        .btn-close { background: #1e293b; border: none; color: #f87171; padding: 10px; border-radius: 12px; cursor: pointer; }
        .btn-publish { background: #10b981; border: none; color: #fff; padding: 10px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; }

        .qe-scroll-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 20px; }
        
        .qe-group label { display: block; color: #64748b; font-size: 0.7rem; font-weight: 800; margin-bottom: 8px; letter-spacing: 1px; }
        .qe-group input { width: 100%; background: #1e293b; border: 1px solid #334155; padding: 12px; border-radius: 10px; color: #fff; font-weight: 600; font-size: 1rem; outline: none; }
        
        .qe-card { background: #1e293b; border-radius: 16px; padding: 16px; border: 1px solid #334155; }
        .qe-card-header { display: flex; justify-content: space-between; margin-bottom: 12px; color: #8b5cf6; font-weight: 800; font-size: 0.8rem; }
        .qe-card-header button { background: transparent; border: none; color: #ef4444; cursor: pointer; }
        
        .qe-card textarea { width: 100%; background: #0f172a; border: 1px solid #334155; padding: 12px; border-radius: 10px; color: #fff; min-height: 80px; resize: none; margin-bottom: 12px; font-family: inherit; font-size: 0.95rem; }
        
        .qe-options { display: flex; flex-direction: column; gap: 8px; }
        .qe-opt { display: flex; align-items: center; gap: 10px; background: #0f172a; padding: 8px 12px; border-radius: 10px; border: 1px solid #334155; }
        .qe-opt.correct { border-color: #10b981; background: rgba(16, 185, 129, 0.05); }
        .qe-opt input { flex: 1; background: transparent; border: none; color: #cbd5e1; outline: none; font-size: 0.9rem; }
        
        .btn-add { width: 100%; padding: 15px; background: rgba(255,255,255,0.02); border: 2px dashed #334155; border-radius: 12px; color: #94a3b8; font-weight: 700; cursor: pointer; }

        @media (max-width: 500px) {
          .qe-header { flex-direction: column; text-align: center; }
          .qe-actions { width: 100%; }
          .btn-publish { flex: 1; justify-content: center; }
          .qe-wrapper { padding: 0; }
          .qe-container { border-radius: 0; height: 100%; }
        }
      `}</style>
    </div>
  );
}