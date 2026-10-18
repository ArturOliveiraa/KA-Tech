import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, Send, X } from "lucide-react";
import { supabase } from "../supabaseClient";
import { Button, Select } from "./ui";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  defaultName?: string;
}

const TYPES = [
  { value: "melhoria", label: "💡 Sugestão" },
  { value: "bug", label: "🐛 Reportar bug" },
  { value: "elogio", label: "⭐ Elogio" },
  { value: "outro", label: "🤔 Outro" },
];

export default function FeedbackModal({ open, onClose, defaultName = "" }: FeedbackModalProps) {
  const [type, setType] = useState("melhoria");
  const [name, setName] = useState(defaultName);
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (defaultName && !name) setName(defaultName);
  }, [defaultName, name]);

  useEffect(() => {
    if (!open) return;
    firstFieldRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !name.trim() || !contact.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Sua sessão expirou. Entre novamente para enviar.");
        return;
      }

      const { error: insertError } = await supabase.from("feedbacks").insert([{
        user_id: user.id,
        type,
        message,
        user_name: name,
        contact_info: contact,
      }]);
      if (insertError) throw insertError;

      setSuccess(true);
      setMessage("");
      setContact("");
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2500);
    } catch (err) {
      console.error("Erro ao enviar feedback:", err);
      setError("Não foi possível enviar agora. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ui-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ui-modal" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
          <div>
            <h2 id="feedback-title" style={{ margin: 0, fontSize: "var(--text-xl)" }}>Deixar feedback</h2>
            <p style={{ margin: "6px 0 0", color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
              Conte o que podemos melhorar. A equipe lê todas as mensagens.
            </p>
          </div>
          <Button variant="ghost" size="sm" className="ui-btn--icon" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </Button>
        </div>

        {success ? (
          <div className="ui-alert ui-alert--success" role="status">
            <CheckCircle2 size={18} /> Obrigado! Seu feedback foi enviado.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="ui-field">
              <label className="ui-label" htmlFor="fb-name">Seu nome</label>
              <input ref={firstFieldRef} id="fb-name" className="ui-input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="ui-field">
              <label className="ui-label" htmlFor="fb-contact">Discord ou WhatsApp</label>
              <input id="fb-contact" className="ui-input" value={contact} onChange={(e) => setContact(e.target.value)} required />
            </div>
            <div className="ui-field">
              <label className="ui-label" htmlFor="fb-type">Tipo</label>
              <Select id="fb-type" value={type} onChange={setType} options={TYPES} />
            </div>
            <div className="ui-field">
              <label className="ui-label" htmlFor="fb-message">Mensagem</label>
              <textarea id="fb-message" className="ui-input" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Descreva com detalhes..." required />
            </div>
            {error && <div className="ui-alert ui-alert--danger" role="alert">{error}</div>}
            <Button type="submit" block loading={submitting} icon={<Send size={16} />}>
              {submitting ? "Enviando..." : "Enviar feedback"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
