from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import sys

# IMPORTANTE: Importamos a nova função que APENAS gera o JSON (sem salvar)
# Certifique-se de ter atualizado o arquivo bot_quiz.py conforme conversamos
from bot_quiz import gerar_sugestao_quiz 

app = FastAPI()

# --- CONFIGURAÇÃO DE CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELO DE DADOS ---
class QuizRequest(BaseModel):
    courseId: int
    title: str

@app.get("/")
def health_check():
    return {"status": "online", "mode": "preview_mode"}

# --- ROTA DE PREVIEW ---
# O React chama aqui, pega o JSON e abre o Modal de Edição
@app.post("/generate-quiz-preview")
async def generate_quiz_preview_endpoint(req: QuizRequest):
    print(f"📡 PREVIEW SOLICITADO: Gerando rascunho para '{req.title}' (ID: {req.courseId})")
    
    try:
        # Chama a IA para ler as aulas e montar o JSON
        quiz_data = gerar_sugestao_quiz(req.courseId, req.title)
        
        # Verifica se a função retornou algum erro interno
        if "error" in quiz_data:
             print(f"⚠️ Erro na geração: {quiz_data['error']}")
             raise HTTPException(status_code=400, detail=quiz_data["error"])

        # Retorna o JSON para o React (NÃO SALVA NO BANCO AINDA)
        return {
            "success": True, 
            "data": quiz_data 
        }
    
    except Exception as e:
        print(f"❌ ERRO CRÍTICO NA API: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("🔥 Servidor de IA KA-Tech (Modo Editor) Iniciado!")
    print("👂 Aguardando pedidos na porta 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)