import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import "./App.css";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

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

      const { error } = await supabase.auth.signUp({

        email,
        password,
        // se quiser mandar metadados:
        // options: {
        //   data: { name: "Nome do usuário" },
        // },
      }); // [web:655]

      if (error) {
        throw error;
      }

      // Em muitos projetos o Supabase exige confirmação por e‑mail.
      setSuccessMessage(
        "Cadastro realizado. Verifique seu e-mail para confirmar a conta."
      );
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Erro ao cadastrar. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleGoToLogin() {
    navigate("/");
  }

  return (
    <div className="auth-page">
      <div className="auth-right">
        <div className="login-card">
          <header className="login-header">
            <h1>Criar conta</h1>
            <p>Preencha seus dados para acessar a plataforma.</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">E-mail</label>
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

            <div className="field">
              <label htmlFor="confirm">Confirmar senha</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
            </div>

            {errorMessage && (
              <div className="feedback feedback-error">{errorMessage}</div>
            )}

            {successMessage && (
              <div className="feedback feedback-success">
                {successMessage}
              </div>
            )}

            <button
              className="primary-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Cadastrando..." : "Criar conta"}
            </button>

            <p className="signup-hint">
              Já tem uma conta?{" "}
              <button
                type="button"
                className="link-button"
                onClick={handleGoToLogin}
              >
                Entrar
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Signup;
