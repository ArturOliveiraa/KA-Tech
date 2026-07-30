import{r as i,j as e,v as y,s as n,l as R}from"./index-B9lAlNMN.js";import{E as q}from"./jspdf.es.min-Bj7h-HQm.js";import I from"./html2canvas.esm-DXEQVQnt.js";import{S as j}from"./sparkles-BeXwp_sc.js";import{T}from"./trophy-CrEawnUB.js";import{F}from"./flame-ClmekOjH.js";import{A as v}from"./award-DD9_cwfX.js";import{C as H}from"./calendar-DuF7950u.js";import{C as P}from"./clock-YnPGeae2.js";import{B as W}from"./book-open-BbrjRURK.js";import{c as O}from"./createLucideIcon-CBFMAAE2.js";const M=[["path",{d:"M12 15V3",key:"m9g1x1"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["path",{d:"m7 10 5 5 5-5",key:"brsn70"}]],Y=O("download",M);function ae(){const[x,w]=i.useState([]),[z,g]=i.useState(!0),[m,N]=i.useState(""),[f,k]=i.useState({totalBadges:0,totalLessons:0}),[S,C]=i.useState(""),[A,h]=i.useState(null);i.useEffect(()=>{async function r(){try{g(!0);const{data:{user:a}}=await n.auth.getUser();if(!a)return;const[t,s,l,o]=await Promise.all([n.from("profiles").select("full_name").eq("id",a.id).single(),n.from("user_badges").select(`
                        earned_at,
                        badges (
                            name, 
                            image_url, 
                            courses (
                                id,
                                total_duration,
                                lessons:lessons(count),
                                course_enrollments (
                                    role,
                                    profiles (full_name)
                                )
                            )
                        )
                    `).eq("user_id",a.id),n.from("user_progress").select("*",{count:"exact",head:!0}).eq("user_id",a.id).eq("is_completed",!0),n.from("platform_settings").select("value").eq("key","certificate_logo").maybeSingle()]);t.data&&N(t.data.full_name),C(o.data?.value||R),s.data&&(w(s.data),k({totalBadges:s.data.length,totalLessons:l.count||0}))}catch(a){console.error("Erro ao carregar dados:",a)}finally{g(!1)}}r()},[]);const _=async(r,a)=>{const t=document.getElementById(a);if(t)try{h(a),t.style.display="block",t.style.position="fixed",t.style.left="-9999px";const l=(await I(t,{scale:3,useCORS:!0,backgroundColor:"#ffffff",width:1e3,height:650})).toDataURL("image/png"),o=new q({orientation:"landscape",unit:"px",format:[1e3,650]});o.addImage(l,"PNG",0,0,1e3,650),o.save(`Certificado-${r}.pdf`),t.style.display="none"}catch(s){console.error("Erro ao gerar PDF:",s),t.style.display="none",alert("Ocorreu um erro ao gerar seu certificado. Tente novamente.")}finally{h(null)}};return z?e.jsxs("div",{className:"dashboard-wrapper",style:{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#020617"},children:[e.jsx(y,{}),e.jsxs("div",{style:{textAlign:"center",flex:1,marginLeft:"260px"},children:[e.jsx(j,{size:44,color:"#8b5cf6",style:{animation:"pulse 2s infinite",margin:"0 auto 15px"}}),e.jsx("h3",{style:{color:"#fff",fontSize:"1.2rem",fontWeight:800,fontFamily:"Inter, sans-serif"},children:"Polindo seus troféus..."}),e.jsx("style",{children:"@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.1); } }"})]})]}):e.jsxs("div",{className:"dashboard-wrapper",children:[e.jsx(y,{}),e.jsxs("main",{className:"achievements-content",children:[e.jsxs("header",{className:"hero-header",children:[e.jsx("div",{className:"ambient-glow"}),e.jsxs("div",{className:"hero-text",children:[e.jsx("h1",{className:"page-title",children:"Salão de Troféus"}),e.jsxs("p",{className:"hero-subtitle",children:["O reflexo do seu esforço e dedicação, ",e.jsx("strong",{style:{color:"#fff"},children:m.split(" ")[0]||"Aluno"}),"."]})]}),e.jsxs("div",{className:"stats-pills",children:[e.jsxs("div",{className:"stat-pill glass-panel",children:[e.jsx("div",{className:"stat-icon-wrapper gold-glow",children:e.jsx(T,{size:20,color:"#fbbf24"})}),e.jsxs("div",{className:"stat-info",children:[e.jsx("span",{className:"stat-value",children:f.totalBadges}),e.jsx("span",{className:"stat-label",children:"Conquistas"})]})]}),e.jsxs("div",{className:"stat-pill glass-panel",children:[e.jsx("div",{className:"stat-icon-wrapper flame-glow",children:e.jsx(F,{size:20,color:"#f97316"})}),e.jsxs("div",{className:"stat-info",children:[e.jsx("span",{className:"stat-value",children:f.totalLessons}),e.jsx("span",{className:"stat-label",children:"Aulas Dominadas"})]})]})]})]}),x.length===0?e.jsxs("div",{className:"empty-state glass-panel",children:[e.jsx(v,{size:80,color:"#334155",style:{marginBottom:"25px",opacity:.6}}),e.jsx("h3",{style:{color:"#f8fafc",fontSize:"1.8rem",marginBottom:"12px",fontWeight:800},children:"Sua estante está pronta."}),e.jsx("p",{style:{color:"#94a3b8",maxWidth:"450px",margin:"0 auto",lineHeight:"1.6",fontSize:"1.05rem"},children:"Você ainda não desbloqueou nenhuma insígnia. Conclua trilhas e treinamentos para eternizar seu conhecimento aqui."})]}):e.jsx("div",{className:"achievements-grid",children:x.map((r,a)=>{const t=r.badges,s=Array.isArray(t?.courses)?t.courses[0]:t?.courses,b=`${((s?.total_duration||0)/60).toFixed(1).replace(".0","")}h`,E=s?.lessons?.[0]?.count||0,d=s?.course_enrollments?.filter(p=>p.role==="TEACHER")?.map(p=>p.profiles?.full_name).filter(Boolean),D=d&&d.length>0?d.join(", "):"Equipe KA Academy",B={day:"numeric",month:"long",year:"numeric"},L=new Date(r.earned_at).toLocaleDateString("pt-BR",B),c=`pdf-template-${a}`,u=A===c;return e.jsxs("div",{className:"achievement-card glass-panel",style:{animationDelay:`${a*.15}s`},children:[e.jsxs("div",{id:c,style:{display:"none",width:"1000px",height:"650px",backgroundColor:"#fff",position:"relative",fontFamily:"sans-serif",boxSizing:"border-box",color:"#0f172a"},children:[e.jsx("div",{style:{position:"absolute",left:0,top:0,bottom:0,width:"30px",backgroundColor:"#7c3aed"}}),e.jsxs("div",{style:{padding:"60px 80px 60px 110px"},children:[e.jsx("div",{style:{marginBottom:"50px",textAlign:"left"},children:e.jsx("img",{src:S,alt:"Logo",style:{height:"55px",objectFit:"contain"}})}),e.jsx("p",{style:{color:"#7c3aed",textTransform:"uppercase",letterSpacing:"3px",fontWeight:800,fontSize:"16px",margin:0,textAlign:"left"},children:"Certificado de Conclusão"}),e.jsx("h1",{style:{fontSize:"72px",fontWeight:900,margin:"15px 0 30px 0",lineHeight:"1",textTransform:"uppercase",textAlign:"left"},children:t?.name}),e.jsxs("p",{style:{fontSize:"24px",color:"#475569",maxWidth:"820px",lineHeight:"1.6",margin:0,textAlign:"left"},children:["Certificamos que o aluno(a) ",e.jsx("strong",{style:{color:"#0f172a"},children:m})," concluiu com êxito este treinamento online com carga horária total de ",e.jsx("strong",{children:b}),"."]}),e.jsxs("div",{style:{position:"absolute",bottom:"60px",left:"110px",right:"80px",borderTop:"2px solid #f1f5f9",paddingTop:"30px",display:"flex",justifyContent:"space-between",alignItems:"flex-end"},children:[e.jsxs("div",{style:{width:"30%",textAlign:"left"},children:[e.jsx("p",{style:{margin:0,fontSize:"14px",color:"#64748b"},children:"Emitido em"}),e.jsx("p",{style:{margin:"5px 0 0 0",fontSize:"18px",fontWeight:700},children:new Date(r.earned_at).toLocaleDateString("pt-BR")})]}),e.jsx("div",{style:{width:"40%",textAlign:"center"},children:e.jsx("p",{style:{fontSize:"11px",textTransform:"uppercase",letterSpacing:"1.5px",margin:0,color:"#94a3b8",fontWeight:600},children:"EMITIDO POR KA ACADEMY"})}),e.jsxs("div",{style:{width:"30%",textAlign:"right"},children:[e.jsx("p",{style:{margin:0,fontSize:"14px",color:"#64748b"},children:"Professores:"}),e.jsx("p",{style:{margin:"5px 0 0 0",fontSize:"18px",fontWeight:700,lineHeight:"1.2"},children:D})]})]})]})]}),e.jsxs("div",{className:"badge-showcase",children:[e.jsx("div",{className:"spotlight"}),e.jsx("div",{className:"badge-image-container",children:t?.image_url?e.jsx("img",{src:t.image_url,alt:t.name,className:"floating-badge"}):e.jsx(v,{size:60,color:"#cbd5e1",className:"floating-badge"})}),e.jsx("div",{className:"pedestal"})]}),e.jsxs("div",{className:"card-info",children:[e.jsxs("div",{className:"date-pill",children:[e.jsx(H,{size:12})," Conquistado em ",L]}),e.jsx("h3",{className:"course-title",title:t?.name,children:t?.name}),e.jsxs("div",{className:"course-meta",children:[e.jsxs("span",{children:[e.jsx(P,{size:14})," ",b]}),e.jsx("span",{className:"meta-dot",children:"•"}),e.jsxs("span",{children:[e.jsx(W,{size:14})," ",E," aulas"]})]}),e.jsx("button",{className:"btn-cert",onClick:()=>_(t?.name,c),disabled:u,children:u?e.jsxs(e.Fragment,{children:[e.jsx(j,{size:18,className:"animate-spin-slow"})," Gerando PDF..."]}):e.jsxs(e.Fragment,{children:[e.jsx(Y,{size:18})," Baixar Certificado"]})})]})]},a)})})]}),e.jsx("style",{children:`
                :root { 
                    --primary: #8b5cf6; --primary-hover: #7c3aed;
                    --bg-dark: #020617; 
                    --card-glass: rgba(15, 23, 42, 0.5); 
                    --border: rgba(255, 255, 255, 0.08);
                }

                * { box-sizing: border-box; }

                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); filter: drop-shadow(0 15px 25px rgba(0,0,0,0.6)); }
                    50% { transform: translateY(-12px) rotate(2deg); filter: drop-shadow(0 25px 35px rgba(0,0,0,0.4)); }
                }
                @keyframes spin-slow { 100% { transform: rotate(360deg); } }
                .animate-spin-slow { animation: spin-slow 3s linear infinite; }

                .dashboard-wrapper { display: flex; min-height: 100vh; background-color: var(--bg-dark); font-family: 'Inter', system-ui, sans-serif; overflow-x: hidden; }
                .achievements-content { flex: 1; padding: 60px; margin-left: 260px; transition: all 0.3s ease; width: calc(100% - 260px); }
                
                /* HERO HEADER */
                .hero-header { 
                    position: relative; margin-bottom: 60px; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 30px;
                    padding-bottom: 40px; border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                .ambient-glow {
                    position: absolute; top: -50px; left: -50px; width: 300px; height: 300px;
                    background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%); pointer-events: none; z-index: 0;
                }
                .hero-text { position: relative; z-index: 1; }
                .page-title { color: #fff; font-size: 3rem; font-weight: 900; margin: 0; letter-spacing: -1.5px; background: linear-gradient(to right, #ffffff, #c4b5fd); -webkit-background-clip: text; -webkit-text-fill-color: transparent;}
                .hero-subtitle { color: #94a3b8; font-size: 1.15rem; margin: 10px 0 0 0; font-weight: 500;}

                /* Pílulas de Estatísticas */
                .stats-pills { display: flex; gap: 15px; flex-wrap: wrap; position: relative; z-index: 1;}
                .stat-pill { 
                    display: flex; align-items: center; gap: 16px; padding: 16px 24px; border-radius: 20px;
                }
                .glass-panel {
                    background: var(--card-glass); backdrop-filter: blur(20px);
                    border: 1px solid var(--border); box-shadow: 0 20px 40px -10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
                }
                .stat-icon-wrapper {
                    width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center;
                    background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.05);
                }
                .gold-glow { box-shadow: inset 0 0 15px rgba(251, 191, 36, 0.1), 0 0 10px rgba(251, 191, 36, 0.1); border-color: rgba(251, 191, 36, 0.2); }
                .flame-glow { box-shadow: inset 0 0 15px rgba(249, 115, 22, 0.1), 0 0 10px rgba(249, 115, 22, 0.1); border-color: rgba(249, 115, 22, 0.2); }
                
                .stat-info { display: flex; flex-direction: column; justify-content: center; }
                .stat-value { color: #f8fafc; font-size: 1.6rem; font-weight: 900; line-height: 1; margin-bottom: 4px; }
                .stat-label { color: #64748b; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;}

                /* Empty State */
                .empty-state { text-align: center; padding: 100px 20px; border-radius: 30px; margin-top: 20px; border-style: dashed; border-color: rgba(255,255,255,0.1);}

                /* Cards de Colecionador */
                .achievements-grid { 
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 35px; padding-bottom: 50px;
                }
                
                .achievement-card { 
                    border-radius: 28px; text-align: center; display: flex; flex-direction: column; overflow: hidden;
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); position: relative;
                    animation: fadeUp 0.6s ease-out forwards; opacity: 0;
                    border-top: 1px solid rgba(255,255,255,0.15); /* Efeito de luz no topo do vidro */
                }
                .achievement-card:hover {
                    transform: translateY(-10px); border-color: rgba(139, 92, 246, 0.4);
                    box-shadow: 0 30px 60px -15px rgba(0,0,0,0.6), 0 0 40px rgba(139, 92, 246, 0.15);
                }

                /* Vitrine / Spotlight */
                .badge-showcase {
                    position: relative; height: 220px; display: flex; align-items: center; justify-content: center;
                    background: linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(2, 6, 23, 0.9) 100%);
                }
                .spotlight {
                    position: absolute; top: -50%; left: 50%; transform: translateX(-50%);
                    width: 200px; height: 300px; background: radial-gradient(ellipse at top, rgba(139, 92, 246, 0.25) 0%, transparent 70%);
                    pointer-events: none; z-index: 1;
                }
                .badge-image-container {
                    position: relative; z-index: 3; width: 130px; height: 130px;
                    display: flex; align-items: center; justify-content: center;
                }
                .floating-badge {
                    width: 100%; height: 100%; object-fit: contain;
                    animation: float 6s ease-in-out infinite;
                }
                .pedestal {
                    position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
                    width: 140px; height: 20px; background: radial-gradient(ellipse at center, rgba(139, 92, 246, 0.3) 0%, transparent 70%);
                    border-radius: 50%; filter: blur(4px); z-index: 2;
                }

                /* Informações e Botão */
                .card-info { padding: 30px 24px; display: flex; flex-direction: column; flex: 1; background: rgba(15, 23, 42, 0.3); align-items: center;}
                
                .date-pill {
                    display: inline-flex; align-items: center; gap: 6px; margin-bottom: 16px;
                    background: rgba(0,0,0,0.4); padding: 6px 14px; border-radius: 20px;
                    font-size: 0.75rem; color: #94a3b8; font-weight: 600; border: 1px solid rgba(255,255,255,0.05);
                }

                .course-title { 
                    color: #f8fafc; font-size: 1.25rem; font-weight: 800; margin: 0 0 16px 0; line-height: 1.4;
                    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
                    text-shadow: 0 2px 10px rgba(0,0,0,0.5);
                }
                
                .course-meta { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 30px; color: #64748b; font-size: 0.9rem; font-weight: 500;}
                .meta-dot { font-size: 1rem; opacity: 0.5; }

                .btn-cert { 
                    margin-top: auto; width: 100%; padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); 
                    background: rgba(255,255,255,0.03); color: #cbd5e1; font-weight: 700; font-size: 0.95rem; cursor: pointer; 
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                }
                .achievement-card:hover .btn-cert:not(:disabled) {
                    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%); 
                    color: #fff; border-color: transparent;
                    box-shadow: 0 10px 25px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255,255,255,0.2);
                }
                .btn-cert:active:not(:disabled) { transform: scale(0.96); }
                .btn-cert:disabled { opacity: 0.7; cursor: not-allowed; background: #1e293b; color: #94a3b8; }

                /* Mobile Adaptations */
                @media (max-width: 1024px) { 
                    .achievements-content { margin-left: 0; padding: 40px 30px 100px 30px; width: 100%; } 
                }

                @media (max-width: 768px) {
                    .achievements-content { padding: 30px 20px 100px 20px; }
                    .hero-header { flex-direction: column; align-items: flex-start; gap: 25px; padding-bottom: 30px;}
                    .page-title { font-size: 2.2rem; }
                    .stats-pills { width: 100%; flex-direction: column; }
                    .stat-pill { width: 100%; }
                    .achievements-grid { grid-template-columns: 1fr; gap: 25px;} 
                }
            `})]})}export{ae as default};
