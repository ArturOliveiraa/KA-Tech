import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Mail } from "lucide-react";
import { supabase } from "../supabaseClient";
import AuthLayout, { AuthField } from "../components/AuthLayout";
import { Button } from "../components/ui";
import discordLogo from "../assets/discord-logo.png";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [remember, setRemember] = useState(true);

  const navigate = useNavigate();

  async function handleSocialLogin(provider: "google" | "discord") {
    setLoading(true);
    setErrorMessage("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMessage(err.message || `Erro ao entrar com ${provider}.`);
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.session || !data.user) throw new Error("Sessão não criada.");

      if (remember) localStorage.setItem("ka-tech-token", data.session.access_token);
      else localStorage.removeItem("ka-tech-token");

      const displayName = data.user.user_metadata?.name || data.user.email;
      setSuccessMessage(`Bem-vindo, ${displayName}! Redirecionando...`);
      setTimeout(() => navigate("/dashboard"), 1000);
    } catch (err: any) {
      setErrorMessage(err?.message || "Erro ao fazer login. Verifique suas credenciais.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Bem-vindo de volta"
      subtitle="Entre para continuar de onde parou."
      footer={
        <>
          <span>Não tem uma conta? <Link to="/signup" className="auth-link">Cadastre-se</Link></span>
          <Link to="/privacidade" className="auth-link auth-footer__legal">Política de Privacidade</Link>
        </>
      }
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
          autoComplete="current-password"
          placeholder="Sua senha"
          icon={<Lock size={18} />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className="auth-row">
          <label className="auth-check">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Lembrar de mim
          </label>
          <Link to="/reset-password" className="auth-link">Esqueceu a senha?</Link>
        </div>

        {errorMessage && <div className="ui-alert ui-alert--danger" role="alert">{errorMessage}</div>}
        {successMessage && <div className="ui-alert ui-alert--success" role="status">{successMessage}</div>}

        <Button type="submit" size="lg" block loading={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </Button>

        <div className="auth-divider">ou continue com</div>

        <div className="auth-social">
          <Button variant="secondary" onClick={() => handleSocialLogin("google")} disabled={loading} icon={<span className="auth-google">G</span>}>
            Google
          </Button>
          <Button variant="secondary" onClick={() => handleSocialLogin("discord")} disabled={loading} icon={<img src={discordLogo} alt="" />}>
            Discord
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}

export default Login;
