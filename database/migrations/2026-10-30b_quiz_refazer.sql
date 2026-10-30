-- =============================================================================
-- KA Tech — Quiz da aula: permitir refazer (rodar depois de 2026-10-29)
-- A tabela antiga tinha uma tentativa por aluno e quiz (unique user_id, quiz_id),
-- e o "Refazer" dava "duplicate key ... quiz_attempts_user_id_quiz_id_key".
-- Agora cada envio é uma tentativa; o quiz mostra a melhor nota e a última.
-- =============================================================================

alter table public.quiz_attempts
  drop constraint if exists quiz_attempts_user_id_quiz_id_key;

drop index if exists public.quiz_attempts_user_id_quiz_id_key;
