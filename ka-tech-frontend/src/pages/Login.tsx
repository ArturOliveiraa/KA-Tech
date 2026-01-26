// src/pages/Login.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

import "../App.css";
import logoKaTech from "../assets/ka-tech-logo.png";
import discordLogo from "../assets/discord-logo.png";

function Login() { 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [remember, setRemember] = useState(true);

  const navigate = useNavigate();

  // Função para Login Social (Google e Discord)
  async function handleSocialLogin(provider: 'google' | 'discord') {
    setLoading(true);
    setErrorMessage("");
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      console.error(err);
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

      if (remember) {
        localStorage.setItem("ka-tech-token", session.access_token);
      } else {
        localStorage.removeItem("ka-tech-token");
      }

      const displayName = user.user_metadata?.name || user.email;
      setSuccessMessage(`Bem-vindo, ${displayName}! Redirecionando...`);

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
      <style>{`
        .social-google, .social-discord {
          transition: all 0.3s ease !important;
        }
        .social-google:hover, .social-discord:hover {
          filter: brightness(1.2);
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.05) !important;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }

        /* NOVO BOTÃO SUTIL */
        .btn-floating-plans {
          position: absolute;
          top: 2rem;
          right: 2rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(139, 92, 246, 0.3);
          color: #94a3b8;
          padding: 0.7rem 1.4rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 100;
        }

        .btn-floating-plans:hover {
          color: #fff;
          border-color: #8b5cf6;
          background: rgba(139, 92, 246, 0.1);
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
          transform: translateY(-2px);
        }

        @media (max-width: 1024px) {
          .auth-page {
            flex-direction: column !important;
            height: auto !important;
            min-height: 100vh;
            padding: 40px 20px !important;
            overflow-y: auto;
            justify-content: flex-start !important;
          }
          .btn-floating-plans {
            top: 1rem;
            right: 1rem;
            padding: 0.5rem 1rem;
            font-size: 0.75rem;
          }
          .auth-left {
            display: flex !important;
            width: 100% !important;
            padding: 0 0 40px 0 !important;
            align-items: center;
            text-align: center;
            flex-direction: column !important;
          }
          .brand {
            display: flex !important;
            justify-content: center !important;
            width: 100% !important;
            margin-bottom: 25px !important;
          }
          .brand-logo {
            height: 140px !important; /* Ajustado para mobile */
            width: auto !important;
            object-fit: contain !important;
          }
          .left-content {
            margin: 0 !important;
            max-width: 100% !important;
          }
          .left-content h2 {
            font-size: 1.6rem !important;
            line-height: 1.2 !important;
            margin-bottom: 15px;
          }
          .left-content p {
            font-size: 0.9rem !important;
            display: block !important;
            color: #94a3b8 !important;
          }
          .abstract-graphic {
            display: none;
          }
          .auth-right {
            width: 100% !important;
            padding: 0 !important;
            display: flex;
            justify-content: center;
          }
          .login-card {
            width: 100% !important;
            max-width: 450px !important;
            margin: 0 auto !important;
          }
        }
      `}</style>

      {/* BOTÃO VER PLANOS */}
      <button className="btn-floating-plans" onClick={() => navigate('/planos')}>
        <span>💎</span> Ver Planos
      </button>

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

      <div className="auth-right">
        <div className="login-card">
          <header className="login-header">
            <h1>Bem-vindo de volta!</h1>
            <p>Acesse sua conta para maximizar o seu aprendizado.</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">E-mail</label>
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
              {loading ? "Processando..." : "Entrar na plataforma"}
            </button>

            <div className="divider">
              <span>ou entre com</span>
            </div>

            <div className="social-row">
              <button
                type="button"
                className="social-button social-google"
                onClick={() => handleSocialLogin('google')}
                disabled={loading}
              >
                <span className="social-icon">G</span>
                <span>Google</span>
              </button>

              <button
                type="button"
                className="social-button social-discord"
                onClick={() => handleSocialLogin('discord')}
                disabled={loading}
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

            <p className="signup-hint" style={{ marginTop: '15px' }}>
              <a
                href="/privacidade"
                className="link-button"
                style={{ 
                  fontSize: '0.8rem', 
                  opacity: 0.7, 
                  textDecoration: 'none',
                  cursor: 'pointer' 
                }}
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/privacidade");
                }}
              >
                Política de Privacidade
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;