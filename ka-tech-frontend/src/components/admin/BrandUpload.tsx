import React, { useEffect, useRef, useState } from "react";
import { ImagePlus, RotateCcw, Save, UploadCloud } from "lucide-react";
import { Button } from "../ui";

interface BrandUploadProps {
  currentUrl: string;
  /** Fundo da prévia (como o logo vai aparecer de verdade) */
  previewBackground: string;
  previewHeight?: number;
  onSave: (file: File) => Promise<void>;
  hint?: string;
}

const MAX_MB = 2;
const ACCEPT = "image/png,image/jpeg,image/svg+xml,image/webp";

/** Troca de logo: arrastar ou clicar, prévia no fundo real e salvar/cancelar. */
export default function BrandUpload({ currentUrl, previewBackground, previewHeight = 56, onSave, hint = "PNG, JPG, SVG ou WebP · até 2 MB" }: BrandUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (f?: File | null) => {
    setError(null);
    setSaved(false);
    if (!f) return;
    if (!ACCEPT.split(",").includes(f.type)) return setError("Formato não suportado. Use PNG, JPG, SVG ou WebP.");
    if (f.size > MAX_MB * 1024 * 1024) return setError(`A imagem passa de ${MAX_MB} MB.`);
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const cancel = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setError(null);
  };

  const save = async () => {
    if (!file) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(file);
      setSaved(true);
      cancel();
    } catch (e: any) {
      setError("Não foi possível salvar: " + (e?.message || "tente novamente"));
    } finally {
      setSaving(false);
    }
  };

  const shown = preview || currentUrl;

  return (
    <div className="bu">
      <div className="bu-preview" style={{ background: previewBackground }}>
        {shown ? <img src={shown} alt="Prévia do logo" style={{ maxHeight: previewHeight }} /> : <span className="bu-preview__empty">Nenhum logo definido</span>}
        {preview && <span className="bu-preview__tag">Prévia</span>}
      </div>

      <button
        type="button"
        className={`bu-drop ${dragging ? "is-dragging" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
        disabled={saving}
      >
        <UploadCloud size={22} aria-hidden="true" />
        <strong>{file ? file.name : "Arraste a imagem ou clique para escolher"}</strong>
        <span>{hint}</span>
      </button>
      <input ref={inputRef} type="file" accept={ACCEPT} hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />

      {error && <span className="ui-error-text" role="alert">{error}</span>}
      {saved && !file && <span className="bu-saved" role="status">Logo atualizado.</span>}

      <div className="bu-actions">
        {file ? (
          <>
            <Button variant="ghost" onClick={cancel} disabled={saving} icon={<RotateCcw size={15} />}>Cancelar</Button>
            <Button onClick={save} loading={saving} icon={<Save size={15} />}>Salvar logo</Button>
          </>
        ) : (
          <Button variant="secondary" onClick={() => inputRef.current?.click()} icon={<ImagePlus size={15} />}>Trocar logo</Button>
        )}
      </div>
    </div>
  );
}
