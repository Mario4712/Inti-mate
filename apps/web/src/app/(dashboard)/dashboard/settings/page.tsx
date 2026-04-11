"use client";

import { useEffect, useState } from "react";
import { Camera, Loader2, Save, Eye, EyeOff, Image as ImageIcon, Shield, Bell, User, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"profile" | "security" | "notifications">("profile");

  // Profile
  const [artisticName, setArtisticName] = useState("");
  const [bio, setBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Security
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdRequested, setPwdRequested] = useState(false);

  // Notifications
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [notifMsg, setNotifMsg] = useState("");

  useEffect(() => {
    api.get("/users/me").then((r) => {
      const p = r.data?.profile;
      if (p) {
        setArtisticName(p.artisticName ?? "");
        setBio(p.bio ?? "");
        if (p.avatarUrl) setAvatarPreview(p.avatarUrl);
        if (p.coverUrl) setCoverPreview(p.coverUrl);
      }
    }).catch(() => {
      if (user?.profile) {
        setArtisticName(user.profile.artisticName ?? "");
        setBio(user.profile.bio ?? "");
      }
    });
  }, []);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/users/me/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAvatarPreview(res.data.avatarUrl);
      setProfileMsg("Foto de perfil atualizada!");
    } catch (e: any) {
      setProfileMsg(e?.response?.data?.message ?? "Erro ao atualizar foto");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverPreview(URL.createObjectURL(file));
    setUploadingCover(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/users/me/cover", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCoverPreview(res.data.coverUrl);
      setProfileMsg("Banner atualizado!");
    } catch (e: any) {
      setProfileMsg(e?.response?.data?.message ?? "Erro ao atualizar banner");
    } finally {
      setUploadingCover(false);
    }
  }

  async function saveProfile() {
    setSavingProfile(true);
    setProfileMsg("");
    try {
      await api.patch("/users/me", {
        ...(artisticName && { artisticName }),
        bio: bio,
      });
      setProfileMsg("Perfil atualizado com sucesso!");
    } catch (e: any) {
      setProfileMsg(e?.response?.data?.message ?? "Erro ao salvar perfil");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    if (!currentPassword || !newPassword) return;
    setSavingPwd(true);
    setPwdMsg("");
    try {
      const res = await api.post("/auth/change-password/request", { currentPassword });
      setPwdMsg(res.data?.message ?? "E-mail de confirmação enviado!");
      setPwdRequested(true);
      setCurrentPassword("");
      setNewPassword("");
    } catch (e: any) {
      setPwdMsg(e?.response?.data?.message ?? "Erro ao solicitar alteração de senha");
    } finally {
      setSavingPwd(false);
    }
  }

  async function saveNotifications() {
    setSavingNotif(true);
    setNotifMsg("");
    try {
      await api.patch("/notifications/preferences", { emailEnabled: notifEmail, pushEnabled: notifPush });
      setNotifMsg("Preferências salvas!");
    } catch (e: any) {
      setNotifMsg(e?.response?.data?.message ?? "Erro ao salvar preferências");
    } finally {
      setSavingNotif(false);
    }
  }

  async function requestAccountDeletion() {
    if (!confirm("Tem certeza que deseja solicitar a exclusão da sua conta? Seus dados serão removidos em até 30 dias (LGPD).")) return;
    try {
      await api.post("/users/me/data-deletion");
      alert("Solicitação registrada. Você receberá um e-mail de confirmação.");
      await logout();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Erro ao solicitar exclusão.");
    }
  }

  const tabs = [
    { id: "profile" as const, label: "Perfil", icon: User },
    { id: "security" as const, label: "Segurança", icon: Shield },
    { id: "notifications" as const, label: "Notificações", icon: Bell },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Configurações</h1>
      <p className="mt-1 text-gray-400">Gerencie sua conta e preferências</p>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 rounded-xl border border-gray-800 bg-gray-900 p-1 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === id ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-6">
        {/* Profile tab */}
        {tab === "profile" && (
          <div className="space-y-4 max-w-md">
            {/* Cover / Banner */}
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">Banner do perfil</label>
              <div className="relative h-24 w-full overflow-hidden rounded-xl bg-gray-800">
                {coverPreview && (
                  <img src={coverPreview} alt="Banner" className="h-full w-full object-cover" />
                )}
                <label className="absolute inset-0 flex cursor-pointer items-center justify-center gap-2 bg-black/40 text-sm text-white opacity-0 hover:opacity-100 transition-opacity">
                  {uploadingCover ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <><ImageIcon size={18} /> Alterar banner</>
                  )}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleCoverChange} />
                </label>
              </div>
            </div>

            {/* Avatar */}
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">Foto de perfil</label>
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gray-800">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-gray-500">
                      {artisticName?.charAt(0)?.toUpperCase() ?? "?"}
                    </span>
                  )}
                  <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
                    {uploadingAvatar ? (
                      <Loader2 size={14} className="animate-spin text-white" />
                    ) : (
                      <Camera size={14} className="text-white" />
                    )}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
                  </label>
                </div>
                <p className="text-xs text-gray-500">Clique na foto para alterar. JPEG, PNG ou WebP, máx. 5 MB.</p>
              </div>
            </div>

            <div>
              <label className="label">E-mail</label>
              <input type="email" className="input opacity-60 cursor-not-allowed" value={user?.email ?? ""} disabled />
            </div>
            <div>
              <label className="label">Nome artístico</label>
              <input
                type="text"
                className="input"
                placeholder="Seu nome público"
                value={artisticName}
                onChange={(e) => setArtisticName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Bio</label>
              <textarea
                className="input min-h-[96px] resize-y"
                placeholder="Fale um pouco sobre você..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
            {profileMsg && (
              <p className={`text-sm ${profileMsg.includes("sucesso") ? "text-green-400" : "text-red-400"}`}>
                {profileMsg}
              </p>
            )}
            <button onClick={saveProfile} disabled={savingProfile} className="btn-primary flex items-center gap-2">
              <Save size={15} />
              {savingProfile ? "Salvando..." : "Salvar perfil"}
            </button>

            <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4 mt-4">
              <p className="text-sm font-semibold text-red-400 mb-1">Zona de perigo</p>
              <p className="text-xs text-gray-500 mb-3">Seus dados serão removidos em até 30 dias (LGPD).</p>
              <button
                onClick={requestAccountDeletion}
                className="flex items-center gap-2 rounded-lg border border-red-800 px-4 py-2 text-sm text-red-400 hover:bg-red-900/30 transition-colors"
              >
                <Trash2 size={14} />
                Excluir minha conta
              </button>
            </div>
          </div>
        )}

        {/* Security tab */}
        {tab === "security" && (
          <div className="space-y-4 max-w-md">
            {pwdRequested && (
              <div className="rounded-lg bg-blue-900/30 border border-blue-700 px-4 py-3 text-sm text-blue-300">
                Verifique seu e-mail e clique no link para confirmar a nova senha.
              </div>
            )}
            <div>
              <label className="label">Senha atual</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Nova senha</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  className="input pr-10"
                  placeholder="Mín. 8 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {pwdMsg && (
              <p className={`text-sm ${pwdMsg.includes("sucesso") ? "text-green-400" : "text-red-400"}`}>
                {pwdMsg}
              </p>
            )}
            <button
              onClick={savePassword}
              disabled={savingPwd || !currentPassword || !newPassword}
              className="btn-primary flex items-center gap-2"
            >
              <Save size={15} />
              {savingPwd ? "Salvando..." : "Alterar senha"}
            </button>
          </div>
        )}

        {/* Notifications tab */}
        {tab === "notifications" && (
          <div className="space-y-4 max-w-md">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-600 bg-gray-800 accent-purple-500"
                checked={notifEmail}
                onChange={(e) => setNotifEmail(e.target.checked)}
              />
              <span className="text-sm text-gray-300">Notificações por e-mail</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-600 bg-gray-800 accent-purple-500"
                checked={notifPush}
                onChange={(e) => setNotifPush(e.target.checked)}
              />
              <span className="text-sm text-gray-300">Notificações push (browser)</span>
            </label>
            {notifMsg && (
              <p className={`text-sm ${notifMsg.includes("salvas") ? "text-green-400" : "text-red-400"}`}>
                {notifMsg}
              </p>
            )}
            <button onClick={saveNotifications} disabled={savingNotif} className="btn-primary flex items-center gap-2">
              <Save size={15} />
              {savingNotif ? "Salvando..." : "Salvar preferências"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
