import{q as j,u as w,r as i,j as e,v,s as a}from"./index-B9lAlNMN.js";function C(){const{userRole:n}=j(),g=w(),[c,f]=i.useState([]),[s,p]=i.useState(""),[l,x]=i.useState(""),[m,h]=i.useState(!0),d=async()=>{const{data:t}=await a.from("meetings").select("*").eq("is_active",!0).order("created_at",{ascending:!1});t&&f(t),h(!1)};i.useEffect(()=>{d()},[]);const b=async()=>{if(!s||!l){alert("Por favor, preencha o Título e a URL personalizada!");return}try{const{data:t}=await a.auth.getUser(),o=l.toLowerCase().trim().replace(/\s+/g,"-").replace(/[^\w-]/g,""),{error:u}=await a.from("meetings").insert([{title:s,room_id:o,created_by:t.user?.id,is_active:!0}]);u?alert(`Erro no banco: ${u.message}`):(p(""),x(""),d(),alert("Reunião criada com sucesso!"))}catch(t){console.error(t),alert("Erro interno ao processar criação.")}},y=async t=>{if(!window.confirm("Deseja realmente encerrar esta reunião?"))return;const{error:o}=await a.from("meetings").delete().eq("id",t);o?alert("Erro ao encerrar: "+o.message):d()};return e.jsxs("div",{className:"hub-container",children:[e.jsx("style",{children:`
                .hub-container { 
                    display: flex; 
                    background-color: #020617; 
                    min-height: 100vh; 
                    color: #fff; 
                    box-sizing: border-box; 
                }
                
                /* Reset global para evitar que padding quebre o layout */
                .hub-container *, .hub-container *::before, .hub-container *::after {
                    box-sizing: border-box;
                }

                .hub-main { 
                    flex: 1; 
                    margin-left: 260px; 
                    padding: 40px; 
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    width: 100%;
                }

                .hub-content-wrapper {
                    width: 100%;
                    max-width: 1200px;
                }
                
                .creation-grid { 
                    display: grid; 
                    grid-template-columns: 1fr 380px; 
                    gap: 40px; 
                    margin-bottom: 25px;
                    align-items: flex-end;
                    width: 100%;
                }

                .input-group { 
                    display: flex; 
                    flex-direction: column; 
                    gap: 8px; 
                    width: 100%;
                }

                .input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                    width: 100%;
                }

                /* Mobile: Ajuste fino para não exceder o campo */
                @media (max-width: 1200px) {
                    .creation-grid { 
                        grid-template-columns: 1fr; 
                        gap: 20px; 
                    }
                    .hub-main { 
                        margin-left: 0; 
                        padding: 20px; 
                        margin-bottom: 85px; 
                    }
                    .hub-content-wrapper { 
                        max-width: 100%; 
                    }
                }

                @media (max-width: 480px) {
                    .hub-main { padding: 15px; }
                    header h1 { font-size: 1.6rem !important; }
                }
            `}),e.jsx(v,{}),e.jsx("main",{className:"hub-main",children:e.jsxs("div",{className:"hub-content-wrapper",children:[e.jsxs("header",{style:{marginBottom:"40px"},children:[e.jsx("h1",{style:{fontSize:"2.2rem",fontWeight:800,margin:0},children:"🤝 Central de Reuniões"}),e.jsx("p",{style:{color:"#9ca3af",fontSize:"1rem",marginTop:"10px"},children:"Gerencie suas salas de mentoria e encontros ao vivo."})]}),(n==="admin"||n==="teacher")&&e.jsxs("section",{style:r.card,children:[e.jsx("h3",{style:{marginBottom:"25px",fontSize:"1.2rem",color:"#f8fafc"},children:"🚀 Criar Nova Reunião"}),e.jsxs("div",{className:"creation-grid",children:[e.jsxs("div",{className:"input-group",children:[e.jsx("label",{style:r.label,children:"Título da Reunião"}),e.jsx("input",{type:"text",placeholder:"Ex: Alinhamento de Indicadores.",value:s,onChange:t=>p(t.target.value),style:r.input})]}),e.jsxs("div",{className:"input-group",children:[e.jsx("label",{style:r.label,children:"URL Personalizada (Slug)"}),e.jsxs("div",{className:"input-wrapper",children:[e.jsx("span",{style:r.urlPrefix,children:"/meet/"}),e.jsx("input",{type:"text",placeholder:"ex: indicadores-softcom",value:l,onChange:t=>x(t.target.value),style:{...r.input,paddingLeft:"65px"}})]})]})]}),e.jsx("button",{onClick:b,style:r.button,children:"Criar e Ativar Sala"})]}),e.jsxs("section",{style:{width:"100%"},children:[e.jsx("h3",{style:{marginBottom:"20px",color:"#f8fafc",fontSize:"1.2rem"},children:"Salas Disponíveis"}),m?e.jsx("p",{children:"Carregando..."}):e.jsx("div",{style:r.grid,children:c.length>0?c.map(t=>e.jsxs("div",{style:r.meetingCard,children:[e.jsxs("div",{style:{flex:1,marginRight:"15px",overflow:"hidden"},children:[e.jsx("h4",{style:{margin:"0 0 5px 0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:"#fff"},children:t.title}),e.jsxs("span",{style:{fontSize:"0.85rem",color:"#8b5cf6",fontWeight:600},children:["/meet/",t.room_id]})]}),e.jsxs("div",{style:{display:"flex",gap:"8px"},children:[e.jsx("button",{onClick:()=>g(`/meet/${t.room_id}`),style:r.joinButton,children:"Entrar"}),(n==="admin"||n==="teacher")&&e.jsx("button",{onClick:()=>y(t.id),style:r.deleteButton,children:"🗑️"})]})]},t.id)):e.jsx("p",{style:{color:"#64748b"},children:"Nenhuma reunião ativa no momento."})})]})]})})]})}const r={card:{backgroundColor:"#0f172a",padding:"25px",borderRadius:"16px",border:"1px solid rgba(139, 92, 246, 0.2)",marginBottom:"40px",width:"100%",overflow:"hidden"},label:{fontSize:"0.9rem",color:"#9ca3af",fontWeight:600,marginBottom:"2px"},input:{width:"100%",padding:"14px",borderRadius:"8px",border:"1px solid #334155",backgroundColor:"#020617",color:"#fff",outline:"none",fontSize:"1rem"},urlPrefix:{position:"absolute",left:"12px",color:"#64748b",fontSize:"0.9rem",fontWeight:700,pointerEvents:"none"},button:{width:"100%",padding:"16px",backgroundColor:"#8b5cf6",color:"#fff",border:"none",borderRadius:"8px",fontWeight:700,cursor:"pointer",fontSize:"1rem",marginTop:"10px"},grid:{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))",gap:"20px",width:"100%"},meetingCard:{backgroundColor:"#1e293b",padding:"20px",borderRadius:"14px",display:"flex",justifyContent:"space-between",alignItems:"center",border:"1px solid #334155"},joinButton:{padding:"10px 22px",backgroundColor:"#10b981",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",fontWeight:700,fontSize:"0.9rem"},deleteButton:{padding:"10px 14px",backgroundColor:"#ef4444",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center"}};export{C as default};
