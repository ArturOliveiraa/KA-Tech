# Busca semântica das aulas (pandAI)

Quando uma aula é **publicada** (ou tem título, vídeo ou texto alterados), o banco chama a função
`index-lesson`. Ela pede ao **Gemini** a transcrição do vídeo do YouTube com o minuto de cada trecho,
gera os vetores e grava em `lesson_chunks`. A busca da tela **Trilhas** usa a função `search-lessons`
e leva o aluno direto ao minuto da aula.

```
Aula publicada ──gatilho──▶ index-lesson ──▶ Gemini (transcrição + vetores) ──▶ lesson_chunks
Aluno pergunta ──▶ search-lessons ──▶ search_lesson_chunks (vetor + palavra, respeita acesso) ──▶ /curso/...?aula=ID&t=SEG
```

## Publicar (uma vez)

Faça os passos **nesta ordem**. A CLI do Supabase roda com `npx`, sem instalar nada.

1. **Chave do Gemini:** crie em <https://aistudio.google.com/apikey>.
2. **Segredo da indexação:** gere um valor aleatório, por exemplo com `openssl rand -hex 32`.
3. **Vault** (SQL Editor do Supabase):
   ```sql
   select vault.create_secret('https://zvgchncgvadzpkffhfbr.supabase.co/functions/v1/index-lesson', 'index_lesson_url');
   select vault.create_secret('<SEGREDO>', 'index_lesson_secret');
   ```
4. **Segredos das funções** (painel → Edge Functions → Secrets):
   `GEMINI_API_KEY` e `INDEX_LESSON_SECRET` (o mesmo `<SEGREDO>`).
   Opcionais: `GEMINI_TRANSCRIBE_MODEL` (padrão `gemini-3.6-flash`) e `GEMINI_EMBED_MODEL` (padrão `gemini-embedding-2`).
5. **Migração:** rode `database/migrations/2026-10-28_busca_semantica_aulas.sql` inteiro no SQL Editor.
6. **Funções** (na pasta `KA-Tech`):
   ```bash
   npx supabase login
   npx supabase link --project-ref zvgchncgvadzpkffhfbr
   npx supabase functions deploy index-lesson --no-verify-jwt
   npx supabase functions deploy search-lessons
   ```
7. **Fila automática:** rode `database/migrations/2026-10-28b_fila_indexacao.sql`. A cada minuto o banco
   envia até 2 aulas pendentes para transcrição e tenta de novo as que falharam por limite do Gemini.
   O botão **Indexar N pendente(s)** do admin continua disponível para adiantar um curso.

> As Edge Functions **não** são publicadas pelo Cloudflare nem pelo `git push`. Depois de mudar algo
> em `supabase/functions`, rode o `deploy` de novo.

## Limites e cuidados

- **Só vídeos públicos do YouTube** são transcritos pelo Gemini. Para vídeos não listados ou privados,
  cole o texto em "Transcrição ou resumo" na aula: ele é indexado no lugar do vídeo.
- **Plano gratuito do Gemini:** até 8 horas de vídeo do YouTube por dia. Indexe em lotes.
- **Tempo:** cada aula leva de segundos a ~2 minutos. Aulas muito longas podem passar do limite de
  tempo da Edge Function no plano gratuito do Supabase; nesse caso a aula fica com "Erro na busca".
- **Trocar o modelo de vetores** exige reindexar tudo (os vetores de modelos diferentes não se comparam).
