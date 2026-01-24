// src/pages/Login.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

import "../App.css";
import logoKaTech from "../assets/ka-tech-logo.png";
import discordLogo from "../assets/discord-logo.png";

function Login() { // Renomeado de App para Login
  const [email, setEmail] = useState("");
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
      // Login via Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const session = data.session;
      const user = data.user;

      if (!session || !user) {
        throw new Error("Sessão não criada.");
      }

      // Gerencia o token local se "Lembrar de mim" estiver marcado
      if (remember) {
        localStorage.setItem("ka-tech-token", session.access_token);
      } else {
        localStorage.removeItem("ka-tech-token");
      }

      // Tenta pegar o nome dos metadados ou usa o email
      const displayName = user.user_metadata?.name || user.email;
      setSuccessMessage(`Bem-vindo, ${displayName}! Redirecionando...`);

      // Redireciona para o dashboard após um breve delay
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err?.message || "Erro ao fazer login. Verifique suas credenciais."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      {/* Lado esquerdo – marca e visual KA Tech */}
      <div className="auth-left">
        <div className="brand">
          <img src={logoKaTech} alt="KA Tech" className="brand-logo" />
        </div>

        <div className="left-content">
          <h2>Transforme sua carreira com a tecnologia que move o mundo.</h2>
          <p>
            Sua jornada de aprendizado contínuo começa aqui. 
            Acesse os melhores conteúdos de cursos, lives e tenha acesso a uma comunidade de aprendizado ativa.
          </p>
          <div className="abstract-graphic" />
        </div>
      </div>

      {/* Lado direito – formulário de login */}
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
                  placeholder="email@exemplo.com"
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
                onClick={() => navigate("/reset-password")}
              >
                Esqueceu a senha?
              </button>
            </div>

            {errorMessage && (
              <div className="feedback feedback-error">{errorMessage}</div>
            )}

            {successMessage && (
              <div className="feedback feedback-success">{successMessage}</div>
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
                onClick={() => alert("Login com Google ainda não implementado.")}
              >
                <span className="social-icon">G</span>
                <span>Google</span>
              </button>

              <button
                type="button"
                className="social-button social-discord"
                onClick={() => alert("Login com Discord ainda não implementado.")}
              >
                <img src={discordLogo} alt="Discord" className="social-icon-img" />
                <span>Discord</span>
              </button>
            </div>

            <p className="signup-hint">
              Não tem uma conta?{" "}
              <button
                type="button"
                className="link-button"
                onClick={() => navigate("/signup")}
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

export default Login; // Exportado como Login