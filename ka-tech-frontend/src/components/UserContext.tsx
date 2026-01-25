import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient"; // Ajustado para subir uma pasta

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

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, theme_color, role")
          .eq("id", user.id)
          .single();

        if (data) {
          setProfile({
            userRole: data.role,
            userName: data.full_name || "Usuário",
            avatarUrl: data.avatar_url,
            themeColor: data.theme_color || "#8b5cf6",
            loading: false
          });
          document.documentElement.style.setProperty('--primary-color', data.theme_color || "#8b5cf6");
        }
      } else {
        setProfile(prev => ({ ...prev, loading: false }));
      }
    }
    loadProfile();
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