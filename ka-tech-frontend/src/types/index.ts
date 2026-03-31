export interface Course {
    id: number;
    title: string;
    slug: string;
    description?: string;
    thumbnailUrl?: string | null;
    totalDuration?: number;
    progress?: number;
}

export interface Lesson {
    id: number;
    course_id: number;
    title: string;
    videoUrl?: string;
    content?: string;
    duration?: number;
    order: number;
}

export interface LessonNote {
    id: string; // UUID
    user_id: string;
    lesson_id: number;
    course_id: number;
    content: string;
    video_timestamp: number;
    created_at?: string;
}

export interface Badge {
    id: number;
    name: string;
    image_url: string;
    course_id: number;
}

export interface UserProgress {
    id: string;
    user_id: string;
    lesson_id: number;
    is_completed: boolean;
    last_time: number;
}

// ==========================================
// NOVAS INTERFACES PARA O SISTEMA DE QUIZZES
// ==========================================

export interface Quiz {
    id: string; // UUID
    title: string;
    description?: string;
    min_score: number;
    
    // Tornamos ambos opcionais (com o '?') para permitir Quizzes Avulsos
    course_id?: number | null; 
    lesson_id?: number | null; 
    
    created_at?: string;
    questions?: Question[]; // Relacionamento (útil no front-end ao carregar o quiz completo)
}

export interface Question {
    id: string; // UUID
    quiz_id: string;
    content: string;
    created_at?: string;
    options?: Option[]; // Relacionamento com as alternativas
}

export interface Option {
    id: string; // UUID
    question_id: string;
    content: string;
    is_correct: boolean;
}

export interface QuizAttempt {
    id: number;
    user_id: string; // UUID
    quiz_id: string; // UUID
    score: number;
    passed: boolean;
    created_at?: string;
}