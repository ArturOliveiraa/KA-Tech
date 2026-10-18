import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  /** Texto usado na busca por digitação quando o label não é texto */
  text?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  id?: string;
  "aria-label"?: string;
  disabled?: boolean;
  className?: string;
  /** Largura mínima do gatilho */
  minWidth?: number | string;
}

/**
 * Seletor no padrão do design system (substitui o <select> nativo).
 * Teclado: setas, Home/End, Enter/Espaço, Esc e busca por letra.
 */
export default function Select({ value, onChange, options, placeholder = "Selecione", id, disabled, className = "", minWidth, ...aria }: SelectProps) {
  const autoId = useId();
  const baseId = id || `sel-${autoId.replace(/:/g, "")}`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [dropUp, setDropUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = options[selectedIndex];

  const textOf = useMemo(() => (o: SelectOption) => (o.text ?? (typeof o.label === "string" ? o.label : "")).toLowerCase(), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const openList = () => {
    if (disabled) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    setDropUp(!!rect && window.innerHeight - rect.bottom < 260 && rect.top > 260);
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const commit = (index: number) => {
    const opt = options[index];
    if (!opt || opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const step = (from: number, dir: 1 | -1) => {
    let i = from;
    for (let n = 0; n < options.length; n++) {
      i = (i + dir + options.length) % options.length;
      if (!options[i].disabled) return i;
    }
    return from;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); openList(); return; }
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => step(a, 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => step(a, -1)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(step(-1, 1)); }
    else if (e.key === "End") { e.preventDefault(); setActive(step(options.length, -1)); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); commit(active); }
    else if (e.key === "Escape" || e.key === "Tab") { setOpen(false); }
    else if (e.key.length === 1) {
      const now = Date.now();
      typed.current = { text: (now - typed.current.at > 600 ? "" : typed.current.text) + e.key.toLowerCase(), at: now };
      const match = options.findIndex((o) => !o.disabled && textOf(o).startsWith(typed.current.text));
      if (match >= 0) setActive(match);
    }
  };

  return (
    <div className={`sel ${className}`} ref={rootRef} style={{ minWidth }}>
      <button
        ref={buttonRef}
        id={baseId}
        type="button"
        className={`sel-trigger ${open ? "is-open" : ""}`}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${baseId}-list`}
        aria-activedescendant={open ? `${baseId}-opt-${active}` : undefined}
        {...aria}
      >
        <span className={`sel-value ${selected ? "" : "is-placeholder"}`}>
          {selected?.icon}
          <span className="sel-value__text">{selected ? selected.label : placeholder}</span>
        </span>
        <ChevronDown size={16} className="sel-chevron" aria-hidden="true" />
      </button>

      {open && (
        <ul ref={listRef} id={`${baseId}-list`} role="listbox" className={`sel-menu ${dropUp ? "is-up" : ""}`} tabIndex={-1} aria-labelledby={baseId}>
          {options.map((o, i) => {
            const isSel = o.value === value;
            return (
              <li
                key={o.value}
                id={`${baseId}-opt-${i}`}
                data-index={i}
                role="option"
                aria-selected={isSel}
                aria-disabled={o.disabled || undefined}
                className={`sel-option ${i === active ? "is-active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(i)}
              >
                {o.icon}
                <span className="sel-option__label">{o.label}</span>
                {isSel && <Check size={15} className="sel-option__check" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
