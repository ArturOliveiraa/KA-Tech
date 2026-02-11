import os
import json
import google.generativeai as genai
from supabase import create_client, Client
from dotenv import load_dotenv

# Carrega as variáveis de ambiente
load_dotenv()

# --- CONFIGURAÇÕES ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") 
GEMINI_KEY = os.getenv("GEMINI_API_KEY")

# Configurações
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GEMINI_KEY)

# --- DEFINIÇÃO DO MODELO ---
# Atualizado para a versão solicitada: GEMINI 2.5 FLASH
MODEL_ID = "models/gemini-2.5-flash"

def gerar_sugestao_quiz(course_id, title):
    print(f"🧠 [Auditor IA] Usando modelo: {MODEL_ID}")
    print(f"🔍 Buscando conteúdo do curso: {title} (ID: {course_id})")

    # 1. Busca as aulas
    try:
        res = supabase.table("lessons").select("title, content").eq("course_id", course_id).execute()
        lessons = res.data
    except Exception as e:
        return {"error": f"Erro Supabase: {str(e)}"}

    if not lessons:
        return {"error": "Sem aulas cadastradas neste curso."}

    # Contexto
    contexto = "\n".join([f"--- AULA: {l['title']} ---\n{l['content']}\n" for l in lessons])

    # 2. PROMPT "AUDITOR RIGOROSO"
    prompt = f"""
    ATUE COMO UM AUDITOR TÉCNICO DA KA TECH.
    Seu objetivo é criar uma prova de validação de conhecimento baseada ESTRITAMENTE no texto abaixo.

    TEXTO BASE (AULAS):
    {contexto}

    REGRAS INEGOCIÁVEIS:
    1. CONHECIMENTO FECHADO: Você NÃO SABE nada além do que está escrito acima. Se o texto não explica o conceito X, não pergunte sobre X.
    2. RIGOR FATUAL: A resposta correta deve ser uma paráfrase fiel ou citação direta do texto.
    3. SEM PEGADINHAS SUBJETIVAS: Foque em processos, definições, números e regras citadas.
    4. DISTRATORES INTELIGENTES: As alternativas erradas devem parecer corretas para quem não leu, mas estarem erradas de acordo com o texto.

    SAÍDA ESPERADA (JSON PURO):
    Gere um JSON com 10 questões seguindo exatamente este esquema:
    {{
      "quiz_title": "Avaliação: {title}",
      "description": "Teste auditado baseado no material do curso.",
      "questions": [
        {{
          "content": "Enunciado da pergunta?",
          "options": [
             {{ "content": "Alternativa A", "is_correct": false }},
             {{ "content": "Alternativa B", "is_correct": false }},
             {{ "content": "Alternativa C (Correta)", "is_correct": true }},
             {{ "content": "Alternativa D", "is_correct": false }},
             {{ "content": "Alternativa E", "is_correct": false }}
          ]
        }}
      ]
    }}
    """

    print(f"🤖 Processando com {MODEL_ID} (Temperatura 0)...")
    
    try:
        model = genai.GenerativeModel(MODEL_ID)
        
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.0 # Zero criatividade para evitar alucinações
            )
        )
        
        quiz_data = json.loads(response.text)
        print("✅ Quiz gerado com sucesso!")
        return quiz_data

    except Exception as e:
        print(f"❌ Erro na geração: {e}")
        # Dica de Debug: Se der erro de modelo não encontrado, lista os disponíveis
        try:
            print("ℹ️ Modelos disponíveis na sua chave:", [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods])
        except:
            pass
        return {"error": str(e)}

if __name__ == "__main__":
    # Teste rápido se rodar direto
    pass