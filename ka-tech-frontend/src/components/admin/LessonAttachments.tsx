import React, { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, Paperclip, Trash2, UploadCloud } from "lucide-react";
import { supabase } from "../../supabaseClient";
import {
  LessonAttachment, MATERIALS_BUCKET, MAX_ATTACHMENT_MB, fileKind, formatBytes, listAttachments, openAttachment,
} from "../../utils/attachments";

const ACCEPT = ".pdf,.zip,.docx,.xlsx,.pptx,.txt,.csv,.png,.jpg,.jpeg,.webp";

/** Materiais de apoio de uma aula: enviar (arrastar ou clicar), baixar e remover. */
export default function LessonAttachments({ lessonId, courseId }: { lessonId: number; courseId: number }) {
  const [items, setItems] = useState<LessonAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await listAttachments(lessonId)); }
    catch (e) { console.error("Erro ao listar materiais:", e); setError("Não foi possível carregar os materiais."); }
    finally { setLoading(false); }
  }, [lessonId]);

  useEffect(() => { load(); }, [load]);

  const upload = async (files: FileList | File[]) => {
    setError(null);
    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) { setError(`"${file.name}" passa de ${MAX_ATTACHMENT_MB} MB.`); continue; }
      setUploading(file.name);
      const safe = file.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "_");
      const path = `${courseId}/${lessonId}/${Date.now()}-${safe}`;
      const { error: upError } = await supabase.storage.from(MATERIALS_BUCKET).upload(path, file, { contentType: file.type || undefined });
      if (upError) { setError(`Não foi possível enviar "${file.name}": ${upError.message}`); continue; }
      const { error: dbError } = await supabase.from("lesson_attachments").insert([{
        lesson_id: lessonId,
        name: file.name,
        file_path: path,
        mime_type: file.type || null,
        size_bytes: file.size,
        order: items.length + 1,
      }]);
      if (dbError) {
        await supabase.storage.from(MATERIALS_BUCKET).remove([path]);
        setError(`Não foi possível registrar "${file.name}".`);
      }
    }
    setUploading(null);
    load();
  };

  const remove = async (att: LessonAttachment) => {
    if (!window.confirm(`Remover "${att.name}"?`)) return;
    const { error: dbError } = await supabase.from("lesson_attachments").delete().eq("id", att.id);
    if (dbError) return setError("Não foi possível remover o material.");
    await supabase.storage.from(MATERIALS_BUCKET).remove([att.file_path]);
    setItems((prev) => prev.filter((i) => i.id !== att.id));
  };

  return (
    <div className="ui-field">
      <span className="ui-label"><Paperclip size={14} style={{ verticalAlign: "-2px" }} /> Materiais de apoio</span>

      <button
        type="button"
        className={`la-drop ${dragging ? "is-dragging" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files?.length) upload(e.dataTransfer.files); }}
        disabled={!!uploading}
      >
        {uploading ? <><span className="ui-spinner ui-spinner--sm" /> Enviando {uploading}...</> : <><UploadCloud size={18} /> Arraste arquivos ou clique para anexar</>}
        <small>PDF, planilhas, documentos, imagens ou ZIP · até {MAX_ATTACHMENT_MB} MB</small>
      </button>
      <input ref={inputRef} type="file" hidden multiple accept={ACCEPT} onChange={(e) => { if (e.target.files?.length) upload(e.target.files); e.target.value = ""; }} />

      {loading ? (
        <span className="ui-hint">Carregando materiais...</span>
      ) : items.length > 0 && (
        <ul className="la-list">
          {items.map((att) => (
            <li key={att.id}>
              <FileText size={16} aria-hidden="true" />
              <span className="la-name" title={att.name}>{att.name}</span>
              <span className="la-meta">{fileKind(att.mime_type, att.name)} · {formatBytes(att.size_bytes)}</span>
              <button type="button" className="sb-icon-btn" style={{ width: 30, height: 30 }} onClick={() => openAttachment(att).catch(() => setError("Link indisponível."))} aria-label={`Baixar ${att.name}`}><Download size={14} /></button>
              <button type="button" className="sb-icon-btn sb-logout" style={{ width: 30, height: 30 }} onClick={() => remove(att)} aria-label={`Remover ${att.name}`}><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}
      {error && <span className="ui-error-text" role="alert">{error}</span>}
    </div>
  );
}
