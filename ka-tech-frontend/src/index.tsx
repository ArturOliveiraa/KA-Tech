import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UserProvider } from './components/UserContext';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';
import UpdatePassword from './pages/UpdatePassword';
import Dashboard from './pages/dashboard'; 
import Cursos from './pages/cursos';     
import CategoryCourses from './pages/CategoryCourses'; // IMPORTAÇÃO DA NOVA TELA
import Admin from './pages/admin';         
import ContentManagement from './pages/ContentManagement'; 
import Player from './pages/Player';
import Settings from './pages/Settings';
import Achievements from "./pages/Achievements";
import Reports from "./pages/Reports";
import Rankings from "./pages/Rankings";
import ProtectedRoute from './components/ProtectedRoute';
import Privacy from './pages/Privacy';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    {/* ADICIONE O USERPROVIDER AQUI ENVOLVENDO TUDO */}
    <UserProvider> 
      <BrowserRouter>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          
          {/* Rotas de Usuário (Logado) */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/cursos" element={<Cursos />} />
          
          <Route path="/categoria/:slug" element={<CategoryCourses />} />
          
          <Route path="/conquistas" element={<Achievements />} />
          <Route path="/configuracoes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          
          <Route path="/curso/:slug" element={<Player />} />

          {/* Rotas de Admin */}
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          
          <Route 
            path="/admin/gestao-conteudo" 
            element={<ProtectedRoute><ContentManagement /></ProtectedRoute>} 
          />

          {/* RELATORIOS */}
          <Route path="/relatorios" element={<ProtectedRoute><Reports /></ProtectedRoute>} />

          {/* Rota de Rankings */}
          <Route path="/rankings" element={<Rankings />} />

          <Route path="/privacidade" element={<Privacy />} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  </React.StrictMode>
);