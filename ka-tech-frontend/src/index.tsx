import './index.css';
import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from './components/UserContext';
import MeetPage from './pages/MeetPage';
import ProtectedRoute from './components/ProtectedRoute';

// --- LAZY LOADING ---
const QuizList = lazy(() => import('./pages/QuizList'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const UpdatePassword = lazy(() => import('./pages/UpdatePassword'));
const Dashboard = lazy(() => import('./pages/dashboard'));
const Cursos = lazy(() => import('./pages/cursos'));
const CategoryCourses = lazy(() => import('./pages/CategoryCourses'));
const Player = lazy(() => import('./pages/Player'));
const Achievements = lazy(() => import('./pages/Achievements'));
const Rankings = lazy(() => import('./pages/Rankings'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Settings = lazy(() => import('./pages/Settings'));
const LivePage = lazy(() => import('./pages/LivePage'));
const LiveSetup = lazy(() => import('./pages/LiveSetup'));
const LiveHub = lazy(() => import('./pages/LiveHub'));
const ContentManagement = lazy(() => import('./pages/ContentManagement'));
const Reports = lazy(() => import('./pages/Reports'));
const MeetingHub = lazy(() => import('./pages/MeetingHub'));
const QuizView = lazy(() => import('./components/QuizPlayer'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminCourses = lazy(() => import('./pages/AdminCourses'));
const AdminLives = lazy(() => import('./pages/AdminLives'));
const AdminGamification = lazy(() => import('./pages/AdminGamification'));
const AdminFeedbacks = lazy(() => import('./pages/AdminFeedbacks'));
const AdminUserReports = lazy(() => import('./pages/AdminUserReports'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

const LoadingFallback = () => (
  <div style={{ 
    height: '100vh', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', 
    backgroundColor: '#020617', color: '#8b5cf6', fontWeight: 800, fontSize: '1.2rem', flexDirection: 'column', gap: '15px'
  }}>
    <div className="spinner" style={{
      width: '40px', height: '40px', border: '4px solid rgba(139, 92, 246, 0.3)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite'
    }}></div>
    <span>Carregando...</span>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <UserProvider> 
          <BrowserRouter>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* --- ROTAS PÚBLICAS --- */}
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/update-password" element={<UpdatePassword />} />
                <Route path="/privacidade" element={<Privacy />} />
                <Route path="/completar-perfil" element={<CompleteProfile />} />

                {/* --- ROTAS DE USUÁRIO (ALUNO) PROTEGIDAS --- */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/cursos" element={<ProtectedRoute><Cursos /></ProtectedRoute>} />
                <Route path="/categoria/:slug" element={<ProtectedRoute><CategoryCourses /></ProtectedRoute>} />
                <Route path="/conquistas" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
                <Route path="/curso/:slug" element={<ProtectedRoute><Player /></ProtectedRoute>} />
                <Route path="/rankings" element={<ProtectedRoute><Rankings /></ProtectedRoute>} />
                <Route path="/configuracoes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                
                {/* ROTA DO QUIZ PELO SLUG */}
                <Route path="/quizzes/:slug" element={<ProtectedRoute><QuizView /></ProtectedRoute>} />

                {/* --- ROTAS DE LIVES E REUNIÕES --- */}
                <Route path="/live" element={<ProtectedRoute><LivePage /></ProtectedRoute>} />
                <Route path="/lives-hub" element={<ProtectedRoute><LiveHub /></ProtectedRoute>} />
                <Route path="/reunioes" element={<ProtectedRoute><MeetingHub /></ProtectedRoute>} />
                <Route path="/meet/:roomId?" element={<ProtectedRoute><MeetPage /></ProtectedRoute>} />

                {/* --- ROTAS ADMINISTRATIVAS --- */}
                <Route path="/admin/gestao-conteudo" element={<ProtectedRoute><ContentManagement /></ProtectedRoute>} />
                <Route path="/relatorios" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/live-setup" element={<ProtectedRoute><LiveSetup /></ProtectedRoute>} />
                <Route path="/admin/quizzes" element={<ProtectedRoute><QuizList /></ProtectedRoute>} />
                <Route path="/admin/usuarios" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
                <Route path="/admin/cursos" element={<ProtectedRoute><AdminCourses /></ProtectedRoute>} />
                <Route path="/admin/lives" element={<ProtectedRoute><AdminLives /></ProtectedRoute>} />
                <Route path="/admin/gamificacao" element={<ProtectedRoute><AdminGamification /></ProtectedRoute>} />
                <Route path="/admin/feedbacks" element={<ProtectedRoute><AdminFeedbacks /></ProtectedRoute>} />

                {/* --- ROTA DOS RELATÓRIOS --- */}
                <Route path="/admin/relatorio-alunos" element={<ProtectedRoute><AdminUserReports /></ProtectedRoute>} />
                
              </Routes>
            </Suspense>
          </BrowserRouter>
        </UserProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
);