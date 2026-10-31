# Migrações antigas (histórico)

Os arquivos desta pasta foram rodados à mão no SQL Editor até 31/10/2026 e ficam
aqui só como registro. **Não crie arquivos novos aqui.**

Migrações novas vão em `supabase/migrations/` com o nome `AAAAMMDDHHMMSS_assunto.sql`
(ou `npx supabase migration new assunto`). Ao chegar na `main`, o GitHub Actions
(`.github/workflows/supabase.yml`) aplica as que faltam e publica as Edge Functions.
O banco guarda quais já rodaram, então cada arquivo roda uma vez só.

Escreva sem `begin;`/`commit;`: a CLI já roda cada arquivo numa transação.
