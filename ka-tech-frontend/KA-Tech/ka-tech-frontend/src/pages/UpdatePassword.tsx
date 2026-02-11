import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

import "../App.css";
import logoKaTech from "../assets/ka-tech-logo.png";

function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setErrorMessage("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      // O Supabase atualiza a senha do usuário da sessão atual (vinda do link do e-mail)
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setSuccessMessage("Senha atualizada! Redirecionando para o login...");
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) {
      setErrorMessage(err?.message || "Erro ao atualizar senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      {/* Lado esquerdo – Marca e Visual KA Tech */}
      <div className="auth-left">
        <div className="brand">
          <img src={logoKaTech} alt="KA Tech" className="brand-logo" />
        </div>

        <div className="left-content">
          <h2>Sua segurança é nossa prioridade.</h2>
          <p>
            Crie uma nova senha forte para proteger seus fluxos e 
            garantir que apenas você tenha acesso à plataforma.
          </p>
          <div className="abstract-graphic" />
        </div>
      </div>

      {/* Lado direito – Formulário de Nova Senha */}
      <div className="auth-right">
        <div className="login-card">
          <header className="login-header">
            <h1>Nova Senha</h1>
            <p>Crie uma senha de acesso para sua conta.</p>
          </header>

          <form className="login-form" onSubmit={handleUpdate}>
            <div className="field">
              <label htmlFor="password">Nova Senha</label>
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
              <label htmlFor="confirm">Confirmar Nova Senha</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {errorMessage && <div className="feedback feedback-error">{errorMessage}</div>}
            {successMessage && <div className="feedback feedback-success">{successMessage}</div>}

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Confirmar Nova Senha"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default UpdatePassword;