import React, { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Eye, EyeOff, Moon, Sparkles, Sun, Trophy } from "lucide-react";
import logoKaTech from "../assets/ka-tech-logo-wide.png";
import { useTheme } from "./ThemeContext";
import SEO from "./SEO";

// Moldura comum das telas de entrada (login, cadastro, recuperar e trocar senha)

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  heroTitle?: string;
  heroText?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const HIGHLIGHTS = [
  { icon: BookOpen, text: "Trilhas organizadas em módulos e aulas" },
  { icon: Trophy, text: "XP, conquistas e ranking para manter o ritmo" },
  { icon: Sparkles, text: "Quizzes e certificados ao concluir cursos" },
];

export default function AuthLayout({
  title,
  subtitle,
  heroTitle = "Aprenda a tecnologia que move o mundo.",
  heroText = "Conteúdo direto ao ponto, progresso salvo e uma comunidade que aprende junto.",
  children,
  footer,
}: AuthLayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const ThemeIcon = theme === "dark" ? Sun : Moon;

  return (
    <div className="auth">
      <SEO title={title} />

      <aside className="auth-hero" aria-hidden="true">
        <div className="auth-hero__glow" />
        <img src={logoKaTech} alt="" className="auth-hero__logo brand-logo-img" />
        <h2 className="auth-hero__title">{heroTitle}</h2>
        <p className="auth-hero__text">{heroText}</p>
        <ul className="auth-hero__list">
          {HIGHLIGHTS.map(({ icon: Icon, text }) => (
            <li key={text}><span><Icon size={16} /></span>{text}</li>
          ))}
        </ul>
      </aside>

      <main className="auth-panel">
        <div className="auth-panel__top">
          <Link to="/login" className="auth-panel__logo"><img src={logoKaTech} alt="KA Tech" className="brand-logo-img" /></Link>
          <button type="button" className="sb-icon-btn" onClick={toggleTheme} aria-label={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}>
            <ThemeIcon size={18} />
          </button>
        </div>

        <div className="auth-card ui-fade-up">
          <header className="auth-card__header">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </header>
          {children}
        </div>

        {footer && <div className="auth-footer">{footer}</div>}
      </main>
    </div>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: React.ReactNode;
};

export function AuthField({ label, icon, id, type = "text", ...rest }: FieldProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const inputId = id || `f-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="ui-field">
      <label className="ui-label" htmlFor={inputId}>{label}</label>
      <div className="ui-input-group">
        {icon}
        <input id={inputId} className="ui-input auth-input" type={isPassword && visible ? "text" : type} {...rest} />
        {isPassword && (
          <button
            type="button"
            className="ui-input-group__end sb-icon-btn"
            style={{ width: 34, height: 34 }}
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}
