import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

import "./App.css";
import logoKaTech from "./assets/ka-tech-logo.png";
import discordLogo from "./assets/discord-logo.png";

function App() {
  const [email, setEmail] = useState("artur.seguro@example.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [remember, setRemember] = useState(true);

  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      // ======== NOVO: login via Supabase Auth ========
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      const session = data.session;
      const user = data.user;

      if (!session || !user) {
        throw new Error("Sessão não criada.");
      }

      if (remember) {
        // guarda o access token do Supabase (opcional, o SDK já gerencia)
        localStorage.setItem("ka-tech-token", session.access_token);
      }

      // por padrão o Supabase não tem name, então usamos o e-mail;
      // depois dá para trocar para user.user_metadata.name
      setSuccessMessage(`Bem-vindo, ${user.email}!`);

      // se quiser já redirecionar depois do login:
      // setTimeout(() => navigate("/dashboard"), 800);
      // ===============================================
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err?.message ||
        err?.error_description ||
        "Erro ao fazer login. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSignupClick() {
    navigate("/signup");
  }

  return (
    <div className="auth-page">
      {/* Lado esquerdo – marca e visual */}
      <div className="auth-left">
        <div className="brand">
          <img src={logoKaTech} alt="KA Tech" className="brand-logo" />
        </div>

        <div className="left-content">
          <h2>Potencialize sua comunicação com a tecnologia KA.</h2>
          <p>
            Fluxos inteligentes, mensagens automatizadas e conexões que
            trabalham por você.
          </p>

          <div className="abstract-graphic" />
        </div>
      </div>

      {/* Lado direito – formulário */}
      <div className="auth-right">
        <div className="login-card">
          <header className="login-header">
            <h1>Bem-vindo de volta!</h1>
            <p>Acesse sua conta para gerenciar suas conexões.</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">E-mail ou celular</label>
              <div className="input-wrapper">
                <span className="input-icon">@</span>
                <input
                  id="email"
                  type="email"
                  placeholder="seu.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="password">Senha</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-meta">
              <label className="remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Lembrar de mim
              </label>

              <button
                type="button"
                className="link-button"
                onClick={handleForgotPassword}
              >
                Esqueceu a senha?
              </button>

            </div>

            {errorMessage && (
              <div className="feedback feedback-error">{errorMessage}</div>
            )}

            {successMessage && (
              <div className="feedback feedback-success">
                {successMessage}
              </div>
            )}

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Entrando..." : "Entrar na plataforma"}
            </button>

            <div className="divider">
              <span>ou entre com</span>
            </div>

            <div className="social-row">
              <button
                type="button"
                className="social-button social-google"
                onClick={() =>
                  alert("Login com Google ainda não implementado.")
                }
              >
                <span className="social-icon">G</span>
                <span>Google</span>
              </button>

              <button
                type="button"
                className="social-button social-discord"
                onClick={() =>
                  alert("Login com Discord ainda não implementado.")
                }
              >
                <img
                  src={discordLogo}
                  alt="Discord"
                  className="social-icon-img"
                />
                <span>Discord</span>
              </button>
            </div>

            <p className="signup-hint">
              Não tem uma conta?{" "}
              <button
                type="button"
                className="link-button"
                onClick={handleSignupClick}
              >
                Cadastre-se
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

async function handleForgotPassword() {
  const emailPrompt = prompt("Digite o e-mail da conta para redefinir a senha:");

  if (!emailPrompt) return;

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(emailPrompt, {
      redirectTo: "http://localhost:3000/reset-password",
    });

    if (error) {
      alert(error.message || "Erro ao enviar e-mail de redefinição.");
      return;
    }

    alert("Se esse e-mail existir, enviaremos um link de redefinição.");
  } catch (err: any) {
    console.error(err);
    alert("Erro ao enviar e-mail de redefinição.");
  }
}

export default App;
