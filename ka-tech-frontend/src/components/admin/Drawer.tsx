import React, { useEffect } from "react";
import { X } from "lucide-react";

interface DrawerProps {
  open: boolean;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}

/** Painel lateral para formulários rápidos sem tirar o contexto da lista. */
export default function Drawer({ open, title, subtitle, onClose, children, footer, width = 520 }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="dw-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="dw" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined} style={{ maxWidth: width }}>
        <header className="dw-head">
          <div>
            <h2 className="dw-title">{title}</h2>
            {subtitle && <p className="dw-subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="sb-icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <div className="dw-body">{children}</div>
        {footer && <footer className="dw-foot">{footer}</footer>}
      </aside>
    </div>
  );
}
