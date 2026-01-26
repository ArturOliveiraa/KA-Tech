import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from "../assets/ka-tech-logo.png";

const Planos: React.FC = () => {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const prices = {
    base: isAnnual ? "249,90" : "299,90",
    core: isAnnual ? "419,90" : "499,90",
  };

  useEffect(() => {
    const centerCoreCard = () => {
      if (scrollContainerRef.current && window.innerWidth <= 1024) {
        const container = scrollContainerRef.current;
        const coreCard = container.children[1] as HTMLElement;
        
        setTimeout(() => {
          const scrollLeft = coreCard.offsetLeft - (container.offsetWidth / 2) + (coreCard.offsetWidth / 2);
          container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }, 150);
      }
    };

    centerCoreCard();
    window.addEventListener('resize', centerCoreCard);
    return () => window.removeEventListener('resize', centerCoreCard);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&display=swap');

        :root {
          --brand-purple: #8b5cf6;
          --brand-purple-glow: rgba(139, 92, 246, 0.4);
          --brand-purple-dark: #7c3aed;
          --bg-dark: #020617;
          --font-main: 'Sora', sans-serif;
          --card-glass: rgba(15, 23, 42, 0.5);
          --transition-premium: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; outline: none; }
        
        body { 
          background: var(--bg-dark); 
          color: #f8fafc; 
          font-family: var(--font-main); 
          overflow-x: hidden; 
          -webkit-font-smoothing: antialiased;
        }

        .lp-wrapper {
          min-height: 100vh;
          width: 100%;
          background: 
            radial-gradient(circle at 0% 0%, #1e1b4b 0%, transparent 40%),
            radial-gradient(circle at 100% 100%, #1a1033 0%, transparent 40%),
            var(--bg-dark);
          display: flex;
          flex-direction: column;
        }

        /* --- HEADER PREMIUM --- */
        .lp-nav {
          display: flex;
          justify-content: flex-end;
          padding: 2.5rem 5%;
          z-index: 1000;
        }

        .btn-premium-login {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(139, 92, 246, 0.4);
          color: #fff;
          padding: 0.85rem 2.2rem;
          border-radius: 16px;
          font-family: var(--font-main);
          font-weight: 700;
          font-size: 0.85rem;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: var(--transition-premium);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-premium-login:hover {
          background: var(--brand-purple);
          border-color: var(--brand-purple);
          box-shadow: 0 0 30px var(--brand-purple-glow);
          transform: translateY(-2px);
        }

        /* --- HERO --- */
        .hero {
          text-align: center;
          padding: 2rem 1.5rem 0rem;
        }

        .logo-main {
          height: clamp(160px, 25vw, 240px);
          margin-bottom: 2rem;
          filter: drop-shadow(0 0 50px var(--brand-purple-glow));
          animation: floatHero 6s ease-in-out infinite;
        }

        @keyframes floatHero {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-25px); }
        }

        .hero h1 {
          font-size: clamp(2.5rem, 8vw, 4.8rem);
          font-weight: 800;
          letter-spacing: -0.05em;
          background: linear-gradient(to bottom, #ffffff 30%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          line-height: 1.1;
          margin-bottom: 4rem;
        }

        /* --- FEATURES SECTION --- */
        .features-section {
          padding: 2rem 5% 5rem;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
        }

        .feature-card {
          background: var(--card-glass);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 2.5rem;
          border-radius: 2.5rem;
          backdrop-filter: blur(20px);
          transition: var(--transition-premium);
          position: relative;
          overflow: hidden;
        }

        .feature-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; width: 100%; height: 2px;
          background: linear-gradient(90deg, transparent, var(--brand-purple), transparent);
          transform: translateX(-100%);
          transition: 0.6s;
        }

        .feature-card:hover {
          transform: translateY(-10px);
          border-color: rgba(139, 92, 246, 0.3);
          background: rgba(15, 23, 42, 0.7);
        }

        .feature-card:hover::before { transform: translateX(100%); }

        .feature-icon { font-size: 2.8rem; display: block; margin-bottom: 1.5rem; }
        
        .feature-card h3 { 
          font-size: 1.2rem; 
          font-weight: 800; 
          margin-bottom: 1rem; 
          color: #fff;
          letter-spacing: -0.02em;
        }

        .feature-card p { 
          color: #94a3b8; 
          font-size: 0.9rem; 
          line-height: 1.7;
          font-weight: 400;
        }

        /* --- TOGGLE PREMIUM --- */
        .billing-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.8rem;
          margin: 2rem 0 5rem;
        }

        .toggle-switch {
          width: 70px; height: 36px;
          background: #0f172a;
          border: 2px solid var(--brand-purple);
          border-radius: 30px;
          position: relative;
          cursor: pointer;
          transition: 0.4s;
        }

        .toggle-circle {
          width: 26px; height: 26px;
          background: #fff;
          border-radius: 50%;
          position: absolute;
          top: 3px; left: 3px;
          transition: 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 0 15px var(--brand-purple-glow);
        }

        .toggle-switch.active .toggle-circle { left: 37px; }

        /* --- PRICING SECTION --- */
        .plans-container {
          display: flex;
          justify-content: center;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          gap: 2.5rem;
          padding: 2rem 5% 8rem;
          scrollbar-width: none;
        }

        .plans-container::-webkit-scrollbar { display: none; }

        .price-card {
          min-width: 370px;
          max-width: 400px;
          flex: 0 0 auto;
          background: var(--card-glass);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 3.5rem;
          padding: 4.5rem 3rem;
          scroll-snap-align: center;
          backdrop-filter: blur(25px);
          transition: var(--transition-premium);
          display: flex;
          flex-direction: column;
        }

        .price-card.featured {
          border: 2px solid var(--brand-purple);
          background: rgba(15, 23, 42, 0.85);
          box-shadow: 0 0 60px rgba(139, 92, 246, 0.15);
          transform: scale(1.05);
        }

        .price-card:hover { 
          transform: translateY(-15px); 
          border-color: var(--brand-purple);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        
        .price-card.featured:hover { transform: scale(1.05) translateY(-15px); }

        .amount { font-size: 4.5rem; font-weight: 800; letter-spacing: -0.06em; color: #fff; }
        
        .check-list { list-style: none; flex: 1; margin: 3rem 0; }
        .check-list li {
          display: flex; align-items: center; gap: 12px; margin-bottom: 1.2rem;
          font-size: 0.95rem; color: #cbd5e1;
        }
        .check-list li b { color: var(--brand-purple); }

        .btn-cta {
          padding: 1.3rem;
          border-radius: 20px;
          font-weight: 800;
          font-size: 1rem;
          letter-spacing: 0.02em;
          cursor: pointer;
          border: none;
          transition: 0.3s;
          font-family: var(--font-main);
        }

        .btn-cta.main {
          background: linear-gradient(135deg, var(--brand-purple) 0%, var(--brand-purple-dark) 100%);
          color: #fff;
          box-shadow: 0 10px 20px -5px var(--brand-purple-glow);
        }

        .btn-cta.ghost {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn-cta:hover { filter: brightness(1.2); transform: scale(1.02); }

        @media (max-width: 1300px) {
          .features-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 1024px) {
          .features-grid { grid-template-columns: 1fr; }
          .plans-container { justify-content: flex-start; padding: 2rem 10% 6rem; gap: 1.5rem; }
          .price-card { min-width: 82%; }
          .price-card.featured { transform: scale(1); }
        }
      `}</style>

      <div className="lp-wrapper">
        <header className="lp-nav">
          <button className="btn-premium-login" onClick={() => navigate('/login')}>
            <span>👤</span> ÁREA DO CLIENTE
          </button>
        </header>

        <section className="hero">
          <img src={logo} alt="KA Tech" className="logo-main" />
          <h1>Transforme conhecimento<br/>em performance de Alto Nível</h1>
        </section>

        {/* --- FEATURES GRID (4 EM LINHA) --- */}
        <section className="features-section">
          <div className="features-grid">
            <div className="feature-card">
              <span className="feature-icon">🛡️</span>
              <h3>Segurança Enterprise</h3>
              <p>Proteção de dados com criptografia de ponta a ponta. Protocolos de segurança feitos para blindar sua propriedade intelectual.</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">☁️</span>
              <h3>Backup & Redundância</h3>
              <p>Sincronização em tempo real com backups automatizados diários. Sua infraestrutura online 24/7, sem riscos.</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">📚</span>
              <h3>Gestão Profissional</h3>
              <p>Arquitetura feita para quem escala. Gerencie módulos e trilhas complexas com uma fluidez nunca vista em EADs tradicionais.</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">📊</span>
              <h3>Relatórios Excepcionais</h3>
              <p>Dashboards granulares de engajamento. Tome decisões baseadas em métricas reais e transforme dados em lucro.</p>
            </div>
          </div>
        </section>

        <section className="hero" style={{padding: 0}}>
          <div className="billing-toggle">
            <span style={{ opacity: isAnnual ? 0.4 : 1, fontWeight: 600 }}>MENSAL</span>
            <div className={`toggle-switch ${isAnnual ? 'active' : ''}`} onClick={() => setIsAnnual(!isAnnual)}>
              <div className="toggle-circle"></div>
            </div>
            <span style={{ opacity: isAnnual ? 1 : 0.4, fontWeight: 600 }}>ANUAL <b style={{ color: '#22d3ee', marginLeft: '5px' }}>-20%</b></span>
          </div>
        </section>

        <div className="pricing-wrapper" style={{width: '100%'}}>
          <main className="plans-container" ref={scrollContainerRef}>
            {/* BASE */}
            <div className="price-card">
              <span style={{ color: '#8b5cf6', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.15em' }}>ENTRY LEVEL</span>
              <h2 style={{ fontSize: '2.4rem', margin: '1rem 0', fontWeight: 800 }}>Base</h2>
              <div className="price-value" style={{ margin: '1.5rem 0' }}>
                <span style={{ fontSize: '1.4rem', color: '#64748b' }}>R$</span>
                <span className="amount">{prices.base}</span>
              </div>
              <ul className="check-list">
                <li><b>✓</b> Até 300 alunos ativos</li>
                <li><b>✓</b> Suporte via ticket</li>
                <li><b>✓</b> Analytics Essentials</li>
                <li style={{opacity: 0.3}}><b>×</b> Domínio White Label</li>
              </ul>
              <button className="btn-cta ghost">ESCOLHER BASE</button>
            </div>

            {/* CORE */}
            <div className="price-card featured">
               <div style={{ background: '#8b5cf6', color: '#fff', width: 'fit-content', padding: '5px 15px', borderRadius: '30px', fontSize: '0.65rem', fontWeight: 900, marginBottom: '1.2rem', letterSpacing: '0.05em' }}>MAIS ESCOLHIDO</div>
              <h2 style={{ fontSize: '2.4rem', margin: '1rem 0', fontWeight: 800 }}>Core</h2>
              <div className="price-value" style={{ margin: '1.5rem 0' }}>
                <span style={{ fontSize: '1.4rem', color: '#64748b' }}>R$</span>
                <span className="amount">{prices.core}</span>
              </div>
              <ul className="check-list">
                <li><b>✓</b> Até 1000 alunos ativos</li>
                <li><b>✓</b> 50GB de armazenamento</li>
                <li><b>✓</b> Backups Redundantes</li>
                <li><b>✓</b> Suporte Prioritário</li>
              </ul>
              <button className="btn-cta main">ASSINAR CORE AGORA</button>
            </div>

            {/* APEX */}
            <div className="price-card">
              <span style={{ color: '#8b5cf6', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.15em' }}>ENTERPRISE</span>
              <h2 style={{ fontSize: '2.4rem', margin: '1rem 0', fontWeight: 800 }}>Apex</h2>
              <div className="price-value" style={{ margin: '2rem 0' }}>
                <span className="amount" style={{fontSize: '3.8rem'}}>Custom</span>
              </div>
              <ul className="check-list">
                <li><b>✓</b> Alunos Ilimitados</li>
                <li><b>✓</b> White Label Total</li>
                <li><b>✓</b> Relatórios Personalizados</li>
                <li><b>✓</b> Gerente VIP Dedicado</li>
              </ul>
              <button className="btn-cta ghost">FALAR COM ESPECIALISTA</button>
            </div>
          </main>
        </div>

        <footer style={{ textAlign: 'center', padding: '6rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
          <p style={{ color: '#4b5563', fontSize: '0.75rem', letterSpacing: '0.3em', fontWeight: 400 }}>
            © 2026 KA TECH. BUILT FOR MODERN BUILDERS.
          </p>
        </footer>
      </div>
    </>
  );
};

export default Planos;