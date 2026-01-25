import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";

function Settings() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [profileId, setProfileId] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  // Estado da cor do tema - Ajustado para o Roxo KA Tech
  const [themeColor, setThemeColor] = useState("#8b5cf6"); 

  const navigate = useNavigate();

  // Aplica a cor no CSS do navegador em tempo real
  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', themeColor);
  }, [themeColor]);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate("/");

      const { data: profile} = await supabase
        .from("profiles")
        .select("id, full_name, role, avatar_url, theme_color")
        .eq("id", user.id)
        .single();

      if (profile) {
        setProfileId(profile.id);
        setFullName(profile.full_name || "");
        setAvatarUrl(profile.avatar_url || "");
        setUserRole(profile.role);
        if (profile.theme_color) setThemeColor(profile.theme_color);
      }
      setLoading(false);
    }
    loadProfile();
  }, [navigate]);

  async function handleUploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0 || !profileId) return;
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${profileId}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      
      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profileId);

      alert("Foto de perfil atualizada!");
    } catch (error: any) {
      alert("Erro no upload: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) return;

    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({ 
        full_name: fullName,
        theme_color: themeColor 
      })
      .eq("id", profileId);

    if (error) alert("Erro ao atualizar perfil: " + error.message);
    else alert("Perfil atualizado com sucesso!");
    
    setLoading(false);
  };

  if (loading && !profileId) return <div className="loading-box" style={{ color: '#8b5cf6', fontFamily: 'Sora', fontWeight: 800, padding: '50px', textAlign: 'center' }}>Carregando configurações...</div>;

  return (
    <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#020617', fontFamily: "'Sora', sans-serif" }}>
      <style>{`
        :root { --primary-color: ${themeColor}; }
        .dashboard-content { flex: 1; padding: 40px; margin-left: 260px; width: 100%; }
        
        /* CARD PRETO PREMIUM */
        .admin-card-local { 
          background: #09090b; 
          border-radius: 16px; 
          padding: 40px; 
          max-width: 550px; 
          border: 1px solid rgba(139, 92, 246, 0.1); 
          box-shadow: 0 20px 50px rgba(0,0,0,0.6); 
        }

        .local-field { margin-bottom: 24px; display: flex; flex-direction: column; gap: 10px; }
        .local-field label { color: #e5e7eb; font-size: 1rem; font-weight: 600; }
        
        .local-input-wrapper { position: relative; display: flex; align-items: center; width: 100%; }
        .local-icon { position: absolute; left: 18px; font-size: 1.2rem; filter: opacity(0.8); }
        
        .local-input-wrapper input {
          width: 100%; background-color: #020617 !important; color: white !important;
          border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 12px; padding: 14px 14px 14px 52px; 
          font-size: 1rem; outline: none; transition: all 0.3s ease;
          font-family: 'Sora', sans-serif;
        }
        .local-input-wrapper input:focus { border-color: var(--primary-color); box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2); }

        /* BOTÃO ROXO NEON FREESTYLE */
        .local-primary-button { 
          width: 100%; padding: 16px; margin-top: 15px; border-radius: 999px; border: none; 
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); 
          color: #fff; font-weight: 800; cursor: pointer; transition: all 0.3s ease; 
          font-size: 1rem; font-family: 'Sora', sans-serif;
          box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
        }
        .local-primary-button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(139, 92, 246, 0.5); filter: brightness(1.1); }
        .local-primary-button:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .avatar-preview-container { display: flex; flex-direction: column; align-items: center; gap: 20px; margin-bottom: 35px; }
        .avatar-big { 
          width: 140px; height: 140px; border-radius: 50%; object-fit: cover; 
          border: 4px solid var(--primary-color); 
          box-shadow: 0 0 30px rgba(139, 92, 246, 0.3); 
        }
        .avatar-placeholder { 
          width: 140px; height: 140px; border-radius: 50%; background: #111116; 
          display: flex; align-items: center; justify-content: center; 
          font-size: 3.5rem; color: #8b5cf6; font-weight: 800;
          border: 2px dashed rgba(139, 92, 246, 0.3); 
        }
        
        .color-input {
          height: 55px; width: 100%; background: #020617; border: 1px solid rgba(139, 92, 246, 0.2); 
          border-radius: 12px; cursor: pointer; padding: 6px; transition: 0.3s;
        }
        .color-input:hover { border-color: var(--primary-color); }

        @media (max-width: 768px) {
          .dashboard-content { margin-left: 0; padding: 20px; padding-bottom: 100px; }
          .admin-card-local { padding: 25px; }
        }
      `}</style>

      <Sidebar/>

      <main className="dashboard-content">
        <header className="dashboard-header" style={{ marginBottom: '40px' }}>
          <div className="header-info">
            <h1 style={{ color: '#fff', fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Configurações</h1>
            <p style={{ color: '#9ca3af', fontSize: '1.1rem', marginTop: '5px' }}>Personalize seu perfil na plataforma <strong style={{ color: '#8b5cf6' }}>KA Tech</strong>.</p>
          </div>
        </header>

        <div className="admin-card-local">
          <form onSubmit={handleSaveProfile}>
            
            <div className="avatar-preview-container">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="avatar-big" />
              ) : (
                <div className="avatar-placeholder">
                  {fullName ? fullName.charAt(0).toUpperCase() : "K"}
                </div>
              )}
              
              <div className="local-field" style={{ width: '100%' }}>
                <label style={{ textAlign: 'center', display: 'block', fontSize: '0.95rem', color: '#9ca3af' }}>Alterar Foto de Perfil</label>
                <div className="local-input-wrapper">
                  <span className="local-icon">📷</span>
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg" 
                    onChange={handleUploadAvatar} 
                    style={{ paddingLeft: '45px', paddingTop: '12px' }}
                  />
                </div>
                {uploading && <p style={{ fontSize: '0.85rem', color: '#8b5cf6', textAlign: 'center', marginTop: '10px', fontWeight: 600 }}>Fazendo upload...</p>}
              </div>
            </div>

            <hr style={{ borderColor: 'rgba(139, 92, 246, 0.1)', marginBottom: '30px', opacity: 0.5 }} />

            <div className="local-field">
              <label>Seu Nome</label>
              <div className="local-input-wrapper">
                <span className="local-icon">👤</span>
                <input 
                  type="text" 
                  placeholder="Ex: Artur Oliveira" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="local-field">
              <label>Cor do Tema</label>
              <input 
                type="color" 
                className="color-input"
                value={themeColor} 
                onChange={(e) => setThemeColor(e.target.value)} 
              />
            </div>

            <button className="local-primary-button" type="submit" disabled={loading || uploading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default Settings;