import React from "react";

interface AvatarProps {
  src: string | null; // URL da imagem vinda da coluna avatar_url
  name: string;       // Nome do usuário para gerar a inicial
  size?: number;      // Diâmetro em px (padrão 40)
  bordered?: boolean; // Borda neutra em volta (padrão true)
}

const Avatar: React.FC<AvatarProps> = ({ src, name, size = 40, bordered = true }) => {
  // Pega a primeira letra do nome ou um "?" se o nome estiver vazio
  const initial = name ? name.charAt(0).toUpperCase() : "?";

  return (
    <div
      className="user-profile-circle"
      style={{
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        backgroundColor: src ? "var(--color-surface-3)" : "var(--color-primary-soft)",
        color: "var(--color-primary-text)",
        fontWeight: 700,
        fontSize: Math.max(12, Math.round(size * 0.4)),
        width: size,
        height: size,
        borderRadius: "50%",
        border: bordered ? "2px solid var(--color-border-strong)" : "none",
      }}
    >
      {src ? (
        <img src={src} alt={name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
};

export default Avatar;
