"use client";

import { useEffect, useState } from "react";
import { Users, DollarSign, Image as ImageIcon, Eye } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import api from "@/lib/api";

interface DashboardStats {
  revenue: { last30Days: number; growthPct: number | null };
  subscribers: { active: number; newThisMonth: number };
  contentCount: number;
  viewsLast30Days: number;
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    body: string;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/analytics/dashboard").catch(() => ({ data: null })),
      api.get("/notifications?limit=5").catch(() => ({ data: { items: [] } })),
    ])
      .then(([analyticsRes, notifRes]) => {
        const a = analyticsRes.data;
        setStats({
          revenue: a?.revenue ?? { last30Days: 0, growthPct: null },
          subscribers: a?.subscribers ?? { active: 0, newThisMonth: 0 },
          contentCount: a?.contentCount ?? 0,
          viewsLast30Days: a?.viewsLast30Days ?? 0,
          recentActivity: notifRes.data?.items ?? [],
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      label: "Assinantes Ativos",
      value: stats ? String(stats.subscribers.active) : "...",
      sub: stats?.subscribers.newThisMonth ? `+${stats.subscribers.newThisMonth} este mes` : undefined,
      icon: Users,
      color: "text-purple-400",
    },
    {
      label: "Receita (30d)",
      value: stats ? `R$ ${(stats.revenue.last30Days ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "...",
      sub: stats?.revenue.growthPct != null ? `${stats.revenue.growthPct >= 0 ? "+" : ""}${stats.revenue.growthPct}% vs anterior` : undefined,
      icon: DollarSign,
      color: "text-green-400",
    },
    {
      label: "Conteudos",
      value: stats ? String(stats.contentCount) : "...",
      icon: ImageIcon,
      color: "text-blue-400",
    },
    {
      label: "Views (30d)",
      value: stats ? stats.viewsLast30Days.toLocaleString("pt-BR") : "...",
      icon: Eye,
      color: "text-amber-400",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white sm:text-3xl">
        Ola, {user?.profile?.artisticName ?? user?.username ?? "Criador"}
      </h1>
      <p className="mt-1 text-gray-400">Bem-vindo ao seu painel de controle</p>

      {/* Stat cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">{label}</p>
              <Icon size={18} className={color} />
            </div>
            <p className={`mt-2 text-2xl font-bold ${color}`}>
              {loading ? (
                <span className="inline-block h-7 w-20 animate-pulse rounded bg-gray-800" />
              ) : (
                value
              )}
            </p>
            {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Activity */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white">Atividade Recente</h2>
          {loading ? (
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg bg-gray-800/50 p-3">
                  <div className="h-8 w-8 rounded-full bg-gray-700 animate-pulse" />
                  <div className="flex-1">
                    <div className="h-3 w-32 rounded bg-gray-700 animate-pulse" />
                    <div className="mt-1.5 h-2.5 w-20 rounded bg-gray-800 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : stats?.recentActivity.length ? (
            <div className="mt-4 space-y-3">
              {stats.recentActivity.map((item) => (
                <div key={item.id} className="flex items-start gap-3 rounded-lg bg-gray-800/50 p-3">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-purple-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500 truncate">{item.body}</p>
                    <p className="mt-1 text-xs text-gray-600">
                      {new Date(item.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-600">Nenhuma atividade recente</p>
          )}
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white">Acoes Rapidas</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { label: "Upload de Conteudo", href: "/dashboard/content", color: "bg-purple-600 hover:bg-purple-500" },
              { label: "Iniciar Live", href: "/dashboard/lives", color: "bg-red-600 hover:bg-red-500" },
              { label: "Ver Analytics", href: "/dashboard/analytics", color: "bg-blue-600 hover:bg-blue-500" },
              { label: "Assinantes", href: "/dashboard/subscribers", color: "bg-green-600 hover:bg-green-500" },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                className={`rounded-lg px-4 py-3 text-center text-sm font-medium text-white transition ${action.color}`}
              >
                {action.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
