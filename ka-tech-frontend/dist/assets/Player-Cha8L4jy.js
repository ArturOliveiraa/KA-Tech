import{r,s as n,j as e,w as xe,u as ge,v as he}from"./index-B9lAlNMN.js";import{S as ve}from"./SEO-CEbvJJMo.js";import W from"./QuizPlayer-BiCevnX2.js";import{L as Z}from"./loader-circle-3J5vS3EO.js";import{B as R}from"./brain-circuit-DFF9Y4i6.js";import{c as O}from"./createLucideIcon-CBFMAAE2.js";import{C as ye}from"./chevron-right-JAqY6J7n.js";import{F as J}from"./file-text-D1Io89Y8.js";import{C as we}from"./circle-play-CVE4AFil.js";import{T as je}from"./trash-2-DLL2FgEN.js";import"./book-open-BbrjRURK.js";import"./trophy-CrEawnUB.js";import"./clock-YnPGeae2.js";import"./arrow-right-C3sF1xKp.js";const ke=[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]],Ne=O("chevron-left",ke);const ze=[["path",{d:"M21 5H3",key:"1fi0y6"}],["path",{d:"M10 12H3",key:"1ulcyk"}],["path",{d:"M10 19H3",key:"108z41"}],["path",{d:"M15 12.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997a1 1 0 0 1-1.517-.86z",key:"ms4nik"}]],_e=O("list-video",ze);const Se=[["path",{d:"M8 3H5a2 2 0 0 0-2 2v3",key:"1dcmit"}],["path",{d:"M21 8V5a2 2 0 0 0-2-2h-3",key:"1e4gt3"}],["path",{d:"M3 16v3a2 2 0 0 0 2 2h3",key:"wsl5sc"}],["path",{d:"M16 21h3a2 2 0 0 0 2-2v-3",key:"18trek"}]],Ee=O("maximize",Se);const Ce=[["path",{d:"M8 3v3a2 2 0 0 1-2 2H3",key:"hohbtr"}],["path",{d:"M21 8h-3a2 2 0 0 1-2-2V3",key:"5jw1f3"}],["path",{d:"M3 16h3a2 2 0 0 1 2 2v3",key:"198tvr"}],["path",{d:"M16 21v-3a2 2 0 0 1 2-2h3",key:"ph8mxp"}]],Le=O("minimize",Ce);function Ie({lessonId:b,initialTime:x=0,onProgressUpdate:h,seekTo:v=null}){const[c,E]=r.useState(null),[o,y]=r.useState(!0),[s,i]=r.useState(null),u=r.useRef(null),m=r.useRef(x),_=r.useRef(h),w=r.useRef(!1);r.useEffect(()=>{_.current=h},[h]);const P=d=>{if(!d)return null;if(d.length===11&&!d.includes("/"))return d;const g=/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,f=d.match(g);return f?f[1]:null},C=r.useCallback(async()=>{if(!b)return;y(!0),i(null);const{data:d,error:g}=await n.from("lessons").select("*").eq("id",b).maybeSingle();if(g||!d){i("Aula não encontrada."),y(!1);return}const f=d.videoUrl||d.videourl||"",l=P(f);l?E({...d,videoId:l}):i(`URL Inválida: ${f}`),y(!1)},[b]);return r.useEffect(()=>{C()},[C]),r.useEffect(()=>{if(!c?.videoId||o||s)return;let d,g=!0;const f=()=>{if(g){if(!window.YT?.Player){setTimeout(f,200);return}try{u.current?.destroy&&u.current.destroy(),u.current=new window.YT.Player("youtube-player",{videoId:c.videoId,playerVars:{rel:0,modestbranding:1,origin:window.location.origin,enablejsapi:1,start:Math.floor(x)},events:{onReady:l=>{g&&(d=setInterval(()=>{if(l.target?.getCurrentTime){const j=l.target.getCurrentTime(),k=l.target.getDuration();k>0&&j>=k-1&&!w.current&&(w.current=!0,_.current?.(k,!0)),j>m.current+3?l.target.seekTo(m.current,!0):j>m.current&&(m.current=j,w.current||_.current?.(j,!1))}},1e3))},onStateChange:l=>{l.data===window.YT.PlayerState.ENDED&&!w.current&&(w.current=!0,_.current?.(l.target.getDuration(),!0))}}})}catch(l){console.error("Player error:",l)}}};if(window.YT)f();else{const l=document.createElement("script");l.src="https://www.youtube.com/iframe_api",document.body.appendChild(l),window.onYouTubeIframeAPIReady=f}return()=>{if(g=!1,d&&clearInterval(d),u.current?.destroy)try{u.current.destroy()}catch{}}},[c?.videoId,o,s]),r.useEffect(()=>{v!==null&&u.current?.seekTo&&(u.current.seekTo(v,!0),m.current=v)},[v]),o?e.jsx("div",{style:{color:"#8b5cf6",padding:"40px",textAlign:"center"},children:"Sincronizando vídeo..."}):s?e.jsx("div",{style:{color:"#ef4444",padding:"40px"},children:s}):e.jsx("div",{style:{width:"100%",margin:"0"},children:e.jsx("div",{style:{position:"relative",paddingTop:"56.25%",background:"#000",borderRadius:"16px",overflow:"hidden",boxShadow:"0 20px 50px rgba(0,0,0,0.5)"},children:e.jsx("div",{id:"youtube-player",style:{position:"absolute",top:0,left:0,width:"100%",height:"100%"}})})})}function Te({course_id:b,currentLessonId:x,onSelectLesson:h}){const[v,c]=r.useState([]),[E,o]=r.useState([]),y=r.useCallback(async()=>{const{data:i}=await n.from("lessons").select("id, title, order").eq("course_id",b).order("order",{ascending:!0});i&&c(i)},[b]),s=r.useCallback(async()=>{const{data:{user:i}}=await n.auth.getUser();if(!i)return;const{data:u}=await n.from("user_progress").select("lesson_id").eq("user_id",i.id).eq("course_id",b).eq("is_completed",!0);u&&o(u.map(m=>m.lesson_id))},[b]);return r.useEffect(()=>(y(),s(),window.addEventListener("progressUpdated",s),()=>window.removeEventListener("progressUpdated",s)),[y,s]),e.jsxs("div",{className:"lesson-sidebar-inner",style:{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"},children:[e.jsx("style",{children:`
        .sidebar-title-lessons {
          padding: 20px;
          color: #fff;
          font-size: 1rem;
          font-weight: 600;
          border-bottom: 1px solid #2d323e;
          background: #1a1d23;
          flex-shrink: 0; /* Impede que o título suma se houver muitas aulas */
        }
        
        .lessons-list-container {
          flex: 1;
          overflow-y: auto;
          background: #09090b;
        }

        /* Personalização da Scrollbar */
        .lessons-list-container::-webkit-scrollbar {
          width: 6px;
        }
        .lessons-list-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .lessons-list-container::-webkit-scrollbar-thumb {
          background: #2d323e;
          border-radius: 10px;
        }
        .lessons-list-container::-webkit-scrollbar-thumb:hover {
          background: #8b5cf6;
        }

        .lesson-item {
          padding: 15px 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: 0.2s;
          border-bottom: 1px solid #1a1d23;
          position: relative;
        }
        .lesson-item:hover { background: #1a1d23; }
        .lesson-item.active {
          background: rgba(139, 92, 246, 0.1);
          border-left: 4px solid #8b5cf6;
        }
        .lesson-num {
          color: #8b5cf6;
          font-weight: bold;
          font-size: 0.8rem;
          min-width: 20px;
        }
        .lesson-txt { color: #fff; font-size: 0.85rem; flex: 1; }
        
        .lesson-check {
          color: #10b981;
          font-size: 0.9rem;
          font-weight: bold;
        }
        .lesson-item.completed .lesson-num {
          color: #10b981;
        }
      `}),e.jsx("h3",{className:"sidebar-title-lessons",children:"Grade do Curso"}),e.jsx("nav",{className:"lessons-list-container",children:v.map(i=>{const u=E.includes(i.id),m=x===i.id;return e.jsxs("div",{className:`lesson-item ${m?"active":""} ${u?"completed":""}`,onClick:()=>h(i.id),children:[e.jsx("span",{className:"lesson-num",children:u?"✓":`#${i.order}`}),e.jsx("span",{className:"lesson-txt",style:{opacity:u&&!m?.6:1},children:i.title}),u&&e.jsx("span",{className:"lesson-check",children:"✅"})]},i.id)})})]})}function Ge(){const{slug:b}=xe(),x=ge(),[h,v]=r.useState(null),[c,E]=r.useState([]),[o,y]=r.useState(null),[s,i]=r.useState(null),[u,m]=r.useState(!0),[_,w]=r.useState(0),[P,C]=r.useState(!1),[d,g]=r.useState(!1),[f,l]=r.useState(!1),[j,k]=r.useState(!1),[$,K]=r.useState({completed:0,total:0,percent:0}),[X,B]=r.useState(!1),[I,ee]=r.useState(null),[U,Q]=r.useState("content"),[Y,H]=r.useState([]),[T,F]=r.useState(""),[te,re]=r.useState(0),[se,ae]=r.useState(null),[A,oe]=r.useState(window.innerWidth<=1024);r.useEffect(()=>{const t=()=>oe(window.innerWidth<=1024);return window.addEventListener("resize",t),()=>window.removeEventListener("resize",t)},[]);const q=r.useCallback(()=>{if(!s||c.length===0)return;const t=c.findIndex(a=>a.id===s);t!==-1&&t<c.length-1&&i(c[t+1].id)},[s,c]),ne=r.useCallback(()=>{if(!s||c.length===0)return;const t=c.findIndex(a=>a.id===s);t>0&&i(c[t-1].id)},[s,c]);r.useEffect(()=>{async function t(){try{m(!0);const{data:{user:a}}=await n.auth.getUser();if(!a)return x("/");const{data:p}=await n.from("courses").select("id, title, slug").eq("slug",b).single();if(!p)return x("/dashboard");v(p),y(p.id);const[N,M]=await Promise.all([n.from("lessons").select("id, order, title").eq("course_id",p.id).order("order",{ascending:!0}),n.from("user_progress").select("lesson_id, is_completed").eq("user_id",a.id).eq("course_id",p.id)]),z=N.data||[];E(z);const L=M.data||[];if(z.length>0){const D=z.find(be=>!L.find(fe=>fe.lesson_id===be.id)?.is_completed);i(D?D.id:z[0].id)}}catch(a){console.error("Erro ao carregar dados do player:",a)}finally{m(!1)}}t()},[b,x]);const S=r.useCallback(async()=>{const{data:{user:t}}=await n.auth.getUser();if(!t||!o)return;const[a,p]=await Promise.all([n.from("lessons").select("id",{count:"exact",head:!0}).eq("course_id",o),n.from("user_progress").select("lesson_id, is_completed").eq("user_id",t.id).eq("course_id",o).eq("is_completed",!0)]),N=a.count||0,M=p.count||0,z=N>0?Math.round(M/N*100):0;if(z===100&&$.percent<100){const{data:L}=await n.from("badges").select("id, name, image_url, course_id").eq("course_id",o).maybeSingle();if(L){const{error:D}=await n.from("user_badges").upsert({user_id:t.id,badge_id:L.id},{onConflict:"user_id,badge_id"});D||(ee(L),B(!0))}}K({completed:M,total:N,percent:z})},[o,$.percent]),ie=r.useCallback(async(t,a=!1)=>{re(t);const{data:{user:p}}=await n.auth.getUser();!p||!s||!o||(await n.from("user_progress").upsert({user_id:p.id,course_id:o,lesson_id:s,last_time:Math.floor(t),is_completed:a,completed_at:a?new Date:null},{onConflict:"user_id,lesson_id"}),a&&(window.dispatchEvent(new Event("progressUpdated")),await S(),setTimeout(()=>{q()},1500)))},[s,o,S,q]);r.useEffect(()=>{if(o)return S(),window.addEventListener("progressUpdated",S),()=>window.removeEventListener("progressUpdated",S)},[o,S]),r.useEffect(()=>{async function t(){if(!s)return;C(!1);const{data:{user:a}}=await n.auth.getUser();if(!a)return;const{data:p}=await n.from("user_progress").select("last_time").eq("user_id",a.id).eq("lesson_id",s).maybeSingle();w(p?.last_time||0),C(!0)}t()},[s]);const de=t=>{const a=Math.floor(t/60),p=Math.floor(t%60);return`${a<10?"0"+a:a}:${p<10?"0"+p:p}`},V=r.useCallback(async()=>{if(!s)return;const{data:{user:t}}=await n.auth.getUser();if(!t)return;const{data:a}=await n.from("lesson_notes").select("*").eq("user_id",t.id).eq("lesson_id",s).order("video_timestamp",{ascending:!0});a&&H(a)},[s]);r.useEffect(()=>{V()},[V]);const le=async()=>{if(!T.trim()||!s||!o)return;const{data:{user:t}}=await n.auth.getUser();if(!t)return;const{error:a}=await n.from("lesson_notes").insert({user_id:t.id,course_id:o,lesson_id:s,content:T,video_timestamp:Math.floor(te)});a||(F(""),V())},ce=async t=>{if(!window.confirm("Deseja excluir esta anotação?"))return;const{error:a}=await n.from("lesson_notes").delete().eq("id",t);a||H(p=>p.filter(N=>N.id!==t))};if(u)return e.jsxs("div",{className:"player-loading-screen",children:[e.jsx(Z,{size:40,className:"animate-spin text-primary"}),e.jsx("p",{children:"Carregando Player..."})]});const G=c.find(t=>t.id===s)?.title||"Aula",pe="75vw",ue=c.findIndex(t=>t.id===s)<=0,me=c.findIndex(t=>t.id===s)>=c.length-1;return e.jsxs("div",{className:"dashboard-wrapper",children:[e.jsx(ve,{title:G,description:`Assistindo ${h?.title}`}),!d&&e.jsx(he,{}),e.jsxs("main",{className:`player-main-content ${d?"theater-active":""} ${A?"mobile-active":""}`,children:[e.jsxs("header",{className:"player-header",children:[e.jsxs("div",{className:"header-titles",children:[e.jsx("span",{className:"course-subtitle",children:h?.title}),e.jsx("h1",{className:"lesson-title",children:G})]}),!A&&e.jsxs("div",{className:"header-actions",children:[e.jsxs("button",{onClick:()=>k(!0),className:"btn-action-glow blue-glow",title:"Testar conhecimento da aula",children:[e.jsx(R,{size:18})," Quiz da Aula"]}),e.jsxs("button",{onClick:()=>l(!0),className:"btn-action-glow green-glow",title:"Prova final do módulo",children:[e.jsx(R,{size:18})," Prova do Módulo"]}),e.jsx("button",{onClick:()=>g(!d),className:"btn-theater-mode",title:"Expandir/Reduzir",children:d?e.jsxs(e.Fragment,{children:[e.jsx(Le,{size:18})," Normal"]}):e.jsxs(e.Fragment,{children:[e.jsx(Ee,{size:18})," Teatro"]})})]})]}),e.jsxs("div",{className:"player-body",children:[e.jsxs("div",{className:"video-column",style:{flex:d?`0 1 ${pe}`:"1"},children:[e.jsx("div",{className:"video-wrapper glass-panel",children:s&&P?e.jsx(Ie,{lessonId:s,initialTime:_,onProgressUpdate:ie,seekTo:se}):e.jsx("div",{className:"video-placeholder",children:e.jsx(Z,{size:30,className:"animate-spin text-primary"})})}),e.jsxs("div",{className:"media-controls glass-panel",children:[e.jsxs("button",{onClick:ne,disabled:ue,className:"btn-nav",children:[e.jsx(Ne,{size:20})," Anterior"]}),A&&e.jsxs("div",{className:"mobile-quiz-group",children:[e.jsxs("button",{onClick:()=>k(!0),className:"btn-icon-round blue",title:"Quiz Aula",children:[e.jsx(R,{size:18})," Aula"]}),e.jsxs("button",{onClick:()=>l(!0),className:"btn-icon-round green",title:"Prova Módulo",children:[e.jsx(R,{size:18})," Módulo"]})]}),e.jsxs("button",{onClick:q,disabled:me,className:"btn-nav primary-nav",children:["Próxima ",e.jsx(ye,{size:20})]})]})]}),(!d||A)&&e.jsxs("aside",{className:"content-sidebar",children:[e.jsxs("div",{className:"sidebar-tabs-container glass-panel",children:[e.jsxs("button",{className:`tab-btn ${U==="content"?"active":""}`,onClick:()=>Q("content"),children:[e.jsx(_e,{size:16})," Conteúdo"]}),e.jsxs("button",{className:`tab-btn ${U==="notes"?"active":""}`,onClick:()=>Q("notes"),children:[e.jsx(J,{size:16})," Anotações"]})]}),e.jsx("div",{className:"sidebar-content-area glass-panel",children:U==="content"?o&&e.jsx(Te,{course_id:o,currentLessonId:s||0,onSelectLesson:i}):e.jsxs("div",{className:"notes-container",children:[e.jsx("div",{className:"notes-list",children:Y.length===0?e.jsxs("div",{className:"empty-notes",children:[e.jsx(J,{size:32,opacity:.3,style:{marginBottom:"10px"}}),e.jsx("p",{children:"Nenhuma anotação nesta aula."}),e.jsx("span",{children:"Suas notas aparecerão aqui."})]}):Y.map(t=>e.jsxs("div",{className:"note-card",children:[e.jsxs("div",{className:"note-header",children:[e.jsxs("button",{className:"note-time-btn",onClick:()=>ae(t.video_timestamp),children:[e.jsx(we,{size:12})," ",de(t.video_timestamp)]}),e.jsx("button",{className:"note-delete-btn",onClick:()=>ce(t.id),children:e.jsx(je,{size:14})})]}),e.jsx("p",{className:"note-text",children:t.content})]},t.id))}),e.jsxs("div",{className:"note-input-area",children:[e.jsx("textarea",{value:T,onChange:t=>F(t.target.value),placeholder:"Adicione uma anotação...",className:"note-textarea"}),e.jsx("button",{onClick:le,className:"note-save-btn",disabled:!T.trim(),children:"Salvar"})]})]})})]})]})]}),f&&o&&e.jsx("div",{className:"modal-overlay",children:e.jsx("div",{className:"modal-content",children:e.jsx(W,{courseId:o,onExit:()=>l(!1)})})}),j&&s&&e.jsx("div",{className:"modal-overlay",children:e.jsx("div",{className:"modal-content",children:e.jsx(W,{lessonId:s,onExit:()=>k(!1)})})}),X&&I&&e.jsx("div",{className:"badge-overlay",children:e.jsxs("div",{className:"badge-modal glass-panel",children:[e.jsx("div",{className:"badge-emoji-header",children:"🎊"}),e.jsx("h2",{className:"badge-title",children:"Novo Marco Alcançado!"}),e.jsx("p",{className:"badge-desc",children:"Seu esforço rendeu frutos. Você desbloqueou uma nova insígnia de conhecimento:"}),e.jsxs("div",{className:"badge-display",children:[e.jsx("div",{className:"badge-glow"}),e.jsx("img",{src:I.image_url,alt:I.name,className:"badge-img"}),e.jsx("h3",{className:"badge-name",children:I.name})]}),e.jsx("button",{onClick:()=>x("/conquistas"),className:"btn-badge-primary",children:"Ver Salão de Troféus"}),e.jsx("button",{onClick:()=>B(!1),className:"btn-badge-secondary",children:"Continuar assistindo"})]})}),e.jsx("style",{children:`
                :root { 
                    --primary: #8b5cf6; --primary-hover: #7c3aed;
                    --bg-dark: #020617; 
                    --bg-panel: rgba(15, 23, 42, 0.4); 
                    --border-color: rgba(255, 255, 255, 0.08);
                    --text-main: #f8fafc; --text-muted: #94a3b8;
                }
                
                * { box-sizing: border-box; }

                /* UTILIDADES */
                .text-primary { color: var(--primary); }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }

                .dashboard-wrapper { display: flex; width: 100%; min-height: 100vh; background: var(--bg-dark); font-family: 'Inter', system-ui, sans-serif; color: var(--text-main); overflow-x: hidden; }
                
                /* LOADING SCREEN */
                .player-loading-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; width: 100%; background: var(--bg-dark); gap: 15px; color: var(--text-muted); font-weight: 600;}

                /* COMPONENTE DE VIDRO */
                .glass-panel {
                    background: var(--bg-panel); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                    border: 1px solid var(--border-color); border-top-color: rgba(255,255,255,0.1);
                }

                /* MAIN LAYOUT */
                .player-main-content {
                    display: flex; flex-direction: column; flex: 1; padding: 40px 50px;
                    margin-left: 260px; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .player-main-content.theater-active { margin-left: 0; padding: 30px; align-items: center; }
                .player-main-content.mobile-active { margin-left: 0; padding: 20px 15px 100px 15px; }

                /* HEADER DO PLAYER */
                .player-header {
                    display: flex; justify-content: space-between; align-items: center; gap: 20px;
                    margin-bottom: 30px; width: 100%;
                }
                .theater-active .player-header { max-width: 75vw; }

                .header-titles { flex: 1; min-width: 0; }
                .course-subtitle { color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; display: block; margin-bottom: 4px; }
                .lesson-title { font-size: 1.8rem; font-weight: 900; margin: 0; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.5px;}

                /* AÇÕES DO HEADER (Quiz / Teatro) */
                .header-actions { display: flex; gap: 12px; align-items: center; }
                
                .btn-action-glow {
                    display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px;
                    font-weight: 700; font-size: 0.9rem; border: 1px solid transparent; cursor: pointer; transition: all 0.3s;
                    color: #fff;
                }
                .btn-action-glow.blue-glow { background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.2); color: #60a5fa; }
                .btn-action-glow.blue-glow:hover { background: rgba(59, 130, 246, 0.2); border-color: rgba(59, 130, 246, 0.4); color: #fff; box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);}
                
                .btn-action-glow.green-glow { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2); color: #34d399; }
                .btn-action-glow.green-glow:hover { background: rgba(16, 185, 129, 0.2); border-color: rgba(16, 185, 129, 0.4); color: #fff; box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);}

                .btn-theater-mode {
                    display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px;
                    background: rgba(255,255,255,0.05); color: #cbd5e1; border: 1px solid var(--border-color);
                    font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: 0.3s;
                }
                .btn-theater-mode:hover { background: rgba(255,255,255,0.1); color: #fff; }
                .theater-active .btn-theater-mode { background: var(--primary); border-color: var(--primary); color: #fff;}

                /* BODY DO PLAYER (Divisão Vídeo / Sidebar) */
                .player-body {
                    display: flex; gap: 30px; width: 100%; align-items: flex-start;
                }
                .theater-active .player-body { justify-content: center; }
                .mobile-active .player-body { flex-direction: column; gap: 20px; }

                /* COLUNA DE VÍDEO */
                .video-column { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
                
                .video-wrapper {
                    border-radius: 20px; overflow: hidden; position: relative; width: 100%;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
                }
                .video-placeholder { width: 100%; aspect-ratio: 16/9; background: #000; display: flex; align-items: center; justify-content: center; }

                /* CONTROLES MULTIMÍDIA */
                .media-controls {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 16px 24px; border-radius: 20px; flex-wrap: wrap; gap: 15px;
                }
                .btn-nav {
                    display: flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 14px;
                    background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); color: var(--text-muted);
                    font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: 0.3s;
                }
                .btn-nav:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: #fff; }
                .btn-nav:disabled { opacity: 0.4; cursor: not-allowed; }
                
                .primary-nav { background: rgba(139, 92, 246, 0.1); border-color: rgba(139, 92, 246, 0.3); color: #c4b5fd; }
                .primary-nav:hover:not(:disabled) { background: var(--primary); color: #fff; border-color: var(--primary); box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);}

                /* MOBILE QUIZ BUTTONS NO MEDIA CONTROL */
                .mobile-quiz-group { display: flex; gap: 10px; }
                .btn-icon-round {
                    display: flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: 12px;
                    font-weight: 700; font-size: 0.85rem; border: none; color: #fff;
                }
                .btn-icon-round.blue { background: #3b82f6; }
                .btn-icon-round.green { background: #10b981; }

                /* SIDEBAR LATERAL (CONTEÚDO/NOTAS) */
                .content-sidebar { width: 360px; flex-shrink: 0; display: flex; flex-direction: column; gap: 15px; }
                .mobile-active .content-sidebar { width: 100%; }

                .sidebar-tabs-container {
                    display: flex; padding: 6px; border-radius: 16px; gap: 6px;
                }
                .tab-btn {
                    flex: 1; padding: 12px; border-radius: 12px; border: none; background: transparent; color: var(--text-muted);
                    font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: 0.3s; display: flex; align-items: center; justify-content: center; gap: 8px;
                }
                .tab-btn:hover { color: #e2e8f0; }
                .tab-btn.active { background: rgba(255,255,255,0.08); color: #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }

                .sidebar-content-area {
                    height: calc(100vh - 200px); max-height: 650px; border-radius: 20px; padding: 20px;
                    display: flex; flex-direction: column; overflow: hidden;
                }
                .mobile-active .sidebar-content-area { height: auto; min-height: 400px; max-height: none;}

                /* AREA DE NOTAS */
                .notes-container { display: flex; flex-direction: column; height: 100%; }
                .notes-list { flex: 1; overflow-y: auto; padding-right: 5px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px;}
                .notes-list::-webkit-scrollbar { width: 4px; }
                .notes-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

                .empty-notes { text-align: center; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; opacity: 0.7;}
                .empty-notes p { margin: 0; font-weight: 600; font-size: 0.95rem; }
                .empty-notes span { font-size: 0.8rem; }

                .note-card { background: rgba(0,0,0,0.3); padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.04); }
                .note-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
                
                .note-time-btn {
                    background: rgba(139, 92, 246, 0.1); color: #c4b5fd; border: 1px solid rgba(139, 92, 246, 0.2);
                    padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 800; cursor: pointer; 
                    display: flex; align-items: center; gap: 6px; transition: 0.2s;
                }
                .note-time-btn:hover { background: rgba(139, 92, 246, 0.2); color: #fff; }
                
                .note-delete-btn { background: none; border: none; color: #ef4444; opacity: 0.5; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; padding: 4px;}
                .note-delete-btn:hover { opacity: 1; background: rgba(239, 68, 68, 0.1); border-radius: 6px; }

                .note-text { color: #e2e8f0; font-size: 0.9rem; line-height: 1.6; margin: 0; }

                .note-input-area { position: relative; background: rgba(0,0,0,0.3); border-radius: 16px; border: 1px solid var(--border-color); padding: 2px;}
                .note-input-area:focus-within { border-color: var(--primary); }
                .note-textarea {
                    width: 100%; background: transparent; border: none; padding: 16px; color: #fff; font-size: 0.95rem;
                    resize: none; min-height: 100px; outline: none; font-family: inherit; line-height: 1.5;
                }
                .note-textarea::placeholder { color: #475569; }
                .note-save-btn {
                    position: absolute; bottom: 12px; right: 12px; background: var(--primary); color: #fff; border: none;
                    padding: 8px 16px; border-radius: 10px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: 0.2s;
                }
                .note-save-btn:disabled { background: #334155; color: #94a3b8; cursor: not-allowed; }
                .note-save-btn:hover:not(:disabled) { filter: brightness(1.1); }

                /* MODAIS DE QUIZ */
                .modal-overlay {
                    position: fixed; inset: 0; z-index: 3000; background: rgba(2, 6, 23, 0.95); backdrop-filter: blur(12px);
                    display: flex; alignItems: center; justify-content: center; padding: 20px; overflow-y: auto;
                }
                .modal-content { width: 100%; max-width: 900px; }

                /* MODAL DE BADGE (CONQUISTA) */
                .badge-overlay {
                    position: fixed; inset: 0; background: rgba(2, 6, 23, 0.85); backdrop-filter: blur(10px);
                    display: flex; align-items: center; justify-content: center; z-index: 4000; padding: 20px;
                }
                .badge-modal {
                    padding: 40px; border-radius: 32px; text-align: center; max-width: 450px; width: 100%;
                    border-color: rgba(139, 92, 246, 0.4); box-shadow: 0 0 60px rgba(139, 92, 246, 0.2);
                    display: flex; flex-direction: column; align-items: center;
                }
                .badge-emoji-header { font-size: 3.5rem; margin-bottom: 10px; animation: fadeUp 0.5s ease;}
                .badge-title { color: #fff; font-size: 1.8rem; font-weight: 900; margin: 0 0 10px 0; letter-spacing: -0.5px;}
                .badge-desc { color: var(--text-muted); margin: 0 0 30px 0; font-size: 0.95rem; line-height: 1.5;}
                
                .badge-display { position: relative; margin-bottom: 40px; }
                .badge-glow { position: absolute; inset: -20px; background: var(--primary); filter: blur(40px); opacity: 0.3; border-radius: 50%; z-index: 0; animation: pulse 2s infinite;}
                .badge-img { width: 120px; height: 120px; object-fit: contain; position: relative; z-index: 1; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.5));}
                .badge-name { color: #c4b5fd; margin: 15px 0 0 0; font-weight: 800; font-size: 1.2rem; position: relative; z-index: 1;}

                .btn-badge-primary {
                    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
                    color: #fff; border: none; padding: 16px 24px; border-radius: 16px; font-weight: 800;
                    cursor: pointer; width: 100%; margin-bottom: 12px; font-size: 1rem; transition: 0.2s;
                }
                .btn-badge-primary:hover { box-shadow: 0 10px 25px rgba(139, 92, 246, 0.4); transform: translateY(-2px); }
                .btn-badge-secondary {
                    background: transparent; color: var(--text-muted); border: none; cursor: pointer;
                    font-weight: 600; font-size: 0.9rem; padding: 10px; transition: 0.2s;
                }
                .btn-badge-secondary:hover { color: #fff; }

                /* RESPONSIVIDADE ADICIONAL */
                @media (max-width: 600px) {
                    .lesson-title { font-size: 1.4rem; white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
                    .media-controls { justify-content: center; padding: 20px 15px; }
                    .btn-nav { flex: 1; justify-content: center;}
                }
            `})]})}export{Ge as default};
