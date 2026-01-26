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

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

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
    if (!selectedCertFile) return;
    try {
      setUploadingCert(true);
      const fileName = `cert-logo-${Date.now()}.${selectedCertFile.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, selectedCertFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await supabase.from("platform_settings").upsert({ key: "certificate_logo", value: publicUrl }, { onConflict: 'key' });
      setSelectedCertFile(null); 
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
    await supabase.from("profiles").update({ full_name: fullName, theme_color: themeColor }).eq("id", profileId);
    setLoading(false);
  };

  return (
    <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#020617', fontFamily: "'Sora', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; } /* GARANTE QUE NADA EXTRAPOLE O PADDING */
        
        :root { --primary-color: ${themeColor}; }
        
        .dashboard-content { 
            flex: 1; padding: 40px; margin-left: 260px; width: 100%; transition: 0.3s; 
            max-width: 100vw; overflow-x: hidden;
        }

        .settings-grid { display: flex; flex-wrap: wrap; gap: 30px; align-items: flex-start; width: 100%; }
        
        .admin-card-local { 
          background: #09090b; border-radius: 16px; padding: 30px; 
          flex: 1; min-width: 320px; max-width: 550px; 
          border: 1px solid rgba(139, 92, 246, 0.1); box-shadow: 0 20px 50px rgba(0,0,0,0.6);
        }

        .local-field { margin-bottom: 24px; display: flex; flex-direction: column; gap: 10px; width: 100%; }
        .local-field label { color: #e5e7eb; font-size: 0.9rem; font-weight: 600; }
        
        .local-input-wrapper { position: relative; width: 100%; overflow: hidden; }

        .local-icon { 
            position: absolute; left: 18px; top: 50%; transform: translateY(-50%);
            font-size: 1.1rem; filter: opacity(0.8); pointer-events: none; z-index: 2;
        }
        
        .local-input-wrapper input {
          width: 100%; background-color: #020617 !important; color: white !important;
          border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 12px; padding: 12px 12px 12px 48px; 
          font-size: 0.9rem; outline: none; transition: 0.3s;
        }

        /* AJUSTE PARA O CAMPO DE ARQUIVO NÃO VAZAR */
        .local-input-wrapper input[type="file"] {
          padding: 12px 12px 12px 48px;
          cursor: pointer;
          font-size: 0.8rem;
        }

        .local-primary-button, .local-secondary-button { 
          width: 100%; padding: 14px; margin-top: 10px; border-radius: 999px; border: none; 
          color: #fff; font-weight: 800; cursor: pointer; transition: 0.3s; font-size: 0.95rem;
        }

        .local-primary-button { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3); }
        
        .local-secondary-button {
          background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); 
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
        }

        .avatar-frame {
            width: 140px; height: 140px; border-radius: 50%; border: 4px solid var(--primary-color);
            box-shadow: 0 0 30px rgba(139, 92, 246, 0.3); overflow: hidden; 
            display: flex; justify-content: center; align-items: center; background: #111;
        }
        .avatar-big { width: 100%; height: 100%; object-fit: cover; }

        .btn-logout-mobile { display: none; }

        @media (max-width: 1024px) {
          .dashboard-content { margin-left: 0; padding: 100px 15px 150px 15px !important; }
          .dashboard-header { display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 35px !important; }
          .admin-card-local { min-width: 100% !important; max-width: 100% !important; padding: 20px; }
          .avatar-frame { width: 110px; height: 110px; }
          .btn-logout-mobile {
             display: block; width: 100%; margin-top: 40px; padding: 15px;
             background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444;
             color: #ef4444; border-radius: 12px; font-weight: 800; cursor: pointer;
          }
        }
      `}</style>

      <Sidebar/>

      <main className="dashboard-content">
        <header className="dashboard-header">
          <h1 style={{ color: '#fff', fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>Configurações</h1>
          <p style={{ color: '#9ca3af', marginTop: '5px' }}>Personalize seu perfil na <strong style={{ color: '#8b5cf6' }}>KA Tech</strong>.</p>
        </header>

        <div className="settings-grid">
          <div className="admin-card-local">
            <form onSubmit={handleSaveProfile}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '30px' }}>
                <div className="avatar-frame">
                    {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="avatar-big" /> : <div style={{ fontSize: '2.5rem', color: '#fff', fontWeight: 800 }}>{fullName.charAt(0).toUpperCase()}</div>}
                </div>
                <div className="local-field" style={{ marginTop: '15px' }}>
                  <label style={{ textAlign: 'center', color: '#9ca3af' }}>Foto de Perfil</label>
                  <div className="local-input-wrapper">
                    <span className="local-icon">📷</span>
                    <input type="file" accept="image/*" onChange={handleUploadAvatar} />
                  </div>
                </div>
              </div>

              <div className="local-field">
                <label>Nome Completo</label>
                <div className="local-input-wrapper">
                  <span className="local-icon">👤</span>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
              </div>

              <div className="local-field">
                <label>Cor do Tema</label>
                <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} style={{ height: '50px', background: '#020617', border: '1px solid #333', borderRadius: '10px', padding: '5px', width: '100%' }} />
              </div>

              <button className="local-primary-button" type="submit" disabled={loading || uploading}>
                {loading ? "SALVANDO..." : "SALVAR PERFIL"}
              </button>
            </form>
          </div>

          {userRole === 'admin' && (
            <div className="admin-card-local" style={{ borderColor: '#f59e0b' }}>
              <h2 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 800, marginBottom: '20px' }}>🎖️ Branding Certificado</h2>
              <div className="local-field">
                {certLogoUrl && (
                  <div style={{ background: '#fff', padding: '10px', borderRadius: '10px', marginBottom: '15px', textAlign: 'center' }}>
                     <img src={certLogoUrl} alt="Cert Logo" style={{ maxHeight: '60px', maxWidth: '100%', objectFit: 'contain' }} />
                  </div>
                )}
                <div className="local-input-wrapper">
                  <span className="local-icon">🖼️</span>
                  <input type="file" accept="image/png, image/jpeg" onChange={handleSelectCertLogo} />
                </div>
                <button className="local-secondary-button" onClick={handleSaveCertLogo} disabled={uploadingCert || !selectedCertFile}>
                  {uploadingCert ? "SALVANDO..." : "💾 SALVAR NOVA LOGO"}
                </button>
              </div>
            </div>
          )}

          <button className="btn-logout-mobile" onClick={handleLogout}>🚪 ENCERRAR SESSÃO</button>
        </div>
      </main>
    </div>
  );
}

export default Settings;