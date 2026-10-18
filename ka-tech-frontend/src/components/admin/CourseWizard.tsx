import React, { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, FileText, Shield, Trophy } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { Button, Select } from "../ui";
import Drawer from "./Drawer";
import TagPicker, { TagOption } from "./TagPicker";
import ImageUpload from "./ImageUpload";

interface Category { id: number; name: string; }

interface CourseWizardProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  tags: TagOption[];
  onCreateTag: (name: string) => Promise<TagOption | null>;
  onCreated: (courseId: number) => void;
}

export const generateSlug = (text: string) =>
  text.toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-").replace(/[^\w-]+/g, "").replace(/--+/g, "-").replace(/^-+/, "").replace(/-+$/, "");

const STEPS = [
  { label: "Informações", icon: FileText },
  { label: "Acesso", icon: Shield },
  { label: "Gamificação", icon: Trophy },
];

/** Criação de curso em 3 etapas num painel lateral. Ao concluir, segue para as aulas. */
export default function CourseWizard({ open, onClose, categories, tags, onCreateTag, onCreated }: CourseWizardProps) {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [xpWeight, setXpWeight] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0); setTitle(""); setDescription(""); setCategoryId(""); setThumbnail("");
    setTagIds([]); setXpWeight(1); setError(null);
  }, [open]);

  const validateStep = (s: number) => {
    if (s === 0) {
      if (!title.trim()) return "Informe o título do curso.";
      if (!description.trim()) return "Escreva uma descrição curta.";
    }
    return null;
  };

  const next = () => {
    const err = validateStep(step);
    if (err) return setError(err);
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const finish = async () => {
    const err = validateStep(0);
    if (err) { setStep(0); return setError(err); }
    setSaving(true);
    setError(null);
    try {
      const { data, error: insError } = await supabase.from("courses").insert([{
        title: title.trim(),
        description: description.trim(),
        thumbnailUrl: thumbnail.trim() || null,
        category_id: categoryId ? Number(categoryId) : null,
        xp_weight: xpWeight,
        slug: generateSlug(title),
        updatedAt: new Date().toISOString(),
      }]).select().single();
      if (insError) throw insError;
      if (tagIds.length) {
        const { error: tagError } = await supabase.from("course_tags").insert(tagIds.map((tag_id) => ({ course_id: data.id, tag_id })));
        if (tagError) throw tagError;
      }
      onCreated(data.id);
    } catch (e: any) {
      setError("Não foi possível criar o curso: " + (e?.message || "erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  const isLast = step === STEPS.length - 1;
  const categoryName = categories.find((c) => String(c.id) === categoryId)?.name;

  return (
    <Drawer
      open={open}
      onClose={() => !saving && onClose()}
      title="Novo curso"
      subtitle={`Etapa ${step + 1} de ${STEPS.length} · ${STEPS[step].label}`}
      width={560}
      footer={
        <>
          {step > 0 ? (
            <Button variant="ghost" onClick={() => { setError(null); setStep((s) => s - 1); }} icon={<ArrowLeft size={16} />} disabled={saving}>Voltar</Button>
          ) : (
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          )}
          {isLast ? (
            <Button onClick={finish} loading={saving} icon={<Check size={16} />}>Criar e adicionar aulas</Button>
          ) : (
            <Button onClick={next}>Continuar <ArrowRight size={16} /></Button>
          )}
        </>
      }
    >
      <ol className="wz-steps" aria-label="Etapas">
        {STEPS.map(({ label, icon: Icon }, i) => (
          <li key={label} className={`wz-step ${i === step ? "is-current" : ""} ${i < step ? "is-done" : ""}`}>
            <button type="button" onClick={() => { if (i < step || !validateStep(0)) { setError(null); setStep(i); } }} aria-current={i === step ? "step" : undefined}>
              <span className="wz-step__dot">{i < step ? <Check size={13} strokeWidth={3} /> : <Icon size={13} />}</span>
              <span className="wz-step__label">{label}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="adm-form">
        {step === 0 && (
          <>
            <div className="ui-field">
              <label className="ui-label" htmlFor="wz-title">Título *</label>
              <input id="wz-title" className="ui-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Implantação do PDV para restaurantes" autoFocus maxLength={120} />
            </div>
            <div className="ui-field">
              <label className="ui-label" htmlFor="wz-desc">Descrição *</label>
              <textarea id="wz-desc" className="ui-input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que a pessoa aprende neste curso?" maxLength={600} />
            </div>
            <div className="ui-field">
              <label className="ui-label" htmlFor="wz-cat">Trilha</label>
              <Select id="wz-cat" value={categoryId} onChange={setCategoryId} options={[{ value: "", label: "Sem trilha" }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]} />
            </div>
            <ImageUpload value={thumbnail} onChange={setThumbnail} bucket="course-thumbs" />
          </>
        )}

        {step === 1 && (
          <>
            <TagPicker id="wz-tags" label="Setores com acesso" options={tags} value={tagIds} onChange={setTagIds} onCreate={onCreateTag} placeholder="Buscar ou criar setor" inline listHeight="calc(100vh - 470px)" />
            <div className="ui-alert">
              {tagIds.length
                ? <>O curso ficará visível para quem pertence a <strong>&nbsp;{tagIds.length} setor(es)</strong>.</>
                : "Sem setores, o curso não aparece para os alunos. Você pode definir isso depois."}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="ui-field">
              <label className="ui-label" htmlFor="wz-xp">Peso de XP</label>
              <div className="ce-xp">
                <input id="wz-xp" type="range" min={1} max={10} value={xpWeight} onChange={(e) => setXpWeight(Number(e.target.value))} />
                <output htmlFor="wz-xp">{xpWeight}x</output>
              </div>
              <span className="ui-hint">Multiplica o XP ganho ao concluir. Use pesos maiores para cursos longos ou difíceis.</span>
            </div>

            <div className="wz-review">
              <p className="adm-section-label">Resumo</p>
              <div className="wz-review__card">
                {thumbnail ? <img src={thumbnail} alt="" /> : <div className="wz-review__noimg">Sem capa</div>}
                <div>
                  <strong>{title || "Sem título"}</strong>
                  <span>{categoryName || "Sem trilha"} · {tagIds.length} setor(es) · XP {xpWeight}x</span>
                </div>
              </div>
            </div>
          </>
        )}

        {error && <div className="ui-alert ui-alert--danger" role="alert">{error}</div>}
      </div>
    </Drawer>
  );
}
