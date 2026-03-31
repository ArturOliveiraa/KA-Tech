import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { QuizEditor } from "./QuizEditor";

interface GenerateQuizButtonProps {
  courseId?: number;
  lessonId?: number;
  title: string;
  description: string;
  // Ajustado para aceitar o parâmetro data e evitar erro TS2322
  onQuizGenerated?: (data: any) => void; 
}

export function GenerateQuizButton({ courseId, lessonId, title, description, onQuizGenerated }: GenerateQuizButtonProps) {
  const [generating, setGenerating] = useState(false);
  const [quizData, setQuizData] = useState<any>(null);
  const [optionsCount, setOptionsCount] = useState<number>(4);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // 1. Constrói as alternativas dinamicamente
      let optionsExample = [];
      optionsExample.push(`{"content": "A resposta correta vai aqui", "is_correct": true}`);
      for (let i = 1; i < optionsCount; i++) {
        optionsExample.push(`{"content": "Alternativa errada ${i}", "is_correct": false}`);
      }

      // 2. Prompt para a IA
      const prompt = `Crie um quiz de múltipla escolha para o tema "${title}".
      Descrição: ${description}.

      REGRAS OBRIGATÓRIAS:
      1. Gere exatamente 5 perguntas.
      2. CADA pergunta DEVE ter EXATAMENTE ${optionsCount} alternativas no array "options".
      3. Apenas UMA alternativa pode ser "is_correct": true.
      4. Retorne APENAS um JSON válido. NADA de crases (\`\`\`) ou texto antes/depois.

      Exemplo EXATO do formato que você deve retornar:
      {
        "quiz_title": "Título do Quiz",
        "description": "Descrição",
        "questions": [
          {
            "content": "Pergunta 1",
            "options": [
              ${optionsExample.join(',\n              ')}
            ]
          }
        ]
      }`;

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + import.meta.env.VITE_GEMINI_API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Erro na API do Gemini.");
      }

      const data = await response.json();
      let text = data.candidates[0].content.parts[0].text;

      // Limpeza de Markdown
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      // Validação do JSON
      let parsedData;
      try {
        parsedData = JSON.parse(text);
      } catch (err) {
        throw new Error("A IA gerou um formato inválido. Clique em gerar novamente.");
      }

      // Se houver a função de callback externa (usada no ContentManagement), envia os dados
      if (onQuizGenerated) {
        onQuizGenerated(parsedData);
      } else {
        // Se não, abre o editor localmente
        setQuizData(text);
      }

    } catch (e: any) {
      alert("Erro ao gerar quiz: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px' }}>
          <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Alternativas por Pergunta:</label>
          <input 
            type="number" 
            min="2" 
            max="6" 
            value={optionsCount} 
            onChange={(e) => setOptionsCount(Number(e.target.value))}
            style={{ width: '60px', padding: '5px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid #334155', color: '#fff', textAlign: 'center' }}
          />
        </div>
        
        <button 
          onClick={handleGenerate} 
          disabled={generating}
          style={{
            width: '100%', padding: '12px', borderRadius: '14px', border: 'none',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white', fontWeight: 900, cursor: generating ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            opacity: generating ? 0.7 : 1, transition: '0.3s'
          }}
        >
          {generating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {generating ? "Gerando Quiz com IA..." : "Gerar Quiz IA"}
        </button>
      </div>

      {quizData && (
        <QuizEditor
          courseId={courseId}
          lessonId={lessonId}
          initialData={quizData}
          onClose={() => setQuizData(null)}
          onSaved={() => {
            setQuizData(null);
            // Chamada sem argumentos aqui pois no contexto local o dado já foi processado
          }}
        />
      )}
    </>
  );
}