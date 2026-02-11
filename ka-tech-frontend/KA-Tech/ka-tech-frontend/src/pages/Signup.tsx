import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

import "../App.css";
import logoKaTech from "../assets/ka-tech-logo.png";

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
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setSuccessMessage("Cadastro realizado! Verifique seu e-mail.");
    } catch (err: any) {
      setErrorMessage(err?.message || "Erro ao cadastrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-isolation-wrapper">
      <style>{`
        /* 1. BASE E FUNDO DINÂMICO */
        .auth-isolation-wrapper { 
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; 
          z-index: 9999; background: #020617; font-family: 'Sora', sans-serif; overflow-y: auto; 
        }
        
        .auth-page-v2 { 
          display: flex; width: 100%; min-height: 100%; 
          background: radial-gradient(circle at center, #1a1033 0%, #020617 70%); 
        }

        /* 2. ANIMAÇÕES */
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

        /* 3. LADO VISUAL (DESKTOP) */
        .auth-visual-side { 
          flex: 1.2; display: flex; flex-direction: column; align-items: center; justify-content: center; 
          padding: 60px; animation: fadeUp 0.8s ease-out; 
        }
        .brand-logo-premium { 
          height: 240px; width: auto; filter: drop-shadow(0 0 40px rgba(139, 92, 246, 0.5)); 
          margin-bottom: 40px; animation: float 6s ease-in-out infinite; 
        }
        .visual-text h2 { 
          font-size: 2.4rem; font-weight: 800; color: #fff; text-align: center;
          background: linear-gradient(to right, #fff, #c4b5fd); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }

        /* 4. CABEÇALHO MOBILE (O PANDA NO CELULAR) */
        .mobile-premium-header { display: none; text-align: center; margin-bottom: 30px; }
        .mobile-premium-header img { 
          height: 100px; filter: drop-shadow(0 0 25px rgba(139, 92, 246, 0.6)); 
          animation: float 6s ease-in-out infinite; 
        }

        /* 5. CARD DE FORMULÁRIO */
        .auth-form-side { 
          flex: 1; display: flex; align-items: center; justify-content: center; padding: 20px; 
        }
        .premium-login-card { 
          width: 100%; max-width: 440px; background: rgba(15, 23, 42, 0.7); 
          backdrop-filter: blur(20px); border: 1px solid rgba(139, 92, 246, 0.2); 
          border-radius: 32px; padding: 50px 40px; box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6); 
          animation: fadeUp 0.8s ease-out 0.2s backwards;
        }

        .login-header h1 { font-size: 1.8rem; color: #fff; font-weight: 800; margin-bottom: 8px; }
        .login-header p { color: #94a3b8; margin-bottom: 30px; font-size: 0.95rem; }

        /* 6. INPUTS E BOTÕES */
        .input-group { margin-bottom: 20px; text-align: left; }
        .input-group label { display: block; color: #e2e8f0; font-size: 0.85rem; margin-bottom: 8px; font-weight: 600; }
        .premium-input-wrapper { 
          display: flex; align-items: center; background: #020617; border: 2px solid #1e293b; 
          border-radius: 16px; padding: 14px 18px; transition: 0.3s; 
        }
        .premium-input-wrapper:focus-within { border-color: #8b5cf6; box-shadow: 0 0 20px rgba(139, 92, 246, 0.15); }
        .premium-input-wrapper input { background: transparent; border: none; color: #fff; width: 100%; outline: none; margin-left: 12px; }

        .btn-premium-action { 
          width: 100%; padding: 18px; border: none; border-radius: 16px; color: #fff; font-weight: 800; 
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); cursor: pointer; transition: 0.3s; 
          margin-top: 15px; font-size: 1rem;
        }
        .btn-premium-action:hover { transform: translateY(-3px); box-shadow: 0 15px 30px rgba(124, 58, 237, 0.4); }

        /* 7. LINK "ENTRAR" ESTILIZADO */
        .auth-footer { margin-top: 25px; text-align: center; color: #64748b; font-size: 0.9rem; }
        .link-text { 
          color: #a78bfa; background: none; border: none; font-weight: 700; cursor: pointer; 
          margin-left: 5px; transition: 0.3s; position: relative; text-decoration: none;
        }
        .link-text::after { 
          content: ''; position: absolute; bottom: -2px; left: 0; width: 0%; height: 2px; 
          background: #a78bfa; transition: width 0.3s ease; 
        }
        .link-text:hover { color: #fff; }
        .link-text:hover::after { width: 100%; }

        /* 8. RESPONSIVIDADE (O TOQUE FINAL) */
        @media (max-width: 1024px) { 
          .auth-visual-side { display: none; } 
          .mobile-premium-header { display: block; }
          .premium-login-card { 
            background: rgba(15, 23, 42, 0.4); 
            padding: 40px 25px; 
            border-radius: 24px;
          }
          .auth-form-side { padding: 15px; }
        }
      `}</style>

      <div className="auth-page-v2">
        {/* VISUAL DESKTOP */}
        <div className="auth-visual-side">
          <img src={logoKaTech} alt="Logo" className="brand-logo-premium" />
          <div className="visual-text">
            <h2>Crie sua conta.</h2>
            <p>Junte-se à maior comunidade tech e evolua seu fluxo.</p>
          </div>
        </div>

        {/* FORM SIDE */}
        <div className="auth-form-side">
          <div className="premium-login-card">
            
            {/* CABEÇALHO SÓ PARA MOBILE */}
            <div className="mobile-premium-header">
               <img src={logoKaTech} alt="Panda KaTech" />
               <h1 style={{ color: '#fff', fontSize: '1.6rem', marginTop: '10px' }}>Cadastrar</h1>
            </div>

            <header className="login-header" style={{ display: window.innerWidth > 1024 ? 'block' : 'none' }}>
              <h1>Cadastrar</h1>
              <p>Comece sua jornada agora mesmo.</p>
            </header>

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>E-mail</label>
                <div className="premium-input-wrapper">
                  <span style={{ color: '#64748b' }}>@</span>
                  <input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>

              <div className="input-group">
                <label>Senha</label>
                <div className="premium-input-wrapper">
                  <span style={{ color: '#64748b' }}>🔒</span>
                  <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
              </div>

              <div className="input-group">
                <label>Confirmar Senha</label>
                <div className="premium-input-wrapper">
                  <span style={{ color: '#64748b' }}>🔒</span>
                  <input type="password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                </div>
              </div>

              {errorMessage && <div className="feedback feedback-error" style={{ color: '#f87171', textAlign: 'center', marginBottom: '15px' }}>{errorMessage}</div>}
              {successMessage && <div className="feedback feedback-success" style={{ color: '#34d399', textAlign: 'center', marginBottom: '15px' }}>{successMessage}</div>}

              <button className="btn-premium-action" type="submit" disabled={loading}>
                {loading ? "Processando..." : "Criar Conta Premium"}
              </button>

              <div className="auth-footer">
                <span>Já tem conta?</span> 
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

export default Signup;