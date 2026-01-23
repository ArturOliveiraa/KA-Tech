// src/pages/ResetPassword.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

import "../App.css";
import logoKaTech from "../assets/ka-tech-logo.png";

function ResetPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();

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
      setSuccessMessage("Se este e-mail existir, enviaremos um link de recuperação.");
    } catch (err: any) {
      setErrorMessage(err?.message || "Erro ao solicitar recuperação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      {/* Lado esquerdo – Idêntico ao Login para consistência e responsividade */}
      <div className="auth-left">
        <div className="brand">
          <img src={logoKaTech} alt="KA Tech" className="brand-logo" />
        </div>

        <div className="left-content">
          <h2>Recupere seu acesso à tecnologia KA.</h2>
          <p>
            Não se preocupe. Em poucos passos você voltará a gerenciar
            suas conexões e fluxos inteligentes.
          </p>
          <div className="abstract-graphic" />
        </div>
      </div>

      {/* Lado direito – Formulário estilizado igual ao Login */}
      <div className="auth-right">
        <div className="login-card">
          <header className="login-header">
            <h1>Recuperar Conta</h1>
            <p>Digite seu e-mail para receber o link de acesso.</p>
          </header>

          <form className="login-form" onSubmit={handleResetRequest}>
            <div className="field">
              <label htmlFor="email">E-mail cadastrado</label>
              <div className="input-wrapper">
                <span className="input-icon">@</span>
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {errorMessage && (
              <div className="feedback feedback-error">{errorMessage}</div>
            )}

            {successMessage && (
              <div className="feedback feedback-success">{successMessage}</div>
            )}

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Enviando..." : "Enviar link de recuperação"}
            </button>

            <p className="signup-hint">
              Lembrou a senha?{" "}
              <button
                type="button"
                className="link-button"
                onClick={() => navigate("/")}
              >
                Voltar ao Login
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;