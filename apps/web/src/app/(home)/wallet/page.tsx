"use client";

import { useEffect, useState } from "react";
import { ArrowDownCircle, Loader2, Wallet, Clock, CheckCircle, XCircle } from "lucide-react";
import api from "@/lib/api";

interface Balance {
  available: number;
  pending: number;
  total: number;
}

interface Withdrawal {
  id: string;
  amount: number;
  pixKey: string;
  pixKeyType: string;
  status: "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED";
  requestedAt: string;
  paidAt: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  PROCESSING: "Processando",
  PAID: "Pago",
  FAILED: "Falhou",
  CANCELLED: "Cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "text-yellow-400",
  PROCESSING: "text-blue-400",
  PAID: "text-green-400",
  FAILED: "text-red-400",
  CANCELLED: "text-gray-500",
};

export default function WalletPage() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [history, setHistory] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  // Form state
  const [amount, setAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState<"CPF" | "EMAIL" | "PHONE" | "EVP">("EMAIL");

  function loadData() {
    setLoading(true);
    Promise.all([
      api.get("/withdrawals/balance").catch(() => ({ data: null })),
      api.get("/withdrawals/history?page=1&limit=20").catch(() => ({ data: { items: [] } })),
    ]).then(([balRes, histRes]) => {
      setBalance(balRes.data);
      setHistory(Array.isArray(histRes.data) ? histRes.data : histRes.data?.items ?? []);
    }).finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, []);

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents < 2000) {
      setFormError("Valor mínimo para saque: R$ 20,00");
      return;
    }
    if (!pixKey.trim()) {
      setFormError("Informe a chave PIX.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/withdrawals", { amount: cents, pixKey: pixKey.trim(), pixKeyType });
      setFormSuccess(true);
      setShowForm(false);
      setAmount("");
      setPixKey("");
      setTimeout(() => { setFormSuccess(false); loadData(); }, 2000);
    } catch (e: any) {
      setFormError(e?.response?.data?.message ?? "Erro ao solicitar saque.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!balance) {
    return (
      <div className="py-16 text-center text-gray-500">
        <p>Esta área é exclusiva para criadores.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Carteira</h1>

      {/* Balance cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="mb-1 flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wide">
            <Wallet size={13} /> Disponível
          </div>
          <p className="text-2xl font-bold text-green-400">
            R$ {(balance.available / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="mb-1 flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wide">
            <Clock size={13} /> Pendente
          </div>
          <p className="text-2xl font-bold text-yellow-400">
            R$ {(balance.pending / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="mb-1 flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wide">
            <ArrowDownCircle size={13} /> Total recebido
          </div>
          <p className="text-2xl font-bold text-white">
            R$ {(balance.total / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Withdraw button */}
      {formSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-green-900/30 px-4 py-3 text-sm text-green-400">
          <CheckCircle size={16} /> Solicitação de saque registrada com sucesso!
        </div>
      )}

      <button
        onClick={() => setShowForm((v) => !v)}
        className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 font-semibold text-white hover:bg-purple-700 transition-colors"
      >
        <ArrowDownCircle size={18} />
        Solicitar saque
      </button>

      {showForm && (
        <form onSubmit={handleWithdraw} className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Novo saque</h2>

          <div>
            <label className="mb-1.5 block text-sm text-gray-400">Valor (R$)</label>
            <input
              type="number"
              min="20"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="20,00"
              className="w-full rounded-lg bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-gray-600">Mínimo: R$ 20,00 · Prazo: D+14</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-400">Tipo de chave PIX</label>
            <select
              value={pixKeyType}
              onChange={(e) => setPixKeyType(e.target.value as any)}
              className="w-full rounded-lg bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="EMAIL">E-mail</option>
              <option value="CPF">CPF</option>
              <option value="PHONE">Telefone</option>
              <option value="EVP">Chave aleatória</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-400">Chave PIX</label>
            <input
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder={pixKeyType === "EMAIL" ? "seu@email.com" : pixKeyType === "CPF" ? "000.000.000-00" : ""}
              className="w-full rounded-lg bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {formError && (
            <p className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{formError}</p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : "Confirmar saque"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-gray-700 px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-800"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* History */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Histórico de saques</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-600">Nenhum saque solicitado ainda.</p>
        ) : (
          <div className="space-y-2">
            {history.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">
                    R$ {(w.amount / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {w.pixKeyType} · {w.pixKey}
                  </p>
                  <p className="text-xs text-gray-600">
                    {new Date(w.requestedAt).toLocaleDateString("pt-BR")}
                    {w.paidAt && ` → pago em ${new Date(w.paidAt).toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
                <span className={`flex items-center gap-1 text-xs font-medium ${STATUS_COLOR[w.status]}`}>
                  {w.status === "PAID" && <CheckCircle size={13} />}
                  {w.status === "FAILED" || w.status === "CANCELLED" ? <XCircle size={13} /> : null}
                  {w.status === "PENDING" || w.status === "PROCESSING" ? <Clock size={13} /> : null}
                  {STATUS_LABEL[w.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
