import { supabase } from "../supabaseClient";

export const MATERIALS_BUCKET = "lesson-materials";
export const MAX_ATTACHMENT_MB = 25;

export interface LessonAttachment {
  id: number;
  lesson_id: number;
  name: string;
  file_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  order: number;
  created_at: string;
}

export const formatBytes = (bytes?: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
};

export const fileKind = (mime?: string | null, name = "") => {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (mime === "application/pdf" || ext === "pdf") return "PDF";
  if (mime?.startsWith("image/")) return "Imagem";
  if (["xlsx", "csv"].includes(ext)) return "Planilha";
  if (["docx", "txt"].includes(ext)) return "Documento";
  if (ext === "pptx") return "Apresentação";
  if (ext === "zip") return "ZIP";
  return ext.toUpperCase() || "Arquivo";
};

/** Link temporário (bucket privado). O download usa o nome original do arquivo. */
export async function openAttachment(att: LessonAttachment) {
  const { data, error } = await supabase.storage.from(MATERIALS_BUCKET).createSignedUrl(att.file_path, 60, { download: att.name });
  if (error || !data?.signedUrl) throw error || new Error("Link indisponível");
  window.open(data.signedUrl, "_blank", "noopener");
}

export async function listAttachments(lessonId: number) {
  const { data, error } = await supabase
    .from("lesson_attachments")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as LessonAttachment[];
}
