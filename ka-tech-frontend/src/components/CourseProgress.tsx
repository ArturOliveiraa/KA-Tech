import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

interface ProgressProps {
  courseId: number;
}

export default function CourseProgress({ courseId }: ProgressProps) {
  const [stats, setStats] = useState({ completed: 0, total: 0, percent: 0 });
  const [loading, setLoading] = useState(true);

  const calculateProgress = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || !courseId) return;

    // 1. Busca o total de aulas do curso
    const { count: totalCount } = await supabase
      .from("lessons")
      .select("*", { count: 'exact', head: true })
      .eq("courseId", courseId);

    // 2. Busca quantas o aluno concluiu
    const { count: completedCount } = await supabase
      .from("user_progress")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", session.user.id)
      .eq("course_id", courseId);

    const total = totalCount || 0;
    const completed = completedCount || 0;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    setStats({ completed, total, percent });
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    calculateProgress();
    
    // Escuta o evento disparado pelo seu LessonView
    window.addEventListener("progressUpdated", calculateProgress);
    return () => window.removeEventListener("progressUpdated", calculateProgress);
  }, [calculateProgress]);

  // LÓGICA GAMER DE RANKS
  const getRank = (p: number) => {
    if (p >= 100) return { label: "GOD", color: "#ff00ff", glow: "0 0 20px #ff00ff" };
    if (p >= 75) return { label: "HACKER", color: "#00e5ff", glow: "0 0 15px #00e5ff" };
    if (p >= 50) return { label: "PRO PLAYER", color: "#7000ff", glow: "0 0 10px #7000ff" };
    if (p >= 25) return { label: "NEW PLAYER", color: "#00ff88", glow: "none" };
    return { label: "NOOB", color: "#94a3b8", glow: "none" };
  };

  const rank = getRank(stats.percent);

  if (loading) return null;

  return (
    <div style={{ 
      background: 'var(--color-surface-1)', 
      padding: '25px', 
      borderRadius: '16px', 
      border: '1px solid var(--color-border-strong)',
      marginBottom: '30px',
      fontFamily: 'var(--font-sans)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '15px' }}>
        <div>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '1px' }}>STATUS DO ALUNO</span>
          <h2 style={{ 
            margin: '5px 0 0 0', 
            color: rank.color, 
            textShadow: rank.glow, 
            fontSize: '1.6rem', 
            fontWeight: '900' 
          }}>
            {rank.label}
          </h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ color: 'var(--color-text)', fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.percent}%</span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', display: 'block' }}>{stats.completed}/{stats.total} Aulas</span>
        </div>
      </div>

      {/* BARRA DE PROGRESSO NEON */}
      <div style={{ width: '100%', height: '10px', background: 'var(--color-surface-3)', borderRadius: '20px', overflow: 'hidden' }}>
        <div style={{ 
          width: `${stats.percent}%`, 
          height: '100%', 
          background: `linear-gradient(90deg, ${rank.color} 0%, #fff 100%)`,
          boxShadow: rank.glow,
          transition: 'width 0.8s ease-out'
        }} />
      </div>
    </div>
  );
}