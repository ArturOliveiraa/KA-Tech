import React from "react";
import { Check, Sparkles } from "lucide-react";
import { COVER_COLORS, COVER_ICONS, CourseCover, CoverChoice, resolveCover } from "../ui";

interface CoverPickerProps {
  title: string;
  category?: string | null;
  value: CoverChoice;
  onChange: (value: CoverChoice) => void;
  /** Escolha da trilha, para a prévia do curso ficar igual à do site. */
  categoryChoice?: CoverChoice | null;
  iconSrc?: string | null;
}

/** Escolhe ícone e cor da capa automática. Vazio = o site escolhe pelo título. */
export default function CoverPicker({ title, category, value, onChange, categoryChoice, iconSrc }: CoverPickerProps) {
  const auto = resolveCover(title, category, null, categoryChoice);
  const set = (patch: CoverChoice) => onChange({ ...value, ...patch });

  return (
    <div className="cvp">
      <CourseCover title={title || "Curso"} category={category} choice={value} categoryChoice={categoryChoice} iconSrc={iconSrc} className="cvp__preview" />

      <div className="ui-field">
        <span className="ui-label">Ícone</span>
        <div className="cvp__icons" role="radiogroup" aria-label="Ícone da capa">
          <button
            type="button"
            role="radio"
            aria-checked={!value.cover_icon}
            className={`cvp__icon cvp__icon--auto ${!value.cover_icon ? "is-active" : ""}`}
            onClick={() => set({ cover_icon: null })}
            title={`Automático (agora: ${COVER_ICONS[auto.icon].label})`}
          >
            <Sparkles size={18} /><span>Auto</span>
          </button>
          {Object.entries(COVER_ICONS).map(([key, { icon: Icon, label }]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={value.cover_icon === key}
              aria-label={label}
              title={label}
              className={`cvp__icon ${value.cover_icon === key ? "is-active" : ""}`}
              onClick={() => set({ cover_icon: key })}
            >
              <Icon size={20} />
            </button>
          ))}
        </div>
      </div>

      <div className="ui-field">
        <span className="ui-label">Cor do quadro</span>
        <div className="cvp__colors" role="radiogroup" aria-label="Cor do quadro">
          <button
            type="button"
            role="radio"
            aria-checked={!value.cover_color}
            className={`cvp__auto ${!value.cover_color ? "is-active" : ""}`}
            onClick={() => set({ cover_color: null })}
            title={`Automática (agora: ${COVER_COLORS[auto.color].label})`}
          >
            <Sparkles size={14} /> Auto
          </button>
          {Object.entries(COVER_COLORS).map(([key, { hex, label }]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={value.cover_color === key}
              aria-label={label}
              title={label}
              className={`cvp__swatch ${value.cover_color === key ? "is-active" : ""}`}
              style={{ background: hex }}
              onClick={() => set({ cover_color: key })}
            >
              {value.cover_color === key && <Check size={14} />}
            </button>
          ))}
        </div>
        <span className="ui-hint">"Auto" escolhe pelo assunto do nome.</span>
      </div>
    </div>
  );
}
