import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Check, ChevronDown } from "lucide-react";
import { supabase } from "../supabaseClient";
import { ProgressBar } from "./ui";

interface Lesson {
  id: number;
  title: string;
  order: number;
  module_id: number | null;
  status?: string;
}

interface Module {
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
  const [modules, setModules] = useState<Module[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<number[]>([]);
  const [collapsed, setCollapsed] = useState<Set<number | "none">>(new Set());
  const activeRef = useRef<HTMLButtonElement>(null);

  const fetchCourseLessons = useCallback(async () => {
    // Para alunos o banco já esconde rascunhos (RLS); a equipe vê tudo
    const [lessonsRes, modulesRes] = await Promise.all([
      supabase.from("lessons").select("id, title, order, module_id, status").eq("course_id", course_id).order("order", { ascending: true }),
      supabase.from("course_modules").select("id, title, order").eq("course_id", course_id).order("order", { ascending: true }),
    ]);
    if (lessonsRes.data) setLessons(lessonsRes.data as Lesson[]);
    setModules((modulesRes.data as Module[]) || []);
  }, [course_id]);

  const fetchUserProgress = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_progress")
      .select("lesson_id")
      .eq("user_id", user.id)
      .eq("course_id", course_id)
      .eq("is_completed", true);

    if (data) setCompletedLessonIds(data.map((p) => p.lesson_id));
  }, [course_id]);

  useEffect(() => {
    fetchCourseLessons();
    fetchUserProgress();

    window.addEventListener("progressUpdated", fetchUserProgress);
    return () => window.removeEventListener("progressUpdated", fetchUserProgress);
  }, [fetchCourseLessons, fetchUserProgress]);

  // Mantém a aula atual visível na lista
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [currentLessonId, lessons.length]);

  // Grupos: aulas sem módulo primeiro, depois os módulos na ordem definida
  const groups = useMemo(() => {
    const result: { key: number | "none"; title: string | null; lessons: Lesson[] }[] = [];
    const loose = lessons.filter((l) => !l.module_id);
    if (loose.length) result.push({ key: "none", title: modules.length ? "Introdução" : null, lessons: loose });
    modules.forEach((m) => {
      const items = lessons.filter((l) => l.module_id === m.id);
      if (items.length) result.push({ key: m.id, title: m.title, lessons: items });
    });
    return result;
  }, [lessons, modules]);

  const published = lessons.filter((l) => (l.status || "published") === "published");
  const done = published.filter((l) => completedLessonIds.includes(l.id)).length;
  const percent = published.length ? (done / published.length) * 100 : 0;

  let counter = 0;

  return (
    <div className="ply-lessons">
      <div className="ply-lessons__head">
        <span>{done} de {published.length} aulas concluídas</span>
        <ProgressBar value={percent} size="sm" label="Aulas concluídas" />
      </div>

      <div className="ply-lessons__list">
        {groups.map((group) => {
          const isCollapsed = collapsed.has(group.key);
          const groupDone = group.lessons.filter((l) => completedLessonIds.includes(l.id)).length;
          const hasActive = group.lessons.some((l) => l.id === currentLessonId);
          return (
            <section key={group.key} className="ply-module">
              {group.title && (
                <button
                  type="button"
                  className={`ply-module__head ${hasActive ? "has-active" : ""}`}
                  onClick={() => setCollapsed((prev) => {
                    const next = new Set(prev);
                    if (next.has(group.key)) next.delete(group.key); else next.add(group.key);
                    return next;
                  })}
                  aria-expanded={!isCollapsed}
                >
                  <span className="ply-module__title">{group.title}</span>
                  <span className="ply-module__count">{groupDone}/{group.lessons.length}</span>
                  <ChevronDown size={15} style={{ transform: isCollapsed ? "rotate(-90deg)" : "none" }} />
                </button>
              )}

              {!isCollapsed && (
                <ol className="ply-module__lessons">
                  {group.lessons.map((lesson) => {
                    counter += 1;
                    const isCompleted = completedLessonIds.includes(lesson.id);
                    const isActive = currentLessonId === lesson.id;
                    const isDraft = lesson.status === "draft";
                    return (
                      <li key={lesson.id}>
                        <button
                          ref={isActive ? activeRef : undefined}
                          className={`ply-lesson ${isCompleted ? "is-done" : ""} ${isDraft ? "is-draft" : ""}`}
                          aria-current={isActive ? "true" : undefined}
                          onClick={() => onSelectLesson(lesson.id)}
                        >
                          <span className="ply-lesson__num" aria-hidden="true">
                            {isCompleted ? <Check size={14} strokeWidth={3} /> : counter}
                          </span>
                          <span className="ply-lesson__title">
                            {lesson.title}
                            {isActive && <span className="ply-lesson__now">Assistindo agora</span>}
                            {isDraft && <span className="ply-lesson__draft">Rascunho · só a equipe vê</span>}
                          </span>
                          {isCompleted && <span className="sr-only">(concluída)</span>}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
