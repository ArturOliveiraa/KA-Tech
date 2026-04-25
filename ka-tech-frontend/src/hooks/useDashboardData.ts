import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export interface DashboardCourse {
  id: number;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  progress: number;
  totalDuration: number;
  enrolledAt: string;
}

export function useDashboardData() {
  const navigate = useNavigate();

  return useQuery({
    queryKey: ['dashboard-courses'], // Nome único para o cache
    queryFn: async () => {
      // 1. Verifica autenticação
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        throw new Error("Usuário não logado");
      }

      // 2. Chama nossa função otimizada do banco
      const { data, error } = await supabase.rpc('get_user_dashboard');

      if (error) {
        console.error("Erro Supabase:", error);
        throw error;
      }

      // 3. Filtra cursos não concluídos (Progresso < 100%)
      // O cast 'as DashboardCourse[]' garante a tipagem correta
      return (data as DashboardCourse[]).filter(c => c.progress < 100);
    }
  });
}