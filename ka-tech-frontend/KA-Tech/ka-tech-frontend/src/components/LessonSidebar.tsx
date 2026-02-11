import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

interface Lesson {
  id: number;
  title: string;
  order: number;
}

interface LessonSidebarProps {
  course_id: number;
  currentLessonId: number;
  onSelectLesson: (id: number) => void;
}

export default function LessonSidebar({ course_id, currentLessonId, onSelectLesson }: LessonSidebarProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<number[]>([]); // Novo estado

  // 1. Busca as aulas do curso (mantém igual)
  const fetchCourseLessons = useCallback(async () => {
    const { data } = await supabase
      .from("lessons")
      .select("id, title, order")
      .eq("course_id", course_id)
      .order("order", { ascending: true });

    if (data) setLessons(data);
  }, [course_id]);

  // 2. BUSCA O PROGRESSO DO USUÁRIO
  const fetchUserProgress = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_progress")
      .select("lesson_id")
      .eq("user_id", user.id)
      .eq("course_id", course_id)
      .eq("is_completed", true);

    if (data) {
      setCompletedLessonIds(data.map((p) => p.lesson_id));
    }
  }, [course_id]);

  useEffect(() => {
    fetchCourseLessons();
    fetchUserProgress();

    // 3. OUVE O EVENTO DE PROGRESSO PARA ATUALIZAR EM TEMPO REAL
    window.addEventListener("progressUpdated", fetchUserProgress);
    return () => window.removeEventListener("progressUpdated", fetchUserProgress);
  }, [fetchCourseLessons, fetchUserProgress]);

  return (
    <div className="lesson-sidebar-inner">
      <style>{`
        .sidebar-title-lessons {
          padding: 20px;
          color: #fff;
          font-size: 1rem;
          font-weight: 600;
          border-bottom: 1px solid #2d323e;
          background: #1a1d23;
        }
        .lesson-item {
          padding: 15px 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: 0.2s;
          border-bottom: 1px solid #1a1d23;
          position: relative;
        }
        .lesson-item:hover { background: #1a1d23; }
        .lesson-item.active {
          background: rgba(139, 92, 246, 0.1);
          border-left: 4px solid #8b5cf6;
        }
        .lesson-num {
          color: #8b5cf6;
          font-weight: bold;
          font-size: 0.8rem;
          min-width: 20px;
        }
        .lesson-txt { color: #fff; font-size: 0.85rem; flex: 1; }
        
        /* Estilo para o Check de Conclusão */
        .lesson-check {
          color: #10b981;
          font-size: 0.9rem;
          font-weight: bold;
        }
        .lesson-item.completed .lesson-num {
          color: #10b981; /* Muda a cor do número se concluída */
        }
      `}</style>

      <h3 className="sidebar-title-lessons">Grade do Curso</h3>
      <nav>
        {lessons.map((lesson) => {
          const isCompleted = completedLessonIds.includes(lesson.id);
          const isActive = currentLessonId === lesson.id;

          return (
            <div
              key={lesson.id}
              className={`lesson-item ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
              onClick={() => onSelectLesson(lesson.id)}
            >
              <span className="lesson-num">
                {isCompleted ? "✓" : `#${lesson.order}`}
              </span>
              <span className="lesson-txt" style={{ opacity: isCompleted && !isActive ? 0.6 : 1 }}>
                {lesson.title}
              </span>
              {isCompleted && <span className="lesson-check">✅</span>}
            </div>
          );
        })}
      </nav>
    </div>
  );
}