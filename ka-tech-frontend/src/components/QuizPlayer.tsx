import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { CheckCircle2, XCircle, Trophy, ArrowRight, Loader2, Clock, Lock, BookOpen } from "lucide-react";
import confetti from "canvas-confetti";

interface Option { id: string; content: string; is_correct: boolean; }
interface Question { id: string; content: string; options: Option[]; }
interface QuizData { id: string; title: string; description: string; questions: Question[]; }

interface QuizPlayerProps {
  courseId: number;
  onExit: () => void;
}

export function QuizPlayer({ courseId, onExit }: QuizPlayerProps) {
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

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setNotFound(false);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: quizzes, error: quizError } = await supabase
          .from("quizzes")
          .select(`id, title, description, questions (id, content, options (id, content, is_correct))`)
          .eq("course_id", courseId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (quizError || !quizzes || quizzes.length === 0 || !quizzes[0].questions || quizzes[0].questions.length === 0) {
            setNotFound(true);
            return;
        }

        const quizData = quizzes[0];
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
  }, [courseId]);

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
    const passed = finalScore >= 70;

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

  if (loading) return <div className="flex-center" style={{height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6'}}><Loader2 className="animate-spin" size={32} /></div>;

  if (notFound || !quiz || !quiz.questions || quiz.questions.length === 0) {
      return (
        <div className="glass-panel qp-screen">
            <BookOpen size={60} style={{margin: '0 auto 20px', color: '#64748b'}} />
            <h2 className="qp-title">Quiz não disponível</h2>
            <p className="qp-text">Este treinamento ainda não possui uma avaliação cadastrada.</p>
            <button onClick={onExit} className="btn-primary" style={{marginTop: '30px', width: '200px'}}>Voltar</button>
        </div>
      );
  }

  if (alreadyAttempted) {
    return (
        <div className="glass-panel qp-screen">
            <Lock size={50} style={{margin: '0 auto 20px', color: '#94a3b8'}} />
            <h2 className="qp-title">Avaliação Concluída</h2>
            <p className="qp-text">Já realizaste este quiz em {alreadyAttempted.date}.</p>
            <div className="qp-score-box">
                <span className="qp-score-label">Tua Nota</span>
                <span className={`qp-score-value ${alreadyAttempted.score >= 70 ? 'text-success' : 'text-danger'}`}>
                    {alreadyAttempted.score}%
                </span>
            </div>
            <br />
            <button onClick={onExit} className="btn-secondary" style={{marginTop: '25px'}}>Voltar ao Painel</button>
        </div>
    );
  }

  if (gameFinished) {
    const percentage = Math.round((score / quiz.questions.length) * 100);
    return (
      <div className="glass-panel qp-screen result-animate">
        <Trophy size={70} color={percentage >= 70 ? '#10b981' : '#ef4444'} style={{margin: '0 auto 20px'}} />
        <h2 className="qp-score-value" style={{fontSize: '4rem'}}>{percentage}%</h2>
        <p className="qp-text">
            {percentage >= 70 ? "Excelente! Dominaste o conteúdo." : "Nota insuficiente. Tenta novamente após rever as aulas."}
        </p>
        <button onClick={onExit} className="btn-primary" style={{width: '100%', maxWidth: '300px', marginTop: '30px'}}>Concluir</button>
      </div>
    );
  }

  // GARANTIA FINAL PARA O TYPESCRIPT:
  // Se chegarmos aqui, quiz.questions existe obrigatoriamente.
  const currentQ = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;
  const progress = (currentQuestionIndex / totalQuestions) * 100;

  return (
    <div className="quiz-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        .quiz-container { max-width: 850px; margin: 0 auto; font-family: 'Inter', sans-serif; width: 100%; -webkit-font-smoothing: antialiased; }
        .glass-panel { background: #0f172a; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 28px; overflow: hidden; }
        .qp-screen { text-align: center; padding: 70px 25px; color: #fff; }
        .qp-title { font-size: 1.8rem; font-weight: 800; margin-bottom: 12px; letter-spacing: -0.03em; }
        .qp-text { color: #94a3b8; font-size: 1.1rem; line-height: 1.6; max-width: 500px; margin: 0 auto; font-weight: 500; }
        .qp-score-box { background: rgba(255,255,255,0.03); padding: 35px; border-radius: 24px; display: inline-block; margin-top: 25px; border: 1px solid rgba(255,255,255,0.06); }
        .qp-score-label { display: block; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 2px; color: #64748b; font-weight: 800; margin-bottom: 10px; }
        .qp-score-value { font-weight: 900; font-size: 3.5rem; }
        .progress-bar { height: 8px; background: #8b5cf6; transition: width 0.5s ease; box-shadow: 0 0 20px rgba(139, 92, 246, 0.5); }
        .option-card { display: flex; align-items: center; gap: 18px; padding: 22px; border-radius: 20px; border: 2px solid rgba(255,255,255,0.05); background: rgba(30, 41, 59, 0.4); color: #cbd5e1; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); font-weight: 600; font-size: 1.05rem; }
        .option-card:hover:not(.disabled) { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.25); transform: translateY(-3px); color: #fff; }
        .option-card.selected { border-color: #8b5cf6; background: rgba(139, 92, 246, 0.15); color: #fff; }
        .option-card.correct { border-color: #10b981; background: rgba(16, 185, 129, 0.2); color: #fff; }
        .option-card.wrong { border-color: #ef4444; background: rgba(239, 68, 68, 0.2); color: #fff; }
        .option-card.disabled { cursor: default; }
        .btn-primary { background: #8b5cf6; color: white; border: none; padding: 18px 36px; border-radius: 16px; font-weight: 800; cursor: pointer; font-size: 1.1rem; transition: 0.2s; box-shadow: 0 8px 20px rgba(139, 92, 246, 0.4); }
        .btn-secondary { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 16px 32px; border-radius: 16px; font-weight: 700; cursor: pointer; }
        .timer-badge { display: flex; align-items: center; gap: 10px; background: rgba(239, 68, 68, 0.15); color: #f87171; padding: 10px 20px; border-radius: 14px; font-weight: 900; font-size: 1.1rem; border: 1px solid rgba(239, 68, 68, 0.3); }
        .text-success { color: #10b981; }
        .text-danger { color: #ef4444; }
        @media (max-width: 640px) {
            .qp-header { flex-direction: column-reverse; gap: 20px; padding: 25px !important; }
            .timer-badge { width: 100%; justify-content: center; }
            .option-card { padding: 18px; font-size: 1rem; }
            .btn-primary { width: 100%; padding: 20px; }
            .qp-footer { flex-direction: column-reverse; gap: 20px; padding: 30px 25px !important; }
            .qp-footer .btn-secondary { background: transparent; border: none; font-size: 1rem; }
        }
      `}</style>

      <div className="glass-panel">
        <div style={{height: '8px', background: '#1e293b', width: '100%'}}>
            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>

        <div className="qp-header" style={{ padding: '40px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
                <div style={{ textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '2.5px', color: '#8b5cf6', fontWeight: 900, marginBottom: '12px' }}>
                    Questão {currentQuestionIndex + 1} de {totalQuestions}
                </div>
                <h2 style={{ fontSize: '1.5rem', color: '#fff', fontWeight: 800, lineHeight: 1.3, margin: 0, letterSpacing: '-0.02em' }}>{currentQ?.content}</h2>
            </div>
            <div className="timer-badge"><Clock size={22} /> {timeLeft}s</div>
        </div>

        <div style={{ display: 'grid', gap: '16px', padding: '40px' }}>
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
                {isAnswerChecked && option.is_correct && <CheckCircle2 className="text-emerald-500" size={26} />}
                {isAnswerChecked && !option.is_correct && option.id === selectedOptionId && <XCircle className="text-red-500" size={26} />}
                {!isAnswerChecked && (
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '12px', 
                        background: selectedOptionId === option.id ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontSize: '1rem', fontWeight: 900, color: '#fff', border: '1px solid rgba(255,255,255,0.15)'
                    }}>
                        {String.fromCharCode(65 + idx)}
                    </div>
                )} 
                <span style={{flex: 1}}>{option.content}</span>
              </div>
            );
          })}
        </div>

        <div className="qp-footer" style={{ padding: '35px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button onClick={onExit} className="btn-secondary" style={{background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer'}}>Sair</button>
          {!isAnswerChecked ? (
            <button className="btn-primary" onClick={handleConfirmAnswer} disabled={!selectedOptionId}>Confirmar Resposta</button>
          ) : (
            <button className="btn-primary" onClick={handleNextQuestion} style={{background: currentQuestionIndex + 1 === totalQuestions ? '#10b981' : '#8b5cf6', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center'}}>
                {currentQuestionIndex + 1 === totalQuestions ? (savingResult ? "A gravar..." : "Ver Resultado") : "Próxima Questão"} 
                <ArrowRight size={24} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}