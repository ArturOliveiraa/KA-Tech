import React, { useRef, useState } from "react";
import { ImagePlus, Link2, Trash2, UploadCloud } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { Button } from "../ui";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  bucket: string;
  label?: string;
  hint?: string;
}

const MAX_MB = 5;

/** Capa com arrastar-e-soltar, prévia imediata e opção de colar uma URL. */
export default function ImageUpload({ value, onChange, bucket, label = "Imagem de capa", hint = "PNG ou JPG, até 5 MB. Proporção 16:9 fica melhor." }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrl, setShowUrl] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const upload = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) return setError("Envie um arquivo de imagem.");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`A imagem passa de ${MAX_MB} MB.`);

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upError } = await supabase.storage.from(bucket).upload(fileName, file);
      if (upError) throw upError;
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
      onChange(publicUrl);
    } catch (err: any) {
      console.error("Erro no upload:", err);
      setError("Não foi possível enviar a imagem. Tente novamente.");
    } finally {
      setUploading(false);
      setPreview(null);
      URL.revokeObjectURL(localUrl);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  const shown = preview || value;

  return (
    <div className="ui-field">
      <span className="ui-label">{label}</span>
      <div
        className={`iu ${dragging ? "is-dragging" : ""} ${shown ? "has-image" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {shown ? (
          <>
            <img src={shown} alt="Prévia da capa" className="iu-preview" />
            {uploading && <div className="iu-overlay"><div className="ui-spinner" /> Enviando...</div>}
          </>
        ) : (
          <button type="button" className="iu-empty" onClick={() => inputRef.current?.click()}>
            <UploadCloud size={28} />
            <strong>Arraste uma imagem ou clique para enviar</strong>
            <span>{hint}</span>
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      </div>

      <div className="iu-actions">
        {shown && (
          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} icon={<ImagePlus size={14} />} disabled={uploading}>
            Trocar imagem
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => setShowUrl((v) => !v)} icon={<Link2 size={14} />}>
          {showUrl ? "Ocultar URL" : "Usar URL"}
        </Button>
        {value && (
          <Button variant="ghost" size="sm" onClick={() => onChange("")} icon={<Trash2 size={14} />}>
            Remover
          </Button>
        )}
      </div>

      {showUrl && (
        <input
          type="url"
          className="ui-input"
          placeholder="https://..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="URL da imagem"
        />
      )}
      {error && <span className="ui-error-text" role="alert">{error}</span>}
    </div>
  );
}
