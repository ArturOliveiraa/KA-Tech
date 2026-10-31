import { createContext, KeyboardEvent as ReactKeyboardEvent, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

/*
 * Confirmação e avisos no visual do site, no lugar de window.confirm/alert.
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Excluir aula?", message: "...", tone: "danger", confirmLabel: "Excluir" }))) return;
 *
 *   const toast = useToast();
 *   toast.success("Aula salva.");
 */

export interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger: botão vermelho, para ações que apagam ou não têm volta */
  tone?: "primary" | "danger";
}

type ToastTone = "success" | "danger" | "info" | "warning";
interface Toast { id: number; tone: ToastTone; text: ReactNode }

interface FeedbackApi {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  toast: (text: ReactNode, tone?: ToastTone) => void;
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

const TOAST_ICON: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 size={18} />,
  danger: <XCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...opts, resolve })),
    [],
  );

  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);

  const toast = useCallback((text: ReactNode, tone: ToastTone = "success") => {
    const id = ++seq.current;
    setToasts((ts) => [...ts.slice(-3), { id, tone, text }]);
    setTimeout(() => dismiss(id), tone === "danger" ? 8000 : 4500);
  }, [dismiss]);

  const close = (ok: boolean) => {
    dialog?.resolve(ok);
    setDialog(null);
  };

  return (
    <FeedbackContext.Provider value={{ confirm, toast }}>
      {children}
      {dialog && <ConfirmDialog {...dialog} onClose={close} />}
      <div className="ui-toasts" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div key={t.id} className={`ui-toast ui-toast--${t.tone}`} role={t.tone === "danger" ? "alert" : "status"}>
            <span className="ui-toast__icon">{TOAST_ICON[t.tone]}</span>
            <span className="ui-toast__text">{t.text}</span>
            <button type="button" className="ui-toast__close" onClick={() => dismiss(t.id)} aria-label="Fechar aviso"><X size={15} /></button>
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  );
}

function ConfirmDialog({ title, message, confirmLabel = "Confirmar", cancelLabel = "Cancelar", tone = "primary", onClose }: ConfirmOptions & { onClose: (ok: boolean) => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previous = useRef<Element | null>(null);

  useEffect(() => {
    previous.current = document.activeElement;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(false); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      (previous.current as HTMLElement | null)?.focus?.();
    };
  }, [onClose]);

  // Mantém o Tab dentro da janela
  const trap = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const items = e.currentTarget.querySelectorAll<HTMLElement>("button");
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  return (
    <div className="ui-modal-backdrop ui-confirm-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose(false)}>
      <div className="ui-modal ui-confirm" role="alertdialog" aria-modal="true" aria-labelledby="ui-confirm-title" aria-describedby={message ? "ui-confirm-text" : undefined} onKeyDown={trap}>
        <div className={`ui-confirm__icon ui-confirm__icon--${tone}`}>{tone === "danger" ? <AlertTriangle size={22} /> : <Info size={22} />}</div>
        <h2 id="ui-confirm-title" className="ui-confirm__title">{title}</h2>
        {message && <div id="ui-confirm-text" className="ui-confirm__text">{message}</div>}
        <div className="ui-confirm__actions">
          <button type="button" className="ui-btn ui-btn--secondary" onClick={() => onClose(false)}>{cancelLabel}</button>
          <button ref={confirmRef} type="button" className={`ui-btn ${tone === "danger" ? "ui-btn--danger" : "ui-btn--primary"}`} onClick={() => onClose(true)}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

const missing = () => { throw new Error("FeedbackProvider ausente: envolva o app com <FeedbackProvider>."); };

/** Pergunta antes de uma ação; resolve true se a pessoa confirmar. */
export function useConfirm() {
  return useContext(FeedbackContext)?.confirm ?? missing;
}

/** Aviso rápido no canto da tela. */
export function useToast() {
  const show = useContext(FeedbackContext)?.toast ?? missing;
  return useMemo(() => ({
    success: (text: ReactNode) => show(text, "success"),
    error: (text: ReactNode) => show(text, "danger"),
    info: (text: ReactNode) => show(text, "info"),
    warning: (text: ReactNode) => show(text, "warning"),
  }), [show]);
}
