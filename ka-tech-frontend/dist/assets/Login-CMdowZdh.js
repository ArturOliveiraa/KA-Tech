import{r,u as y,j as e,l as f,s as x}from"./index-B9lAlNMN.js";/* empty css            */const N="/assets/discord-logo-DIpk3eZK.png";function z(){const[s,h]=r.useState(""),[l,w]=r.useState(""),[d,t]=r.useState(!1),[c,p]=r.useState(""),[m,i]=r.useState(""),[g,k]=r.useState(!0),n=y();async function u(o){t(!0),i("");try{const{error:a}=await x.auth.signInWithOAuth({provider:o,options:{redirectTo:`${window.location.origin}/dashboard`}});if(a)throw a}catch(a){i(a.message||`Erro ao entrar com ${o}.`),t(!1)}}async function v(o){o.preventDefault(),t(!0),i(""),p("");try{const{data:a,error:b}=await x.auth.signInWithPassword({email:s,password:l});if(b)throw b;if(!a.session||!a.user)throw new Error("Sessão não criada.");g?localStorage.setItem("ka-tech-token",a.session.access_token):localStorage.removeItem("ka-tech-token");const j=a.user.user_metadata?.name||a.user.email;p(`Bem-vindo, ${j}! Redirecionando...`),setTimeout(()=>n("/dashboard"),1e3)}catch(a){i(a?.message||"Erro ao fazer login. Verifique suas credenciais.")}finally{t(!1)}}return e.jsxs("div",{className:"auth-isolation-wrapper",children:[e.jsx("style",{children:`
        /* 1. RESET E ESTRUTURA GLOBAL */
        .auth-isolation-wrapper {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          z-index: 9999; background: #020617; margin: 0; padding: 0;
          overflow: hidden; font-family: 'Sora', sans-serif;
        }

        .auth-page-v2 { display: flex; width: 100%; height: 100%; background: radial-gradient(circle at 20% 30%, #1a1033 0, #020617 60%, #000 100%); }

        /* 2. ANIMAÇÕES GERAIS */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px) rotate(-3deg); }
          75% { transform: translateX(3px) rotate(3deg); }
        }
        @keyframes gradientAnim {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* 3. BOTÃO FLUTUANTE PLANOS (OCULTADO)
        .btn-floating-plans {
          position: absolute; top: 2rem; right: 2rem;
          background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(139, 92, 246, 0.2);
          color: #94a3b8; padding: 0.8rem 1.6rem; border-radius: 14px;
          font-size: 0.9rem; font-weight: 600; cursor: pointer;
          transition: all 0.3s ease; backdrop-filter: blur(12px);
          display: flex; align-items: center; gap: 10px; z-index: 10000;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        .btn-floating-plans:hover {
          color: #fff; border-color: #a855f7;
          background: rgba(139, 92, 246, 0.15);
          transform: translateY(-3px);
          box-shadow: 0 10px 25px rgba(139, 92, 246, 0.25);
        }
        .btn-floating-plans span { font-size: 1.1rem; }
        */

        /* 4. LADO VISUAL (DESKTOP) */
        .auth-visual-side {
          flex: 1.3; display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 60px; position: relative; animation: fadeUp 0.8s ease-out;
        }
        .brand-logo-premium {
          height: 280px; width: auto; filter: drop-shadow(0 0 40px rgba(139, 92, 246, 0.5));
          margin-bottom: 40px; animation: float 6s ease-in-out infinite;
        }
        .visual-text { text-align: center; max-width: 550px; }
        .visual-text h2 {
          font-size: 2.4rem; font-weight: 800; color: #fff; margin-bottom: 20px;
          background: linear-gradient(to right, #fff, #c4b5fd); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .visual-text p { color: #94a3b8; font-size: 1.15rem; line-height: 1.7; font-weight: 400; }

        /* 5. LADO FORMULÁRIO */
        .auth-form-side {
          flex: 1; background: rgba(2, 6, 23, 0.6); backdrop-filter: blur(25px);
          border-left: 1px solid rgba(139, 92, 246, 0.15);
          display: flex; align-items: center; justify-content: center; padding: 40px; overflow-y: auto;
          animation: fadeUp 0.8s ease-out 0.2s backwards;
        }
        .premium-login-card {
          width: 100%; max-width: 460px; background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 32px;
          padding: 50px 40px; box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .premium-login-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 40px 80px rgba(0, 0, 0, 0.7), 0 0 30px rgba(139, 92, 246, 0.1);
        }
        
        /* LOGO MOBILE */
        .mobile-logo-container { display: none; margin-bottom: 35px; text-align: center; }
        .mobile-logo-container img {
          height: 130px; filter: drop-shadow(0 0 25px rgba(139, 92, 246, 0.5));
          animation: float 6s ease-in-out infinite;
        }

        .login-header h1 { font-size: 2rem; font-weight: 800; color: #fff; margin-bottom: 10px; letter-spacing: -0.5px; }
        .login-header p { color: #64748b; font-size: 1rem; margin-bottom: 35px; }

        .input-group { margin-bottom: 20px; }
        .input-group label { display: block; color: #e2e8f0; font-size: 0.9rem; font-weight: 600; margin-bottom: 10px; }
        .premium-input-wrapper {
          display: flex; align-items: center; background: #020617;
          border: 2px solid #1e293b; border-radius: 16px; padding: 14px 18px;
          transition: all 0.3s ease;
        }
        .premium-input-wrapper:focus-within {
          border-color: #8b5cf6; background: #090917;
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.2);
        }
        .premium-input-wrapper span { font-size: 1.2rem; color: #64748b; transition: color 0.3s ease; }
        .premium-input-wrapper:focus-within span { color: #8b5cf6; }
        .premium-input-wrapper input {
          background: transparent; border: none; color: #fff; outline: none; width: 100%;
          margin-left: 12px; font-size: 1rem; font-weight: 500;
        }
        .premium-input-wrapper input::placeholder { color: #475569; }

        /* META LINKS */
        .form-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; font-size: 0.9rem; }
        .remember { color: #94a3b8; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: color 0.3s ease; }
        .remember:hover { color: #fff; }
        .remember input { accent-color: #8b5cf6; width: 16px; height: 16px; cursor: pointer; }
        
        .link-text {
          color: #a78bfa; background: none; border: none; font-weight: 600; cursor: pointer;
          transition: all 0.3s ease; position: relative; padding: 2px 0;
        }
        .link-text::after {
          content: ''; position: absolute; bottom: 0; left: 0; width: 0%; height: 2px;
          background: #a78bfa; transition: width 0.3s ease;
        }
        .link-text:hover { color: #fff; }
        .link-text:hover::after { width: 100%; background: #fff; }

        /* BOTÃO PRINCIPAL */
        .btn-premium-action {
          width: 100%; padding: 18px; border: none; border-radius: 16px; color: #fff; font-weight: 800; font-size: 1.05rem; cursor: pointer;
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          background-size: 200% auto; transition: all 0.3s ease;
        }
        .btn-premium-action:hover:not(:disabled) {
          background-position: right center; transform: translateY(-3px);
          box-shadow: 0 15px 30px rgba(124, 58, 237, 0.4), 0 0 20px rgba(168, 85, 247, 0.6);
        }
        .btn-premium-action:active { transform: translateY(-1px); box-shadow: 0 5px 15px rgba(124, 58, 237, 0.4); }
        .btn-premium-action:disabled { opacity: 0.7; cursor: not-allowed; }

        .social-divider { text-align: center; margin: 25px 0; color: #64748b; font-size: 0.9rem; font-weight: 500; position: relative; }
        .social-divider::before, .social-divider::after { content: ""; position: absolute; top: 50%; width: 30%; height: 1px; background: #1e293b; }
        .social-divider::before { left: 0; } .social-divider::after { right: 0; }

        /* BOTÕES SOCIAIS REFORMULADOS */
        .social-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px; }
        .btn-social {
          background: #0f172a; border: 2px solid #1e293b; border-radius: 16px; padding: 16px; color: #fff; font-weight: 700;
          display: flex; align-items: center; justify-content: center; gap: 12px; cursor: pointer; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          font-size: 1rem; position: relative; overflow: hidden;
        }
        .btn-social::before {
          content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), transparent);
          opacity: 0; transition: opacity 0.3s ease;
        }
        .btn-social:hover {
          border-color: #8b5cf6; transform: translateY(-5px);
          box-shadow: 0 10px 25px rgba(139, 92, 246, 0.25); background: #1a1a2e;
        }
        .btn-social:hover::before { opacity: 1; }
        .btn-social .social-icon { font-size: 1.3rem; transition: transform 0.3s ease; }
        .btn-social:hover .social-icon { transform: scale(1.1) rotate(5deg); animation: shake 0.5s ease-in-out; }
        .btn-social img.social-icon { height: 22px; width: auto; }

        /* FOOTER CARD */
        .auth-footer { margin-top: 35px; text-align: center; font-size: 0.9rem; color: #64748b; display: flex; flex-direction: column; gap: 15px; }
        .auth-footer p { margin: 0; }

        /* FEEDBACK */
        .feedback { padding: 12px 16px; border-radius: 12px; font-size: 0.9rem; font-weight: 600; text-align: center; margin-bottom: 20px; }
        .feedback-error { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
        .feedback-success { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }

        /* RESPONSIVIDADE */
        @media (max-width: 1024px) {
          .auth-visual-side { display: none; }
          .auth-form-side { background: #020617; padding: 20px; align-items: flex-start; }
          .mobile-logo-container { display: block; }
          .premium-login-card {
            padding: 40px 25px; border: none; background: transparent; box-shadow: none;
            max-width: 100%; animation: fadeUp 0.8s ease-out;
          }
          .premium-login-card:hover { transform: none; box-shadow: none; }
          /* .btn-floating-plans { top: 1.5rem; right: 1.5rem; padding: 0.6rem 1.2rem; font-size: 0.8rem; } */
          .login-header h1 { font-size: 1.8rem; }
        }
      `}),e.jsxs("div",{className:"auth-page-v2",children:[e.jsxs("div",{className:"auth-visual-side",children:[e.jsx("img",{src:f,alt:"Panda KaTech",className:"brand-logo-premium"}),e.jsxs("div",{className:"visual-text",children:[e.jsx("h2",{children:"Transforme sua carreira com a tecnologia que move o mundo."}),e.jsx("p",{children:"Acesse os melhores conteúdos e faça parte da maior comunidade de aprendizado ativa."})]})]}),e.jsx("div",{className:"auth-form-side",children:e.jsxs("div",{className:"premium-login-card",children:[e.jsx("div",{className:"mobile-logo-container",children:e.jsx("img",{src:f,alt:"Logo Mobile"})}),e.jsxs("header",{className:"login-header",children:[e.jsx("h1",{children:"Bem-vindo!"}),e.jsx("p",{children:"Acesse sua conta para continuar."})]}),e.jsxs("form",{onSubmit:v,children:[e.jsxs("div",{className:"input-group",children:[e.jsx("label",{children:"E-mail"}),e.jsxs("div",{className:"premium-input-wrapper",children:[e.jsx("span",{children:"@"}),e.jsx("input",{type:"email",placeholder:"exemplo@email.com",value:s,onChange:o=>h(o.target.value),required:!0})]})]}),e.jsxs("div",{className:"input-group",children:[e.jsx("label",{children:"Senha"}),e.jsxs("div",{className:"premium-input-wrapper",children:[e.jsx("span",{children:"🔒"}),e.jsx("input",{type:"password",placeholder:"Sua senha",value:l,onChange:o=>w(o.target.value),required:!0})]})]}),e.jsxs("div",{className:"form-meta",children:[e.jsxs("label",{className:"remember",children:[e.jsx("input",{type:"checkbox",checked:g,onChange:o=>k(o.target.checked)}),"Lembrar de mim"]}),e.jsx("button",{type:"button",className:"link-text",onClick:()=>n("/reset-password"),children:"Esqueceu a senha?"})]}),m&&e.jsx("div",{className:"feedback feedback-error",children:m}),c&&e.jsx("div",{className:"feedback feedback-success",children:c}),e.jsx("button",{className:"btn-premium-action",type:"submit",disabled:d,children:d?"Sincronizando...":"Entrar na plataforma"}),e.jsx("div",{className:"social-divider",children:"ou acesse com"}),e.jsxs("div",{className:"social-grid",children:[e.jsxs("button",{type:"button",className:"btn-social",onClick:()=>u("google"),children:[e.jsx("span",{className:"social-icon",children:"G"})," Google"]}),e.jsxs("button",{type:"button",className:"btn-social",onClick:()=>u("discord"),children:[e.jsx("img",{src:N,alt:"Discord",className:"social-icon"})," Discord"]})]}),e.jsxs("div",{className:"auth-footer",children:[e.jsxs("p",{children:["Não tem uma conta? ",e.jsx("button",{type:"button",className:"link-text",onClick:()=>n("/signup"),children:"Cadastre-se"})]}),e.jsx("button",{type:"button",className:"link-text",style:{fontSize:"0.8rem",opacity:.7},onClick:()=>n("/privacidade"),children:"Política de Privacidade"})]})]})]})})]})]})}export{z as default};
