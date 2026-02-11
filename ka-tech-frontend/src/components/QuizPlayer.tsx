import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { CheckCircle2, XCircle, Trophy, ArrowRight, Loader2, Clock, AlertTriangle, Lock } from "lucide-react";
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
  
  // Estados de Jogo
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [gameFinished, setGameFinished] = useState(false);
  const [savingResult, setSavingResult] = useState(false);
  
  // Estados de Controle (Novos)
  const [alreadyAttempted, setAlreadyAttempted] = useState<{score: number, date: string} | null>(null);
  const [timeLeft, setTimeLeft] = useState(60); // 60 segundos por pergunta
  const timerRef = useRef<any>(null);

  // 1. CARREGAMENTO INICIAL
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // A) Busca Quiz
        const { data: quizData, error: quizError } = await supabase
          .from("quizzes")
          .select(`id, title, description, questions (id, content, options (id, content, is_correct))`)
          .eq("course_id", courseId)
          .single();

        if (quizError || !quizData) throw new Error("Quiz não encontrado");

        // B) Verifica Tentativa Anterior (Bloqueio)
        const { data: attempt } = await supabase
          .from("quiz_attempts")
          .select("score, created_at")
          .eq("user_id", user.id)
          .eq("quiz_id", quizData.id) // Agora compara UUID com UUID
          .maybeSingle();

        if (attempt) {
            setAlreadyAttempted({ 
                score: attempt.score, 
                date: new Date(attempt.created_at).toLocaleDateString() 
            });
            setQuiz(quizData as any); // Só para ter o título
        } else {
            // Prepara o jogo (embaralha opções)
            const questionsShuffled = quizData.questions.map((q: any) => ({
                ...q,
                options: q.options.sort(() => Math.random() - 0.5)
            }));
            setQuiz({ ...quizData, questions: questionsShuffled } as any);
        }

      } catch (err) {
        console.error("Erro init quiz:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [courseId]);

  // 2. LÓGICA DO TIMER
  useEffect(() => {
    if (gameFinished || alreadyAttempted || !quiz) return;

    // Reseta para 60s sempre que mudar a pergunta
    setTimeLeft(60); 
    
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeout(); // Tempo esgotou
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [currentQuestionIndex, gameFinished, alreadyAttempted]);

  // Para o timer ao responder
  const stopTimer = () => {
      if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleTimeout = () => {
      setIsAnswerChecked(true); // Trava a pergunta
      // Não marca ponto pois selectedOptionId será null ou incorreto
  };

  const handleConfirmAnswer = () => {
    if (!selectedOptionId || !quiz) return;
    stopTimer();
    
    const currentQ = quiz.questions[currentQuestionIndex];
    const isCorrect = currentQ.options.find(opt => opt.id === selectedOptionId)?.is_correct;
    
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

  // 3. SALVAR E FINALIZAR
  const finishGame = async () => {
    if (!quiz) return;
    setSavingResult(true);
    stopTimer();

    // Calcula nota final (0 a 100)
    // O score já foi atualizado no handleConfirmAnswer da última pergunta? 
    // Sim, pois o usuário clica em "Verificar" antes de "Finalizar".
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
        alert("Erro ao salvar sua nota. Verifique sua conexão.");
    } finally {
        setSavingResult(false);
    }
  };

  // --- RENDERIZAÇÃO ---

  if (loading) return <div className="flex-center" style={{height: '400px', color: '#8b5cf6'}}><Loader2 className="animate-spin" /></div>;

  // TELA DE BLOQUEIO (JÁ FEZ)
  if (alreadyAttempted) {
    return (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '50px', color: '#fff' }}>
            <Lock size={48} className="text-gray-400" style={{margin: '0 auto 20px'}} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '10px' }}>Tentativa Já Realizada</h2>
            <p style={{ color: '#94a3b8', marginBottom: '30px' }}>Você realizou este quiz em {alreadyAttempted.date}.</p>
            
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '16px', display: 'inline-block', marginBottom: '30px' }}>
                <span style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8' }}>Sua Nota</span>
                <span style={{ fontSize: '2.5rem', fontWeight: 900, color: alreadyAttempted.score >= 70 ? '#10b981' : '#ef4444' }}>
                    {alreadyAttempted.score}%
                </span>
            </div>
            
            <br />
            <button onClick={onExit} className="btn-secondary">Voltar ao Curso</button>
        </div>
    );
  }

  if (!quiz) return <div className="glass-panel">Erro ao carregar dados.</div>;

  // TELA DE RESULTADO PÓS-JOGO
  if (gameFinished) {
    const percentage = Math.round((score / quiz.questions.length) * 100);
    const passed = percentage >= 70;

    return (
      <div className="glass-panel result-animate" style={{ textAlign: 'center', padding: '40px' }}>
        <Trophy size={48} color={passed ? '#10b981' : '#ef4444'} style={{margin: '0 auto 20px'}} />
        <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', marginBottom: '5px' }}>{percentage}%</h2>
        <p style={{ color: '#94a3b8', marginBottom: '30px' }}>
            {passed ? "Parabéns! Você foi aprovado." : "Infelizmente você não atingiu a nota mínima."}
        </p>
        <button onClick={onExit} className="btn-primary">Voltar às Aulas</button>
      </div>
    );
  }

  // TELA DO JOGO
  const currentQ = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex) / quiz.questions.length) * 100;

  return (
    <div className="quiz-container">
      <style>{`
        .quiz-container { max-width: 800px; margin: 0 auto; font-family: 'Sora', sans-serif; width: 100%; }
        .glass-panel { background: #0f172a; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; overflow: hidden; }
        .progress-bar { height: 6px; background: #8b5cf6; transition: width 0.3s ease; }
        .option-card { display: flex; align-items: center; gap: 15px; padding: 18px; border-radius: 16px; border: 2px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); color: #cbd5e1; cursor: pointer; transition: all 0.2s; }
        .option-card:hover:not(.disabled) { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.2); }
        .option-card.selected { border-color: #8b5cf6; background: rgba(139, 92, 246, 0.1); color: #fff; }
        .option-card.correct { border-color: #10b981; background: rgba(16, 185, 129, 0.15); }
        .option-card.wrong { border-color: #ef4444; background: rgba(239, 68, 68, 0.15); }
        .option-card.disabled { cursor: default; opacity: 0.6; }
        .btn-primary { background: #8b5cf6; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 800; cursor: pointer; }
        .btn-secondary { background: transparent; border: 1px solid #334155; color: #fff; padding: 12px 24px; border-radius: 12px; cursor: pointer; }
        .timer-badge { display: flex; align-items: center; gap: 6px; background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 6px 12px; borderRadius: 20px; font-weight: 700; font-size: 0.85rem; }
      `}</style>

      <div className="glass-panel">
        <div style={{height: '6px', background: '#1e293b', width: '100%'}}>
            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>

        <div style={{ padding: '30px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
                <div style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', color: '#94a3b8', fontWeight: 800, marginBottom: '8px' }}>
                    Questão {currentQuestionIndex + 1} de {quiz.questions.length}
                </div>
                <h2 style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 600, lineHeight: 1.4 }}>{currentQ.content}</h2>
            </div>
            
            {/* TIMER */}
            <div className="timer-badge">
                <Clock size={16} /> {timeLeft}s
            </div>
        </div>

        <div style={{ display: 'grid', gap: '12px', padding: '30px' }}>
          {currentQ.options.map((option) => {
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
                {isAnswerChecked && option.is_correct && <CheckCircle2 className="text-emerald-500" size={20} />}
                {isAnswerChecked && !option.is_correct && option.id === selectedOptionId && <XCircle className="text-red-500" size={20} />}
                {!isAnswerChecked && <div style={{width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700}}>{String.fromCharCode(65 + currentQ.options.indexOf(option))}</div>} 
                <span>{option.content}</span>
              </div>
            );
          })}
        </div>

        <div style={{ padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
          <button className="btn-secondary" onClick={onExit} style={{border: 'none', color: '#64748b', fontSize: '0.9rem'}}>Cancelar</button>
          
          {!isAnswerChecked ? (
            <button className="btn-primary" onClick={handleConfirmAnswer} disabled={!selectedOptionId}>Confirmar</button>
          ) : (
            <button className="btn-primary" onClick={handleNextQuestion} style={{background: currentQuestionIndex + 1 === quiz.questions.length ? '#10b981' : '#8b5cf6'}}>
                {currentQuestionIndex + 1 === quiz.questions.length ? (savingResult ? "Salvando..." : "Finalizar") : "Próxima"} <ArrowRight size={18} style={{marginLeft: '8px', verticalAlign: 'middle'}}/>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}