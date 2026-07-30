import{r as a,u as y,s as p,j as e}from"./index-B9lAlNMN.js";import{S as w}from"./search-CcnXwaEv.js";import{B as j}from"./brain-BuK9RfQ9.js";import{c as u}from"./createLucideIcon-CBFMAAE2.js";import{C as v}from"./check-DCb4FCCf.js";import{T as k}from"./trash-2-DLL2FgEN.js";const N=[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]],q=u("copy",N);const C=[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]],S=u("external-link",C);function Q(){const[t,o]=a.useState([]),[x,s]=a.useState(!0),[n,f]=a.useState(""),[c,d]=a.useState(null),b=y();a.useEffect(()=>{g()},[]);async function g(){try{s(!0);const{data:r,error:i}=await p.from("quizzes").select("*").order("created_at",{ascending:!1});if(i)throw i;o(r||[])}catch(r){alert("Erro ao carregar quizzes: "+r.message)}finally{s(!1)}}const h=async r=>{if(window.confirm("Tem certeza que deseja excluir este quiz? Isso apagará todas as perguntas associadas."))try{const{error:i}=await p.from("quizzes").delete().eq("id",r);if(i)throw i;o(t.filter(z=>z.id!==r))}catch(i){alert("Erro ao excluir: "+i.message)}},m=(r,i)=>{navigator.clipboard.writeText(r),d(i),setTimeout(()=>d(null),2e3)},l=t.filter(r=>r.title.toLowerCase().includes(n.toLowerCase()));return x?e.jsx("div",{style:{padding:"100px",textAlign:"center",color:"#8b5cf6",fontWeight:800},children:"Carregando biblioteca de quizzes..."}):e.jsxs("div",{className:"quiz-list-wrapper",children:[e.jsx("style",{children:`
        .quiz-list-wrapper { min-height: 100vh; background: #020617; color: #fff; padding: 40px; font-family: 'Sora', sans-serif; }
        .container { max-width: 1000px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
        .header h1 { font-size: 2rem; font-weight: 900; margin: 0; }
        
        .search-bar { position: relative; margin-bottom: 30px; }
        .search-bar input { width: 100%; padding: 15px 20px 15px 50px; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 15px; color: #fff; outline: none; transition: 0.3s; }
        .search-bar input:focus { border-color: #8b5cf6; box-shadow: 0 0 15px rgba(139, 92, 246, 0.2); }
        .search-icon { position: absolute; left: 18px; top: 15px; color: #64748b; }

        .quiz-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .quiz-card { background: #0f172a; border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 25px; transition: 0.3s; }
        .quiz-card:hover { transform: translateY(-5px); border-color: rgba(139, 92, 246, 0.3); }
        
        .quiz-title { font-size: 1.2rem; font-weight: 800; margin-bottom: 10px; color: #fff; display: flex; align-items: center; gap: 10px; }
        .quiz-desc { color: #94a3b8; font-size: 0.85rem; line-height: 1.5; margin-bottom: 20px; height: 40px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        
        .card-actions { display: flex; gap: 10px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px; }
        .action-btn { flex: 1; padding: 10px; border-radius: 12px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; font-size: 0.75rem; transition: 0.2s; }
        .btn-view { background: rgba(139, 92, 246, 0.1); color: #c4b5fd; }
        .btn-copy { background: rgba(16, 185, 129, 0.1); color: #6ee7b7; }
        .btn-delete { background: rgba(239, 68, 68, 0.1); color: #fca5a5; flex: 0; padding: 10px 15px; }
        
        .btn-view:hover { background: #8b5cf6; color: #fff; }
        .btn-copy:hover { background: #10b981; color: #fff; }
        .btn-delete:hover { background: #ef4444; color: #fff; }

        @media (max-width: 768px) { .quiz-list-wrapper { padding: 20px; } .header { flex-direction: column; align-items: flex-start; gap: 20px; } }
      `}),e.jsxs("div",{className:"container",children:[e.jsxs("header",{className:"header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"Biblioteca de Quizzes"}),e.jsx("p",{style:{color:"#64748b"},children:"Todos os desafios gerados pela IA"})]}),e.jsx("button",{onClick:()=>b("/admin/gestao-conteudo"),style:{background:"#1e293b",color:"#fff",border:"none",padding:"12px 20px",borderRadius:"12px",cursor:"pointer",fontWeight:700},children:"+ Criar Novo"})]}),e.jsxs("div",{className:"search-bar",children:[e.jsx(w,{className:"search-icon",size:20}),e.jsx("input",{type:"text",placeholder:"Pesquisar por título...",value:n,onChange:r=>f(r.target.value)})]}),e.jsx("div",{className:"quiz-grid",children:l.map(r=>e.jsxs("div",{className:"quiz-card",children:[e.jsxs("div",{className:"quiz-title",children:[e.jsx(j,{size:20,color:"#8b5cf6"}),r.title]}),e.jsx("p",{className:"quiz-desc",children:r.description||"Sem descrição disponível."}),e.jsxs("div",{className:"card-actions",children:[e.jsxs("button",{className:"action-btn btn-view",onClick:()=>window.open(r.url||`/quizzes/${r.slug}`,"_blank"),children:[e.jsx(S,{size:16})," TESTAR"]}),e.jsxs("button",{className:"action-btn btn-copy",onClick:()=>m(r.url||`${window.location.origin}/quizzes/${r.slug}`,r.id),children:[c===r.id?e.jsx(v,{size:16}):e.jsx(q,{size:16}),c===r.id?"COPIADO":"LINK"]}),e.jsx("button",{className:"action-btn btn-delete",onClick:()=>h(r.id),children:e.jsx(k,{size:16})})]})]},r.id))}),l.length===0&&e.jsx("div",{style:{textAlign:"center",padding:"50px",color:"#64748b"},children:"Nenhum quiz encontrado."})]})]})}export{Q as default};
