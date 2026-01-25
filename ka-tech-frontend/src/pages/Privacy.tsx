import React from "react";
import { useNavigate } from "react-router-dom";
import logoKaTech from "../assets/ka-tech-logo.png";

function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="auth-page privacy-page" style={{ overflowY: "auto", padding: "40px 20px" }}>
      <style>{`
        .privacy-container {
          max-width: 800px;
          margin: 0 auto;
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(10px);
          padding: 40px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #f8fafc;
        }
        .privacy-container h1 { font-size: 2rem; margin-bottom: 20px; color: #fff; }
        .privacy-container h2 { font-size: 1.25rem; margin-top: 30px; margin-bottom: 10px; color: #818cf8; }
        .privacy-container p { line-height: 1.6; color: #94a3b8; margin-bottom: 15px; }
        .back-link { cursor: pointer; color: #818cf8; display: flex; align-items: center; gap: 8px; margin-bottom: 30px; }
        .back-link:hover { text-decoration: underline; }
      `}</style>

      <div className="privacy-container">
        <div className="back-link" onClick={() => navigate("/")}>
           ← Voltar para o Login
        </div>
        
        <header style={{ textAlign: "center", marginBottom: "40px" }}>
          <img src={logoKaTech} alt="KA Tech" style={{ height: "60px", marginBottom: "20px" }} />
          <h1>Política de Privacidade</h1>
        </header>

        <section>
          <p>Última atualização: 25 de janeiro de 2026</p>
          
          <h2>1. Informações que Coletamos</h2>
          <p>
            Ao utilizar a <strong>KA Academy</strong>, coletamos informações básicas fornecidas pelos seus provedores de identidade (Google e Discord), como nome completo, endereço de e-mail e foto de perfil.
          </p>

          <h2>2. Como Usamos Seus Dados</h2>
          <p>
            Seus dados são utilizados exclusivamente para identificar você na plataforma, gerenciar seu acesso aos cursos e personalizar sua experiência de aprendizado.
          </p>

          <h2>3. Compartilhamento de Dados</h2>
          <p>
            Nós não vendemos nem compartilhamos seus dados pessoais com terceiros. As informações permanecem seguras dentro da nossa infraestrutura hospedada no Supabase.
          </p>

          <h2>4. Seus Direitos</h2>
          <p>
            Você tem o direito de acessar, corrigir ou excluir seus dados a qualquer momento através das configurações da sua conta ou entrando em contato pelo e-mail: <strong>katechbr@gmail.com</strong>.
          </p>

          <h2>5. Segurança</h2>
          <p>
            Utilizamos criptografia de ponta e os protocolos de segurança do Supabase para garantir que suas informações estejam protegidas contra acessos não autorizados.
          </p>
        </section>

        <footer style={{ marginTop: "50px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "20px" }}>
          <p>© 2026 KA Tech - Todos os direitos reservados.</p>
        </footer>
      </div>
    </div>
  );
}

export default Privacy;