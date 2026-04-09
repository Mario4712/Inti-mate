"use client";

import { useEffect, useState } from "react";
import { Save, Eye, EyeOff, Shield, Bell, User } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

export default function SettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"profile" | "security" | "notifications">("profile");

  // Profile
  const [artisticName, setArtisticName] = useState("");
  const [bio, setBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  // Security
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");

  // Notifications
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [notifMsg, setNotifMsg] = useState("");

  useEffect(() => {
    if (user?.profile) {
      setArtisticName(user.profile.artisticName ?? "");
      setBio(user.profile.bio ?? "");
    }
  }, [user]);

  async function saveProfile() {
    setSavingProfile(true);
    setProfileMsg("");
    try {
      await api.patch("/profile/me", { artisticName: artisticName || undefined, bio: bio || undefined });
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
      await api.patch("/auth/change-password", { currentPassword, newPassword });
      setPwdMsg("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (e: any) {
      setPwdMsg(e?.response?.data?.message ?? "Erro ao alterar senha");
    } finally {
      setSavingPwd(false);
    }
  }

  async function saveNotifications() {
    setSavingNotif(true);
    setNotifMsg("");
    try {
      await api.patch("/notifications/preferences", { email: notifEmail, push: notifPush });
      setNotifMsg("Preferências salvas!");
    } catch (e: any) {
      setNotifMsg(e?.response?.data?.message ?? "Erro ao salvar preferências");
    } finally {
      setSavingNotif(false);
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
          </div>
        )}

        {/* Security tab */}
        {tab === "security" && (
          <div className="space-y-4 max-w-md">
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
