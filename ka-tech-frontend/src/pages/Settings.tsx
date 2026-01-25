import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";

function Settings() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profileId, setProfileId] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [themeColor, setThemeColor] = useState("#8b5cf6"); 

  const [userRole, setUserRole] = useState("");
  const [certLogoUrl, setCertLogoUrl] = useState("");
  const [uploadingCert, setUploadingCert] = useState(false);
  const [selectedCertFile, setSelectedCertFile] = useState<File | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', themeColor);
  }, [themeColor]);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate("/");
        setProfileId(user.id);

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, theme_color, role")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          setFullName(profile.full_name || "");
          setAvatarUrl(profile.avatar_url || "");
          setUserRole(profile.role || "");
          if (profile.theme_color) setThemeColor(profile.theme_color);

          if (profile.role === 'admin') {
            const { data: setRes } = await supabase
              .from("platform_settings")
              .select("value")
              .eq("key", "certificate_logo")
              .maybeSingle();
            if (setRes) setCertLogoUrl(setRes.value);
          }
        }
      } catch (error: any) {
        console.error("Erro ao carregar:", error.message);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [navigate]);

  async function handleUploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0 || !profileId) return;
      const file = event.target.files[0];
      const fileName = `${profileId}-${Math.random()}.${file.name.split('.').pop()}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(publicUrl);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", profileId);
      alert("Foto de perfil atualizada!");
    } catch (error: any) {
      alert("Erro no upload: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  function handleSelectCertLogo(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedCertFile(file);
      setCertLogoUrl(URL.createObjectURL(file)); 
    }
  }

  async function handleSaveCertLogo() {
    if (!selectedCertFile) return alert("Selecione um arquivo primeiro!");

    try {
      setUploadingCert(true);
      const fileName = `cert-logo-${Date.now()}.${selectedCertFile.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, selectedCertFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from("platform_settings")
        .upsert({ key: "certificate_logo", value: publicUrl }, { onConflict: 'key' });

      if (dbError) throw dbError;

      setSelectedCertFile(null); 
      alert("Logo do certificado salva com sucesso!");
    } catch (error: any) {
      alert("Erro ao salvar: " + error.message);
    } finally {
      setUploadingCert(false);
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, theme_color: themeColor }).eq("id", profileId);
    if (error) alert(error.message);
    else alert("Perfil atualizado com sucesso!");
    setLoading(false);
  };

  if (loading && !profileId) {
    return (
      <div className="dashboard-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#020617' }}>
        <div style={{ color: '#8b5cf6', fontFamily: 'Sora', fontWeight: 800 }}>Carregando configurações...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#020617', fontFamily: "'Sora', sans-serif" }}>
      <style>{`
        :root { --primary-color: ${themeColor}; }
        
        .dashboard-content { 
            flex: 1; 
            padding: 40px; 
            margin-left: 260px; 
            width: 100%; 
            transition: 0.3s; 
            box-sizing: border-box;
        }

        .settings-grid { display: flex; flex-wrap: wrap; gap: 30px; align-items: flex-start; width: 100%; }
        
        .admin-card-local { 
          background: #09090b; border-radius: 16px; padding: 40px; 
          flex: 1; min-width: 320px; max-width: 550px; 
          border: 1px solid rgba(139, 92, 246, 0.1); box-shadow: 0 20px 50px rgba(0,0,0,0.6); 
        }

        .local-field { margin-bottom: 24px; display: flex; flex-direction: column; gap: 10px; }
        .local-field label { color: #e5e7eb; font-size: 1rem; font-weight: 600; }
        
        .local-input-wrapper { position: relative; display: flex; align-items: center; width: 100%; }
        .local-icon { position: absolute; left: 18px; font-size: 1.2rem; filter: opacity(0.8); }
        
        .local-input-wrapper input {
          width: 100%; background-color: #020617 !important; color: white !important;
          border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 12px; padding: 14px 14px 14px 52px; 
          font-size: 1rem; outline: none; transition: all 0.3s ease; font-family: 'Sora', sans-serif;
        }

        .local-primary-button { 
          width: 100%; padding: 16px; margin-top: 15px; border-radius: 999px; border: none; 
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); 
          color: #fff; font-weight: 800; cursor: pointer; transition: all 0.3s ease; 
          font-size: 1rem; font-family: 'Sora', sans-serif; box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
        }

        .local-secondary-button {
          width: 100%; padding: 14px; margin-top: 10px; border-radius: 999px; border: 1px solid #f59e0b;
          background: rgba(245, 158, 11, 0.1); color: #f59e0b; font-weight: 800; cursor: pointer; transition: 0.3s;
          font-size: 0.9rem;
        }

        .avatar-preview-container { display: flex; flex-direction: column; align-items: center; gap: 20px; margin-bottom: 35px; }
        .avatar-big { width: 140px; height: 140px; border-radius: 50%; object-fit: cover; border: 4px solid var(--primary-color); box-shadow: 0 0 30px rgba(139, 92, 246, 0.3); }
        .color-input { height: 55px; width: 100%; background: #020617; border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 12px; cursor: pointer; padding: 6px; transition: 0.3s; }
        
        @media (max-width: 1024px) {
          .dashboard-content { 
             margin-left: 0; 
             padding: 80px 20px 120px 20px; /* Padding superior para afastar do topo e inferior para não cobrir botões */
          }
          .dashboard-header { text-align: center; }
          .dashboard-header h1 { font-size: 1.8rem !important; }
          .dashboard-header p { font-size: 0.9rem !important; }
          
          .admin-card-local { 
             min-width: 100%; 
             padding: 25px; 
             box-sizing: border-box;
          }
          .avatar-big { width: 110px; height: 110px; }
        }
      `}</style>

      <Sidebar/>

      <main className="dashboard-content">
        <header className="dashboard-header" style={{ marginBottom: '40px' }}>
          <div className="header-info">
            <h1 style={{ color: '#fff', fontSize: '2.2rem', fontWeight: 800 }}>Configurações</h1>
            <p style={{ color: '#9ca3af', fontSize: '1.1rem', marginTop: '5px' }}>
              Personalize seu perfil na plataforma <strong style={{ color: '#8b5cf6' }}>KA Tech</strong>.
            </p>
          </div>
        </header>

        <div className="settings-grid">
          {/* CARD DE PERFIL */}
          <div className="admin-card-local">
            <form onSubmit={handleSaveProfile}>
              <div className="avatar-preview-container">
                {avatarUrl ? 
                    <img src={avatarUrl} alt="Avatar" className="avatar-big" /> : 
                    <div className="avatar-big" style={{ background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', color: '#fff' }}>
                        {fullName.charAt(0).toUpperCase()}
                    </div>
                }
                <div className="local-field" style={{ width: '100%' }}>
                  <label style={{ textAlign: 'center', display: 'block', fontSize: '0.9rem', color: '#9ca3af' }}>Alterar Foto de Perfil</label>
                  <div className="local-input-wrapper">
                    <span className="local-icon">📷</span>
                    <input type="file" accept="image/*" onChange={handleUploadAvatar} style={{ paddingLeft: '50px', paddingTop: '12px' }} title="Escolher arquivo" />
                  </div>
                </div>
              </div>

              <div className="local-field">
                <label>Seu Nome</label>
                <div className="local-input-wrapper">
                  <span className="local-icon">👤</span>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Seu nome completo" />
                </div>
              </div>

              <div className="local-field">
                <label>Cor do Tema</label>
                <input type="color" className="color-input" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} />
              </div>

              <button className="local-primary-button" type="submit" disabled={loading || uploading}>
                {loading ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
              </button>
            </form>
          </div>

          {/* CARD DE ADMIN (BRANDING) */}
          {userRole === 'admin' && (
            <div className="admin-card-local" style={{ borderColor: '#f59e0b' }}>
              <h2 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 800, marginBottom: '20px' }}>🎖️ Branding do Certificado</h2>
              <div className="local-field">
                <label style={{color: '#fff'}}>Logo Oficial dos Certificados (PNG)</label>
                
                {certLogoUrl && (
                  <div style={{ background: '#fff', padding: '15px', borderRadius: '12px', marginBottom: '15px', textAlign: 'center', border: selectedCertFile ? '2px dashed #f59e0b' : 'none' }}>
                     <img src={certLogoUrl} alt="Cert Logo" style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }} />
                     {selectedCertFile && <p style={{ color: '#f59e0b', fontSize: '0.7rem', marginTop: '5px', fontWeight: 700 }}>PREVIEW DA NOVA LOGO</p>}
                  </div>
                )}

                <div className="local-input-wrapper">
                  <span className="local-icon" style={{left: '18px'}}>🖼️</span>
                  <input type="file" accept="image/png, image/jpeg" onChange={handleSelectCertLogo} style={{ paddingLeft: '50px', paddingTop: '12px' }} />
                </div>
                
                <button 
                  className="local-secondary-button" 
                  onClick={handleSaveCertLogo} 
                  disabled={uploadingCert || !selectedCertFile}
                >
                  {uploadingCert ? "SALVANDO..." : "💾 SALVAR NOVA LOGO"}
                </button>

                <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '15px', lineHeight: '1.4' }}>
                    * Esta logo aparecerá no topo de todos os PDFs gerados para os alunos. Recomenda-se fundo transparente.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Settings;