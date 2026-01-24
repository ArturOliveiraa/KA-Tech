import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';
import UpdatePassword from './pages/UpdatePassword';
import Dashboard from './pages/dashboard'; // dashboard.tsx no seu arquivo
import Cursos from './pages/cursos';       // cursos.tsx no seu arquivo
import Admin from './pages/admin';         // admin.tsx no seu arquivo
import Player from './pages/Player';
import Settings from './pages/Settings';
import Achievements from "./pages/Achievements";
import Reports from "./pages/Reports";
import Rankings from "./pages/Rankings";


// Components
import ProtectedRoute from './components/ProtectedRoute';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
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
        
        <Route path="/conquistas" element={<Achievements />} />
        <Route path="/configuracoes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        
        {/* Rota do Player (Agora usando Slug para URLs amigáveis) */}
        <Route path="/course/:slug" element={<Player />} />

        {/* Rotas de Admin */}
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />

        {/* RELATORIOS */}
        <Route path="/relatorios" element={<ProtectedRoute><Reports /></ProtectedRoute>} />

        {/* NOVO: Rota de Rankings */}
        <Route path="/rankings" element={<Rankings />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);