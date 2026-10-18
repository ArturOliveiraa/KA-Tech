// src/components/ProtectedRoute.tsx
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { LoadingScreen } from "./ui";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [isProfileComplete, setIsProfileComplete] = useState(true);
  const location = useLocation();

  useEffect(() => {
    async function checkAuthAndProfile() {
      // 1. Pega a sessão atual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setSession(null);
        setLoading(false);
        return;
      }

      setSession(session);

      // 2. Verifica se a equipe está preenchida na tabela profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("equipe")
        .eq("id", session.user.id)
        .single();

      // Se der erro ou se a coluna 'equipe' estiver vazia/nula, perfil está incompleto
      if (profileError || !profile?.equipe || profile.equipe.trim() === "") {
        setIsProfileComplete(false);
      } else {
        setIsProfileComplete(true);
      }
      
      setLoading(false);
    }

    checkAuthAndProfile();
  }, [location.pathname]); // Re-executa se a rota mudar

  // Enquanto carrega, mostra uma tela vazia ou loading (evita piscar o dashboard)
  if (loading) return <LoadingScreen label="Verificando acesso..." />;
  
  // Se não estiver logado, joga para a tela de login
  if (!session) return <Navigate to="/" replace />;

  // Se estiver logado mas falta a equipe, força a tela de completar perfil
  if (!isProfileComplete) {
    return <Navigate to="/completar-perfil" replace />;
  }

  // Se passou por tudo, libera a rota
  return <>{children}</>;
};

export default ProtectedRoute;