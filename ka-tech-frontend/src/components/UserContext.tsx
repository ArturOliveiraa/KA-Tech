import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import logoDefault from "../assets/ka-tech-logo.png";

interface UserContextType {
  userRole: string | null;
  userName: string;
  avatarUrl: string | null;
  themeColor: string;
  sidebarLogo: string; 
  loading: boolean;
  refreshBranding: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Omit<UserContextType, 'refreshBranding'>>({
    userRole: null,
    userName: "Usuário",
    avatarUrl: null,
    themeColor: "#8b5cf6",
    sidebarLogo: logoDefault,
    loading: true
  });

  // 1. loadBranding envolvida em useCallback para ser estável
  const loadBranding = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "sidebar_logo")
        .maybeSingle();
      
      if (data?.value) {
        const freshLogo = `${data.value}?t=${new Date().getTime()}`;
        setProfile(prev => ({ ...prev, sidebarLogo: freshLogo }));
      }
    } catch (err) {
      console.error("Erro ao carregar branding:", err);
    }
  }, []);

  // 2. loadProfile envolvida em useCallback
  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, theme_color, role")
      .eq("id", userId)
      .maybeSingle();

    if (data && !error) {
      setProfile(prev => ({
        ...prev,
        userRole: data.role,
        userName: data.full_name || "Usuário",
        avatarUrl: data.avatar_url,
        themeColor: data.theme_color || "#8b5cf6",
        loading: false
      }));
      document.documentElement.style.setProperty('--primary-color', data.theme_color || "#8b5cf6");
      await loadBranding();
    } else {
      setProfile(prev => ({ ...prev, loading: false }));
    }
  }, [loadBranding]);

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        await loadBranding();
        setProfile(prev => ({ ...prev, loading: false }));
      }
    };

    getInitialSession();

    const channel = supabase
      .channel('global-branding')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'platform_settings', filter: 'key=eq.sidebar_logo' },
        (payload) => {
          if (payload.new && payload.new.value) {
            const freshLogo = `${payload.new.value}?t=${new Date().getTime()}`;
            setProfile(prev => ({ ...prev, sidebarLogo: freshLogo }));
          }
        }
      )
      .subscribe();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile({
          userRole: null,
          userName: "Usuário",
          avatarUrl: null,
          themeColor: "#8b5cf6",
          sidebarLogo: logoDefault,
          loading: false
        });
        loadBranding();
      }
    });

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [loadBranding, loadProfile]); // 3. Agora as dependências estão corretas e estáveis

  return (
    <UserContext.Provider value={{ ...profile, refreshBranding: loadBranding }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser deve ser usado dentro de um UserProvider");
  return context;
};