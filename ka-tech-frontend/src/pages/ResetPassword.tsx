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
    <div className="auth-isolation-wrapper">
      <style>{`
        .auth-isolation-wrapper { 
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; 
          background: #020617; overflow: hidden; font-family: 'Sora', sans-serif;
        }

        .auth-page-v2 { 
          display: flex; width: 100%; height: 100%; 
          /* Gradiente que se adapta ao centro no mobile */
          background: radial-gradient(circle at center, #1a1033 0%, #020617 70%);
        }

        @media (min-width: 1025px) {
          .auth-page-v2 { background: radial-gradient(circle at 20% 30%, #1a1033 0, #020617 60%, #000 100%); }
        }

        /* Lado Visual (Desktop) */
        .auth-visual-side { 
          flex: 1.2; display: flex; flex-direction: column; align-items: center; justify-content: center; 
          padding: 40px; animation: fadeUp 0.8s ease-out; 
        }

        .brand-logo-premium { 
          max-height: 200px; width: auto; 
          filter: drop-shadow(0 0 30px rgba(139, 92, 246, 0.4));
          margin-bottom: 30px; animation: float 6s ease-in-out infinite; 
        }

        /* Logo Mobile (Só aparece no celular) */
        .mobile-logo-container { display: none; text-align: center; margin-bottom: 25px; }
        .mobile-logo-container img { 
          height: 80px; filter: drop-shadow(0 0 20px rgba(139, 92, 246, 0.5));
          animation: float 6s ease-in-out infinite;
        }

        .visual-text { text-align: center; max-width: 450px; }
        .visual-text h2 { 
          font-size: 2.2rem; font-weight: 800; color: #fff; line-height: 1.2;
          background: linear-gradient(to right, #fff, #c4b5fd); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }

        /* Lado Formulário */
        .auth-form-side { 
          flex: 1; display: flex; align-items: center; justify-content: center; padding: 25px;
          backdrop-filter: blur(10px);
        }

        .premium-login-card { 
          width: 100%; max-width: 420px; 
          background: rgba(15, 23, 42, 0.7); 
          border: 1px solid rgba(139, 92, 246, 0.2); 
          border-radius: 32px; padding: 45px 35px;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
          animation: fadeUp 0.8s ease-out 0.2s backwards;
        }

        .login-header h1 { font-size: 1.8rem; color: #fff; font-weight: 800; margin-bottom: 10px; text-align: center; }
        .login-header p { color: #94a3b8; font-size: 0.95rem; margin-bottom: 35px; text-align: center; }

        .input-group label { display: block; color: #e2e8f0; font-size: 0.9rem; margin-bottom: 10px; font-weight: 600; }
        
        .premium-input-wrapper { 
          display: flex; align-items: center; background: #020617; border: 2px solid #1e293b; 
          border-radius: 16px; padding: 14px 18px; transition: 0.3s ease; 
        }
        .premium-input-wrapper:focus-within { border-color: #8b5cf6; box-shadow: 0 0 20px rgba(139, 92, 246, 0.15); }
        .premium-input-wrapper input { background: transparent; border: none; color: #fff; width: 100%; outline: none; margin-left: 12px; font-size: 1rem; }

        .btn-premium-action { 
          width: 100%; padding: 18px; border: none; border-radius: 16px; color: #fff; font-weight: 800;
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); cursor: pointer; transition: 0.3s;
          margin-top: 15px; font-size: 1rem;
        }
        .btn-premium-action:hover { transform: translateY(-3px); box-shadow: 0 15px 30px rgba(124, 58, 237, 0.4); }

        .auth-footer { margin-top: 30px; text-align: center; color: #64748b; font-size: 0.9rem; }
        
        .link-text { 
          color: #a78bfa; background: none; border: none; font-weight: 700; cursor: pointer; 
          margin-left: 8px; transition: 0.3s; position: relative;
        }
        .link-text::after { content: ''; position: absolute; bottom: -2px; left: 0; width: 0; height: 2px; background: #a78bfa; transition: 0.3s; }
        .link-text:hover::after { width: 100%; }

        /* Mobile Adjustments (MLP) */
        @media (max-width: 1024px) {
          .auth-visual-side { display: none; }
          .mobile-logo-container { display: block; }
          .premium-login-card { 
            background: rgba(15, 23, 42, 0.4); 
            border: 1px solid rgba(255, 255, 255, 0.05);
            padding: 35px 25px;
          }
          .login-header h1 { font-size: 1.6rem; }
        }

        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="auth-page-v2">
        {/* DESKTOP VISUAL */}
        <div className="auth-visual-side">
          <img src={logoKaTech} alt="KA Tech" className="brand-logo-premium" />
          <div className="visual-text">
            <h2>Recupere seu acesso.</h2>
            <p>Em poucos passos você voltará a gerenciar suas conexões e fluxos inteligentes.</p>
          </div>
        </div>

        {/* FORM SIDE */}
        <div className="auth-form-side">
          <div className="premium-login-card">
            {/* LOGO QUE APARECE SÓ NO MOBILE */}
            <div className="mobile-logo-container">
              <img src={logoKaTech} alt="KA Tech" />
            </div>

            <header className="login-header">
              <h1>Esqueci a senha</h1>
              <p>Digite seu e-mail para receber o link.</p>
            </header>

            <form onSubmit={handleResetRequest}>
              <div className="input-group" style={{ marginBottom: "25px" }}>
                <label>E-mail cadastrado</label>
                <div className="premium-input-wrapper">
                  <span style={{ color: "#64748b" }}>@</span>
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {errorMessage && <div className="feedback feedback-error" style={{ marginBottom: "20px", color: "#f87171", textAlign: "center", fontSize: "0.85rem" }}>{errorMessage}</div>}
              {successMessage && <div className="feedback feedback-success" style={{ marginBottom: "20px", color: "#34d399", textAlign: "center", fontSize: "0.85rem" }}>{successMessage}</div>}

              <button className="btn-premium-action" type="submit" disabled={loading}>
                {loading ? "Enviando..." : "Enviar link de recuperação"}
              </button>

              <div className="auth-footer">
                <span>Lembrou a senha?</span>
                <button type="button" className="link-text" onClick={() => navigate("/login")}>
                  Entrar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;