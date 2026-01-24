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

  // Memorizando a busca para evitar alertas de build
  const fetchCourseLessons = useCallback(async () => {
    const { data } = await supabase
      .from("lessons")
      .select("id, title, order")
      .eq("course_id", course_id)
      .order("order", { ascending: true }); //

    if (data) setLessons(data);
  }, [course_id]);

  useEffect(() => {
    fetchCourseLessons();
  }, [fetchCourseLessons]);

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
        }
        .lesson-item:hover { background: #1a1d23; }
        .lesson-item.active {
          background: rgba(0, 229, 255, 0.1);
          border-left: 4px solid #00e5ff;
        }
        .lesson-num {
          color: #00e5ff;
          font-weight: bold;
          font-size: 0.8rem;
          min-width: 20px;
        }
        .lesson-txt { color: #fff; font-size: 0.85rem; }
      `}</style>

      <h3 className="sidebar-title-lessons">Grade do Curso</h3>
      <nav>
        {lessons.map((lesson) => (
          <div
            key={lesson.id}
            className={`lesson-item ${currentLessonId === lesson.id ? "active" : ""}`}
            onClick={() => onSelectLesson(lesson.id)}
          >
            <span className="lesson-num">#{lesson.order}</span>
            <span className="lesson-txt">{lesson.title}</span>
          </div>
        ))}
      </nav>
    </div>
  );
}