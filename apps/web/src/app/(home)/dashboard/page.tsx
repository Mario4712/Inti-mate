"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, Loader2, Plus, Trash2, Eye, Lock, Globe, Users,
  Edit2, Check, X, BarChart2, Wallet, BookOpen,
} from "lucide-react";
import api from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────

interface MediaItem {
  id: string;
  title: string | null;
  type: "PHOTO" | "VIDEO";
  status: string;
  visibility: "PUBLIC" | "SUBSCRIBERS" | "PPV";
  viewCount: number;
  thumbnailUrl: string | null;
  createdAt: string;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  isActive: boolean;
}

interface Balance {
  available: number;
  pending: number;
  total: number;
}

type Tab = "overview" | "content" | "plans";

const VISIBILITY_ICONS = {
  PUBLIC: Globe,
  SUBSCRIBERS: Lock,
  PPV: Wallet,
};

const VISIBILITY_LABELS = {
  PUBLIC: "Público",
  SUBSCRIBERS: "Assinantes",
  PPV: "PPV",
};

// ─── Main Component ─────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");

  // Overview
  const [balance, setBalance] = useState<Balance | null>(null);
  const [mediaCount, setMediaCount] = useState(0);

  // Content
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadVisibility, setUploadVisibility] = useState<"PUBLIC" | "SUBSCRIBERS" | "PPV">("SUBSCRIBERS");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Plans
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [newPlan, setNewPlan] = useState({ name: "", description: "", monthlyPrice: "" });
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);
  const [planError, setPlanError] = useState("");

  useEffect(() => {
    // Load balance + my content count for overview
    api.get("/withdrawals/balance").then((r) => setBalance(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === "content") loadMedia();
    if (tab === "plans") loadPlans();
  }, [tab]);

  function loadMedia(page = 1) {
    setMediaLoading(true);
    api.get("/users/me").then((r) => {
      const creatorId = r.data?.id;
      if (!creatorId) return;
      api.get(`/content/creator/${creatorId}?page=${page}&limit=20`).then((res) => {
        setMedia(res.data?.items ?? []);
        setMediaCount(res.data?.total ?? 0);
      }).finally(() => setMediaLoading(false));
    }).catch(() => setMediaLoading(false));
  }

  function loadPlans() {
    setPlansLoading(true);
    api.get("/users/me").then((r) => {
      const creatorId = r.data?.id;
      if (!creatorId) return;
      api.get(`/subscriptions/plans/creator/${creatorId}`).then((res) => {
        setPlans(Array.isArray(res.data) ? res.data : []);
      }).finally(() => setPlansLoading(false));
    }).catch(() => setPlansLoading(false));
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      await api.post(`/content/upload?visibility=${uploadVisibility}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      loadMedia();
    } catch (err: any) {
      alert(err?.response?.data?.message ?? "Erro ao fazer upload.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este conteúdo?")) return;
    await api.delete(`/content/${id}`).catch(() => {});
    setMedia((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    setPlanError("");
    const price = parseFloat(newPlan.monthlyPrice);
    if (!newPlan.name.trim() || isNaN(price) || price <= 0) {
      setPlanError("Preencha nome e preço válido.");
      return;
    }
    setPlanSaving(true);
    try {
      await api.post("/subscriptions/plans", {
        name: newPlan.name.trim(),
        description: newPlan.description.trim(),
        monthlyPrice: price,
      });
      setNewPlan({ name: "", description: "", monthlyPrice: "" });
      setShowNewPlanForm(false);
      loadPlans();
    } catch (e: any) {
      setPlanError(e?.response?.data?.message ?? "Erro ao criar plano.");
    } finally {
      setPlanSaving(false);
    }
  }

  async function handleDeactivatePlan(id: string) {
    if (!confirm("Desativar este plano?")) return;
    await api.delete(`/subscriptions/plans/${id}`).catch(() => {});
    setPlans((prev) => prev.map((p) => p.id === id ? { ...p, isActive: false } : p));
  }

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "overview", label: "Visão geral", icon: BarChart2 },
    { id: "content", label: "Conteúdo", icon: BookOpen },
    { id: "plans", label: "Planos", icon: Users },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-900 p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === id ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <p className="text-xs uppercase tracking-wide text-gray-500">Saldo disponível</p>
            <p className="mt-2 text-2xl font-bold text-green-400">
              {balance
                ? `R$ ${(balance.available / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                : "—"}
            </p>
            <button
              onClick={() => router.push("/wallet")}
              className="mt-3 text-xs text-purple-400 hover:text-purple-300"
            >
              Ver carteira →
            </button>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <p className="text-xs uppercase tracking-wide text-gray-500">Conteúdos publicados</p>
            <p className="mt-2 text-2xl font-bold text-white">{mediaCount}</p>
            <button
              onClick={() => setTab("content")}
              className="mt-3 text-xs text-purple-400 hover:text-purple-300"
            >
              Gerenciar →
            </button>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <p className="text-xs uppercase tracking-wide text-gray-500">Planos ativos</p>
            <p className="mt-2 text-2xl font-bold text-white">{plans.filter((p) => p.isActive).length || "—"}</p>
            <button
              onClick={() => setTab("plans")}
              className="mt-3 text-xs text-purple-400 hover:text-purple-300"
            >
              Gerenciar →
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {tab === "content" && (
        <div className="space-y-4">
          {/* Upload area */}
          <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900 p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-sm font-medium text-gray-300">Fazer upload</p>
                <p className="text-xs text-gray-600">Foto ou vídeo — até 150 MB</p>
              </div>
              <div className="flex items-center gap-3 ml-auto flex-wrap">
                <select
                  value={uploadVisibility}
                  onChange={(e) => setUploadVisibility(e.target.value as any)}
                  className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-300 outline-none"
                >
                  <option value="PUBLIC">Público</option>
                  <option value="SUBSCRIBERS">Assinantes</option>
                  <option value="PPV">PPV</option>
                </select>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                  {uploading ? "Enviando..." : "Selecionar arquivo"}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleUpload}
              />
            </div>
          </div>

          {/* Media list */}
          {mediaLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            </div>
          ) : media.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-600">Nenhum conteúdo publicado ainda.</p>
          ) : (
            <div className="space-y-2">
              {media.map((item) => {
                const VIcon = VISIBILITY_ICONS[item.visibility];
                return (
                  <div key={item.id} className="flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
                    {/* Thumbnail */}
                    <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-800">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-600 text-xs">
                          {item.type === "VIDEO" ? "▶" : "📷"}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-white">{item.title ?? "(sem título)"}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <VIcon size={11} /> {VISIBILITY_LABELS[item.visibility]}
                        </span>
                        <span className="flex items-center gap-1"><Eye size={11} /> {item.viewCount}</span>
                        <span>{item.status}</span>
                        <span>{new Date(item.createdAt).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => router.push(`/content/${item.id}`)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-800 hover:text-gray-300"
                        title="Ver"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-800 hover:text-red-400"
                        title="Remover"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Plans */}
      {tab === "plans" && (
        <div className="space-y-4">
          <button
            onClick={() => setShowNewPlanForm((v) => !v)}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            <Plus size={15} /> Novo plano
          </button>

          {showNewPlanForm && (
            <form onSubmit={handleCreatePlan} className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Criar plano</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Nome</label>
                  <input
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    placeholder="Ex: Plano Premium"
                    className="w-full rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Preço mensal (R$)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={newPlan.monthlyPrice}
                    onChange={(e) => setNewPlan({ ...newPlan, monthlyPrice: e.target.value })}
                    placeholder="19,90"
                    className="w-full rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Descrição</label>
                <textarea
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  rows={2}
                  placeholder="O que está incluído neste plano..."
                  className="w-full rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                />
              </div>
              {planError && <p className="text-xs text-red-400">{planError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={planSaving}
                  className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {planSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Criar plano
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewPlanForm(false)}
                  className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {plansLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            </div>
          ) : plans.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-600">Nenhum plano criado ainda.</p>
          ) : (
            <div className="space-y-3">
              {plans.map((plan) => (
                <div key={plan.id} className={`rounded-xl border p-4 ${plan.isActive ? "border-gray-800 bg-gray-900" : "border-gray-800/50 bg-gray-900/50 opacity-60"}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{plan.name}</p>
                        {!plan.isActive && (
                          <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-400">Inativo</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-purple-400 font-bold">
                        R$ {plan.monthlyPrice.toFixed(2)}/mês
                      </p>
                      {plan.description && (
                        <p className="mt-1 text-xs text-gray-500">{plan.description}</p>
                      )}
                    </div>
                    {plan.isActive && (
                      <button
                        onClick={() => handleDeactivatePlan(plan.id)}
                        className="rounded-lg p-2 text-gray-600 hover:bg-gray-800 hover:text-red-400"
                        title="Desativar"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
