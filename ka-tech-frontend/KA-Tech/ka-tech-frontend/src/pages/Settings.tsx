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

  const [sidebarLogoUrl, setSidebarLogoUrl] = useState("");
  const [uploadingSidebar, setUploadingSidebar] = useState(false);
  const [selectedSidebarFile, setSelectedSidebarFile] = useState<File | null>(null);

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

        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
        if (profile) {
          setFullName(profile.full_name || "");
          setAvatarUrl(profile.avatar_url || "");
          setUserRole(profile.role || "");
          if (profile.theme_color) setThemeColor(profile.theme_color);

          if (profile.role === 'admin') {
            const { data: settings } = await supabase.from("platform_settings").select("key, value");
            if (settings) {
              const cert = settings.find(s => s.key === "certificate_logo");
              const side = settings.find(s => s.key === "sidebar_logo");
              if (cert) setCertLogoUrl(cert.value);
              if (side) setSidebarLogoUrl(side.value);
            }
          }
        }
      } catch (error: any) { console.error(error.message); } finally { setLoading(false); }
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
      const fileName = `avatar-${profileId}-${Date.now()}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setAvatarUrl(publicUrl);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", profileId);
    } catch (error: any) { alert(error.message); } finally { setUploading(false); }
  }

  async function handleSaveBranding(key: 'sidebar_logo' | 'certificate_logo', file: File | null, setLoad: Function) {
    if (!file) return;
    try {
      setLoad(true);
      const fileName = `${key}-${Date.now()}`;
      const { error: uploadError } = await supabase.storage.from('brandings').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('brandings').getPublicUrl(fileName);
      await supabase.from("platform_settings").upsert({ key, value: publicUrl }, { onConflict: 'key' });
      alert("Marca atualizada com sucesso!");
    } catch (error: any) { alert("Erro ao salvar: " + error.message); } finally { setLoad(false); }
  }

  return (
    <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#020617', fontFamily: "'Sora', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        :root { --primary-color: ${themeColor}; }
        .dashboard-content { flex: 1; padding: 40px; margin-left: 260px; width: 100%; transition: 0.3s; max-width: 100vw; overflow-x: hidden; }
        .dashboard-header { display: flex; flex-direction: column; gap: 8px; margin-bottom: 35px; }
        .settings-grid { display: flex; flex-wrap: wrap; gap: 30px; align-items: flex-start; width: 100%; }
        .admin-card-local { background: #09090b; border-radius: 16px; padding: 30px; flex: 1; min-width: 320px; max-width: 550px; border: 1px solid rgba(139, 92, 246, 0.1); box-shadow: 0 20px 50px rgba(0,0,0,0.6); }
        .local-field { margin-bottom: 24px; display: flex; flex-direction: column; gap: 10px; width: 100%; }
        .local-field label { color: #e5e7eb; font-size: 0.9rem; font-weight: 600; }
        .local-input-wrapper input { width: 100%; background-color: #020617 !important; color: white !important; border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 12px; padding: 12px; font-size: 0.9rem; outline: none; }
        .local-primary-button, .local-secondary-button { width: 100%; padding: 14px; margin-top: 10px; border-radius: 999px; border: none; color: #fff; font-weight: 800; cursor: pointer; transition: 0.2s; }
        .local-primary-button:disabled, .local-secondary-button:disabled { opacity: 0.5; cursor: not-allowed; }
        .local-primary-button { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); }
        .local-secondary-button { background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); }
        .avatar-frame { width: 140px; height: 140px; border-radius: 50%; border: 4px solid var(--primary-color); overflow: hidden; display: flex; justify-content: center; align-items: center; background: #111; margin: 0 auto; }
        .btn-logout-mobile { display: none; }
        @media (max-width: 1024px) {
          .dashboard-content { margin-left: 0; padding: 40px 20px 140px 20px !important; }
          .dashboard-header { align-items: center; text-align: center; }
          .dashboard-header h1 { font-size: 1.8rem; margin: 0; }
          .dashboard-header p { font-size: 0.85rem; margin: 0; }
          .admin-card-local { min-width: 100% !important; max-width: 100% !important; padding: 25px 20px; }
          .btn-logout-mobile { display: block; width: 100%; margin-top: 25px; padding: 16px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; border-radius: 14px; font-weight: 800; cursor: pointer; }
        }
      `}</style>

      <Sidebar/>

      <main className="dashboard-content">
        <header className="dashboard-header">
          <h1 style={{ color: '#fff' }}>Configurações</h1>
          <p style={{ color: '#9ca3af' }}>Olá, {loading ? "..." : fullName}. Personalize seu perfil.</p>
        </header>

        <div className="settings-grid">
          <div className="admin-card-local">
            <form onSubmit={e => { e.preventDefault(); supabase.from("profiles").update({ full_name: fullName, theme_color: themeColor }).eq("id", profileId).then(() => alert("Perfil salvo!")); }}>
              <div className="avatar-frame">
                {avatarUrl ? (
                  <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Foto de Perfil" />
                ) : (
                  <div style={{ fontSize: '2.5rem', color: '#fff' }}>{fullName.charAt(0)}</div>
                )}
              </div>
              <div className="local-field" style={{ marginTop: '20px' }}>
                <label>Foto de Perfil</label>
                <input type="file" onChange={handleUploadAvatar} disabled={uploading} />
              </div>
              <div className="local-field">
                <label>Nome Completo</label>
                <div className="local-input-wrapper">
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} disabled={loading} />
                </div>
              </div>
              <button className="local-primary-button" type="submit" disabled={loading || uploading}>
                {loading ? "CARREGANDO..." : "SALVAR PERFIL"}
              </button>
            </form>
          </div>

          {userRole === 'admin' && (
            <>
              <div className="admin-card-local" style={{ borderColor: '#f59e0b' }}>
                <h2 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '20px' }}>🎖️ Branding Certificado</h2>
                {certLogoUrl && (
                  <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', marginBottom: '15px', textAlign: 'center' }}>
                    <img src={certLogoUrl} style={{ maxHeight: '50px' }} alt="Prévia da Logo do Certificado" />
                  </div>
                )}
                <input type="file" onChange={e => setSelectedCertFile(e.target.files?.[0] || null)} />
                <button className="local-secondary-button" onClick={() => handleSaveBranding('certificate_logo', selectedCertFile, setUploadingCert)} disabled={uploadingCert || !selectedCertFile}>
                  {uploadingCert ? "ENVIANDO..." : "SALVAR LOGO CERTIFICADO"}
                </button>
              </div>

              <div className="admin-card-local" style={{ borderColor: '#3b82f6' }}>
                <h2 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '20px' }}>🎨 Logo da Sidebar</h2>
                {sidebarLogoUrl && (
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', marginBottom: '15px', textAlign: 'center' }}>
                    <img src={sidebarLogoUrl} style={{ maxHeight: '40px' }} alt="Prévia da Logo da Sidebar" />
                  </div>
                )}
                <input type="file" onChange={e => setSelectedSidebarFile(e.target.files?.[0] || null)} />
                <button className="local-primary-button" style={{ background: '#3b82f6' }} onClick={() => handleSaveBranding('sidebar_logo', selectedSidebarFile, setUploadingSidebar)} disabled={uploadingSidebar || !selectedSidebarFile}>
                   {uploadingSidebar ? "ATUALIZANDO..." : "ATUALIZAR SIDEBAR"}
                </button>
              </div>
            </>
          )}

          <button className="btn-logout-mobile" onClick={handleLogout}>🚪 ENCERRAR SESSÃO</button>
        </div>
      </main>
    </div>
  );
}

export default Settings;