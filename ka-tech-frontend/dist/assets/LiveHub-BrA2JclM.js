import{u as z,r as i,s as g,j as e,v as f}from"./index-B9lAlNMN.js";import{c}from"./createLucideIcon-CBFMAAE2.js";import{C as l}from"./calendar-DuF7950u.js";import{C as b}from"./circle-play-CVE4AFil.js";import{S}from"./sparkles-BeXwp_sc.js";import{C as D}from"./clock-YnPGeae2.js";const R=[["path",{d:"M16.247 7.761a6 6 0 0 1 0 8.478",key:"1fwjs5"}],["path",{d:"M19.075 4.933a10 10 0 0 1 0 14.134",key:"ehdyv1"}],["path",{d:"M4.925 19.067a10 10 0 0 1 0-14.134",key:"1q22gi"}],["path",{d:"M7.753 16.239a6 6 0 0 1 0-8.478",key:"r2q7qm"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]],d=c("radio",R);const _=[["rect",{x:"3",y:"3",width:"18",height:"18",rx:"2",key:"h1oib"}],["path",{d:"M9 9.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997A1 1 0 0 1 9 14.996z",key:"kmsa83"}]],A=c("square-play",_);const E=[["path",{d:"m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5",key:"ftymec"}],["rect",{x:"2",y:"6",width:"14",height:"12",rx:"2",key:"158x01"}]],C=c("video",E);function M(){const h=z(),[o,u]=i.useState([]),[p,y]=i.useState([]),[v,j]=i.useState(new Date),[w,x]=i.useState(!0);i.useEffect(()=>{const a=setInterval(()=>j(new Date),6e4);return k(),()=>clearInterval(a)},[]);async function k(){x(!0);try{const{data:a}=await g.from("lives").select("*").is("duration",null).order("scheduled_at",{ascending:!0}),{data:r}=await g.from("lives").select("*").not("duration","is",null).order("scheduled_at",{ascending:!1});a&&u(a),r&&y(r)}catch(a){console.error("Erro:",a)}finally{x(!1)}}const n=a=>{if(!a)return"";if(a.length===11&&!a.includes("/"))return a;const r=/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,t=a.match(r);return t?t[1]:a},m=a=>{h("/live",{state:{videoId:n(a.video_id),isReplay:!!a.duration}})};return w?e.jsxs("div",{className:"dashboard-layout",style:{display:"flex",alignItems:"center",justifyContent:"center"},children:[e.jsx(f,{}),e.jsxs("div",{style:{textAlign:"center",flex:1,marginLeft:"260px"},children:[e.jsx(d,{size:44,color:"#8b5cf6",style:{animation:"pulse 2s infinite",margin:"0 auto 15px"}}),e.jsx("h3",{style:{color:"#fff",fontSize:"1.2rem",fontWeight:800,fontFamily:"Inter, sans-serif"},children:"Sintonizando frequências..."}),e.jsx("style",{children:"@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.1); } }"})]})]}):e.jsxs("div",{className:"dashboard-layout",children:[e.jsx(f,{}),e.jsx("style",{children:`
                :root { 
                    --primary: #8b5cf6; 
                    --bg-dark: #020617; 
                    --card-glass: rgba(15, 23, 42, 0.6); 
                    --border: rgba(255, 255, 255, 0.08);
                }

                * { box-sizing: border-box; }

                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes pulseRed {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                    70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }

                .dashboard-layout { display: flex; width: 100%; min-height: 100vh; background: var(--bg-dark); font-family: 'Inter', system-ui, sans-serif; color: #fff; overflow-x: hidden;}
                .main-content { flex: 1; margin-left: 260px; padding: 50px 60px; transition: 0.3s ease; width: calc(100% - 260px); max-width: 1800px; margin-right: auto;}
                
                /* HERO HEADER */
                .hero-header { 
                    position: relative; margin-bottom: 60px; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 30px;
                    padding-bottom: 30px; border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                .ambient-glow {
                    position: absolute; top: -50px; left: -50px; width: 300px; height: 300px;
                    background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%); pointer-events: none; z-index: 0;
                }
                .hero-text { position: relative; z-index: 1; }
                .page-title { color: #fff; font-size: 3rem; font-weight: 900; margin: 0; letter-spacing: -1.5px; background: linear-gradient(to right, #ffffff, #c4b5fd); -webkit-background-clip: text; -webkit-text-fill-color: transparent;}
                .hero-subtitle { color: #94a3b8; font-size: 1.15rem; margin: 10px 0 0 0; font-weight: 500;}

                .section-title { 
                    font-size: 1.4rem; font-weight: 900; margin-bottom: 25px; display: flex; align-items: center; gap: 12px; color: #f8fafc; letter-spacing: -0.5px;
                }

                .grid-container { 
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 30px; margin-bottom: 60px;
                }

                /* CARDS (Estilo Streaming) */
                .live-card { 
                    background: var(--card-glass); border: 1px solid var(--border); border-radius: 24px; overflow: hidden; 
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); cursor: pointer; display: flex; flex-direction: column;
                    backdrop-filter: blur(12px); box-shadow: 0 15px 35px -10px rgba(0,0,0,0.5);
                    animation: fadeUp 0.6s ease-out forwards; opacity: 0;
                }
                .live-card:hover { 
                    transform: translateY(-8px); border-color: rgba(139, 92, 246, 0.5); 
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7), 0 0 30px rgba(139, 92, 246, 0.15); 
                }
                
                .live-card.on-air { border-color: rgba(239, 68, 68, 0.4); box-shadow: 0 15px 35px rgba(239, 68, 68, 0.15); }
                .live-card.on-air:hover { border-color: #ef4444; box-shadow: 0 25px 50px rgba(239, 68, 68, 0.25), 0 0 30px rgba(239, 68, 68, 0.2); }
                
                /* THUMBNAIL */
                .thumb-box { position: relative; width: 100%; aspect-ratio: 16/9; overflow: hidden; background: #000; }
                .thumb-img { width: 100%; height: 100%; object-fit: cover; opacity: 0.9; transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
                .live-card:hover .thumb-img { transform: scale(1.08); opacity: 1; }
                
                /* Overlay Gradient */
                .thumb-overlay {
                    position: absolute; inset: 0; z-index: 1; pointer-events: none;
                    background: linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 40%, rgba(0,0,0,0.6) 100%);
                }

                /* BADGES */
                .badge { 
                    position: absolute; top: 16px; left: 16px; padding: 6px 14px; border-radius: 12px; font-weight: 800; font-size: 0.75rem; 
                    text-transform: uppercase; z-index: 2; backdrop-filter: blur(10px); letter-spacing: 0.5px;
                }
                .badge.agendada { background: rgba(30, 41, 59, 0.8); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.1); }
                .badge.ao-vivo { 
                    background: #ef4444; color: #fff; display: flex; align-items: center; gap: 6px; 
                    box-shadow: 0 0 15px rgba(239, 68, 68, 0.5); animation: pulseRed 2s infinite; border: 1px solid #fca5a5;
                }
                
                .badge-time { 
                    position: absolute; bottom: 16px; right: 16px; background: rgba(2, 6, 23, 0.85); color: #fff; 
                    padding: 6px 12px; border-radius: 10px; font-size: 0.8rem; font-weight: 700; z-index: 2;
                    backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 6px;
                }

                .card-body { padding: 24px; display: flex; flex-direction: column; flex: 1; position: relative; z-index: 2; background: var(--card-glass); }
                .card-title { font-weight: 800; color: #f8fafc; margin-bottom: 12px; font-size: 1.2rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                
                .card-meta { color: #94a3b8; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; font-weight: 500; margin-top: auto;}
                .card-meta.live-now { color: #ef4444; font-weight: 700; }
                
                /* Play Button Overlay */
                .play-overlay {
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.8);
                    width: 60px; height: 60px; background: rgba(139, 92, 246, 0.9); border-radius: 50%;
                    display: flex; align-items: center; justify-content: center; z-index: 3;
                    opacity: 0; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    box-shadow: 0 10px 25px rgba(139, 92, 246, 0.5);
                }
                .live-card:hover .play-overlay { opacity: 1; transform: translate(-50%, -50%) scale(1); }

                /* Empty State */
                .empty-state {
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    padding: 60px 20px; background: rgba(30, 41, 59, 0.3); border-radius: 24px; border: 2px dashed rgba(255,255,255,0.05);
                    text-align: center; margin-bottom: 60px;
                }

                @media (max-width: 1024px) { 
                    .main-content { margin-left: 0; width: 100%; padding: 40px 20px 100px 20px; } 
                    .grid-container { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;}
                    .hero-header { flex-direction: column; align-items: flex-start; gap: 20px; }
                    .page-title { font-size: 2.2rem; }
                }
            `}),e.jsxs("main",{className:"main-content",children:[e.jsxs("header",{className:"hero-header",children:[e.jsx("div",{className:"ambient-glow"}),e.jsxs("div",{className:"hero-text",children:[e.jsx("h1",{className:"page-title",children:"Live Center"}),e.jsx("p",{className:"hero-subtitle",children:"Transmissões ao vivo, mentorias e biblioteca de replays."})]})]}),e.jsxs("h2",{className:"section-title",children:[e.jsx(d,{size:24,color:"#ef4444"})," Transmissões Oficiais"]}),o.length===0?e.jsxs("div",{className:"empty-state",children:[e.jsx(l,{size:48,color:"#475569",style:{marginBottom:"15px"}}),e.jsx("h3",{style:{color:"#fff",fontSize:"1.2rem",marginBottom:"8px"},children:"Agenda Livre"}),e.jsx("p",{style:{color:"#94a3b8"},children:"Nenhuma transmissão programada para os próximos dias."})]}):e.jsx("div",{className:"grid-container",children:o.map((a,r)=>{const t=new Date(a.scheduled_at)<=v,s=n(a.video_id);return e.jsxs("div",{className:`live-card ${t?"on-air":""}`,onClick:()=>m(a),style:{animationDelay:`${r*.1}s`},children:[e.jsxs("div",{className:"thumb-box",children:[e.jsx("div",{className:"thumb-overlay"}),e.jsx("div",{className:"play-overlay",children:e.jsx(b,{size:32,color:"#fff",fill:"#fff"})}),t?e.jsxs("span",{className:"badge ao-vivo",children:[e.jsx(d,{size:14})," AO VIVO AGORA"]}):e.jsx("span",{className:"badge agendada",children:"Agendada"}),e.jsx("img",{src:`https://img.youtube.com/vi/${s}/maxresdefault.jpg`,onError:N=>N.currentTarget.src=`https://img.youtube.com/vi/${s}/hqdefault.jpg`,alt:a.title,className:"thumb-img"})]}),e.jsxs("div",{className:"card-body",children:[e.jsx("h3",{className:"card-title",title:a.title,children:a.title}),e.jsx("div",{className:`card-meta ${t?"live-now":""}`,children:t?e.jsxs(e.Fragment,{children:[e.jsx(S,{size:16})," Acontecendo agora"]}):e.jsxs(e.Fragment,{children:[e.jsx(l,{size:16})," ",new Date(a.scheduled_at).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})]})})]})]},a.id)})}),e.jsxs("h2",{className:"section-title",style:{marginTop:"20px"},children:[e.jsx(A,{size:24,color:"#8b5cf6"})," Biblioteca de Replays"]}),p.length===0?e.jsxs("div",{className:"empty-state",children:[e.jsx(C,{size:48,color:"#475569",style:{marginBottom:"15px"}}),e.jsx("h3",{style:{color:"#fff",fontSize:"1.2rem",marginBottom:"8px"},children:"Acervo Vazio"}),e.jsx("p",{style:{color:"#94a3b8"},children:"Os replays das transmissões aparecerão aqui."})]}):e.jsx("div",{className:"grid-container",children:p.map((a,r)=>{const t=n(a.video_id);return e.jsxs("div",{className:"live-card",onClick:()=>m(a),style:{animationDelay:`${(o.length+r)*.1}s`},children:[e.jsxs("div",{className:"thumb-box",children:[e.jsx("div",{className:"thumb-overlay"}),e.jsx("div",{className:"play-overlay",children:e.jsx(b,{size:32,color:"#fff",fill:"#fff"})}),a.duration&&e.jsxs("span",{className:"badge-time",children:[e.jsx(D,{size:14})," ",a.duration]}),e.jsx("img",{src:`https://img.youtube.com/vi/${t}/maxresdefault.jpg`,onError:s=>s.currentTarget.src=`https://img.youtube.com/vi/${t}/hqdefault.jpg`,alt:a.title,className:"thumb-img"})]}),e.jsxs("div",{className:"card-body",children:[e.jsx("h3",{className:"card-title",title:a.title,children:a.title}),e.jsxs("div",{className:"card-meta",children:[e.jsx(l,{size:16})," Replay de ",new Date(a.scheduled_at).toLocaleDateString("pt-BR")]})]})]},a.id)})})]})]})}export{M as default};
