import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { supabase } from "../supabaseClient";
import AuthLayout, { AuthField } from "../components/AuthLayout";
import { Button } from "../components/ui";
import { authErrorMessage } from "../utils/authErrors";

function ResetPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/update-password",
      });
      if (error) throw error;
      setSuccessMessage("Se este e-mail estiver cadastrado, enviaremos um link de recuperação.");
    } catch (err: any) {
      setErrorMessage(authErrorMessage(err, "Não foi possível enviar o link."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Esqueceu a senha?"
      subtitle="Informe seu e-mail e enviaremos um link para criar uma nova."
      heroTitle="Recupere seu acesso em poucos passos."
      heroText="Seu progresso, conquistas e certificados continuam salvos."
      footer={<span>Lembrou a senha? <Link to="/login" className="auth-link">Entrar</Link></span>}
    >
      <form className="auth-form" onSubmit={handleResetRequest}>
        <AuthField
          label="E-mail cadastrado"
          type="email"
          autoComplete="email"
          placeholder="voce@email.com"
          icon={<Mail size={18} />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {errorMessage && <div className="ui-alert ui-alert--danger" role="alert">{errorMessage}</div>}
        {successMessage && <div className="ui-alert ui-alert--success" role="status">{successMessage}</div>}

        <Button type="submit" size="lg" block loading={loading}>
          {loading ? "Enviando..." : "Enviar link de recuperação"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default ResetPassword;
