/** Traduz as mensagens do Supabase Auth para português, com orientação do que fazer. */
export function authErrorMessage(err: any, fallback = "Não foi possível concluir. Tente novamente."): string {
  const raw = String(err?.message || "").toLowerCase();
  const status = err?.status;

  if (raw.includes("error sending confirmation email") || raw.includes("error sending recovery email") || raw.includes("error sending")) {
    return "Não conseguimos enviar o e-mail agora. Tente entrar com o Google ou avise a equipe da KA Tech.";
  }
  if (raw.includes("rate limit") || raw.includes("too many") || status === 429) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";
  }
  if (raw.includes("already registered") || raw.includes("already exists") || raw.includes("user already")) {
    return "Este e-mail já tem conta. Entre ou use \"Esqueceu a senha?\".";
  }
  if (raw.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (raw.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar. Procure a mensagem na caixa de entrada ou no spam.";
  }
  if (raw.includes("password should be at least") || raw.includes("weak password")) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }
  if (raw.includes("invalid email") || raw.includes("unable to validate email")) {
    return "Esse e-mail não parece válido.";
  }
  if (raw.includes("signups not allowed") || raw.includes("signup is disabled")) {
    return "O cadastro está desativado no momento. Fale com a equipe da KA Tech.";
  }
  if (raw.includes("same password") || raw.includes("should be different")) {
    return "A nova senha precisa ser diferente da atual.";
  }
  if (raw.includes("failed to fetch") || raw.includes("network")) {
    return "Sem conexão com o servidor. Verifique sua internet.";
  }
  return err?.message ? `${fallback} (${err.message})` : fallback;
}
