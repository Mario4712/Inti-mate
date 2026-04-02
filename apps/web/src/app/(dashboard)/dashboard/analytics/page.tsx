"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Users, DollarSign, Eye, BarChart3 } from "lucide-react";
import api from "@/lib/api";

interface DashboardData {
  revenue: {
    last30Days: number;
    prev30Days: number;
    growthPct: number | null;
    byType: Array<{ type: string; amount: number }>;
  };
  subscribers: {
    active: number;
    newThisMonth: number;
    cancelledThisMonth: number;
    totalEver: number;
  };
  churn: {
    churnRate: number;
    avgSubscriptionDays: number | null;
  };
  topContent: Array<{
    id: string;
    title: string;
    type: string;
    viewCount: number;
  }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/analytics/dashboard")
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-purple-500" />
      </div>
    );
  }

  const revenue = data?.revenue;
  const subs = data?.subscribers;
  const churn = data?.churn;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Analytics</h1>
      <p className="mt-1 text-gray-400">Acompanhe o desempenho do seu conteúdo</p>

      {/* Stat cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Receita (30d)"
          value={`R$ ${(revenue?.last30Days ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          growth={revenue?.growthPct}
          icon={DollarSign}
          color="text-green-400"
        />
        <StatCard
          label="Assinantes Ativos"
          value={String(subs?.active ?? 0)}
          subtext={`+${subs?.newThisMonth ?? 0} este mês`}
          icon={Users}
          color="text-purple-400"
        />
        <StatCard
          label="Taxa de Churn"
          value={`${churn?.churnRate ?? 0}%`}
          subtext={churn?.avgSubscriptionDays ? `Média: ${churn.avgSubscriptionDays} dias` : undefined}
          icon={BarChart3}
          color="text-amber-400"
        />
        <StatCard
          label="Total Assinantes"
          value={String(subs?.totalEver ?? 0)}
          subtext={`${subs?.cancelledThisMonth ?? 0} cancelamentos este mês`}
          icon={Eye}
          color="text-blue-400"
        />
      </div>

      {/* Revenue by type */}
      {revenue?.byType && revenue.byType.length > 0 && (
        <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white">Receita por Tipo</h2>
          <div className="mt-4 space-y-3">
            {revenue.byType.map((t) => (
              <div key={t.type} className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{formatType(t.type)}</span>
                <span className="font-medium text-white">
                  R$ {(t.amount / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top content */}
      {data?.topContent && data.topContent.length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white">Conteúdo Mais Visto</h2>
          <div className="mt-4 space-y-3">
            {data.topContent.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-800 text-xs font-bold text-gray-400">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-200">{c.title || "Sem título"}</p>
                  <p className="text-xs text-gray-500">{c.type}</p>
                </div>
                <span className="text-sm text-gray-400">{c.viewCount.toLocaleString("pt-BR")} views</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  growth,
  subtext,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  growth?: number | null;
  subtext?: string;
  icon: any;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{label}</p>
        <Icon size={18} className={color} />
      </div>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
      {growth != null && (
        <div className="mt-1 flex items-center gap-1 text-xs">
          {growth >= 0 ? (
            <TrendingUp size={12} className="text-green-400" />
          ) : (
            <TrendingDown size={12} className="text-red-400" />
          )}
          <span className={growth >= 0 ? "text-green-400" : "text-red-400"}>
            {growth >= 0 ? "+" : ""}
            {growth}% vs mês anterior
          </span>
        </div>
      )}
      {subtext && <p className="mt-1 text-xs text-gray-500">{subtext}</p>}
    </div>
  );
}

function formatType(type: string) {
  const map: Record<string, string> = {
    SUBSCRIPTION: "Assinaturas",
    PPV: "Pay-per-view",
    TIP: "Tips",
    SUPERCHAT: "Super Chat",
    DIGITAL_ITEM: "Itens Digitais",
  };
  return map[type] ?? type;
}
