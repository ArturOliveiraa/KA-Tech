import React, { useState } from "react";
import api from "./services/api";

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await api.post("/auth/login", { email, password });
      const { token, user } = response.data;

      if (remember) {
        localStorage.setItem("ka-tech-token", token);
      }

      setSuccessMessage(`Bem-vindo, ${user.name}!`);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.error || "Erro ao fazer login. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
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
                onClick={() =>
                  alert("Fluxo de recuperação ainda não implementado.")
                }
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
                onClick={() =>
                  alert("Fluxo de cadastro ainda não implementado.")
                }
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

export default App;
