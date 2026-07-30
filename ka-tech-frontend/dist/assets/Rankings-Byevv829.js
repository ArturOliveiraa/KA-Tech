import{r as s,s as j,j as e,v as y,A as c}from"./index-B9lAlNMN.js";import{T as z}from"./trophy-CrEawnUB.js";import{c as m}from"./createLucideIcon-CBFMAAE2.js";import{S as N}from"./star-D5tbs8TU.js";import{A as _}from"./award-DD9_cwfX.js";import{C}from"./clock-YnPGeae2.js";import{F as M}from"./flame-ClmekOjH.js";const L=[["path",{d:"M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",key:"1vdc57"}],["path",{d:"M5 21h14",key:"11awu3"}]],A=m("crown",L);const S=[["path",{d:"M16 7h6v6",key:"box55l"}],["path",{d:"m22 7-8.5 8.5-5-5L2 17",key:"1t1m79"}]],F=m("trending-up",S);const R=[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]],T=m("zap",R);function q(){const[g,f]=s.useState(!0),[t,u]=s.useState("xp"),[x,w]=s.useState([]),b=s.useCallback(async()=>{f(!0);let a="",i="";switch(t){case"xp":a="ranking_xp",i="total_xp";break;case"badges":a="ranking_badges",i="total_badges";break;case"maratonistas":a="ranking_maratonistas",i="lessons_completed";break;case"tempo":a="ranking_tempo_voo",i="total_time_spent";break;case"on_fire":a="ranking_on_fire",i="active_days";break}const l=`full_name, avatar_url, ${i}${t==="xp"?", rank_name":""}`,{data:o,error:n}=await j.from(a).select(l).order(i,{ascending:!1}).limit(10);if(!n&&o){const k=o.map(p=>({full_name:p.full_name,avatar_url:p.avatar_url,score:p[i]||0,rank_name:p.rank_name}));w(k)}f(!1)},[t]);s.useEffect(()=>{b()},[b]);const d=(a,i)=>{const l=a.score;if(t==="xp")return e.jsxs("div",{className:i?"xp-podium-center":"xp-table-right",children:[e.jsxs("span",{className:"xp-points-text",children:[l.toLocaleString()," XP"]}),e.jsx("span",{className:"xp-rank-subtext",children:a.rank_name||"Panda Broto"})]});let o="",n="#8b5cf6";return t==="badges"?(o=" Insígnias",n="#fcd34d"):t==="tempo"?(o=" min",n="#60a5fa"):t==="maratonistas"?(o=" aulas",n="#34d399"):t==="on_fire"&&(o=" 🔥",n="#f97316"),e.jsx("div",{className:i?"score-podium-center":"score-table-right",children:e.jsxs("span",{style:{color:n,fontWeight:900,fontSize:i?"1.15rem":"1rem"},children:[l.toLocaleString(),e.jsx("span",{style:{fontSize:"0.75em",opacity:.8,marginLeft:"4px"},children:o})]})})},v=[{id:"xp",label:"XP Global",icon:e.jsx(N,{size:16})},{id:"badges",label:"Colecionadores",icon:e.jsx(_,{size:16})},{id:"maratonistas",label:"Maratonistas",icon:e.jsx(T,{size:16})},{id:"tempo",label:"Tempo de Voo",icon:e.jsx(C,{size:16})},{id:"on_fire",label:"Ofensiva",icon:e.jsx(M,{size:16})}],r=x.slice(0,3),h=x.slice(3,10);return e.jsxs("div",{className:"dashboard-wrapper",children:[e.jsx(y,{}),e.jsxs("main",{className:"ranking-main-content",children:[e.jsxs("header",{className:"ranking-header",children:[e.jsxs("div",{className:"title-wrapper",children:[e.jsx(z,{size:42,color:"#fbbf24",style:{filter:"drop-shadow(0 0 20px rgba(251, 191, 36, 0.5))"}}),e.jsx("h1",{children:"Hall da Fama"})]}),e.jsxs("p",{children:["A elite da ",e.jsx("strong",{style:{color:"#8b5cf6"},children:"KA Tech"}),". Conquiste o topo e escreva seu nome na história."]})]}),e.jsx("div",{className:"ranking-tabs-container",children:e.jsx("div",{className:"ranking-tabs",children:v.map(a=>e.jsxs("button",{onClick:()=>u(a.id),className:`tab-btn ${t===a.id?"active":""}`,children:[a.icon," ",a.label]},a.id))})}),g?e.jsxs("div",{className:"loading-state",children:[e.jsx(F,{size:44,className:"animate-pulse",style:{marginBottom:"15px",color:"#8b5cf6"}}),e.jsx("span",{children:"Computando posições..."})]}):e.jsxs("div",{className:"ranking-animate-in",children:[e.jsxs("div",{className:"podium-container",children:[r[1]&&e.jsxs("div",{className:"podium-item silver",children:[e.jsx("div",{className:"podium-glow silver-glow"}),e.jsx("div",{className:"podium-rank",children:"2"}),e.jsx("div",{className:"avatar-wrapper-podium silver-border",children:e.jsx(c,{src:r[1].avatar_url,name:r[1].full_name||"Misterioso"})}),e.jsxs("div",{className:"podium-info",children:[e.jsx("span",{className:"podium-name",children:(r[1].full_name||"Misterioso").split(" ")[0]}),e.jsx("div",{className:"podium-score",children:d(r[1],!0)})]})]}),r[0]&&e.jsxs("div",{className:"podium-item gold",children:[e.jsx("div",{className:"crown-wrapper",children:e.jsx(A,{size:36,color:"#fbbf24",fill:"#fbbf24",style:{filter:"drop-shadow(0 4px 15px rgba(251, 191, 36, 0.8))"}})}),e.jsx("div",{className:"podium-glow gold-glow"}),e.jsx("div",{className:"podium-rank gold-rank",children:"1"}),e.jsx("div",{className:"avatar-wrapper-podium gold-border first-place",children:e.jsx(c,{src:r[0].avatar_url,name:r[0].full_name||"Misterioso"})}),e.jsxs("div",{className:"podium-info",children:[e.jsx("span",{className:"podium-name winner-name",children:(r[0].full_name||"Misterioso").split(" ")[0]}),e.jsx("div",{className:"podium-score",children:d(r[0],!0)})]})]}),r[2]&&e.jsxs("div",{className:"podium-item bronze",children:[e.jsx("div",{className:"podium-glow bronze-glow"}),e.jsx("div",{className:"podium-rank",children:"3"}),e.jsx("div",{className:"avatar-wrapper-podium bronze-border",children:e.jsx(c,{src:r[2].avatar_url,name:r[2].full_name||"Misterioso"})}),e.jsxs("div",{className:"podium-info",children:[e.jsx("span",{className:"podium-name",children:(r[2].full_name||"Misterioso").split(" ")[0]}),e.jsx("div",{className:"podium-score",children:d(r[2],!0)})]})]})]}),h.length>0&&e.jsx("div",{className:"ranking-list-container",children:h.map((a,i)=>e.jsxs("div",{className:"ranking-row-card",children:[e.jsx("div",{className:"rank-position",children:e.jsx("span",{className:"rank-number",children:i+4})}),e.jsxs("div",{className:"user-info-row",children:[e.jsx("div",{className:"avatar-fixed",children:e.jsx(c,{src:a.avatar_url,name:a.full_name||"Misterioso"})}),e.jsx("span",{className:"user-name-list",children:a.full_name||"Usuário Misterioso"})]}),e.jsx("div",{className:"score-cell",children:d(a,!1)})]},i))}),x.length===0&&!g&&e.jsx("div",{className:"empty-state",children:"Ainda não há competidores suficientes nesta categoria."})]})]}),e.jsx("style",{children:`
        :root { 
            --primary: #8b5cf6; 
            --bg-dark: #020617; 
            --card-glass: rgba(15, 23, 42, 0.6); 
            --border: rgba(255, 255, 255, 0.08);
            
            /* Cores e Brilhos das Medalhas */
            --gold: #fbbf24; --gold-glow: rgba(251, 191, 36, 0.2);
            --silver: #94a3b8; --silver-glow: rgba(148, 163, 184, 0.15);
            --bronze: #d97706; --bronze-glow: rgba(217, 119, 6, 0.15);
        }
        
        * { box-sizing: border-box; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .dashboard-wrapper { display: flex; min-height: 100vh; background-color: var(--bg-dark); font-family: 'Inter', system-ui, sans-serif; overflow-x: hidden; }
        .ranking-main-content { flex: 1; padding: 50px 60px; margin-left: 260px; transition: 0.3s; width: calc(100% - 260px); max-width: 100%; display: flex; flex-direction: column; align-items: center; }

        /* Cabeçalho */
        .ranking-header { text-align: center; margin-bottom: 45px; width: 100%; }
        .title-wrapper { display: flex; alignItems: center; gap: 15px; justifyContent: center; flex-wrap: wrap; margin-bottom: 8px; }
        .ranking-header h1 { color: #fff; font-size: 3rem; font-weight: 900; margin: 0; letter-spacing: -1.5px; text-transform: uppercase; background: linear-gradient(to bottom, #ffffff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;}
        .ranking-header p { color: #94a3b8; font-size: 1.1rem; }

        /* Abas */
        .ranking-tabs-container { width: 100%; display: flex; justify-content: center; margin-bottom: 50px; }
        .ranking-tabs { 
          display: inline-flex; gap: 6px; flex-wrap: wrap; justify-content: center;
          background: rgba(255,255,255,0.02); padding: 8px; border-radius: 20px; border: 1px solid var(--border);
          box-shadow: inset 0 2px 10px rgba(0,0,0,0.2);
        }
        .tab-btn { 
          display: flex; align-items: center; gap: 8px;
          background: transparent; color: #64748b; border: none; padding: 12px 22px; 
          border-radius: 14px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); font-size: 0.95rem; font-weight: 700; 
        }
        .tab-btn:hover { color: #e2e8f0; background: rgba(255,255,255,0.04); }
        .tab-btn.active { 
          background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: #fff; 
          box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4); 
        }

        .loading-state { color: #8b5cf6; text-align: center; padding: 100px; font-weight: 700; font-size: 1.1rem; display: flex; flex-direction: column; align-items: center; }
        .animate-pulse { animation: pulse 2s infinite; }

        .ranking-animate-in { animation: fadeUp 0.6s ease-out forwards; width: 100%; max-width: 900px; }

        /* Pódio Flutuante e Alinhado */
        .podium-container { 
          display: flex; align-items: flex-end; justify-content: center; gap: 24px; 
          margin-bottom: 60px; padding: 40px 10px 0 10px; width: 100%; min-height: 320px;
        }
        
        .podium-item { 
          display: flex; flex-direction: column; align-items: center; justify-content: space-between;
          background: rgba(15, 23, 42, 0.7); border-radius: 28px; 
          border: 1px solid var(--border); border-top-width: 2px;
          flex: 1; position: relative; max-width: 220px; transition: 0.4s;
          backdrop-filter: blur(12px); box-shadow: 0 20px 40px rgba(0,0,0,0.4);
          animation: float 6s ease-in-out infinite;
        }
        
        .podium-glow { position: absolute; top: 0; left: 0; width: 100%; height: 100px; border-radius: 28px 28px 0 0; pointer-events: none; opacity: 0.8; }
        .gold-glow { background: linear-gradient(180deg, var(--gold-glow) 0%, transparent 100%); }
        .silver-glow { background: linear-gradient(180deg, var(--silver-glow) 0%, transparent 100%); }
        .bronze-glow { background: linear-gradient(180deg, var(--bronze-glow) 0%, transparent 100%); }

        .podium-item.gold { 
          border-top-color: var(--gold); min-height: 280px; padding: 35px 20px 25px;
          transform: translateY(-20px); z-index: 3;
          box-shadow: 0 30px 60px rgba(0,0,0,0.5), 0 0 40px var(--gold-glow); order: 2; 
          animation-delay: -1s;
        }
        .podium-item.silver { 
          border-top-color: var(--silver); min-height: 230px; padding: 25px 20px;
          order: 1; animation-delay: -2s; box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 30px var(--silver-glow);
        }
        .podium-item.bronze { 
          border-top-color: var(--bronze); min-height: 210px; padding: 25px 20px;
          order: 3; animation-delay: -3s; box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 30px var(--bronze-glow);
        }

        .avatar-wrapper-podium { 
          width: 75px; height: 75px; overflow: hidden; border-radius: 50%; display: flex; align-items: center; justify-content: center; 
          background: #0f172a; border: 4px solid transparent; box-shadow: 0 10px 25px rgba(0,0,0,0.6); position: relative; z-index: 2;
        }
        .first-place { width: 95px; height: 95px; border-width: 5px; }
        
        .avatar-wrapper-podium > *, .avatar-fixed > * { width: 100% !important; height: 100% !important; border-radius: 50%; }
        .avatar-wrapper-podium img, .avatar-fixed img { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block; }

        .silver-border { border-color: var(--silver); }
        .gold-border { border-color: var(--gold); }
        .bronze-border { border-color: var(--bronze); }
        
        .podium-rank { 
          position: absolute; top: -16px; background: #0f172a; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; 
          border: 2px solid var(--border); border-radius: 50%; font-weight: 900; font-size: 0.95rem; color: #fff; box-shadow: 0 6px 15px rgba(0,0,0,0.5); z-index: 4;
        }
        .gold-rank { border-color: var(--gold); color: var(--gold); width: 38px; height: 38px; top: -19px; font-size: 1.1rem;}
        
        .podium-info { display: flex; flex-direction: column; align-items: center; width: 100%; position: relative; z-index: 2; margin-top: auto;}
        .podium-name { color: #f8fafc; font-weight: 800; margin-top: 15px; font-size: 1.05rem; text-align: center; }
        .winner-name { font-size: 1.3rem; color: var(--gold); text-shadow: 0 0 20px rgba(251,191,36,0.4); }
        .podium-score { margin-top: 8px; width: 100%; }
        
        .crown-wrapper { position: absolute; top: -55px; z-index: 4; animation: pulse 3s infinite; }

        /* Linhas da Lista (4º ao 10º) */
        .ranking-list-container { 
          display: flex; flex-direction: column; gap: 14px; width: 100%; 
        }
        
        .ranking-row-card {
          display: flex; align-items: center; justify-content: space-between;
          background: linear-gradient(90deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%); 
          border: 1px solid var(--border); border-left: 4px solid #334155;
          padding: 16px 28px; border-radius: 20px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
        }
        .ranking-row-card:hover {
          transform: translateX(6px); background: rgba(30, 41, 59, 0.9);
          border-left-color: var(--primary); box-shadow: 0 12px 25px rgba(0,0,0,0.3);
        }

        .rank-position { 
          width: 50px; display: flex; align-items: center;
        }
        .rank-number {
          font-weight: 900; color: #475569; font-size: 1.2rem; 
          background: rgba(0,0,0,0.3); width: 36px; height: 36px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
        }
        .ranking-row-card:hover .rank-number { color: var(--primary); background: rgba(139, 92, 246, 0.1); }

        .user-info-row { display: flex; align-items: center; gap: 18px; flex: 1; }
        .avatar-fixed { width: 48px; height: 48px; flex-shrink: 0; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #000; border: 2px solid rgba(255,255,255,0.1); }
        .user-name-list { color: #f8fafc; font-weight: 700; font-size: 1.05rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 350px; }
        
        /* Scores Formatting */
        .xp-podium-center, .score-podium-center { display: flex; flex-direction: column; align-items: center; text-align: center; width: 100%; line-height: 1.2; }
        .xp-table-right, .score-table-right { display: flex; flex-direction: column; align-items: flex-end; text-align: right; line-height: 1.2; }

        .xp-points-text { 
          color: transparent; font-weight: 900; font-size: 1.2rem; 
          background: linear-gradient(135deg, #c4b5fd 0%, #8b5cf6 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .score-table-right .xp-points-text { font-size: 1.1rem; }
        .xp-rank-subtext { color: #64748b; font-size: 0.75rem; text-transform: uppercase; font-weight: 800; margin-top: 4px; letter-spacing: 0.5px;}
        
        .empty-state { text-align: center; color: #64748b; padding: 60px; font-size: 1.1rem; }

        @media (max-width: 1024px) {
          .ranking-main-content { margin-left: 0; padding: 30px 20px 100px 20px; width: 100%; }
          .ranking-header { text-align: center; }
          .podium-container { gap: 16px; margin-bottom: 40px; min-height: 280px;}
          .podium-item { padding: 25px 15px; }
          .user-name-list { max-width: 180px; }
        }

        @media (max-width: 600px) {
          .ranking-header h1 { font-size: 2.2rem; }
          .podium-container { flex-direction: column; align-items: center; gap: 20px; padding-top: 20px; min-height: auto;}
          .podium-item { width: 100%; max-width: 100%; flex-direction: row; gap: 16px; padding: 20px; border-radius: 20px; border: 1px solid var(--border); border-left-width: 3px; min-height: auto !important; animation: none;}
          
          /* Refazendo pódio para mobile (estilo lista destacada) */
          .podium-glow { display: none; }
          .podium-item.gold { transform: none; order: unset; border-left-color: var(--gold); border-top-width: 1px; box-shadow: 0 10px 20px rgba(0,0,0,0.5); }
          .podium-item.silver { order: unset; border-left-color: var(--silver); border-top-width: 1px;}
          .podium-item.bronze { order: unset; border-left-color: var(--bronze); border-top-width: 1px;}
          
          .podium-rank { position: static; width: 34px; height: 34px; flex-shrink: 0; font-size: 1rem;}
          .podium-info { align-items: flex-start; text-align: left; margin: 0; }
          .podium-name { margin: 0; text-align: left; font-size: 1.15rem;}
          .podium-score { text-align: left; margin-top: 4px; }
          .xp-podium-center, .score-podium-center { align-items: flex-start; text-align: left; }
          .crown-wrapper { position: absolute; top: -15px; right: 20px; transform: rotate(15deg); }
          
          .avatar-wrapper-podium { width: 55px; height: 55px; margin: 0; }
          .first-place { width: 60px; height: 60px; border-width: 3px;}
          
          .ranking-row-card { padding: 14px 20px; border-radius: 16px; }
          .rank-position { width: 36px; }
          .rank-number { width: 30px; height: 30px; font-size: 1rem;}
          .avatar-fixed { width: 40px; height: 40px; }
          .user-name-list { font-size: 0.95rem; }
        }
      `})]})}export{q as default};
