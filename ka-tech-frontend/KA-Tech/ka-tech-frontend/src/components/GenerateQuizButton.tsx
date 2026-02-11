import { useState } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { QuizEditor } from "./QuizEditor";

interface GenerateQuizButtonProps {
  courseId: number;
  title: string;
  description?: string; // Opcional agora
  onQuizGenerated?: () => void;
}

export function GenerateQuizButton({ courseId, title, onQuizGenerated }: GenerateQuizButtonProps) {
  const [loading, setLoading] = useState(false);
  const [editorData, setEditorData] = useState<any>(null);

  const handleGeneratePreview = async () => {
    if (!confirm(`Deseja iniciar o processo de criação de Quiz com IA para "${title}"?`)) return;

    setLoading(true);
    try {
      // 1. Chama a API Python local (Certifique-se que python api.py está rodando)
      // Se mudou a porta para 8001, ajuste aqui. Padrão é 8000.
      const response = await fetch('http://127.0.0.1:8000/generate-quiz-preview', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, title }),
      });

      if (!response.ok) {
        throw new Error("Falha na conexão com o Bot Python.");
      }

      const json = await response.json();
      
      if (json.success && json.data) {
        // 2. Recebe os dados e abre o Modal
        setEditorData(json.data);
      } else {
        alert("A IA não retornou dados válidos. Tente novamente.");
      }

    } catch (error: any) {
      console.error(error);
      alert("Erro ao conectar com a IA:\n" + error.message + "\n\nVerifique se o terminal do Python está aberto!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleGeneratePreview}
        disabled={loading}
        className="action-btn"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          background: loading ? 'rgba(255, 255, 255, 0.05)' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
          opacity: loading ? 0.7 : 1,
          padding: '14px',
          borderRadius: '16px',
          cursor: loading ? 'not-allowed' : 'pointer',
          width: '100%',
          marginTop: '15px',
          fontWeight: 800,
          fontSize: '0.8rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          boxShadow: loading ? 'none' : '0 10px 20px -5px rgba(124, 58, 237, 0.4)',
          transition: 'all 0.3s ease'
        }}
      >
        {loading ? (
          <Loader2 className="animate-spin w-4 h-4" />
        ) : (
          <Wand2 className="w-4 h-4" />
        )}
        <span>{loading ? "IA Criando Rascunho..." : "Gerar Quiz com IA"}</span>
      </button>

      {/* 3. Renderiza o Modal de Edição se houver dados */}
      {editorData && (
        <QuizEditor 
          courseId={courseId}
          initialData={editorData}
          onClose={() => setEditorData(null)}
          onSaved={() => {
            setEditorData(null);
            if (onQuizGenerated) onQuizGenerated();
          }}
        />
      )}
    </>
  );
}