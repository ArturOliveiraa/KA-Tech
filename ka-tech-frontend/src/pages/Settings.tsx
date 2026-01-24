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
  // Estado da cor do tema
  const [themeColor, setThemeColor] = useState("#00c9ff"); 

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
        .select("id, full_name, role, avatar_url, theme_color") // Adicionado theme_color
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
    if (!profileId) return; // Previne erro de UUID vazio

    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({ 
        full_name: fullName,
        theme_color: themeColor // Salva a cor escolhida
      })
      .eq("id", profileId);

    if (error) alert("Erro ao atualizar perfil: " + error.message);
    else alert("Perfil atualizado com sucesso!");
    
    setLoading(false);
  };

  if (loading && !profileId) return <div className="loading-box">Carregando configurações...</div>;

  return (
    <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#0b0e14' }}>
      <style>{`
        :root { --primary-color: ${themeColor}; }
        .dashboard-content { flex: 1; padding: 40px; margin-left: 260px; width: 100%; }
        .admin-card-local { background: #121418; border-radius: 16px; padding: 32px; max-width: 500px; border: 1px solid #2d323e; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        .local-field { margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; }
        .local-field label { color: #e2e8f0; font-size: 0.85rem; font-weight: 500; }
        .local-input-wrapper { position: relative; display: flex; align-items: center; width: 100%; }
        .local-icon { position: absolute; left: 15px; font-size: 1.1rem; }
        .local-input-wrapper input {
          width: 100%; background-color: #1a1d23 !important; color: white !important;
          border: 1px solid #2d323e; border-radius: 8px; padding: 12px 12px 12px 45px; font-size: 14px; outline: none;
        }
        .local-primary-button { 
          width: 100%; padding: 12px; margin-top: 10px; border-radius: 8px; border: none; 
          background: var(--primary-color); 
          color: #000; font-weight: bold; cursor: pointer; transition: opacity 0.3s ease; 
        }
        .local-primary-button:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .avatar-preview-container { display: flex; flex-direction: column; align-items: center; gap: 15px; margin-bottom: 30px; }
        .avatar-big { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary-color); box-shadow: 0 0 20px rgba(34, 197, 94, 0.2); }
        .avatar-placeholder { width: 120px; height: 120px; border-radius: 50%; background: #1a1d23; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; color: #94a3b8; border: 2px dashed #2d323e; }
        
        .color-input {
          height: 45px; width: 100%; background: #1a1d23; border: 1px solid #2d323e; border-radius: 8px; cursor: pointer; padding: 4px;
        }

        @media (max-width: 768px) {
          .dashboard-content { margin-left: 0; padding: 20px; }
        }
      `}</style>

      <Sidebar userRole={userRole} />

      <main className="dashboard-content">
        <header className="dashboard-header" style={{ marginBottom: '30px' }}>
          <div className="header-info">
            <h1 style={{ color: '#fff', fontSize: '1.8rem' }}>Configurações</h1>
            <p style={{ color: '#94a3b8' }}>Personalize seu perfil na plataforma <strong>KA Tech</strong>.</p>
          </div>
        </header>

        <div className="admin-card-local">
          <form onSubmit={handleSaveProfile}>
            
            <div className="avatar-preview-container">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="avatar-big" />
              ) : (
                <div className="avatar-placeholder">
                  {fullName ? fullName.charAt(0).toUpperCase() : "?"}
                </div>
              )}
              
              <div className="local-field" style={{ width: '100%' }}>
                <label style={{ textAlign: 'center', display: 'block' }}>Alterar Foto de Perfil</label>
                <div className="local-input-wrapper">
                  <span className="local-icon">📷</span>
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg" 
                    onChange={handleUploadAvatar} 
                    style={{ paddingLeft: '45px', paddingTop: '10px' }}
                  />
                </div>
                {uploading && <p style={{ fontSize: '0.75rem', color: '#00e5ff', textAlign: 'center' }}>Fazendo upload...</p>}
              </div>
            </div>

            <hr style={{ borderColor: '#1f2937', marginBottom: '25px', opacity: 0.3 }} />

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

            {/* SEÇÃO DE COR DO TEMA */}
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