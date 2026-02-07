import './index.css';
import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async'; // <--- Importação do Helmet
import { UserProvider } from './components/UserContext';

// --- COMPONENTES ESPECIAIS (Não Lazy) ---
// O ProtectedRoute é leve e usado em quase tudo, pode manter normal ou lazy, mas normal é mais seguro para evitar flickers
import ProtectedRoute from './components/ProtectedRoute';

// --- LAZY LOADING (Carregamento sob demanda) ---
// O navegador só vai baixar esses arquivos quando o usuário entrar na rota
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const UpdatePassword = lazy(() => import('./pages/UpdatePassword'));
const Planos = lazy(() => import('./pages/Plans'));

// Área do Aluno
const Dashboard = lazy(() => import('./pages/dashboard'));
const Cursos = lazy(() => import('./pages/cursos'));
const CategoryCourses = lazy(() => import('./pages/CategoryCourses'));
const Player = lazy(() => import('./pages/Player'));
const Achievements = lazy(() => import('./pages/Achievements'));
const Rankings = lazy(() => import('./pages/Rankings'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Settings = lazy(() => import('./pages/Settings'));

// Área de Lives
const LivePage = lazy(() => import('./pages/LivePage'));
const LiveSetup = lazy(() => import('./pages/LiveSetup'));
const LiveHub = lazy(() => import('./pages/LiveHub'));

// Área Administrativa (O aluno nunca vai precisar baixar isso!)
const Admin = lazy(() => import('./pages/admin'));
const ContentManagement = lazy(() => import('./pages/ContentManagement'));
const Reports = lazy(() => import('./pages/Reports'));

// Componente de Loading Simples e Bonito para as transições
const LoadingFallback = () => (
  <div style={{ 
    height: '100vh', 
    width: '100%', 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#020617',
    color: '#8b5cf6',
    fontWeight: 800,
    fontSize: '1.2rem',
    flexDirection: 'column',
    gap: '15px'
  }}>
    <div className="spinner" style={{
      width: '40px',
      height: '40px',
      border: '4px solid rgba(139, 92, 246, 0.3)',
      borderTopColor: '#8b5cf6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }}></div>
    <span>Carregando...</span>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    {/* O HelmetProvider envolve a aplicação para gerenciar os títulos e meta tags */}
    <HelmetProvider>
      <UserProvider> 
        <BrowserRouter>
          {/* O Suspense segura a tela enquanto o pedaço do site (chunk) é baixado */}
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* --- ROTAS PÚBLICAS --- */}
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route path="/planos" element={<Planos />} />
              <Route path="/privacidade" element={<Privacy />} />

              {/* --- ROTAS DE USUÁRIO (ALUNO) --- */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/cursos" element={<Cursos />} />
              <Route path="/categoria/:slug" element={<CategoryCourses />} />
              <Route path="/conquistas" element={<Achievements />} />
              <Route path="/curso/:slug" element={<Player />} />
              <Route path="/rankings" element={<Rankings />} />
              
              <Route path="/configuracoes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

              {/* --- ROTAS DE LIVES --- */}
              <Route path="/live" element={<LivePage />} />
              <Route path="/lives-hub" element={<LiveHub />} />

              {/* --- ROTAS ADMINISTRATIVAS --- */}
              {/* Agora sim! Só quem entrar aqui vai baixar o peso do painel admin */}
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route 
                path="/admin/gestao-conteudo" 
                element={<ProtectedRoute><ContentManagement /></ProtectedRoute>} 
              />
              <Route path="/relatorios" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/live-setup" element={<LiveSetup />} />

            </Routes>
          </Suspense>
        </BrowserRouter>
      </UserProvider>
    </HelmetProvider>
  </React.StrictMode>
);