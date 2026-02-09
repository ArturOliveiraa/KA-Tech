import { useState } from "react";
import { supabase } from "../supabaseClient";
import { Trash2, Plus, Save, CheckCircle2, X } from "lucide-react";

interface Option { content: string; is_correct: boolean; }
interface Question { content: string; options: Option[]; }
// O JSON da IA pode vir com chaves diferentes, então ajustamos a interface
interface QuizData { quiz_title: string; description: string; questions: Question[]; }

interface QuizEditorProps {
  courseId: number;
  initialData: QuizData;
  onClose: () => void;
  onSaved: () => void;
}

export function QuizEditor({ courseId, initialData, onClose, onSaved }: QuizEditorProps) {
  const [quiz, setQuiz] = useState(initialData);
  const [saving, setSaving] = useState(false);

  // --- FUNÇÕES DE EDIÇÃO ---
  const updateQuestion = (idx: number, text: string) => {
    const newQ = [...quiz.questions];
    newQ[idx].content = text;
    setQuiz({ ...quiz, questions: newQ });
  };

  const updateOption = (qIdx: number, oIdx: number, text: string) => {
    const newQ = [...quiz.questions];
    newQ[qIdx].options[oIdx].content = text;
    setQuiz({ ...quiz, questions: newQ });
  };

  const setCorrectOption = (qIdx: number, oIdx: number) => {
    const newQ = [...quiz.questions];
    newQ[qIdx].options.forEach((opt, i) => opt.is_correct = (i === oIdx));
    setQuiz({ ...quiz, questions: newQ });
  };

  const deleteQuestion = (idx: number) => {
    if (confirm("Tem certeza que deseja remover esta pergunta?")) {
      const newQ = quiz.questions.filter((_, i) => i !== idx);
      setQuiz({ ...quiz, questions: newQ });
    }
  };

  const addQuestion = () => {
    setQuiz({
      ...quiz,
      questions: [
        ...quiz.questions,
        {
          content: "Nova pergunta aqui...",
          options: [
            { content: "Alternativa A", is_correct: true },
            { content: "Alternativa B", is_correct: false },
            { content: "Alternativa C", is_correct: false },
            { content: "Alternativa D", is_correct: false },
            { content: "Alternativa E", is_correct: false },
          ]
        }
      ]
    });
  };

  // --- SALVAR NO BANCO DE DADOS ---
  const handleSaveToDb = async () => {
    if (quiz.questions.length === 0) return alert("O quiz precisa ter pelo menos uma pergunta.");
    
    setSaving(true);
    try {
      // 1. Salva o cabeçalho do Quiz
      const { data: quizEntry, error: qError } = await supabase.from("quizzes").insert({
        course_id: courseId,
        title: quiz.quiz_title || "Novo Quiz",
        description: quiz.description,
        min_score: 70
      }).select().single();

      if (qError) throw qError;

      // 2. Salva as Perguntas
      const questionsPayload = quiz.questions.map(q => ({
        quiz_id: quizEntry.id,
        content: q.content
      }));
      
      const { data: insertedQuestions, error: iqError } = await supabase
        .from("questions").insert(questionsPayload).select();

      if (iqError) throw iqError;

      // 3. Salva as Opções (plana)
      const optionsPayload: any[] = [];
      quiz.questions.forEach((q, qIndex) => {
        const qId = insertedQuestions[qIndex].id;
        q.options.forEach(opt => {
          optionsPayload.push({
            question_id: qId,
            content: opt.content,
            is_correct: opt.is_correct
          });
        });
      });

      const { error: opError } = await supabase.from("options").insert(optionsPayload);
      if (opError) throw opError;

      alert("✅ Quiz publicado com sucesso!");
      onSaved();
      onClose();

    } catch (err: any) {
      console.error(err);
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', padding: '40px', overflowY: 'auto', backdropFilter: 'blur(5px)' }}>
      <div className="glass-panel" style={{ background: '#0f172a', width: '100%', maxWidth: '900px', borderRadius: '24px', padding: '40px', border: '1px solid #334155', height: 'fit-content', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        
        {/* CABEÇALHO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #334155', paddingBottom: '20px' }}>
          <div>
            <h2 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Editor de Quiz IA</h2>
            <p style={{ color: '#94a3b8', margin: 0 }}>Revise as perguntas geradas antes de publicar.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={{ padding: '12px 20px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <X size={18} /> Cancelar
            </button>
            <button onClick={handleSaveToDb} disabled={saving} style={{ padding: '12px 20px', background: '#10b981', border: 'none', color: '#fff', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, display: 'flex', gap: '8px', alignItems: 'center', boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.39)' }}>
              {saving ? "Salvando..." : <><Save size={18}/> Publicar Quiz</>}
            </button>
          </div>
        </div>

        {/* CAMPOS DO QUIZ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div>
             <label style={{color: '#94a3b8', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px'}}>Título do Exame</label>
             <input 
                value={quiz.quiz_title} 
                onChange={(e) => setQuiz({...quiz, quiz_title: e.target.value})}
                style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', padding: '15px', color: '#fff', borderRadius: '12px', marginTop: '8px', fontSize: '1.1rem', fontWeight: 700, outline: 'none' }}
             />
          </div>

          {/* LISTA DE PERGUNTAS */}
          {quiz.questions.map((q, qIdx) => (
            <div key={qIdx} style={{ background: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                <span style={{ color: '#a78bfa', fontWeight: 800, fontSize: '0.8rem', background: 'rgba(139, 92, 246, 0.1)', padding: '4px 10px', borderRadius: '6px' }}>QUESTÃO {qIdx + 1}</span>
                <button onClick={() => deleteQuestion(qIdx)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.7 }} title="Excluir"><Trash2 size={18} /></button>
              </div>

              <textarea 
                value={q.content}
                onChange={(e) => updateQuestion(qIdx, e.target.value)}
                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', padding: '15px', color: '#fff', borderRadius: '12px', minHeight: '80px', resize: 'vertical', marginBottom: '20px', fontFamily: 'inherit', fontSize: '1rem', lineHeight: '1.5' }}
                placeholder="Digite o enunciado da pergunta..."
              />

              <div style={{ display: 'grid', gap: '10px' }}>
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button 
                      onClick={() => setCorrectOption(qIdx, oIdx)}
                      title={opt.is_correct ? "Correta" : "Marcar como correta"}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: opt.is_correct ? '#10b981' : '#475569', transition: 'all 0.2s' }}
                    >
                      <CheckCircle2 size={24} fill={opt.is_correct ? "rgba(16, 185, 129, 0.2)" : "none"} />
                    </button>
                    <input 
                      value={opt.content}
                      onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                      style={{ flex: 1, background: opt.is_correct ? 'rgba(16, 185, 129, 0.05)' : '#0f172a', border: opt.is_correct ? '1px solid #10b981' : '1px solid #334155', padding: '12px', color: '#cbd5e1', borderRadius: '10px', outline: 'none', transition: 'all 0.2s' }}
                      placeholder={`Alternativa ${oIdx + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button onClick={addQuestion} style={{ width: '100%', padding: '25px', background: 'rgba(255,255,255,0.02)', border: '2px dashed #334155', borderRadius: '16px', color: '#94a3b8', fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', transition: 'all 0.2s' }}>
            <Plus size={20} /> Adicionar Nova Pergunta
          </button>
        </div>
      </div>
    </div>
  );
}