import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

interface UserContextType {
  userRole: string | null;
  userName: string;
  avatarUrl: string | null;
  themeColor: string;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserContextType>({
    userRole: null,
    userName: "Usuário",
    avatarUrl: null,
    themeColor: "#8b5cf6",
    loading: true
  });

  const loadProfile = async (userId: string) => {
    // Busca os dados na tabela profiles conforme definido no seu schema
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, theme_color, role")
      .eq("id", userId)
      .maybeSingle();

    if (data && !error) {
      setProfile({
        userRole: data.role,
        userName: data.full_name || "Usuário", // Identificará como Artur Oliveira se preenchido
        avatarUrl: data.avatar_url,
        themeColor: data.theme_color || "#8b5cf6",
        loading: false
      });
      document.documentElement.style.setProperty('--primary-color', data.theme_color || "#8b5cf6");
    } else {
      setProfile(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    // Verifica a sessão atual de forma segura
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setProfile(prev => ({ ...prev, loading: false }));
      }
    };

    getInitialSession();

    // Listener para mudanças de estado (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile({
          userRole: null,
          userName: "Usuário",
          avatarUrl: null,
          themeColor: "#8b5cf6",
          loading: false
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={profile}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser deve ser usado dentro de um UserProvider");
  return context;
};