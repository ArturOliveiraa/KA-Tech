import{r as i,u as O,j as e,v as _,s as l}from"./index-B9lAlNMN.js";import{S as y}from"./sparkles-BeXwp_sc.js";import{B as v}from"./brain-circuit-DFF9Y4i6.js";import{X as P}from"./x-8-Ldq6_U.js";import{C as M}from"./circle-play-CVE4AFil.js";import{A as w}from"./arrow-right-C3sF1xKp.js";import{C as j}from"./compass-DdGqqENZ.js";import{S as q}from"./search-CcnXwaEv.js";import{c as t}from"./createLucideIcon-CBFMAAE2.js";const U=[["rect",{width:"20",height:"14",x:"2",y:"5",rx:"2",key:"ynyp8z"}],["line",{x1:"2",x2:"22",y1:"10",y2:"10",key:"1b3vmo"}]],Y=t("credit-card",U);const B=[["path",{d:"m16 6 4 14",key:"ji33uf"}],["path",{d:"M12 6v14",key:"1n7gus"}],["path",{d:"M8 8v12",key:"1gg7y9"}],["path",{d:"M4 4v16",key:"6qkkli"}]],H=t("library",B);const $=[["path",{d:"M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5",key:"slp6dd"}],["path",{d:"M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244",key:"o0xfot"}],["path",{d:"M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05",key:"wn3emo"}]],F=t("store",$);const V=[["path",{d:"m17 2-5 5-5-5",key:"16satq"}],["rect",{width:"20",height:"15",x:"2",y:"7",rx:"2",key:"1e6viu"}]],G=t("tv",V);function se(){const[d,N]=i.useState([]),[k,p]=i.useState(!0),[s,z]=i.useState(""),[o,A]=i.useState(""),[x,S]=i.useState([]),[n,m]=i.useState(!1),[C,g]=i.useState(!1),[X,E]=i.useState([]),h=O();i.useEffect(()=>{async function a(){try{p(!0);const{data:{user:r}}=await l.auth.getUser(),{data:c,error:u}=await l.from("categories").select("*").order("name",{ascending:!0});if(u)throw u;if(N(c||[]),r){const{data:f}=await l.from("course_enrollments").select("courses (slug)").eq("userId",r.id);if(f){const L=f.map(D=>D.courses?.slug).filter(Boolean);E(L)}}}catch(r){console.error("Erro ao carregar dados:",r)}finally{p(!1)}}a()},[]);const b=i.useMemo(()=>d.filter(a=>a.name.toLowerCase().includes(s.toLowerCase())||a.description?.toLowerCase().includes(s.toLowerCase())),[d,s]),I=async a=>{if(a.preventDefault(),!!o.trim()){m(!0),g(!0);try{const r=await fetch("https://pandai.discloud.app/search-lessons",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:o})});if(!r.ok)throw new Error("Falha na comunicação com a IA");const c=await r.json();S(c.results||[])}catch(r){console.error("Erro na busca IA:",r),alert("Não foi possível conectar ao cérebro da IA. Tente novamente.")}finally{m(!1)}}},R=a=>{h(`/curso/${a}`)},T=a=>{const r=a.toLowerCase();return r.includes("live")?e.jsx(G,{size:28}):r.includes("pdv")?e.jsx(Y,{size:28}):r.includes("shop")?e.jsx(F,{size:28}):e.jsx(H,{size:28})};return e.jsxs("div",{className:"dashboard-wrapper",children:[e.jsx(_,{}),e.jsxs("div",{className:"ambient-bg",children:[e.jsx("div",{className:"ambient-blob blob-1"}),e.jsx("div",{className:"ambient-blob blob-2"})]}),e.jsxs("main",{className:"main-content",children:[e.jsx("section",{className:"hero-ai-section",children:e.jsxs("div",{className:"hero-content glass-panel",children:[e.jsxs("div",{className:"hero-badge",children:[e.jsx(y,{size:14,className:"text-cyan-400"}),e.jsx("span",{children:"Powered by pandAI"})]}),e.jsxs("h1",{className:"hero-title",children:["O que você quer ",e.jsx("span",{className:"text-gradient",children:"aprender hoje?"})]}),e.jsx("p",{className:"hero-subtitle",children:"Faça uma pergunta específica e nossa IA encontrará o momento exato da aula para você."}),e.jsx("form",{onSubmit:I,className:"ai-search-form",children:e.jsxs("div",{className:"ai-input-wrapper",children:[e.jsx(v,{className:"ai-icon",size:24}),e.jsx("input",{type:"text",className:"ai-input",placeholder:"Ex: Como cancelar uma venda no PDV?",value:o,onChange:a=>A(a.target.value)}),e.jsx("button",{type:"submit",className:"ai-submit-btn",disabled:n,children:n?e.jsx("span",{className:"animate-pulse",children:"Analisando..."}):"Pesquisar"})]})})]})}),C&&e.jsxs("section",{className:"ai-results-area glass-panel",children:[e.jsxs("div",{className:"results-header",children:[e.jsxs("h3",{children:[e.jsx(v,{size:22,className:"text-cyan-400"})," Soluções Encontradas"]}),e.jsx("button",{onClick:()=>g(!1),className:"close-btn",children:e.jsx(P,{size:20})})]}),n?e.jsxs("div",{className:"ai-loading",children:[e.jsx(y,{size:40,className:"animate-spin-slow text-cyan-400",style:{margin:"0 auto 15px"}}),e.jsx("p",{children:"Sincronizando com a base de conhecimento neural..."})]}):x.length>0?e.jsx("div",{className:"ai-grid",children:x.map((a,r)=>e.jsxs("div",{className:"ai-result-card",onClick:()=>R(a.course_slug),children:[e.jsxs("div",{className:"ai-card-header",children:[e.jsx("div",{className:"ai-card-icon",children:e.jsx(M,{size:20})}),e.jsxs("div",{className:"match-badge",children:["Match ",(a.similarity*100).toFixed(0),"%"]})]}),e.jsx("h4",{className:"ai-card-title",children:a.lesson_title}),e.jsxs("p",{className:"ai-snippet",children:['"',a.content.substring(0,150),'..."']}),e.jsxs("div",{className:"ai-card-footer",children:[e.jsx("span",{children:"Acessar Aula"}),e.jsx(w,{size:16})]})]},r))}):e.jsx("div",{className:"ai-no-results",children:"Ainda não possuímos nenhum conteúdo sobre esse tema específico em nossa base de aulas."})]}),e.jsxs("div",{className:"section-controls",children:[e.jsxs("div",{className:"section-title-wrapper",children:[e.jsx(j,{size:28,className:"text-primary"}),e.jsx("h2",{children:"Trilhas de Conhecimento"})]}),e.jsxs("div",{className:"classic-search",children:[e.jsx(q,{className:"classic-search-icon",size:18}),e.jsx("input",{type:"text",placeholder:"Filtrar trilhas...",value:s,onChange:a=>z(a.target.value),className:"classic-search-input"})]})]}),k?e.jsxs("div",{className:"loading-container glass-panel",children:[e.jsx(j,{size:48,className:"animate-spin-slow text-primary",style:{margin:"0 auto 15px"}}),e.jsx("p",{children:"Carregando acervo de trilhas..."})]}):e.jsx("div",{className:"categories-grid",children:b.length>0?b.map(a=>e.jsxs("div",{className:"category-card glass-panel",onClick:()=>h(`/categoria/${a.slug}`),children:[e.jsx("div",{className:"card-top",children:e.jsx("div",{className:"card-icon-wrapper",children:a.image_url?e.jsx("img",{src:a.image_url,alt:a.name,className:"cat-img"}):T(a.name)})}),e.jsxs("div",{className:"card-content",children:[e.jsx("h3",{className:"card-title",children:a.name}),e.jsx("p",{className:"card-desc",children:a.description||"Inicie seu aprendizado nesta trilha de conhecimento especializada. Domine o assunto passo a passo."})]}),e.jsx("div",{className:"card-footer",children:e.jsxs("button",{className:"card-btn",children:["Acessar Trilha ",e.jsx(w,{size:18,className:"btn-icon-slide"})]})})]},a.id)):e.jsxs("div",{className:"no-results glass-panel",children:["Nenhuma trilha encontrada para ",e.jsxs("strong",{children:['"',s,'"']}),"."]})})]}),e.jsx("style",{children:`
        :root {
            --primary: #8b5cf6; 
            --primary-hover: #7c3aed;
            --ai-cyan: #06b6d4;
            --bg-dark: #020617; 
            --bg-card: rgba(15, 23, 42, 0.5); 
            --border-color: rgba(255, 255, 255, 0.08);
            --text-light: #f8fafc;
            --text-dim: #94a3b8;
        }
        
        * { box-sizing: border-box; }

        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin-slow { 100% { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 4s linear infinite; }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }

        /* Utilidades Rápidas */
        .text-primary { color: var(--primary); }
        .text-cyan-400 { color: var(--ai-cyan); }
        .text-gradient { background: linear-gradient(135deg, #c4b5fd 0%, #8b5cf6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

        .dashboard-wrapper {
            display: flex; width: 100%; min-height: 100vh; position: relative;
            background-color: var(--bg-dark); font-family: 'Inter', system-ui, sans-serif;
            overflow-x: hidden; color: var(--text-light);
        }

        /* BACKGROUND AMBIENTE PARA PREENCHER TELA */
        .ambient-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
        .ambient-blob { position: absolute; border-radius: 50%; filter: blur(120px); opacity: 0.15; }
        .blob-1 { top: -10%; left: 10%; width: 50vw; height: 50vw; background: var(--primary); }
        .blob-2 { bottom: -20%; right: -10%; width: 60vw; height: 60vw; background: var(--ai-cyan); }

        /* CONTEÚDO PRINCIPAL */
        .main-content {
            position: relative; z-index: 1; flex: 1; margin-left: 260px; 
            padding: 60px 80px 100px 80px; width: calc(100% - 260px); 
            animation: fadeUp 0.6s ease-out forwards;
        }

        /* COMPONENTE DE VIDRO */
        .glass-panel {
            background: var(--bg-card); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
            border: 1px solid var(--border-color); border-top-color: rgba(255,255,255,0.15);
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
        }

        /* HERO AI SECTION */
        .hero-ai-section { margin-bottom: 60px; }
        .hero-content { 
            border-radius: 32px; padding: 60px; text-align: center; 
            display: flex; flex-direction: column; align-items: center; position: relative; overflow: hidden;
        }
        .hero-content::before {
            content: ''; position: absolute; top: 0; left: 0; right: 0; height: 100%;
            background: radial-gradient(ellipse at top, rgba(6, 182, 212, 0.15) 0%, transparent 60%); pointer-events: none;
        }
        
        .hero-badge {
            display: inline-flex; align-items: center; gap: 8px; background: rgba(6, 182, 212, 0.1);
            border: 1px solid rgba(6, 182, 212, 0.3); padding: 8px 16px; border-radius: 20px;
            font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24px;
        }

        .hero-title { font-size: 3.5rem; font-weight: 900; margin: 0 0 16px 0; letter-spacing: -1.5px; line-height: 1.1; }
        .hero-subtitle { color: var(--text-dim); font-size: 1.25rem; max-width: 600px; margin: 0 0 40px 0; line-height: 1.5; }

        .ai-search-form { width: 100%; max-width: 800px; }
        .ai-input-wrapper {
            display: flex; background: rgba(2, 6, 23, 0.6); border: 1px solid rgba(255,255,255,0.1);
            border-radius: 24px; padding: 8px; position: relative; transition: 0.3s ease;
        }
        .ai-input-wrapper:focus-within {
            border-color: var(--ai-cyan); box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.15);
            background: rgba(2, 6, 23, 0.8);
        }
        .ai-icon { position: absolute; left: 24px; top: 50%; transform: translateY(-50%); color: #64748b; }
        
        .ai-input {
            flex: 1; background: transparent; border: none; padding: 20px 20px 20px 64px;
            color: #fff; font-size: 1.15rem; outline: none; font-family: 'Inter', sans-serif;
        }
        .ai-input::placeholder { color: #475569; }

        .ai-submit-btn {
            background: var(--ai-cyan); color: #000; border: none; padding: 0 32px;
            border-radius: 16px; font-weight: 800; font-size: 1.05rem; cursor: pointer; transition: 0.3s;
        }
        .ai-submit-btn:hover:not(:disabled) { transform: scale(1.02); box-shadow: 0 10px 25px rgba(6, 182, 212, 0.4); }
        .ai-submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }


        /* RESULTADOS DA IA */
        .ai-results-area { border-radius: 32px; padding: 40px; margin-bottom: 60px; animation: fadeUp 0.4s ease; }
        .results-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 1px solid var(--border-color); padding-bottom: 20px;}
        .results-header h3 { display: flex; align-items: center; gap: 12px; margin: 0; font-size: 1.4rem; font-weight: 800;}
        .close-btn { background: rgba(255,255,255,0.05); border: none; color: var(--text-dim); padding: 8px; border-radius: 50%; cursor: pointer; transition: 0.2s;}
        .close-btn:hover { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

        .ai-loading { text-align: center; color: var(--text-dim); padding: 60px; font-size: 1.1rem; }
        .ai-no-results { text-align: center; color: var(--text-dim); padding: 40px; font-size: 1.1rem; }

        .ai-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; }
        .ai-result-card {
            background: rgba(6, 182, 212, 0.05); border: 1px solid rgba(6, 182, 212, 0.2);
            border-radius: 20px; padding: 24px; cursor: pointer; transition: 0.3s;
            display: flex; flex-direction: column;
        }
        .ai-result-card:hover { background: rgba(6, 182, 212, 0.1); border-color: rgba(6, 182, 212, 0.4); transform: translateY(-4px); }
        
        .ai-card-header { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .ai-card-icon { width: 40px; height: 40px; background: rgba(0,0,0,0.3); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--ai-cyan);}
        .match-badge { background: var(--text-light); color: #000; font-size: 0.75rem; font-weight: 800; padding: 6px 12px; border-radius: 20px; align-self: flex-start;}
        
        .ai-card-title { color: #fff; font-size: 1.15rem; font-weight: 800; margin: 0 0 10px 0; line-height: 1.4;}
        .ai-snippet { color: var(--text-dim); font-size: 0.95rem; line-height: 1.6; margin: 0 0 20px 0; font-style: italic; flex: 1;}
        .ai-card-footer { display: flex; align-items: center; gap: 8px; color: var(--ai-cyan); font-weight: 700; font-size: 0.95rem; }
        .ai-result-card:hover .ai-card-footer { gap: 12px; }


        /* HEADER DAS TRILHAS */
        .section-controls {
            display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 20px; margin-bottom: 40px;
        }
        .section-title-wrapper { display: flex; align-items: center; gap: 12px; }
        .section-title-wrapper h2 { font-size: 1.8rem; font-weight: 800; margin: 0; }

        .classic-search { position: relative; width: 100%; max-width: 320px; }
        .classic-search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #64748b; }
        .classic-search-input {
            width: 100%; padding: 16px 16px 16px 45px; border-radius: 16px; background: var(--bg-card);
            border: 1px solid var(--border-color); color: #fff; font-size: 1rem; outline: none; transition: 0.3s;
        }
        .classic-search-input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1); }


        /* GRID DE TRILHAS (BENTO STYLE) */
        .categories-grid { 
            display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 35px; 
        }

        .category-card {
            border-radius: 28px; padding: 40px 35px; display: flex; flex-direction: column; min-height: 320px;
            cursor: pointer; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .category-card:hover {
            transform: translateY(-8px) scale(1.02); border-color: rgba(139, 92, 246, 0.5);
            box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.6), 0 0 40px rgba(139, 92, 246, 0.15);
        }

        .card-top { margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
        .card-icon-wrapper {
            width: 64px; height: 64px; background: rgba(0,0,0,0.4); border-radius: 18px;
            display: flex; align-items: center; justify-content: center; color: var(--primary);
            border: 1px solid rgba(255,255,255,0.08); transition: 0.4s;
        }
        .category-card:hover .card-icon-wrapper { background: var(--primary); color: #fff; border-color: var(--primary); transform: scale(1.1) rotate(-5deg); }
        .cat-img { width: 36px; height: 36px; object-fit: contain; }

        .card-content { flex: 1; display: flex; flex-direction: column;}
        .card-title { font-size: 1.5rem; font-weight: 800; margin: 0 0 12px 0; line-height: 1.3;}
        .card-desc { color: var(--text-dim); font-size: 1.05rem; line-height: 1.6; margin: 0; }

        .card-footer { margin-top: 35px; }
        .card-btn {
            width: 100%; background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); color: #fff;
            padding: 18px; border-radius: 16px; font-weight: 700; font-size: 1.05rem; cursor: pointer; transition: 0.3s;
            display: flex; align-items: center; justify-content: space-between;
        }
        .btn-icon-slide { transition: 0.3s; opacity: 0.5;}
        
        .category-card:hover .card-btn {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
            border-color: transparent; box-shadow: 0 10px 25px rgba(139, 92, 246, 0.4);
        }
        .category-card:hover .btn-icon-slide { transform: translateX(5px); opacity: 1;}

        .loading-container, .no-results { text-align: center; padding: 100px 20px; color: var(--text-dim); font-size: 1.1rem; border-radius: 32px;}

        /* RESPONSIVIDADE */
        @media (max-width: 1024px) {
            .main-content { margin-left: 0; padding: 40px 30px 100px 30px; width: 100%; }
            .hero-content { padding: 40px 25px; }
            .hero-title { font-size: 2.5rem; }
            .ai-input-wrapper { flex-direction: column; background: transparent; border: none; padding: 0;}
            .ai-input { background: rgba(2, 6, 23, 0.6); border: 1px solid rgba(255,255,255,0.1); margin-bottom: 15px;}
            .ai-icon { top: 30px; }
            .ai-submit-btn { padding: 20px; width: 100%; }
            .section-controls { flex-direction: column; align-items: flex-start; gap: 20px; }
            .classic-search { max-width: 100%; }
            .categories-grid { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
        }

        @media (max-width: 600px) {
            .main-content { padding: 30px 20px 100px 20px; }
            .hero-title { font-size: 2rem; }
            .categories-grid { grid-template-columns: 1fr; }
            .category-card { padding: 30px 25px; }
        }
      `})]})}export{se as default};
