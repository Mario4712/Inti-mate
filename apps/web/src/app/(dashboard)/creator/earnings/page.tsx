"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, Clock, DollarSign, ArrowDownCircle } from "lucide-react";
import { withdrawalsApi, paymentsApi } from "@/lib/api";

interface Balance {
  available: number;
  pending: number;
  totalEarned: number;
  availableBrl: string;
  pendingBrl: string;
}

interface Transaction {
  id: string;
  type: string;
  status: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  description: string;
  createdAt: string;
}

export default function EarningsPage() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [pixKey, setPixKey] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [balanceRes, txRes] = await Promise.all([
          withdrawalsApi.getBalance(),
          paymentsApi.getTransactions(),
        ]);
        setBalance(balanceRes.data);
        setTransactions(txRes.data.items);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleWithdraw() {
    setWithdrawError("");
    setWithdrawSuccess("");
    if (!pixKey || !withdrawAmount) {
      setWithdrawError("Informe a chave PIX e o valor");
      return;
    }
    const amountCents = Math.round(parseFloat(withdrawAmount) * 100);
    if (amountCents < 2000) {
      setWithdrawError("Valor mínimo: R$ 20,00");
      return;
    }

    setWithdrawing(true);
    try {
      const { data } = await withdrawalsApi.request({
        amount: amountCents,
        pixKey,
        pixKeyType: "EMAIL",
      });
      setWithdrawSuccess(data.message);
      const balanceRes = await withdrawalsApi.getBalance();
      setBalance(balanceRes.data);
    } catch (err: any) {
      setWithdrawError(err?.response?.data?.message ?? "Erro ao solicitar saque");
    } finally {
      setWithdrawing(false);
    }
  }

  const typeLabel: Record<string, string> = {
    SUBSCRIPTION: "Assinatura",
    PPV: "PPV",
    TIP: "Gorjeta",
    WITHDRAWAL: "Saque",
    REFUND: "Reembolso",
  };

  const statusColor: Record<string, string> = {
    PAID: "text-green-400",
    PENDING: "text-yellow-400",
    FAILED: "text-red-400",
    REFUNDED: "text-gray-400",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-brand-400" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-white">Financeiro</h1>

      {/* Cards de saldo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Disponível para saque",
            value: `R$ ${balance?.availableBrl}`,
            icon: DollarSign,
            color: "text-green-400",
          },
          {
            label: "Em processamento",
            value: `R$ ${balance?.pendingBrl}`,
            icon: Clock,
            color: "text-yellow-400",
          },
          {
            label: "Total ganho",
            value: `R$ ${((balance?.totalEarned ?? 0) / 100).toFixed(2)}`,
            icon: TrendingUp,
            color: "text-brand-400",
          },
        ].map((card) => (
          <div key={card.label} className="card flex items-center gap-4">
            <div className={`${card.color} shrink-0`}>
              <card.icon size={28} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">{card.label}</p>
              <p className="text-xl font-bold text-white">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Solicitação de saque */}
      <div className="card space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <ArrowDownCircle size={20} className="text-brand-400" /> Solicitar saque via PIX
        </h2>
        <p className="text-sm text-gray-400">
          Prazo: <strong className="text-white">D+14</strong> (14 dias corridos). Mínimo: R$ 20,00.
          Taxa da plataforma (20%) já foi retida.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Valor (R$)</label>
            <input
              type="number"
              placeholder="0,00"
              min="20"
              step="0.01"
              className="input"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Chave PIX (e-mail)</label>
            <input
              type="email"
              placeholder="seu@email.com"
              className="input"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
            />
          </div>
        </div>

        {withdrawError && (
          <p className="text-sm text-red-400">{withdrawError}</p>
        )}
        {withdrawSuccess && (
          <p className="text-sm text-green-400">{withdrawSuccess}</p>
        )}

        <button
          className="btn-primary"
          onClick={handleWithdraw}
          disabled={withdrawing}
        >
          {withdrawing ? <><Loader2 size={14} className="animate-spin" /> Solicitando...</> : "Solicitar saque"}
        </button>
      </div>

      {/* Extrato */}
      <div className="card">
        <h2 className="text-lg font-bold text-white mb-4">Extrato</h2>
        <p className="text-xs text-gray-500 mb-4">
          Taxa da plataforma: <strong className="text-gray-300">20%</strong> retida em cada transação.
        </p>

        {transactions.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhuma transação ainda.</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0"
              >
                <div>
                  <p className="text-sm text-white font-medium">{tx.description}</p>
                  <p className="text-xs text-gray-500">
                    {typeLabel[tx.type] ?? tx.type} ·{" "}
                    {new Date(tx.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">
                    R$ {(tx.netAmount / 100).toFixed(2)}
                  </p>
                  <p className={`text-xs ${statusColor[tx.status] ?? "text-gray-400"}`}>
                    {tx.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
