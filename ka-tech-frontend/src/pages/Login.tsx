import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Mail } from "lucide-react";
import { supabase } from "../supabaseClient";
import AuthLayout, { AuthField } from "../components/AuthLayout";
import { Button } from "../components/ui";
import { authErrorMessage } from "../utils/authErrors";
import discordLogo from "../assets/discord-logo.png";

/** Logo oficial do Google ("G" multicolorido), como pedem as diretrizes de login do Google */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

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
      setErrorMessage(authErrorMessage(err, `Não foi possível entrar com ${provider === "google" ? "Google" : "Discord"}.`));
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
      setErrorMessage(authErrorMessage(err, "Não foi possível entrar."));
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
          <Button variant="secondary" onClick={() => handleSocialLogin("google")} disabled={loading} icon={<GoogleIcon />}>
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
