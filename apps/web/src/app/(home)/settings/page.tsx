"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Save, User, Shield, Trash2 } from "lucide-react";
import api from "@/lib/api";

interface Profile {
  id: string;
  username: string;
  email: string;
  artisticName: string;
  displayName: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  showLocation: boolean;
  isPublic: boolean;
  role: string;
  avatarUrl: string | null;
}

type Tab = "profile" | "account";

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Profile form state
  const [artisticName, setArtisticName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [showLocation, setShowLocation] = useState(false);
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    api.get("/users/me")
      .then((r) => {
        const p: Profile = r.data;
        setProfile(p);
        setArtisticName(p.artisticName ?? "");
        setDisplayName(p.displayName ?? "");
        setBio(p.bio ?? "");
        setCity(p.city ?? "");
        setState(p.state ?? "");
        setShowLocation(p.showLocation ?? false);
        setIsPublic(p.isPublic ?? true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.patch("/users/me", {
        artisticName: artisticName || undefined,
        displayName: displayName || undefined,
        bio: bio || undefined,
        city: city || undefined,
        state: state || undefined,
        showLocation,
        isPublic,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestDeletion() {
    if (!confirm("Tem certeza que deseja solicitar a exclusão da sua conta? Esta ação segue as regras de privacidade da LGPD.")) return;
    try {
      await api.post("/users/me/data-deletion");
      alert("Solicitação de exclusão registrada. Você receberá um e-mail de confirmação.");
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Erro ao solicitar exclusão.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Configurações</h1>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-900 p-1">
        {(["profile", "account"] as Tab[]).map((t) => {
          const labels = { profile: "Perfil", account: "Conta" };
          const icons = { profile: User, account: Shield };
          const Icon = icons[t];
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === t ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon size={15} />
              {labels[t]}
            </button>
          );
        })}
      </div>

      {tab === "profile" && (
        <form onSubmit={handleSaveProfile} className="space-y-5">
          {/* Avatar placeholder */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gray-800 text-2xl font-bold text-gray-400">
              {profile?.avatarUrl
                ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                : (artisticName || profile?.username || "U").charAt(0).toUpperCase()
              }
            </div>
            <p className="text-xs text-gray-500">Para atualizar a foto de perfil, use o painel do criador.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">Nome artístico</label>
              <input
                value={artisticName}
                onChange={(e) => setArtisticName(e.target.value)}
                className="w-full rounded-lg bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
                minLength={3}
                maxLength={50}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">Nome de exibição</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
                maxLength={80}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-400">Biografia</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full rounded-lg bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500 resize-none"
            />
            <p className="mt-1 text-right text-xs text-gray-600">{bio.length}/500</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">Cidade</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-lg bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
                maxLength={100}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">Estado (UF)</label>
              <input
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                className="w-full rounded-lg bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
                maxLength={2}
                placeholder="SP"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-800 bg-gray-900 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-200">Exibir localização</p>
                <p className="text-xs text-gray-500">Mostra cidade/estado no seu perfil público</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLocation((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${showLocation ? "bg-purple-600" : "bg-gray-700"}`}
              >
                <span className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${showLocation ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-200">Perfil público</p>
                <p className="text-xs text-gray-500">Permite que qualquer pessoa veja seu perfil</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPublic((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${isPublic ? "bg-purple-600" : "bg-gray-700"}`}
              >
                <span className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${isPublic ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : saved ? (
              <><Check size={18} /> Salvo!</>
            ) : (
              <><Save size={18} /> Salvar alterações</>
            )}
          </button>
        </form>
      )}

      {tab === "account" && (
        <div className="space-y-5">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Informações da conta</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">E-mail</span>
                <span className="text-gray-200">{profile?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Username</span>
                <span className="text-gray-200">@{profile?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tipo de conta</span>
                <span className="capitalize text-gray-200">{profile?.role?.toLowerCase()}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-5">
            <h2 className="mb-1 text-sm font-semibold text-red-400">Zona de perigo</h2>
            <p className="mb-4 text-xs text-gray-500">
              Ao solicitar exclusão da conta, seus dados serão removidos em conformidade com a LGPD dentro de 30 dias.
            </p>
            <button
              onClick={handleRequestDeletion}
              className="flex items-center gap-2 rounded-lg border border-red-800 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-900/30"
            >
              <Trash2 size={15} />
              Solicitar exclusão da conta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
