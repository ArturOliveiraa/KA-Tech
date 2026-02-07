/// <reference types="vite/client" />

// 1. Tipagem para as variáveis de ambiente (evita erro de 'env does not exist')
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_YOUTUBE_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// 2. Tipagem para Imagens (resolve o erro "Cannot find module ...png")
declare module '*.png';
declare module '*.svg';
declare module '*.jpeg';
declare module '*.jpg';

// 3. Tipagem para CSS Modules (resolve o erro do dashboard.module.css)
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}