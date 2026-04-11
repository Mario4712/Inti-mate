"use client";

import { useEffect, useState } from "react";
import { Check, Edit2, Loader2, Plus, Trash2, X } from "lucide-react";
import api from "@/lib/api";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  isActive: boolean;
}

const EMPTY_FORM = { name: "", description: "", monthlyPrice: "" };

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadPlans() {
    setLoading(true);
    try {
      // Get my own creator ID from /users/me then fetch plans
      const meRes = await api.get("/users/me");
      const creatorId = meRes.data?.id;
      if (!creatorId) return;
      const res = await api.get(`/subscriptions/plans/creator/${creatorId}`);
      setPlans(Array.isArray(res.data) ? res.data.map((p: Plan) => ({
        ...p,
        monthlyPrice: Number(p.monthlyPrice),
      })) : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPlans(); }, []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEdit(plan: Plan) {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      description: plan.description ?? "",
      monthlyPrice: String(plan.monthlyPrice),
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(form.monthlyPrice);
    if (!form.name.trim()) { setError("Nome é obrigatório"); return; }
    if (isNaN(price) || price < 5) { setError("Preço mínimo: R$ 5,00"); return; }

    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        monthlyPrice: price,
      };
      if (editingId) {
        await api.patch(`/subscriptions/plans/${editingId}`, payload);
        setSuccess("Plano atualizado!");
      } else {
        await api.post("/subscriptions/plans", payload);
        setSuccess("Plano criado!");
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadPlans();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Erro ao salvar plano");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(planId: string) {
    if (!confirm("Desativar este plano? Assinantes ativos serão cancelados.")) return;
    try {
      await api.delete(`/subscriptions/plans/${planId}`);
      await loadPlans();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Erro ao desativar plano");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Planos de Assinatura</h1>
          <p className="mt-1 text-gray-400">Crie e gerencie seus planos (máximo 3)</p>
        </div>
        {!showForm && plans.length < 3 && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition-colors"
          >
            <Plus size={16} /> Novo plano
          </button>
        )}
      </div>

      {success && !showForm && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-900/30 border border-green-700/40 px-4 py-3 text-sm text-green-400">
          <Check size={15} /> {success}
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mt-6 rounded-xl border border-gray-700 bg-gray-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">
              {editingId ? "Editar plano" : "Novo plano"}
            </h2>
            <button type="button" onClick={cancelForm} className="text-gray-500 hover:text-gray-300">
              <X size={18} />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">Nome do plano *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Plano Básico"
                maxLength={60}
                className="w-full rounded-lg bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-400">Preço mensal (R$) *</label>
              <input
                type="number"
                value={form.monthlyPrice}
                onChange={(e) => setForm((f) => ({ ...f, monthlyPrice: e.target.value }))}
                placeholder="29.90"
                min="5"
                step="0.01"
                className="w-full rounded-lg bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-400">Descrição</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="O que o assinante recebe neste plano..."
              rows={3}
              maxLength={300}
              className="w-full rounded-lg bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500 resize-none"
            />
            <p className="mt-1 text-right text-xs text-gray-600">{form.description.length}/300</p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {editingId ? "Salvar alterações" : "Criar plano"}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="rounded-xl border border-gray-700 px-5 py-2.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Plans list */}
      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-purple-500" />
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 py-16 text-center">
            <p className="text-gray-400">Você ainda não tem planos de assinatura.</p>
            <p className="mt-1 text-sm text-gray-600">Crie um plano para começar a receber assinantes.</p>
            <button
              onClick={openCreate}
              className="mt-4 flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition-colors mx-auto"
            >
              <Plus size={16} /> Criar primeiro plano
            </button>
          </div>
        ) : (
          plans.map((plan) => (
            <div key={plan.id} className="flex items-start justify-between rounded-xl border border-gray-800 bg-gray-900 p-5">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">{plan.name}</h3>
                </div>
                {plan.description && (
                  <p className="mt-1 text-sm text-gray-400">{plan.description}</p>
                )}
                <p className="mt-2 text-xl font-bold text-purple-400">
                  R$ {Number(plan.monthlyPrice).toFixed(2)}
                  <span className="text-sm font-normal text-gray-500">/mês</span>
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => openEdit(plan)}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:border-purple-600 hover:text-purple-400 transition-colors"
                >
                  <Edit2 size={13} /> Editar
                </button>
                <button
                  onClick={() => handleDeactivate(plan.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:border-red-700 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={13} /> Desativar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
