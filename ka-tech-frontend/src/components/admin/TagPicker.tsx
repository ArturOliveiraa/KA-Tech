import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";

export interface TagOption {
  id: string;
  name: string;
  type?: string | null;
}

interface TagPickerProps {
  options: TagOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  placeholder?: string;
  /** Permite criar um setor novo a partir do texto digitado */
  onCreate?: (name: string) => Promise<TagOption | null>;
  /** Seleção única (ex.: filtro) */
  single?: boolean;
  id?: string;
  /** Quantos chips mostrar antes de agrupar em "+N" (padrão 3) */
  maxChips?: number;
  /** Lista sempre aberta abaixo da busca (bom para painéis laterais) */
  inline?: boolean;
  /** Altura máxima da lista no modo inline */
  listHeight?: number | string;
}

const typeLabel = (type?: string | null) => (type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : "Outros");

/**
 * Seleção de setores com busca rápida, chips e agrupamento por tipo.
 * Teclado: setas navegam, Enter seleciona, Backspace remove o último chip.
 */
export default function TagPicker({
  options, value, onChange, label, placeholder = "Buscar setor...", onCreate, single, id,
  maxChips = 3, inline = false, listHeight = 360,
}: TagPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [creating, setCreating] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = id || "tag-picker";

  const selected = useMemo(() => value.map((v) => options.find((o) => o.id === v)).filter(Boolean) as TagOption[], [value, options]);

  // Tudo que bate com a busca (para "selecionar todos") e a parte exibida na lista
  const matching = useMemo(() => {
    const term = query.trim().toLowerCase();
    return options.filter((o) => !term || o.name.toLowerCase().includes(term));
  }, [options, query]);
  const filtered = useMemo(() => matching.slice(0, 120), [matching]);

  const matchingByGroup = useMemo(() => {
    const map = new Map<string, string[]>();
    matching.forEach((o) => {
      const key = typeLabel(o.type);
      map.set(key, [...(map.get(key) || []), o.id]);
    });
    return map;
  }, [matching]);

  const allSelected = (ids: string[]) => ids.length > 0 && ids.every((tid) => value.includes(tid));
  const toggleMany = (ids: string[]) => {
    if (allSelected(ids)) onChange(value.filter((v) => !ids.includes(v)));
    else onChange(Array.from(new Set([...value, ...ids])));
    inputRef.current?.focus();
  };

  const groups = useMemo(() => {
    const map = new Map<string, TagOption[]>();
    filtered.forEach((o) => {
      const key = typeLabel(o.type);
      map.set(key, [...(map.get(key) || []), o]);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const exactMatch = options.some((o) => o.name.toLowerCase() === query.trim().toLowerCase());

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => setHighlight(0), [query]);

  const toggle = (tagId: string) => {
    if (single) {
      onChange(value[0] === tagId ? [] : [tagId]);
      setOpen(false);
      setQuery("");
      return;
    }
    onChange(value.includes(tagId) ? value.filter((v) => v !== tagId) : [...value, tagId]);
    setQuery("");
    inputRef.current?.focus();
  };

  const handleCreate = async () => {
    if (!onCreate || !query.trim()) return;
    setCreating(true);
    const created = await onCreate(query.trim());
    setCreating(false);
    if (created) {
      onChange(single ? [created.id] : [...value, created.id]);
      setQuery("");
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlight]) toggle(filtered[highlight].id);
      else if (onCreate && query.trim() && !exactMatch) handleCreate();
    }
    else if (e.key === "Escape" && !inline) setOpen(false);
    else if (e.key === "Backspace" && !query && value.length) onChange(value.slice(0, -1));
  };

  let flatIndex = -1;
  const menuOpen = inline || open;
  const visibleChips = expanded ? selected : selected.slice(0, maxChips);
  const hiddenCount = selected.length - visibleChips.length;

  return (
    <div className={`tp ${inline ? "tp--inline" : ""}`} ref={rootRef}>
      {(label || (!single && value.length > 0)) && (
        <div className="tp-top">
          {label && <label className="ui-label" htmlFor={inputId}>{label}</label>}
          {!single && value.length > 0 && (
            <span className="tp-summary">
              <strong>{value.length}</strong> {value.length === 1 ? "selecionado" : "selecionados"}
              <button type="button" onClick={() => { onChange([]); setExpanded(false); }}>Limpar seleção</button>
            </span>
          )}
        </div>
      )}
      <div className={`tp-box ${menuOpen ? "is-open" : ""}`} onClick={() => { setOpen(true); inputRef.current?.focus(); }}>
        {visibleChips.map((t) => (
          <span key={t.id} className="tp-chip">
            {t.name}
            <button type="button" onClick={(e) => { e.stopPropagation(); toggle(t.id); }} aria-label={`Remover ${t.name}`}>
              <X size={12} />
            </button>
          </span>
        ))}
        {hiddenCount > 0 && (
          <button type="button" className="tp-chip tp-chip--more" onClick={(e) => { e.stopPropagation(); setExpanded(true); }} title="Mostrar todos os selecionados">
            +{hiddenCount} {hiddenCount === 1 ? "setor" : "setores"}
          </button>
        )}
        {expanded && selected.length > maxChips && (
          <button type="button" className="tp-chip tp-chip--more" onClick={(e) => { e.stopPropagation(); setExpanded(false); }}>
            Mostrar menos
          </button>
        )}
        <div className="tp-input">
          {selected.length === 0 && <Search size={15} aria-hidden="true" />}
          <input
            ref={inputRef}
            id={inputId}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={selected.length && !inline ? "" : placeholder}
            role="combobox"
            aria-expanded={menuOpen}
            aria-controls={`${inputId}-list`}
            aria-autocomplete="list"
          />
        </div>
      </div>

      {menuOpen && (
        <div
          className={`tp-menu ${inline ? "tp-menu--inline" : ""}`}
          id={`${inputId}-list`}
          role="listbox"
          aria-multiselectable={!single}
          style={inline ? { maxHeight: listHeight } : undefined}
        >
          {groups.length === 0 && !onCreate && <div className="tp-empty">Nenhum setor encontrado.</div>}
          {!single && matching.length > 1 && (
            <div className="tp-bulk">
              <button type="button" className="tp-bulk__btn" onClick={() => toggleMany(matching.map((o) => o.id))}>
                <span className={`tp-check ${allSelected(matching.map((o) => o.id)) ? "is-on" : ""}`}>
                  {allSelected(matching.map((o) => o.id)) && <Check size={13} strokeWidth={3} />}
                </span>
                {allSelected(matching.map((o) => o.id))
                  ? "Desmarcar todos"
                  : query.trim() ? `Selecionar os ${matching.length} resultados` : `Selecionar todos (${matching.length})`}
              </button>
              {value.length > 0 && (
                <button type="button" className="tp-bulk__clear" onClick={() => { onChange([]); inputRef.current?.focus(); }}>
                  Limpar ({value.length})
                </button>
              )}
            </div>
          )}
          {groups.map(([group, items]) => {
            const groupIds = matchingByGroup.get(group) || [];
            const groupAll = allSelected(groupIds);
            return (
            <div key={group} className="tp-group">
              {(groups.length > 1 || !single) && (
                <div className="tp-group__label">
                  <span>{group} <em>· {groupIds.length}</em></span>
                  {!single && groupIds.length > 1 && (
                    <button type="button" onClick={() => toggleMany(groupIds)}>
                      {groupAll ? "Desmarcar grupo" : `Marcar grupo (${groupIds.length})`}
                    </button>
                  )}
                </div>
              )}
              {items.map((o) => {
                flatIndex += 1;
                const idx = flatIndex;
                const isSel = value.includes(o.id);
                return (
                  <button
                    type="button"
                    key={o.id}
                    role="option"
                    aria-selected={isSel}
                    className={`tp-option ${idx === highlight ? "is-highlight" : ""}`}
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => toggle(o.id)}
                  >
                    <span className="tp-check">{isSel && <Check size={13} strokeWidth={3} />}</span>
                    {o.name}
                  </button>
                );
              })}
            </div>
            );
          })}
          {matching.length > filtered.length && (
            <div className="tp-empty">Mostrando {filtered.length} de {matching.length}. Digite para refinar.</div>
          )}
          {onCreate && query.trim() && !exactMatch && (
            <button type="button" className="tp-option tp-create" onClick={handleCreate} disabled={creating}>
              <Plus size={14} /> {creating ? "Criando..." : <>Criar setor “{query.trim().toUpperCase()}”</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
