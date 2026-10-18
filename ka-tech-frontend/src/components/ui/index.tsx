import React from "react";

// Componentes de interface compartilhados. Os estilos ficam em src/styles/ui.css.

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "light";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  block,
  loading,
  icon,
  className = "",
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = [
    "ui-btn",
    `ui-btn--${variant}`,
    size !== "md" && `ui-btn--${size}`,
    block && "ui-btn--block",
    className,
  ].filter(Boolean).join(" ");

  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="ui-spinner ui-spinner--sm" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, eyebrow, actions }: PageHeaderProps) {
  return (
    <header className="ui-page-header">
      <div>
        {eyebrow && <div className="ui-page-header__eyebrow">{eyebrow}</div>}
        <h1 className="ui-page-header__title">{title}</h1>
        {subtitle && <p className="ui-page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="ui-page-header__actions">{actions}</div>}
    </header>
  );
}

interface ProgressBarProps {
  value: number;
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

export function ProgressBar({ value, size = "md", label = "Progresso", className = "" }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div
      className={`ui-progress ${size !== "md" ? `ui-progress--${size}` : ""} ${className}`}
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="ui-progress__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  tone?: "neutral" | "danger";
}

export function EmptyState({ icon, title, description, action, tone = "neutral" }: EmptyStateProps) {
  return (
    <div className={`ui-empty ${tone === "danger" ? "ui-empty--danger" : ""}`} role={tone === "danger" ? "alert" : undefined}>
      {icon && <div className="ui-empty__icon" aria-hidden="true">{icon}</div>}
      <h2 className="ui-empty__title">{title}</h2>
      {description && <p className="ui-empty__text">{description}</p>}
      {action}
    </div>
  );
}

export function LoadingScreen({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="ui-loading-screen" role="status" aria-live="polite">
      <div className="ui-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function Skeleton({ width = "100%", height = 16, radius }: { width?: number | string; height?: number | string; radius?: number | string }) {
  return <div className="ui-skeleton" aria-hidden="true" style={{ width, height, borderRadius: radius }} />;
}

export { default as Select } from "./Select";
export type { SelectOption } from "./Select";
