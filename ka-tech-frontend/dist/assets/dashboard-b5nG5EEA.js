import{S as ee,p as F,a as f,b as T,c as w,n as I,i as z,d as L,t as te,e as E,f as re,g as se,h as B,k as V,r as m,m as J,o as ie,u as X,s as $,q as ae,j as r,v as H,l as y}from"./index-B9lAlNMN.js";import{S as ne}from"./SEO-CEbvJJMo.js";import{C as W}from"./compass-DdGqqENZ.js";import{F as oe}from"./flame-ClmekOjH.js";import{c as Z}from"./createLucideIcon-CBFMAAE2.js";import{C as le}from"./circle-play-CVE4AFil.js";import{B as ce}from"./book-open-BbrjRURK.js";import{C as de}from"./chevron-right-JAqY6J7n.js";var he=class extends ee{constructor(e,t){super(),this.options=t,this.#r=e,this.#i=null,this.#s=F(),this.bindMethods(),this.setOptions(t)}#r;#e=void 0;#f=void 0;#t=void 0;#n;#d;#s;#i;#m;#h;#p;#o;#l;#a;#u=new Set;bindMethods(){this.refetch=this.refetch.bind(this)}onSubscribe(){this.listeners.size===1&&(this.#e.addObserver(this),G(this.#e,this.options)?this.#c():this.updateResult(),this.#v())}onUnsubscribe(){this.hasListeners()||this.destroy()}shouldFetchOnReconnect(){return U(this.#e,this.options,this.options.refetchOnReconnect)}shouldFetchOnWindowFocus(){return U(this.#e,this.options,this.options.refetchOnWindowFocus)}destroy(){this.listeners=new Set,this.#y(),this.#w(),this.#e.removeObserver(this)}setOptions(e){const t=this.options,i=this.#e;if(this.options=this.#r.defaultQueryOptions(e),this.options.enabled!==void 0&&typeof this.options.enabled!="boolean"&&typeof this.options.enabled!="function"&&typeof f(this.options.enabled,this.#e)!="boolean")throw new Error("Expected enabled to be a boolean or a callback that returns a boolean");this.#j(),this.#e.setOptions(this.options),t._defaulted&&!T(this.options,t)&&this.#r.getQueryCache().notify({type:"observerOptionsUpdated",query:this.#e,observer:this});const a=this.hasListeners();a&&Y(this.#e,i,this.options,t)&&this.#c(),this.updateResult(),a&&(this.#e!==i||f(this.options.enabled,this.#e)!==f(t.enabled,this.#e)||w(this.options.staleTime,this.#e)!==w(t.staleTime,this.#e))&&this.#g();const n=this.#x();a&&(this.#e!==i||f(this.options.enabled,this.#e)!==f(t.enabled,this.#e)||n!==this.#a)&&this.#b(n)}getOptimisticResult(e){const t=this.#r.getQueryCache().build(this.#r,e),i=this.createResult(t,e);return ue(this,i)&&(this.#t=i,this.#d=this.options,this.#n=this.#e.state),i}getCurrentResult(){return this.#t}trackResult(e,t){return new Proxy(e,{get:(i,a)=>(this.trackProp(a),t?.(a),a==="promise"&&(this.trackProp("data"),!this.options.experimental_prefetchInRender&&this.#s.status==="pending"&&this.#s.reject(new Error("experimental_prefetchInRender feature flag is not enabled"))),Reflect.get(i,a))})}trackProp(e){this.#u.add(e)}getCurrentQuery(){return this.#e}refetch({...e}={}){return this.fetch({...e})}fetchOptimistic(e){const t=this.#r.defaultQueryOptions(e),i=this.#r.getQueryCache().build(this.#r,t);return i.fetch().then(()=>this.createResult(i,t))}fetch(e){return this.#c({...e,cancelRefetch:e.cancelRefetch??!0}).then(()=>(this.updateResult(),this.#t))}#c(e){this.#j();let t=this.#e.fetch(this.options,e);return e?.throwOnError||(t=t.catch(I)),t}#g(){this.#y();const e=w(this.options.staleTime,this.#e);if(z||this.#t.isStale||!L(e))return;const i=te(this.#t.dataUpdatedAt,e)+1;this.#o=E.setTimeout(()=>{this.#t.isStale||this.updateResult()},i)}#x(){return(typeof this.options.refetchInterval=="function"?this.options.refetchInterval(this.#e):this.options.refetchInterval)??!1}#b(e){this.#w(),this.#a=e,!(z||f(this.options.enabled,this.#e)===!1||!L(this.#a)||this.#a===0)&&(this.#l=E.setInterval(()=>{(this.options.refetchIntervalInBackground||re.isFocused())&&this.#c()},this.#a))}#v(){this.#g(),this.#b(this.#x())}#y(){this.#o&&(E.clearTimeout(this.#o),this.#o=void 0)}#w(){this.#l&&(E.clearInterval(this.#l),this.#l=void 0)}createResult(e,t){const i=this.#e,a=this.options,n=this.#t,d=this.#n,o=this.#d,x=e!==i?e.state:this.#f,{state:l}=e;let s={...l},h=!1,c;if(t._optimisticResults){const p=this.hasListeners(),v=!p&&G(e,t),R=p&&Y(e,i,t,a);(v||R)&&(s={...s,...se(l.data,e.options)}),t._optimisticResults==="isRestoring"&&(s.fetchStatus="idle")}let{error:j,errorUpdatedAt:M,status:b}=s;c=s.data;let _=!1;if(t.placeholderData!==void 0&&c===void 0&&b==="pending"){let p;n?.isPlaceholderData&&t.placeholderData===o?.placeholderData?(p=n.data,_=!0):p=typeof t.placeholderData=="function"?t.placeholderData(this.#p?.state.data,this.#p):t.placeholderData,p!==void 0&&(b="success",c=B(n?.data,p,t),h=!0)}if(t.select&&c!==void 0&&!_)if(n&&c===d?.data&&t.select===this.#m)c=this.#h;else try{this.#m=t.select,c=t.select(c),c=B(n?.data,c,t),this.#h=c,this.#i=null}catch(p){this.#i=p}this.#i&&(j=this.#i,c=this.#h,M=Date.now(),b="error");const S=s.fetchStatus==="fetching",O=b==="pending",C=b==="error",A=O&&S,P=c!==void 0,g={status:b,fetchStatus:s.fetchStatus,isPending:O,isSuccess:b==="success",isError:C,isInitialLoading:A,isLoading:A,data:c,dataUpdatedAt:s.dataUpdatedAt,error:j,errorUpdatedAt:M,failureCount:s.fetchFailureCount,failureReason:s.fetchFailureReason,errorUpdateCount:s.errorUpdateCount,isFetched:s.dataUpdateCount>0||s.errorUpdateCount>0,isFetchedAfterMount:s.dataUpdateCount>x.dataUpdateCount||s.errorUpdateCount>x.errorUpdateCount,isFetching:S,isRefetching:S&&!O,isLoadingError:C&&!P,isPaused:s.fetchStatus==="paused",isPlaceholderData:h,isRefetchError:C&&P,isStale:D(e,t),refetch:this.refetch,promise:this.#s,isEnabled:f(t.enabled,e)!==!1};if(this.options.experimental_prefetchInRender){const p=g.data!==void 0,v=g.status==="error"&&!p,R=N=>{v?N.reject(g.error):p&&N.resolve(g.data)},Q=()=>{const N=this.#s=g.promise=F();R(N)},k=this.#s;switch(k.status){case"pending":e.queryHash===i.queryHash&&R(k);break;case"fulfilled":(v||g.data!==k.value)&&Q();break;case"rejected":(!v||g.error!==k.reason)&&Q();break}}return g}updateResult(){const e=this.#t,t=this.createResult(this.#e,this.options);if(this.#n=this.#e.state,this.#d=this.options,this.#n.data!==void 0&&(this.#p=this.#e),T(t,e))return;this.#t=t;const i=()=>{if(!e)return!0;const{notifyOnChangeProps:a}=this.options,n=typeof a=="function"?a():a;if(n==="all"||!n&&!this.#u.size)return!0;const d=new Set(n??this.#u);return this.options.throwOnError&&d.add("error"),Object.keys(this.#t).some(o=>{const u=o;return this.#t[u]!==e[u]&&d.has(u)})};this.#R({listeners:i()})}#j(){const e=this.#r.getQueryCache().build(this.#r,this.options);if(e===this.#e)return;const t=this.#e;this.#e=e,this.#f=e.state,this.hasListeners()&&(t?.removeObserver(this),e.addObserver(this))}onQueryUpdate(){this.updateResult(),this.hasListeners()&&this.#v()}#R(e){V.batch(()=>{e.listeners&&this.listeners.forEach(t=>{t(this.#t)}),this.#r.getQueryCache().notify({query:this.#e,type:"observerResultsUpdated"})})}};function pe(e,t){return f(t.enabled,e)!==!1&&e.state.data===void 0&&!(e.state.status==="error"&&t.retryOnMount===!1)}function G(e,t){return pe(e,t)||e.state.data!==void 0&&U(e,t,t.refetchOnMount)}function U(e,t,i){if(f(t.enabled,e)!==!1&&w(t.staleTime,e)!=="static"){const a=typeof i=="function"?i(e):i;return a==="always"||a!==!1&&D(e,t)}return!1}function Y(e,t,i,a){return(e!==t||f(a.enabled,e)===!1)&&(!i.suspense||e.state.status!=="error")&&D(e,i)}function D(e,t){return f(t.enabled,e)!==!1&&e.isStaleByTime(w(t.staleTime,e))}function ue(e,t){return!T(e.getCurrentResult(),t)}var q=m.createContext(!1),fe=()=>m.useContext(q);q.Provider;function me(){let e=!1;return{clearReset:()=>{e=!1},reset:()=>{e=!0},isReset:()=>e}}var ge=m.createContext(me()),xe=()=>m.useContext(ge),be=(e,t,i)=>{const a=i?.state.error&&typeof e.throwOnError=="function"?J(e.throwOnError,[i.state.error,i]):e.throwOnError;(e.suspense||e.experimental_prefetchInRender||a)&&(t.isReset()||(e.retryOnMount=!1))},ve=e=>{m.useEffect(()=>{e.clearReset()},[e])},ye=({result:e,errorResetBoundary:t,throwOnError:i,query:a,suspense:n})=>e.isError&&!t.isReset()&&!e.isFetching&&a&&(n&&e.data===void 0||J(i,[e.error,a])),we=e=>{if(e.suspense){const i=n=>n==="static"?n:Math.max(n??1e3,1e3),a=e.staleTime;e.staleTime=typeof a=="function"?(...n)=>i(a(...n)):i(a),typeof e.gcTime=="number"&&(e.gcTime=Math.max(e.gcTime,1e3))}},je=(e,t)=>e.isLoading&&e.isFetching&&!t,Re=(e,t)=>e?.suspense&&t.isPending,K=(e,t,i)=>t.fetchOptimistic(e).catch(()=>{i.clearReset()});function ke(e,t,i){const a=fe(),n=xe(),d=ie(),o=d.defaultQueryOptions(e);d.getDefaultOptions().queries?._experimental_beforeQuery?.(o);const u=d.getQueryCache().get(o.queryHash);o._optimisticResults=a?"isRestoring":"optimistic",we(o),be(o,n,u),ve(n);const x=!d.getQueryCache().get(o.queryHash),[l]=m.useState(()=>new t(d,o)),s=l.getOptimisticResult(o),h=!a&&e.subscribed!==!1;if(m.useSyncExternalStore(m.useCallback(c=>{const j=h?l.subscribe(V.batchCalls(c)):I;return l.updateResult(),j},[l,h]),()=>l.getCurrentResult(),()=>l.getCurrentResult()),m.useEffect(()=>{l.setOptions(o)},[o,l]),Re(o,s))throw K(o,l,n);if(ye({result:s,errorResetBoundary:n,throwOnError:o.throwOnError,query:u,suspense:o.suspense}))throw s.error;return d.getDefaultOptions().queries?._experimental_afterQuery?.(o,s),o.experimental_prefetchInRender&&!z&&je(s,a)&&(x?K(o,l,n):u?.promise)?.catch(I).finally(()=>{l.updateResult()}),o.notifyOnChangeProps?s:l.trackResult(s)}function Ne(e,t){return ke(e,he)}const Ee=[["path",{d:"M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z",key:"10ikf1"}]],Se=Z("play",Ee);const Oe=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"12",r:"6",key:"1vlfrh"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]],Ce=Z("target",Oe);function Te(){const e=X();return Ne({queryKey:["dashboard-courses"],queryFn:async()=>{const{data:{user:t}}=await $.auth.getUser();if(!t)throw e("/"),new Error("Usuário não logado");const{data:i,error:a}=await $.rpc("get_user_dashboard");if(a)throw console.error("Erro Supabase:",a),a;return i.filter(n=>n.progress<100)}})}function Fe(){const{userName:e}=ae(),t=X(),{data:i=[],isLoading:a,isError:n}=Te(),d=[...i].sort((s,h)=>new Date(h.enrolledAt).getTime()-new Date(s.enrolledAt).getTime()),o=d[0],u=d.slice(1,4),x=[...i].sort((s,h)=>h.progress-s.progress),l=s=>{s.currentTarget.src=y};return n?r.jsxs("div",{className:"dashboard-wrapper",style:{justifyContent:"center",alignItems:"center"},children:[r.jsx(H,{}),r.jsxs("div",{style:{color:"#ef4444",textAlign:"center",marginLeft:"260px"},children:[r.jsx("h3",{children:"Erro ao carregar sua jornada."}),r.jsx("p",{children:"Tente recarregar a página."})]})]}):r.jsxs("div",{className:"dashboard-wrapper",children:[r.jsx(ne,{title:"Minha Jornada",description:"Acompanhe seu progresso na KA Tech."}),r.jsx(H,{}),r.jsxs("div",{className:"ambient-bg",children:[r.jsx("div",{className:"ambient-blob blob-1"}),r.jsx("div",{className:"ambient-blob blob-2"})]}),r.jsxs("main",{className:"dashboard-content",children:[r.jsx("div",{className:"brand-logo-mobile",children:r.jsx("img",{src:y,alt:"KA Tech Logo"})}),r.jsxs("header",{className:"hero-header",children:[r.jsxs("h1",{className:"page-title",children:["Minha ",r.jsx("span",{className:"text-gradient",children:"Jornada"})]}),r.jsxs("p",{className:"hero-subtitle",children:["Bem-vindo de volta, ",r.jsx("strong",{children:e.split(" ")[0]}),". Retome seu foco."]})]}),a?r.jsxs("div",{className:"loading-state glass-panel",children:[r.jsx(W,{size:44,className:"animate-spin-slow text-primary",style:{margin:"0 auto 15px"}}),r.jsx("p",{children:"Sincronizando seu progresso..."})]}):r.jsx(r.Fragment,{children:i.length>0?r.jsxs(r.Fragment,{children:[o&&r.jsxs("div",{className:"featured-banner glass-panel",onClick:()=>t(`/curso/${o.slug}`),children:[r.jsx("div",{className:"featured-bg",style:{backgroundImage:`url(${o.thumbnailUrl||y})`}}),r.jsx("div",{className:"featured-overlay"}),r.jsxs("div",{className:"featured-content",children:[r.jsxs("div",{className:"featured-badge",children:[r.jsx(oe,{size:14})," CONTINUAR ASSISTINDO"]}),r.jsx("h2",{className:"featured-title",title:o.title,children:o.title}),r.jsxs("div",{className:"featured-progress-wrapper",children:[r.jsx("div",{className:"progress-track featured-track",children:r.jsx("div",{className:"progress-fill",style:{width:`${o.progress}%`}})}),r.jsxs("span",{className:"featured-percent",children:[o.progress,"% concluído"]})]}),r.jsxs("button",{className:"btn-featured-play",children:[r.jsx(Se,{size:20,fill:"currentColor"})," Retomar Aula"]})]})]}),u.length>0&&r.jsxs("div",{className:"section-block",children:[r.jsxs("h3",{className:"section-title",children:[r.jsx(Ce,{size:20,className:"text-primary"})," Assistidos Recentemente"]}),r.jsx("div",{className:"recent-grid",children:u.map((s,h)=>r.jsxs("div",{className:"recent-card glass-panel",onClick:()=>t(`/curso/${s.slug}`),style:{animationDelay:`${h*.1}s`},children:[r.jsxs("div",{className:"recent-thumb",children:[r.jsx("div",{className:"thumb-overlay-dark"}),r.jsx("img",{src:s.thumbnailUrl||y,alt:s.title,onError:l}),r.jsx("div",{className:"play-icon-center",children:r.jsx(le,{size:36,color:"#fff"})})]}),r.jsxs("div",{className:"recent-info",children:[r.jsx("h4",{className:"recent-title",title:s.title,children:s.title}),r.jsx("div",{className:"progress-track compact-track",children:r.jsx("div",{className:"progress-fill",style:{width:`${s.progress}%`}})}),r.jsxs("span",{className:"recent-percent",children:[s.progress,"%"]})]})]},s.id))})]}),r.jsxs("div",{className:"section-block",style:{marginTop:"50px"},children:[r.jsxs("h3",{className:"section-title",children:[r.jsx(ce,{size:20,className:"text-primary"})," Seu Acervo Completo"]}),r.jsx("div",{className:"all-courses-grid",children:x.map((s,h)=>r.jsxs("div",{className:"list-card glass-panel",onClick:()=>t(`/curso/${s.slug}`),style:{animationDelay:`${h*.05}s`},children:[r.jsx("div",{className:"list-thumb",children:r.jsx("img",{src:s.thumbnailUrl||y,alt:s.title,onError:l})}),r.jsxs("div",{className:"list-info",children:[r.jsx("h4",{className:"list-title",title:s.title,children:s.title}),r.jsxs("div",{className:"list-progress-area",children:[r.jsx("div",{className:"progress-track super-compact",children:r.jsx("div",{className:"progress-fill",style:{width:`${s.progress}%`}})}),r.jsxs("span",{className:"list-percent",children:[s.progress,"%"]})]})]}),r.jsx("div",{className:"list-action",children:r.jsx("button",{className:"btn-circle-play",title:"Acessar",children:r.jsx(de,{size:24})})})]},s.id))})]})]}):r.jsxs("div",{className:"empty-state glass-panel",children:[r.jsx(W,{size:64,color:"#475569",style:{marginBottom:"20px",opacity:.5}}),r.jsx("h3",{style:{color:"#fff",fontSize:"1.8rem",marginBottom:"10px",fontWeight:800},children:"O início da sua jornada."}),r.jsx("p",{style:{color:"#94a3b8",maxWidth:"450px",margin:"0 auto 30px",fontSize:"1.05rem",lineHeight:"1.5"},children:"Seu painel está vazio. Explore as trilhas de conhecimento no menu lateral e dê o primeiro passo rumo à maestria."}),r.jsx("button",{onClick:()=>t("/cursos"),className:"btn-primary-large",children:"Explorar Trilhas Agora"})]})})]}),r.jsx("style",{children:`
        :root {
            --primary: #8b5cf6; 
            --primary-hover: #7c3aed;
            --bg-dark: #020617; 
            --bg-card: rgba(15, 23, 42, 0.4); 
            --border-color: rgba(255, 255, 255, 0.08);
            --text-light: #f8fafc;
            --text-dim: #94a3b8;
            --track-bg: rgba(0,0,0,0.4);
        }
        
        * { box-sizing: border-box; }

        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin-slow { 100% { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 4s linear infinite; }

        .text-primary { color: var(--primary); }
        .text-gradient { background: linear-gradient(135deg, #c4b5fd 0%, #8b5cf6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

        .dashboard-wrapper {
            display: flex; width: 100%; min-height: 100vh; position: relative;
            background-color: var(--bg-dark); font-family: 'Inter', system-ui, sans-serif;
            overflow-x: hidden; color: var(--text-light);
        }

        /* AMBIENT BACKGROUND */
        .ambient-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
        .ambient-blob { position: absolute; border-radius: 50%; filter: blur(140px); opacity: 0.15; }
        .blob-1 { top: -10%; left: 10%; width: 40vw; height: 40vw; background: var(--primary); }
        .blob-2 { bottom: -20%; right: -10%; width: 50vw; height: 50vw; background: #0ea5e9; }

        /* CONTENT: Remoção do Max-Width para Ocupar 100% */
        .dashboard-content {
            position: relative; z-index: 1; flex: 1; margin-left: 260px; 
            padding: 50px 60px 100px 60px; width: calc(100% - 260px); 
        }

        .brand-logo-mobile { display: none; width: 100%; justify-content: center; margin-bottom: 30px; }
        .brand-logo-mobile img { height: 50px; object-fit: contain; }

        .glass-panel {
            background: var(--bg-card); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--border-color); border-top-color: rgba(255,255,255,0.12);
        }

        /* HEADER */
        .hero-header { margin-bottom: 40px; }
        .page-title { font-size: 2.5rem; font-weight: 900; margin: 0 0 5px 0; letter-spacing: -1px; color: #fff;}
        .hero-subtitle { color: var(--text-dim); font-size: 1.1rem; margin: 0; font-weight: 400; }

        /* 1. FEATURED BANNER (HERO) */
        .featured-banner {
            position: relative; width: 100%; height: 380px; border-radius: 32px; overflow: hidden;
            margin-bottom: 40px; cursor: pointer; transition: 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            display: flex; align-items: flex-end; box-shadow: 0 20px 50px -10px rgba(0,0,0,0.5);
            animation: fadeUp 0.6s ease-out forwards;
        }
        .featured-banner:hover { transform: translateY(-5px); box-shadow: 0 30px 60px -10px rgba(0,0,0,0.7); border-color: rgba(139, 92, 246, 0.4);}
        
        .featured-bg {
            position: absolute; inset: 0; background-size: cover; background-position: center; 
            filter: blur(5px) brightness(0.8); transform: scale(1.05); transition: 0.8s;
        }
        .featured-banner:hover .featured-bg { filter: blur(2px) brightness(1); transform: scale(1.08); }
        
        .featured-overlay {
            position: absolute; inset: 0;
            background: linear-gradient(to top, rgba(2, 6, 23, 1) 0%, rgba(2, 6, 23, 0.6) 50%, transparent 100%);
        }

        .featured-content {
            position: relative; z-index: 2; padding: 40px; width: 100%; max-width: 800px;
        }
        .featured-badge {
            display: inline-flex; align-items: center; gap: 6px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4);
            color: #fca5a5; font-size: 0.75rem; font-weight: 800; padding: 6px 12px; border-radius: 20px; letter-spacing: 1px; margin-bottom: 15px;
        }
        .featured-title { font-size: 2.4rem; font-weight: 900; color: #fff; margin: 0 0 20px 0; line-height: 1.2; text-shadow: 0 4px 20px rgba(0,0,0,0.8); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;}
        
        .featured-progress-wrapper { display: flex; align-items: center; gap: 15px; margin-bottom: 25px; width: 100%; max-width: 400px;}
        .featured-track { height: 8px; flex: 1; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; }
        .featured-percent { font-weight: 700; color: #cbd5e1; font-size: 0.95rem; }

        .btn-featured-play {
            background: #fff; color: #000; border: none; padding: 14px 28px; border-radius: 16px;
            font-size: 1.05rem; font-weight: 800; cursor: pointer; transition: 0.3s;
            display: inline-flex; align-items: center; gap: 10px; box-shadow: 0 10px 30px rgba(255,255,255,0.2);
        }
        .featured-banner:hover .btn-featured-play { background: var(--primary); color: #fff; box-shadow: 0 10px 30px rgba(139, 92, 246, 0.4); }

        /* SECTION TITLES */
        .section-block { margin-bottom: 50px; }
        .section-title { font-size: 1.25rem; font-weight: 800; color: #fff; margin: 0 0 20px 0; display: flex; align-items: center; gap: 10px; letter-spacing: -0.3px;}

        /* 2. RECENTES GRID */
        .recent-grid { 
            display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; 
        }
        .recent-card {
            border-radius: 20px; overflow: hidden; cursor: pointer; display: flex; flex-direction: column;
            transition: all 0.3s ease; animation: fadeUp 0.5s ease-out forwards; opacity: 0;
        }
        .recent-card:hover { transform: translateY(-5px); border-color: rgba(139, 92, 246, 0.4); box-shadow: 0 15px 30px rgba(0,0,0,0.4); }
        
        .recent-thumb { position: relative; width: 100%; aspect-ratio: 16/9; background: #000; overflow: hidden;}
        .recent-thumb img { width: 100%; height: 100%; object-fit: cover; opacity: 0.8; transition: 0.5s; }
        .recent-card:hover .recent-thumb img { transform: scale(1.05); opacity: 1; }
        
        .thumb-overlay-dark { position: absolute; inset: 0; background: rgba(0,0,0,0.2); z-index: 1; transition: 0.3s;}
        .recent-card:hover .thumb-overlay-dark { background: rgba(0,0,0,0); }

        .play-icon-center { 
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 2;
            opacity: 0.5; transition: 0.3s; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));
        }
        .recent-card:hover .play-icon-center { opacity: 1; transform: translate(-50%, -50%) scale(1.1); color: var(--primary); }

        .recent-info { padding: 20px; flex: 1; display: flex; flex-direction: column; justify-content: flex-end;}
        .recent-title { font-size: 1.1rem; font-weight: 700; color: #fff; margin: 0 0 15px 0; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;}
        .compact-track { height: 4px; margin-bottom: 8px;}
        .recent-percent { font-size: 0.8rem; font-weight: 700; color: var(--text-dim); }


        /* 3. TODOS OS CURSOS (GRID FLUIDO 100%) */
        /* Essa é a grande sacada: grid com minmax() longo faz a lista se comportar como cards largos que preenchem a tela */
        .all-courses-grid {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 20px;
        }

        .list-card {
            display: flex; align-items: center; gap: 20px; padding: 16px; border-radius: 20px;
            cursor: pointer; transition: all 0.3s ease; animation: fadeUp 0.5s ease-out forwards; opacity: 0;
        }
        .list-card:hover {
            transform: translateX(5px); border-color: rgba(139, 92, 246, 0.4);
            background: rgba(30, 41, 59, 0.6); box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        }

        .list-thumb { width: 90px; height: 60px; border-radius: 12px; overflow: hidden; background: #000; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.05);}
        .list-thumb img { width: 100%; height: 100%; object-fit: cover; opacity: 0.9; transition: 0.3s;}
        .list-card:hover .list-thumb img { opacity: 1; transform: scale(1.05);}

        .list-info { flex: 1; display: flex; flex-direction: column; justify-content: center; min-width: 0;}
        .list-title { 
            font-size: 1.05rem; font-weight: 700; color: #fff; margin: 0 0 8px 0; line-height: 1.2;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        
        .list-progress-area { display: flex; align-items: center; gap: 12px; width: 100%; max-width: 250px; }
        .super-compact { height: 4px; flex: 1;}
        .list-percent { font-size: 0.8rem; font-weight: 700; color: var(--text-dim); min-width: 35px;}

        .list-action { flex-shrink: 0; display: flex; align-items: center; justify-content: center; padding-right: 10px;}
        .btn-circle-play {
            background: transparent; border: none; color: var(--text-dim);
            cursor: pointer; transition: 0.3s; display: flex; align-items: center; justify-content: center;
        }
        .list-card:hover .btn-circle-play { color: var(--primary); transform: translateX(5px); }

        /* BARRAS DE PROGRESSO GLOBAIS */
        .progress-track { background: var(--track-bg); border-radius: 99px; overflow: hidden; width: 100%; }
        .progress-fill { 
            height: 100%; border-radius: 99px; transition: width 1s cubic-bezier(0.16, 1, 0.3, 1);
            background: linear-gradient(90deg, #8b5cf6 0%, #d946ef 100%);
            box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
        }

        /* EMPTY STATE / LOADING */
        .loading-state { text-align: center; padding: 60px 20px; border-radius: 24px; color: var(--text-dim); font-size: 1.1rem; }
        .empty-state { text-align: center; padding: 100px 20px; border-radius: 32px; border-style: dashed;}
        
        .btn-primary-large {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
            color: #fff; border: none; padding: 18px 36px; border-radius: 18px; font-weight: 800;
            font-size: 1.05rem; cursor: pointer; transition: 0.3s; box-shadow: 0 10px 25px rgba(139, 92, 246, 0.3);
        }
        .btn-primary-large:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(139, 92, 246, 0.5); filter: brightness(1.1); }


        /* MOBILE RESPONSIVE */
        @media (max-width: 1024px) {
            .dashboard-content { margin-left: 0; padding: 40px 30px 120px 30px; width: 100%; max-width: 100%; }
            .featured-banner { height: 320px; }
            .featured-content { padding: 30px; }
            .featured-title { font-size: 2rem; }
            .all-courses-grid { grid-template-columns: 1fr; } /* Em tablet, a lista vira 1 coluna */
        }

        @media (max-width: 600px) {
            .dashboard-content { padding: 30px 20px 100px 20px; }
            .brand-logo-mobile { display: flex; }
            .page-title { font-size: 2.2rem; }
            
            .featured-banner { height: auto; min-height: 300px; }
            .featured-content { padding: 25px 20px; }
            .featured-title { font-size: 1.6rem; }
            
            .recent-grid { grid-template-columns: 1fr; }
            
            /* Lista de cursos em Mobile */
            .list-card { padding: 12px 16px; gap: 15px; }
            .list-card:hover { transform: none; }
            .list-thumb { width: 70px; height: 50px; }
            .list-title { font-size: 0.95rem; white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
            .list-progress-area { max-width: 100%; }
            .list-action { display: none; } /* Oculta a seta no mobile para economizar espaço */
        }
      `})]})}export{Fe as default};
