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
    queryKey: ['dashboard-courses'],
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

      // 3. Mapeia os dados do formato do banco (snake_case) para o React (camelCase)
      const formattedCourses: DashboardCourse[] = (data || []).map((course: any) => ({
        id: course.id,
        title: course.title,
        slug: course.slug,
        thumbnailUrl: course.thumbnail_url,   // Traduzindo a capa
        progress: course.progress,
        totalDuration: course.total_duration, // Traduzindo a duração
        enrolledAt: course.enrolled_at        // Traduzindo a data
      }));

      // 4. Filtra cursos não concluídos (Progresso < 100%)
      return formattedCourses.filter(c => c.progress < 100);
    }
  });
}