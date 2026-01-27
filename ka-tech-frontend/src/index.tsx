import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UserProvider } from './components/UserContext';
import Planos from './pages/Plans';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';
import UpdatePassword from './pages/UpdatePassword';
import Dashboard from './pages/dashboard'; 
import Cursos from './pages/cursos';     
import CategoryCourses from './pages/CategoryCourses'; 
import Admin from './pages/admin';         
import ContentManagement from './pages/ContentManagement'; 
import Player from './pages/Player';
import Settings from './pages/Settings';
import Achievements from "./pages/Achievements";
import Reports from "./pages/Reports";
import Rankings from "./pages/Rankings";
import ProtectedRoute from './components/ProtectedRoute';
import Privacy from './pages/Privacy';
import LivePage from './pages/LivePage';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <UserProvider> 
      <BrowserRouter>
        <Routes>
          {/* --- ROTAS PÚBLICAS (LANDING PAGE E AUTH) --- */}
          
          {/* A raiz do site agora é a sua Landing Page de Planos */}
          <Route path="/" element={<Planos />} />
          
          {/* A tela de login agora possui sua própria rota dedicada */}
          <Route path="/login" element={<Login />} />
          
          <Route path="/signup" element={<Signup />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          
          {/* --- ROTAS DE USUÁRIO (ALUNO) --- */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/cursos" element={<Cursos />} />
          <Route path="/categoria/:slug" element={<CategoryCourses />} />
          <Route path="/conquistas" element={<Achievements />} />
          <Route path="/curso/:slug" element={<Player />} />
          <Route path="/rankings" element={<Rankings />} />
          
          {/* Rotas Protegidas (Exigem Login/Contexto) */}
          <Route path="/configuracoes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          {/* --- ROTAS ADMINISTRATIVAS --- */}
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route 
            path="/admin/gestao-conteudo" 
            element={<ProtectedRoute><ContentManagement /></ProtectedRoute>} 
          />
          <Route path="/relatorios" element={<ProtectedRoute><Reports /></ProtectedRoute>} />

          {/* --- OUTROS --- */}
          <Route path="/privacidade" element={<Privacy />} />

          {/* Alias opcional: Caso o usuário ainda digite /planos, ele verá a home */}
          <Route path="/planos" element={<Planos />} />

          <Route path="/live" element={<LivePage />} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  </React.StrictMode>
);