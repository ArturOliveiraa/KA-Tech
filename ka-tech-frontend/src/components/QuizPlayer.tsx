import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { CheckCircle2, XCircle, Trophy, ArrowRight, Loader2, Clock, Lock, BookOpen } from "lucide-react";
import confetti from "canvas-confetti";

interface Option { id: string; content: string; is_correct: boolean; }
interface Question { id: string; content: string; options: Option[]; }
interface QuizData { id: string; title: string; description: string; questions: Question[]; min_score?: number; }

// DEFINIÇÃO DAS PROPS ATUALIZADA
interface QuizPlayerProps {
  courseId?: number;
  lessonId?: number;
  onExit?: () => void;
}

export default function QuizPlayer({ courseId, lessonId, onExit }: QuizPlayerProps) {
  const { slug } = useParams(); 
  const navigate = useNavigate();
  
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [gameFinished, setGameFinished] = useState(false);
  const [savingResult, setSavingResult] = useState(false);
  
  const [alreadyAttempted, setAlreadyAttempted] = useState<{score: number, date: string} | null>(null);
  const [timeLeft, setTimeLeft] = useState(60); 
  const timerRef = useRef<any>(null);

  const handleExit = () => {
    if (onExit) {
      onExit();
    } else {
      navigate("/dashboard");
    }
  };

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setNotFound(false);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let query = supabase
          .from("quizzes")
          .select(`id, title, description, min_score, questions (id, content, options (id, content, is_correct))`);

        // --- NOVA LÓGICA DE BUSCA ---
        if (lessonId) {
          // Busca o quiz específico daquela aula
          query = query.eq("lesson_id", lessonId).order('created_at', { ascending: false }).limit(1);
        } else if (courseId) {
          // Busca o quiz geral do módulo (garante que não tem lesson_id atrelado)
          query = query.eq("course_id", courseId).is("lesson_id", null).order('created_at', { ascending: false }).limit(1);
        } else if (slug) {
          query = query.eq("slug", slug);
        } else {
          setNotFound(true);
          return;
        }

        const { data: res, error: quizError } = await query;
        const quizData = Array.isArray(res) ? res[0] : res;

        if (quizError || !quizData || !quizData.questions || quizData.questions.length === 0) {
            setNotFound(true);
            return;
        }

        const { data: attempt } = await supabase
          .from("quiz_attempts")
          .select("score, created_at")
          .eq("user_id", user.id)
          .eq("quiz_id", quizData.id)
          .maybeSingle();

        if (attempt) {
            setAlreadyAttempted({ 
                score: attempt.score, 
                date: new Date(attempt.created_at).toLocaleDateString() 
            });
            setQuiz(quizData as any);
        } else {
            const questionsShuffled = quizData.questions.map((q: any) => ({
                ...q,
                options: q.options ? [...q.options].sort(() => Math.random() - 0.5) : []
            }));
            setQuiz({ ...quizData, questions: questionsShuffled } as any);
        }
      } catch (err) {
        console.error("Erro ao carregar quiz:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [courseId, lessonId, slug]); // <-- Adicionado lessonId nas dependências

  useEffect(() => {
    if (gameFinished || alreadyAttempted || !quiz || notFound) return;
    
    setTimeLeft(60); 
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setIsAnswerChecked(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentQuestionIndex, gameFinished, alreadyAttempted, quiz, notFound]);

  const handleConfirmAnswer = () => {
    if (!selectedOptionId || !quiz) return;
    if (timerRef.current) clearInterval(timerRef.current);
    
    const currentQ = quiz.questions[currentQuestionIndex];
    const isCorrect = currentQ?.options?.find(opt => opt.id === selectedOptionId)?.is_correct;
    
    if (isCorrect) setScore(prev => prev + 1);
    setIsAnswerChecked(true);
  };

  const handleNextQuestion = () => {
    if (!quiz) return;
    if (currentQuestionIndex + 1 < quiz.questions.length) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOptionId(null);
      setIsAnswerChecked(false);
    } else {
      finishGame();
    }
  };

  const finishGame = async () => {
    if (!quiz) return;
    setSavingResult(true);
    const finalScore = Math.round((score / quiz.questions.length) * 100);
    const minRequired = quiz.min_score || 70;
    const passed = finalScore >= minRequired;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from("quiz_attempts").insert({
                user_id: user.id,
                quiz_id: quiz.id,
                score: finalScore,
                passed: passed
            });
        }
        setGameFinished(true);
        if (passed) confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    } catch (error) {
        console.error("Erro ao salvar resultado:", error);
    } finally {
        setSavingResult(false);
    }
  };

  if (loading) return <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg)', color: 'var(--color-primary-text)'}}><Loader2 className="animate-spin" size={42} /></div>;

  if (notFound || !quiz) {
      return (
        <div className="quiz-view-wrapper">
            <div className="glass-panel qp-screen">
                <BookOpen size={60} style={{margin: '0 auto 20px', color: 'var(--color-text-subtle)'}} />
                <h2 className="qp-title">Quiz não disponível</h2>
                <p className="qp-text">Este link não é válido ou a avaliação ainda não possui perguntas.</p>
                <button onClick={handleExit} className="btn-primary" style={{marginTop: '30px', width: '200px'}}>Voltar</button>
            </div>
        </div>
      );
  }

  if (alreadyAttempted) {
    return (
        <div className="quiz-view-wrapper">
            <div className="glass-panel qp-screen">
                <Lock size={50} style={{margin: '0 auto 20px', color: 'var(--color-text-muted)'}} />
                <h2 className="qp-title">Avaliação Concluída</h2>
                <p className="qp-text">Já realizaste este quiz em {alreadyAttempted.date}.</p>
                <div className="qp-score-box">
                    <span className="qp-score-label">Tua Nota</span>
                    <span className={`qp-score-value ${alreadyAttempted.score >= 70 ? 'text-success' : 'text-danger'}`}>
                        {alreadyAttempted.score}%
                    </span>
                </div>
                <br />
                <button onClick={handleExit} className="btn-secondary" style={{marginTop: '25px'}}>Voltar</button>
            </div>
        </div>
    );
  }

  if (gameFinished) {
    const percentage = Math.round((score / quiz.questions.length) * 100);
    return (
      <div className="quiz-view-wrapper">
          <div className="glass-panel qp-screen result-animate">
            <Trophy size={70} color={percentage >= 70 ? '#10b981' : '#ef4444'} style={{margin: '0 auto 20px'}} />
            <h2 className="qp-score-value" style={{fontSize: '4rem'}}>{percentage}%</h2>
            <p className="qp-text">
                {percentage >= 70 ? "Excelente! Dominaste o conteúdo." : "Nota insuficiente. Tenta novamente após rever as aulas."}
            </p>
            <button onClick={handleExit} className="btn-primary" style={{width: '100%', maxWidth: '300px', marginTop: '30px'}}>Concluir</button>
          </div>
      </div>
    );
  }

  const currentQ = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;
  const progress = ((currentQuestionIndex) / totalQuestions) * 100;

  return (
    <div className="quiz-view-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        .quiz-view-wrapper { min-height: 100vh; width: 100%; background: var(--color-bg); display: flex; align-items: center; justify-content: center; padding: 20px; font-family: var(--font-sans); box-sizing: border-box; }
        .quiz-container { max-width: 850px; width: 100%; margin: 0 auto; -webkit-font-smoothing: antialiased; }
        .glass-panel { background: var(--color-surface-1); border: 1px solid var(--color-border); border-radius: 28px; overflow: hidden; width: 100%; }
        .qp-screen { text-align: center; padding: 70px 25px; color: var(--color-text); }
        .qp-title { font-size: 1.8rem; font-weight: 800; margin-bottom: 12px; }
        .qp-text { color: var(--color-text-muted); font-size: 1.1rem; line-height: 1.6; max-width: 500px; margin: 0 auto; }
        .qp-score-box { background: var(--color-surface-2); padding: 35px; border-radius: 24px; display: inline-block; margin-top: 25px; }
        .qp-score-label { display: block; font-size: 0.85rem; text-transform: uppercase; color: var(--color-text-subtle); font-weight: 800; margin-bottom: 10px; }
        .qp-score-value { font-weight: 900; font-size: 3.5rem; }
        .progress-bar { height: 8px; background: var(--color-primary); transition: width 0.5s ease; box-shadow: var(--shadow-sm); }
        .option-card { display: flex; align-items: center; gap: 18px; padding: 22px; border-radius: 20px; border: 2px solid var(--color-border); background: var(--color-surface-2); color: var(--color-text-secondary); cursor: pointer; transition: 0.2s; font-weight: 600; margin-bottom: 12px; }
        .option-card:hover:not(.disabled) { background: var(--color-surface-2); border-color: var(--color-border-strong); transform: translateY(-3px); color: var(--color-text); }
        .option-card.selected { border-color: var(--color-primary); background: var(--color-primary-soft); color: var(--color-text); }
        .option-card.correct { border-color: var(--color-success); background: var(--color-success-soft); color: var(--color-text); }
        .option-card.wrong { border-color: var(--color-danger); background: var(--color-danger-soft); color: var(--color-text); }
        .btn-primary { background: var(--color-primary); color: white; border: none; padding: 18px 36px; border-radius: 16px; font-weight: 800; cursor: pointer; transition: 0.2s; }
        .btn-secondary { background: var(--color-surface-2); border: 1px solid var(--color-border); color: var(--color-text); padding: 16px 32px; border-radius: 16px; font-weight: 700; cursor: pointer; }
        .timer-badge { display: flex; align-items: center; gap: 10px; background: var(--color-danger-soft); color: var(--color-danger-text); padding: 10px 20px; border-radius: 14px; font-weight: 900; }
        .text-success { color: var(--color-success-text); }
        .text-danger { color: var(--color-danger-text); }
      `}</style>

      <div className="quiz-container">
        <div className="glass-panel">
            <div style={{height: '8px', background: 'var(--color-surface-3)', width: '100%'}}>
                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>

            <div style={{ padding: '40px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ textTransform: 'uppercase', fontSize: '0.8rem', color: 'var(--color-primary-text)', fontWeight: 900, margin: '10px 0' }}>
                        Questão {currentQuestionIndex + 1} de {totalQuestions}
                    </div>
                    <h2 style={{ fontSize: '1.5rem', color: 'var(--color-text)', fontWeight: 800, margin: 0 }}>{currentQ?.content}</h2>
                </div>
                <div className="timer-badge"><Clock size={22} /> {timeLeft}s</div>
            </div>

            <div style={{ padding: '40px' }}>
            {currentQ?.options?.map((option, idx) => {
                let cardClass = "option-card";
                if (isAnswerChecked) {
                    cardClass += " disabled";
                    if (option.is_correct) cardClass += " correct";
                    else if (option.id === selectedOptionId) cardClass += " wrong";
                } else if (selectedOptionId === option.id) {
                    cardClass += " selected";
                }
                return (
                <div key={option.id} className={cardClass} onClick={() => !isAnswerChecked && setSelectedOptionId(option.id)}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'var(--color-text)' }}>
                        {String.fromCharCode(65 + idx)}
                    </div>
                    <span style={{flex: 1}}>{option.content}</span>
                </div>
                );
            })}
            </div>

            <div style={{ padding: '35px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface-2)' }}>
                <button onClick={handleExit} className="btn-secondary">Sair</button>
                {!isAnswerChecked ? (
                    <button className="btn-primary" onClick={handleConfirmAnswer} disabled={!selectedOptionId}>Confirmar Resposta</button>
                ) : (
                    <button className="btn-primary" onClick={handleNextQuestion}>
                        {currentQuestionIndex + 1 === totalQuestions ? (savingResult ? "Salvando..." : "Ver Resultado") : "Próxima Questão"} 
                        <ArrowRight size={24} style={{marginLeft: '10px'}} />
                    </button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}