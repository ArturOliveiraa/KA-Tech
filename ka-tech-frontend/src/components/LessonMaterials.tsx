import React, { useEffect, useState } from "react";
import { Download, FileText, Paperclip } from "lucide-react";
import { LessonAttachment, fileKind, formatBytes, listAttachments, openAttachment } from "../utils/attachments";

/** Materiais de apoio da aula atual, para o aluno baixar. */
export default function LessonMaterials({ lessonId, onCount }: { lessonId: number; onCount?: (n: number) => void }) {
  const [items, setItems] = useState<LessonAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    listAttachments(lessonId)
      .then((data) => { if (alive) { setItems(data); onCount?.(data.length); } })
      .catch(() => alive && setError("Não foi possível carregar os materiais."))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [lessonId, onCount]);

  const download = async (att: LessonAttachment) => {
    setOpening(att.id);
    try { await openAttachment(att); }
    catch { setError("O link do arquivo expirou ou não está disponível. Tente de novo."); }
    finally { setOpening(null); }
  };

  if (loading) return <div className="ui-loading-inline"><div className="ui-spinner" /></div>;

  return (
    <div className="ply-materials">
      {error && <div className="ui-alert ui-alert--danger" role="alert">{error}</div>}
      {items.length === 0 ? (
        <div className="ply-notes__empty">
          <Paperclip size={28} />
          <p>Nenhum material nesta aula.</p>
          <span>Quando o instrutor anexar arquivos, eles aparecem aqui.</span>
        </div>
      ) : (
        <ul className="ply-materials__list">
          {items.map((att) => (
            <li key={att.id}>
              <button type="button" className="ply-material" onClick={() => download(att)} disabled={opening === att.id}>
                <span className="ply-material__icon"><FileText size={18} /></span>
                <span className="ply-material__info">
                  <strong title={att.name}>{att.name}</strong>
                  <span>{fileKind(att.mime_type, att.name)}{att.size_bytes ? ` · ${formatBytes(att.size_bytes)}` : ""}</span>
                </span>
                {opening === att.id ? <span className="ui-spinner ui-spinner--sm" /> : <Download size={16} aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
