import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, Camera, LogOut, Mail, Moon, Palette, Save, Sun, User } from "lucide-react";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import SEO from "../components/SEO";
import { useUser } from "../components/UserContext";
import { useTheme } from "../components/ThemeContext";
import { Button, LoadingScreen, PageHeader } from "../components/ui";
import BrandUpload from "../components/admin/BrandUpload";
import "./Settings.css";

type Tab = "perfil" | "marca";

const AVATAR_MAX_MB = 3;

function Settings() {
  const navigate = useNavigate();
  const { refreshBranding, refreshProfile } = useUser();
  const { theme, setTheme } = useTheme();

  const [tab, setTab] = useState<Tab>("perfil");
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState("");
  const [fullName, setFullName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [themeColor, setThemeColor] = useState("#8b5cf6");
  const [userRole, setUserRole] = useState("");

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarDrag, setAvatarDrag] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);

  const [certLogoUrl, setCertLogoUrl] = useState("");
  const [sidebarLogoUrl, setSidebarLogoUrl] = useState("");

  const isAdmin = userRole === "admin";

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate("/");
        setProfileId(user.id);
        setEmail(user.email || "");

        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
        if (profile) {
          setFullName(profile.full_name || "");
          setSavedName(profile.full_name || "");
          setAvatarUrl(profile.avatar_url || "");
          setUserRole(profile.role || "");
          if (profile.theme_color) setThemeColor(profile.theme_color);

          if (profile.role === "admin") {
            const { data: settings } = await supabase.from("platform_settings").select("key, value");
            if (settings) {
              setCertLogoUrl(settings.find((s) => s.key === "certificate_logo")?.value || "");
              setSidebarLogoUrl(settings.find((s) => s.key === "sidebar_logo")?.value || "");
            }
          }
        }
      } catch (error: any) {
        console.error(error.message);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [navigate]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function uploadAvatar(file?: File | null) {
    if (!file || !profileId) return;
    if (!file.type.startsWith("image/")) return setNotice({ tone: "danger", text: "Escolha um arquivo de imagem." });
    if (file.size > AVATAR_MAX_MB * 1024 * 1024) return setNotice({ tone: "danger", text: `A foto passa de ${AVATAR_MAX_MB} MB.` });
    try {
      setUploadingAvatar(true);
      const fileName = `avatar-${profileId}-${Date.now()}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const { error: dbError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", profileId);
      if (dbError) throw dbError;
      setAvatarUrl(publicUrl);
      await refreshProfile();
      setNotice({ tone: "success", text: "Foto atualizada." });
    } catch (error: any) {
      setNotice({ tone: "danger", text: "Não foi possível trocar a foto: " + error.message });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return setNotice({ tone: "danger", text: "Informe seu nome." });
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName.trim(), theme_color: themeColor }).eq("id", profileId);
    setSavingProfile(false);
    if (error) return setNotice({ tone: "danger", text: "Não foi possível salvar: " + error.message });
    setSavedName(fullName.trim());
    await refreshProfile();
    setNotice({ tone: "success", text: "Perfil salvo." });
  }

  async function saveBranding(key: "sidebar_logo" | "certificate_logo", file: File) {
    const ext = file.name.split(".").pop() || "png";
    const fileName = `${key}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("brandings").upload(fileName, file, { contentType: file.type });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from("brandings").getPublicUrl(fileName);
    const { error: dbError } = await supabase.from("platform_settings").upsert({ key, value: publicUrl }, { onConflict: "key" });
    if (dbError) throw dbError;
    if (key === "sidebar_logo") { setSidebarLogoUrl(publicUrl); await refreshBranding(); }
    else setCertLogoUrl(publicUrl);
  }

  if (loading) return <LoadingScreen label="Carregando configurações..." />;

  const roleLabel = userRole === "admin" ? "Administrador" : userRole === "teacher" ? "Instrutor" : "Aluno";
  const nameChanged = fullName.trim() !== savedName;

  return (
    <div className="ui-shell">
      <SEO title="Configurações" />
      <Sidebar />
      <main className="ui-main">
        <div className="ui-main__inner st">
          <PageHeader
            title="Configurações"
            subtitle={isAdmin ? "Seu perfil e a identidade visual da plataforma." : "Seu perfil e suas preferências."}
          />

          {isAdmin && (
            <div className="ui-tabs st-tabs" role="tablist" aria-label="Seções de configuração">
              <button role="tab" className="ui-tab" aria-selected={tab === "perfil"} onClick={() => setTab("perfil")}><User size={15} /> Perfil pessoal</button>
              <button role="tab" className="ui-tab" aria-selected={tab === "marca"} onClick={() => setTab("marca")}><Palette size={15} /> Identidade e marca</button>
            </div>
          )}

          {notice && <div className={`ui-alert ui-alert--${notice.tone}`} role="status" style={{ marginBottom: 16 }}>{notice.text}</div>}

          {tab === "perfil" ? (
            <div className="st-grid">
              <section className="ui-card st-card">
                <h2 className="st-card__title">Perfil</h2>
                <form className="st-profile" onSubmit={saveProfile}>
                  <button
                    type="button"
                    className={`st-avatar ${avatarDrag ? "is-dragging" : ""}`}
                    onClick={() => avatarInput.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setAvatarDrag(true); }}
                    onDragLeave={() => setAvatarDrag(false)}
                    onDrop={(e) => { e.preventDefault(); setAvatarDrag(false); uploadAvatar(e.dataTransfer.files?.[0]); }}
                    disabled={uploadingAvatar}
                    aria-label="Trocar foto de perfil"
                  >
                    {avatarUrl ? <img src={avatarUrl} alt="" /> : <span className="st-avatar__initial">{(fullName || "?").charAt(0).toUpperCase()}</span>}
                    <span className="st-avatar__overlay">
                      {uploadingAvatar ? <span className="ui-spinner ui-spinner--sm" /> : <Camera size={20} />}
                      <small>{uploadingAvatar ? "Enviando..." : "Trocar foto"}</small>
                    </span>
                  </button>
                  <input ref={avatarInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { uploadAvatar(e.target.files?.[0]); e.target.value = ""; }} />
                  <p className="ui-hint st-avatar__hint">Clique ou arraste uma foto · PNG, JPG ou WebP até {AVATAR_MAX_MB} MB</p>

                  <div className="st-fields">
                    <div className="ui-field">
                      <label className="ui-label" htmlFor="st-name">Nome completo</label>
                      <input id="st-name" className="ui-input" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
                    </div>
                    <div className="ui-field">
                      <label className="ui-label" htmlFor="st-email">E-mail</label>
                      <div className="ui-input-group">
                        <Mail size={16} />
                        <input id="st-email" className="ui-input" value={email} readOnly aria-readonly="true" />
                      </div>
                      <span className="ui-hint">Para trocar o e-mail, fale com um administrador.</span>
                    </div>
                    <div className="st-role"><span className="ui-badge">{roleLabel}</span></div>
                  </div>

                  <div className="st-card__foot">
                    <Button type="submit" loading={savingProfile} disabled={!nameChanged} icon={<Save size={16} />}>Salvar perfil</Button>
                  </div>
                </form>
              </section>

              <div className="st-side">
                <section className="ui-card st-card">
                  <h2 className="st-card__title">Aparência</h2>
                  <p className="st-card__desc">Escolha o tema da plataforma neste dispositivo.</p>
                  <div className="st-theme" role="radiogroup" aria-label="Tema">
                    <button type="button" role="radio" aria-checked={theme === "light"} className="st-theme__opt st-theme__opt--light" onClick={() => setTheme("light")}>
                      <span className="st-theme__preview" aria-hidden="true"><span /><span /><span /></span>
                      <span className="st-theme__label"><Sun size={14} /> Claro</span>
                    </button>
                    <button type="button" role="radio" aria-checked={theme === "dark"} className="st-theme__opt st-theme__opt--dark" onClick={() => setTheme("dark")}>
                      <span className="st-theme__preview" aria-hidden="true"><span /><span /><span /></span>
                      <span className="st-theme__label"><Moon size={14} /> Escuro</span>
                    </button>
                  </div>
                </section>

                <section className="ui-card st-card">
                  <h2 className="st-card__title">Sessão</h2>
                  <p className="st-card__desc">Sair desta conta neste navegador.</p>
                  <Button variant="danger" onClick={handleLogout} icon={<LogOut size={16} />}>Sair da conta</Button>
                </section>
              </div>
            </div>
          ) : (
            <div className="st-grid st-grid--brand">
              <section className="ui-card st-card">
                <h2 className="st-card__title"><Award size={16} /> Logo do certificado</h2>
                <p className="st-card__desc">Aparece no topo dos certificados em PDF, sobre fundo branco.</p>
                <BrandUpload currentUrl={certLogoUrl} previewBackground="#ffffff" onSave={(f) => saveBranding("certificate_logo", f)} />
              </section>

              <section className="ui-card st-card">
                <h2 className="st-card__title"><Palette size={16} /> Logo da sidebar</h2>
                <p className="st-card__desc">Aparece no menu lateral para todos. Prefira fundo transparente.</p>
                <BrandUpload currentUrl={sidebarLogoUrl} previewBackground="var(--color-sidebar)" previewHeight={44} onSave={(f) => saveBranding("sidebar_logo", f)} />
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Settings;
