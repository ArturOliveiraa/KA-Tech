import{q as K,r,u as Q,s,j as e,v as ee}from"./index-B9lAlNMN.js";import{c as d}from"./createLucideIcon-CBFMAAE2.js";import{A as ae}from"./arrow-right-C3sF1xKp.js";import{L as re,P as E,T as O}from"./tag-VQ-7cpmf.js";import{T as L}from"./trash-2-DLL2FgEN.js";import{S as te}from"./sparkles-BeXwp_sc.js";import{S as M}from"./search-CcnXwaEv.js";import{C as P}from"./check-DCb4FCCf.js";const oe=[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]],Y=d("chevron-down",oe);const se=[["path",{d:"M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z",key:"hod4my"}],["path",{d:"M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z",key:"w4yl2u"}],["path",{d:"M3 5a2 2 0 0 0 2 2h3",key:"f2jnh7"}],["path",{d:"M3 3v13a2 2 0 0 0 2 2h3",key:"k8epm1"}]],ne=d("folder-tree",se);const ie=[["path",{d:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",key:"1cjeqo"}],["path",{d:"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",key:"19qd67"}]],$=d("link",ie);const de=[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],le=d("settings",de);const ce=[["path",{d:"M13.172 2a2 2 0 0 1 1.414.586l6.71 6.71a2.4 2.4 0 0 1 0 3.408l-4.592 4.592a2.4 2.4 0 0 1-3.408 0l-6.71-6.71A2 2 0 0 1 6 9.172V3a1 1 0 0 1 1-1z",key:"16rjxf"}],["path",{d:"M2 7v6.172a2 2 0 0 0 .586 1.414l6.71 6.71a2.4 2.4 0 0 0 3.191.193",key:"178nd4"}],["circle",{cx:"10.5",cy:"6.5",r:".5",fill:"currentColor",key:"12ikhr"}]],pe=d("tags",ce);const me=[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]],xe=d("user",me),ge=o=>o.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g,"").replace(/\s+/g,"-").trim();function Ne(){const{userRole:o,loading:b}=K(),[q,F]=r.useState(!0),[h,w]=r.useState(""),[l,B]=r.useState([]),[y,U]=r.useState([]),[c,j]=r.useState(""),[N,V]=r.useState([]),[n,k]=r.useState(""),[i,z]=r.useState(""),[p,m]=r.useState(!1),[S,C]=r.useState(""),[x,g]=r.useState(!1),[T,A]=r.useState(""),v=Q(),u=r.useCallback(async()=>{const{data:a}=await s.from("tags").select("*").order("name");a&&B(a)},[]),f=r.useCallback(async()=>{const{data:a}=await s.from("categories").select("*").order("name");a&&U(a)},[]),D=r.useCallback(async()=>{const{data:a,error:t}=await s.from("profiles").select("id, full_name").order("full_name");t&&console.error("Erro ao buscar alunos:",t.message),a&&V(a)},[]);r.useEffect(()=>{if(!b){if(o!=="admin"&&o!=="teacher"){v("/dashboard");return}(async()=>(await Promise.all([u(),f(),D()]),F(!1)))()}},[b,o,v,u,f,D]),r.useEffect(()=>{const a=t=>{t.target.closest(".custom-dropdown-container")||(m(!1),g(!1))};return document.addEventListener("mousedown",a),()=>document.removeEventListener("mousedown",a)},[]);const R=async a=>{if(o!=="admin")return alert("Apenas administradores podem remover tags.");window.confirm("Deseja realmente remover este Setor (Tag)?")&&(await s.from("tags").delete().eq("id",a),u())},G=async a=>{if(o!=="admin")return alert("Apenas administradores podem remover categorias.");window.confirm("Deseja realmente remover esta Trilha? Isso não apagará as aulas vinculadas automaticamente, cuidado com os vínculos perdidos!")&&(await s.from("categories").delete().eq("id",a),f())},H=async a=>{a.preventDefault(),h.trim()&&(await s.from("tags").upsert([{name:h.toUpperCase().trim()}],{onConflict:"name"}),w(""),u())},Z=async a=>{if(a.preventDefault(),!c.trim())return;const t=ge(c);await s.from("categories").insert([{name:c.trim(),slug:t}]),j(""),f()},W=async a=>{if(a.preventDefault(),!n||!i)return alert("Por favor, selecione um Colaborador e um Setor antes de confirmar.");try{const{error:t}=await s.rpc("vincular_tag_aluno",{aluno_id:n,tag_uuid:i});t?(console.error(t),alert("Erro ao vincular: "+t.message)):(alert("Vínculo realizado com sucesso! ✨"),k(""),z(""))}catch(t){console.error("Erro inesperado:",t),alert("Ocorreu um erro inesperado.")}},_=N.filter(a=>(a.full_name||"Sem nome cadastrado").toLowerCase().includes(S.toLowerCase())),X=N.find(a=>a.id===n)?.full_name||"Selecione o Colaborador...",I=l.filter(a=>a.name.toLowerCase().includes(T.toLowerCase())),J=l.find(a=>a.id===i)?.name||"Selecione o Setor...";return b||q?e.jsx("div",{className:"dashboard-wrapper",style:{display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsxs("div",{style:{textAlign:"center"},children:[e.jsx(le,{size:44,color:"#8b5cf6",style:{animation:"spin 3s linear infinite",margin:"0 auto 15px"}}),e.jsx("h3",{style:{color:"#fff",fontSize:"1.2rem",fontWeight:800,fontFamily:"Inter, sans-serif"},children:"Carregando Estrutura..."}),e.jsx("style",{children:"@keyframes spin { 100% { transform: rotate(360deg); } }"})]})}):e.jsxs("div",{className:"dashboard-wrapper",children:[e.jsx("style",{children:`
        :root { 
            --primary: #8b5cf6; --primary-hover: #7c3aed;
            --bg-dark: #020617; 
            --card-glass: rgba(15, 23, 42, 0.4); 
            --border: rgba(255, 255, 255, 0.06);
            --text-muted: #94a3b8;
        }
        
        * { box-sizing: border-box; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes dropdownFade {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dashboard-wrapper { 
            display: flex; width: 100%; min-height: 100vh; 
            background: var(--bg-dark); font-family: 'Inter', system-ui, sans-serif;
            overflow-x: hidden; color: #f8fafc;
        }

        .dashboard-content { 
          flex: 1; margin-left: 260px; padding: 50px 60px; transition: 0.3s;
          animation: fadeUp 0.5s ease-out forwards;
        }

        /* Cabeçalho */
        .dashboard-header { margin-bottom: 40px; }
        .dashboard-header h1 { 
          color: #fff; font-size: 2.6rem; font-weight: 900; margin: 0 0 8px 0; letter-spacing: -1px; 
          background: linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .dashboard-header p { color: var(--text-muted); font-size: 1.05rem; margin: 0; font-weight: 500; }

        /* Banner de Navegação Premium */
        .cta-banner { 
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.9) 100%); 
          padding: 40px 45px; border-radius: 28px; border: 1px solid rgba(139, 92, 246, 0.2); 
          display: flex; align-items: center; justify-content: space-between; gap: 30px;
          margin-bottom: 50px; 
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
          position: relative; overflow: hidden; backdrop-filter: blur(20px);
        }
        .cta-banner::before {
          content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
          background: radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 50%);
          pointer-events: none;
        }
        .cta-text h2 { color: #fff; font-size: 1.7rem; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.5px; }
        .cta-text p { color: var(--text-muted); font-size: 1.05rem; margin: 0; line-height: 1.5; }
        
        .btn-cta { 
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%); 
          color: #fff; padding: 16px 36px; border-radius: 18px; border: none; font-weight: 800; 
          cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
          display: inline-flex; align-items: center; gap: 10px;
          white-space: nowrap; font-size: 1.05rem; 
          box-shadow: 0 10px 25px rgba(139, 92, 246, 0.3), inset 0 1px 0 rgba(255,255,255,0.2);
          z-index: 2;
        }
        .btn-cta:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(139, 92, 246, 0.5), inset 0 1px 0 rgba(255,255,255,0.3); }
        .btn-cta:active { transform: translateY(0); }

        /* Grid de Cards */
        .admin-grid { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 30px; 
        }
        
        .glass-card { 
          background: var(--card-glass); border-radius: 28px; padding: 40px; 
          border: 1px solid var(--border); 
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
          backdrop-filter: blur(20px); display: flex; flex-direction: column;
          position: relative; overflow: visible; 
        }
        .card-header { display: flex; align-items: center; gap: 14px; margin-bottom: 30px; position: relative; z-index: 2; }
        .card-header h2 { color: #fff; font-size: 1.5rem; font-weight: 800; margin: 0; letter-spacing: -0.5px; }

        /* Inputs e Forms */
        .input-group { position: relative; margin-bottom: 24px; width: 100%; z-index: 2; }
        .input-icon { position: absolute; left: 22px; top: 50%; transform: translateY(-50%); color: #64748b; display: flex; transition: 0.3s; z-index: 3; pointer-events: none;}
        
        .form-input { 
          width: 100%; background-color: rgba(0,0,0,0.2); color: white; border: 1px solid rgba(255,255,255,0.05); 
          border-radius: 18px; padding: 20px 20px 20px 60px; outline: none; transition: all 0.3s ease;
          font-family: 'Inter', sans-serif; font-size: 1.05rem; appearance: none;
        }
        .form-input::placeholder { color: #475569; }
        
        .form-input:focus { 
          border-color: var(--primary); background: rgba(139, 92, 246, 0.03); 
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.15); 
        }
        .form-input:focus + .input-icon { color: var(--primary); }

        /* ESTILOS DO DROPDOWN CUSTOMIZADO (COMBOBOX) */
        .custom-dropdown-container { position: relative; width: 100%; margin-bottom: 24px; z-index: 50; }
        .dropdown-trigger {
          width: 100%; background-color: rgba(0,0,0,0.2); color: white; border: 1px solid rgba(255,255,255,0.05); 
          border-radius: 18px; padding: 20px 20px 20px 60px; transition: all 0.3s ease;
          font-family: 'Inter', sans-serif; font-size: 1.05rem; display: flex; align-items: center; justify-content: space-between;
          cursor: pointer; text-align: left;
        }
        .dropdown-trigger:hover, .dropdown-trigger.open {
          border-color: var(--primary); background: rgba(139, 92, 246, 0.03);
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.15);
        }
        .dropdown-trigger .placeholder { color: #94a3b8; }
        
        .dropdown-menu {
          position: absolute; top: calc(100% + 8px); left: 0; width: 100%;
          background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px;
          box-shadow: 0 15px 40px rgba(0,0,0,0.6); overflow: hidden;
          animation: dropdownFade 0.2s ease-out; z-index: 100;
        }
        .dropdown-search-box {
          padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05);
          position: relative; background: #0f172a;
        }
        .dropdown-search-icon {
          position: absolute; left: 24px; top: 50%; transform: translateY(-50%); color: #64748b;
        }
        .dropdown-search-input {
          width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 12px 12px 12px 40px; color: #fff; outline: none; font-size: 0.95rem;
        }
        .dropdown-search-input:focus { border-color: var(--primary); }
        
        .dropdown-list { max-height: 250px; overflow-y: auto; padding: 8px; }
        .dropdown-list::-webkit-scrollbar { width: 6px; }
        .dropdown-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        
        .dropdown-item {
          padding: 12px 16px; border-radius: 10px; cursor: pointer; color: #cbd5e1;
          transition: 0.2s; display: flex; align-items: center; justify-content: space-between;
          font-size: 0.95rem;
        }
        .dropdown-item:hover { background: rgba(139, 92, 246, 0.1); color: #fff; }
        .dropdown-item.selected { background: var(--primary); color: #fff; font-weight: 600; }

        /* Botoes e Pilulas */
        .btn-submit { 
          width: 100%; padding: 20px; border-radius: 16px; border: none; 
          background: rgba(255,255,255,0.03); color: #fff; font-weight: 800; cursor: pointer; transition: 0.3s;
          display: flex; align-items: center; justify-content: center; gap: 10px; border: 1px solid var(--border);
          font-size: 1.05rem; z-index: 2; position: relative;
        }
        .btn-submit:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); transform: translateY(-2px); }
        .btn-submit:active { transform: translateY(0); }

        .pill-container { margin-top: 35px; display: flex; flex-wrap: wrap; gap: 12px; position: relative; z-index: 2; }
        
        .data-pill { 
          background: rgba(2, 6, 23, 0.6); border: 1px solid var(--border); 
          padding: 10px 16px; border-radius: 14px; font-size: 0.9rem; color: #e2e8f0; 
          font-weight: 600; display: inline-flex; align-items: center; gap: 10px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative; overflow: hidden;
        }
        .data-pill:hover { border-color: rgba(255,255,255,0.15); background: rgba(30, 41, 59, 0.9); padding-right: 42px; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        
        .data-pill.category:hover { border-color: rgba(52, 211, 153, 0.4); }
        .data-pill.tag:hover { border-color: rgba(139, 92, 246, 0.4); }
        
        .btn-delete-pill { 
          position: absolute; right: -40px; top: 0; bottom: 0; width: 40px;
          background: rgba(239, 68, 68, 0.15); border: none; color: #f87171; 
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: 0.3s; opacity: 0;
        }
        .btn-delete-pill:hover { background: #ef4444; color: #fff; }
        .data-pill:hover .btn-delete-pill { right: 0; opacity: 1; }

        @media (max-width: 1024px) {
          .dashboard-content { margin-left: 0; padding: 40px 20px; }
          .cta-banner { flex-direction: column; text-align: center; padding: 30px 20px; }
          .cta-banner .btn-cta { width: 100%; justify-content: center; }
          .glass-card { padding: 30px 20px; }
        }
      `}),e.jsx(ee,{}),e.jsxs("main",{className:"dashboard-content",children:[e.jsxs("header",{className:"dashboard-header",children:[e.jsx("h1",{children:"Painel do Admin"}),e.jsx("p",{children:"Organize categorias, setores e gerencie os acessos do seu time com precisão."})]}),e.jsxs("div",{className:"cta-banner",children:[e.jsxs("div",{className:"cta-text",children:[e.jsx("h2",{children:"Gestão de Trilhas & Aulas"}),e.jsx("p",{children:"Monte o conteúdo da plataforma, edite vídeos, inteligência artificial e gamificação em um só lugar."})]}),e.jsxs("button",{onClick:()=>v("/admin/gestao-conteudo"),className:"btn-cta",children:["Acessar Gerenciador ",e.jsx(ae,{size:20})]})]}),e.jsxs("div",{className:"admin-grid",children:[e.jsxs("div",{className:"glass-card",children:[e.jsxs("div",{className:"card-header",children:[e.jsx(re,{size:30,color:"#34d399"}),e.jsx("h2",{children:"Categorias"})]}),e.jsxs("form",{onSubmit:Z,children:[e.jsxs("div",{className:"input-group",children:[e.jsx("input",{type:"text",className:"form-input",placeholder:"Nova Categoria (Ex: Vendas)",value:c,onChange:a=>j(a.target.value),required:!0}),e.jsx("div",{className:"input-icon",children:e.jsx(ne,{size:22})})]}),e.jsxs("button",{className:"btn-submit",type:"submit",children:[e.jsx(E,{size:20})," Adicionar Categoria"]})]}),e.jsxs("div",{className:"pill-container",children:[y.length===0&&e.jsx("span",{style:{color:"var(--text-muted)",fontSize:"0.95rem"},children:"Nenhuma categoria criada."}),y.map(a=>e.jsxs("div",{className:"data-pill category",children:[e.jsx("span",{children:a.name}),o==="admin"&&e.jsx("button",{className:"btn-delete-pill",onClick:()=>G(a.id),title:"Excluir Categoria",children:e.jsx(L,{size:16})})]},a.id))]})]}),e.jsxs("div",{className:"glass-card",children:[e.jsxs("div",{className:"card-header",children:[e.jsx(pe,{size:30,color:"var(--primary)"}),e.jsx("h2",{children:"Setores (Tags)"})]}),e.jsxs("form",{onSubmit:H,children:[e.jsxs("div",{className:"input-group",children:[e.jsx("input",{type:"text",className:"form-input",placeholder:"Novo Setor (Ex: COMERCIAL)",value:h,onChange:a=>w(a.target.value),required:!0}),e.jsx("div",{className:"input-icon",children:e.jsx(O,{size:22})})]}),e.jsxs("button",{className:"btn-submit",type:"submit",children:[e.jsx(E,{size:20})," Adicionar Setor"]})]}),e.jsxs("div",{className:"pill-container",children:[l.length===0&&e.jsx("span",{style:{color:"var(--text-muted)",fontSize:"0.95rem"},children:"Nenhuma tag criada."}),l.map(a=>e.jsxs("div",{className:"data-pill tag",children:[e.jsx("span",{children:a.name}),o==="admin"&&e.jsx("button",{className:"btn-delete-pill",onClick:()=>R(a.id),title:"Excluir Setor",children:e.jsx(L,{size:16})})]},a.id))]})]}),e.jsxs("div",{className:"glass-card",style:{border:"1px solid rgba(139, 92, 246, 0.25)"},children:[e.jsx("div",{style:{position:"absolute",top:"-10%",right:"-10%",padding:"20px",opacity:.05,pointerEvents:"none"},children:e.jsx(te,{size:180})}),e.jsxs("div",{className:"card-header",children:[e.jsx($,{size:30,color:"#60a5fa"}),e.jsx("h2",{children:"Atribuir Acessos"})]}),e.jsx("p",{style:{color:"var(--text-muted)",fontSize:"1rem",marginBottom:"30px",position:"relative",zIndex:2,lineHeight:"1.5"},children:"Vincule um Colaborador a um Setor específico para liberar permissões exclusivas ou segmentar análises no dashboard."}),e.jsxs("form",{onSubmit:W,style:{position:"relative",zIndex:2},children:[e.jsxs("div",{className:"custom-dropdown-container",children:[e.jsxs("button",{type:"button",className:`dropdown-trigger ${p?"open":""}`,onClick:()=>{m(!p),g(!1)},children:[e.jsx("div",{className:"input-icon",style:{left:"20px"},children:e.jsx(xe,{size:22})}),e.jsx("span",{className:n?"":"placeholder",children:X}),e.jsx(Y,{size:20,color:"#94a3b8",style:{transition:"0.3s",transform:p?"rotate(180deg)":"rotate(0)"}})]}),p&&e.jsxs("div",{className:"dropdown-menu",children:[e.jsxs("div",{className:"dropdown-search-box",children:[e.jsx(M,{size:18,className:"dropdown-search-icon"}),e.jsx("input",{autoFocus:!0,type:"text",className:"dropdown-search-input",placeholder:"Buscar colaborador...",value:S,onChange:a=>C(a.target.value)})]}),e.jsx("div",{className:"dropdown-list",children:_.length===0?e.jsx("div",{style:{padding:"15px",textAlign:"center",color:"#64748b",fontSize:"0.9rem"},children:"Nenhum colaborador encontrado."}):_.map(a=>e.jsxs("div",{className:`dropdown-item ${n===a.id?"selected":""}`,onClick:()=>{k(a.id),m(!1),C("")},children:[a.full_name||"Sem nome cadastrado",n===a.id&&e.jsx(P,{size:18})]},a.id))})]})]}),e.jsxs("div",{className:"custom-dropdown-container",style:{zIndex:49},children:[e.jsxs("button",{type:"button",className:`dropdown-trigger ${x?"open":""}`,onClick:()=>{g(!x),m(!1)},children:[e.jsx("div",{className:"input-icon",style:{left:"20px"},children:e.jsx(O,{size:22})}),e.jsx("span",{className:i?"":"placeholder",children:J}),e.jsx(Y,{size:20,color:"#94a3b8",style:{transition:"0.3s",transform:x?"rotate(180deg)":"rotate(0)"}})]}),x&&e.jsxs("div",{className:"dropdown-menu",children:[e.jsxs("div",{className:"dropdown-search-box",children:[e.jsx(M,{size:18,className:"dropdown-search-icon"}),e.jsx("input",{autoFocus:!0,type:"text",className:"dropdown-search-input",placeholder:"Buscar setor...",value:T,onChange:a=>A(a.target.value)})]}),e.jsx("div",{className:"dropdown-list",children:I.length===0?e.jsx("div",{style:{padding:"15px",textAlign:"center",color:"#64748b",fontSize:"0.9rem"},children:"Nenhum setor encontrado."}):I.map(a=>e.jsxs("div",{className:`dropdown-item ${i===a.id?"selected":""}`,onClick:()=>{z(a.id),g(!1),A("")},children:[a.name,i===a.id&&e.jsx(P,{size:18})]},a.id))})]})]}),e.jsxs("button",{className:"btn-submit",type:"submit",style:{background:"linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",borderColor:"transparent",marginTop:"15px",color:"#fff",boxShadow:"0 10px 25px rgba(59, 130, 246, 0.3)"},children:[e.jsx($,{size:20})," Confirmar Vínculo"]})]})]})]})]})]})}export{Ne as default};
