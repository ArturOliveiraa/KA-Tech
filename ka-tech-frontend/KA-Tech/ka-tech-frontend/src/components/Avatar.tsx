import React from "react";

interface AvatarProps {
  src: string | null; // URL da imagem vinda da coluna avatar_url
  name: string;       // Nome do usuário para gerar a inicial
}

const Avatar: React.FC<AvatarProps> = ({ src, name }) => {
  // Pega a primeira letra do nome ou um "?" se o nome estiver vazio
  const initial = name ? name.charAt(0).toUpperCase() : "?";

  return (
    <div 
      className="user-profile-circle" 
      style={{ 
        overflow: 'hidden', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: src ? 'transparent' : '#00e5ff', // Cor de fundo se não houver foto
        color: '#121418',
        fontWeight: 'bold',
        fontSize: '1.2rem',
        width: '40px', // Tamanho padrão do círculo
        height: '40px',
        borderRadius: '50%',
        border: '2px solid #2d323e'
      }}
    >
      {src ? (
        <img 
          src={src} 
          alt={name} 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover' // Garante que a foto preencha o círculo sem distorcer
          }} 
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
};

export default Avatar;