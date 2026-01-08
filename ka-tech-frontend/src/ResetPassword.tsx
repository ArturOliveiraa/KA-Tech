// src/ResetPassword.tsx
import React, { useState } from "react";
import { supabase } from "./supabaseClient";
import "./App.css";

function ResetPassword() {
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
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw error;
      }

      setSuccessMessage("Senha alterada com sucesso. Já pode fazer login.");
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Erro ao alterar senha. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-right">
        <div className="login-card">
          <header className="login-header">
            <h1>Redefinir senha</h1>
            <p>Digite sua nova senha abaixo.</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="password">Nova senha</label>
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

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
