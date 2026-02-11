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
    videoUrl?: string; // ou video_id, dependendo de como você salva
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