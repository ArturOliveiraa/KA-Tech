import React, { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

export interface ActionItem {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

/** Menu "..." com ações secundárias. Fecha com Esc ou clique fora; setas navegam. */
export default function ActionMenu({ items, label = "Mais ações" }: { items: ActionItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean }>({ top: 0, left: 0, up: false });
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btnRef.current?.focus(); } };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    menuRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Posição fixa para não ser cortado por contêineres com rolagem (ex.: tabela)
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const up = window.innerHeight - rect.bottom < 240;
      setPos({ top: up ? rect.top - 6 : rect.bottom + 6, left: Math.max(8, rect.right - 220), up });
    }
    setOpen((v) => !v);
  };

  const onMenuKey = (e: React.KeyboardEvent) => {
    const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") || []);
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown") { e.preventDefault(); buttons[(i + 1) % buttons.length]?.focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); buttons[(i - 1 + buttons.length) % buttons.length]?.focus(); }
  };

  return (
    <div className="am" ref={rootRef} onClick={(e) => e.stopPropagation()}>
      <button ref={btnRef} type="button" className="sb-icon-btn am-trigger" aria-haspopup="menu" aria-expanded={open} aria-label={label} title={label} onClick={toggle}>
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div
          ref={menuRef}
          className="am-menu"
          role="menu"
          onKeyDown={onMenuKey}
          style={{ top: pos.top, left: pos.left, transform: pos.up ? "translateY(-100%)" : undefined }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={`am-item ${item.danger ? "is-danger" : ""}`}
              disabled={item.disabled}
              onClick={() => { setOpen(false); item.onSelect(); }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
