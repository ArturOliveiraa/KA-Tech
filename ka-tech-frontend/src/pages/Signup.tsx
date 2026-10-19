import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Mail } from "lucide-react";
import { supabase } from "../supabaseClient";
import AuthLayout, { AuthField } from "../components/AuthLayout";
import { Button } from "../components/ui";
import { authErrorMessage } from "../utils/authErrors";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    if (password !== confirm) {
      setErrorMessage("As senhas não conferem.");
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setSuccessMessage("Cadastro realizado! Verifique seu e-mail para confirmar a conta.");
    } catch (err: any) {
      setErrorMessage(authErrorMessage(err, "Não foi possível criar a conta."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Crie sua conta"
      subtitle="Leva menos de um minuto para começar."
      heroTitle="Sua próxima habilidade começa aqui."
      heroText="Crie a conta, escolha uma trilha e acompanhe cada aula concluída."
      footer={<span>Já tem conta? <Link to="/login" className="auth-link">Entrar</Link></span>}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <AuthField
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="voce@email.com"
          icon={<Mail size={18} />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <AuthField
          label="Senha"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo de 6 caracteres"
          minLength={6}
          icon={<Lock size={18} />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <AuthField
          label="Confirmar senha"
          type="password"
          autoComplete="new-password"
          placeholder="Repita a senha"
          icon={<Lock size={18} />}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />

        {errorMessage && <div className="ui-alert ui-alert--danger" role="alert">{errorMessage}</div>}
        {successMessage && <div className="ui-alert ui-alert--success" role="status">{successMessage}</div>}

        <Button type="submit" size="lg" block loading={loading}>
          {loading ? "Criando conta..." : "Criar conta"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default Signup;
