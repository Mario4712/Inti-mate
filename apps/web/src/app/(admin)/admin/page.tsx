"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckSquare, FileText, Loader2, Users, Wallet, TrendingUp } from "lucide-react";
import api from "@/lib/api";

interface DashboardData {
  users: { total: number; creators: number; consumers: number };
  activeSubscriptions: number;
  pendingKyc: number;
  pendingWithdrawals: number;
  pendingContent: number;
  pendingReports: number;
  revenueLastMonth: { brl: string };
}

function StatCard({ label, value, icon: Icon, color, href }: {
  label: string; value: number | string; icon: any; color: string; href?: string;
}) {
  const content = (
    <div className={`rounded-xl border bg-gray-900 p-5 transition-colors ${href ? "hover:border-gray-600 cursor-pointer" : ""} border-gray-800`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
  if (href) return <a href={href}>{content}</a>;
  return content;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/admin/dashboard")
      .then((r) => setData(r.data))
      .catch(() => setError("Erro ao carregar dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-red-400">{error || "Sem dados"}</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard Admin</h1>
        <p className="mt-1 text-gray-400">Visão geral da plataforma</p>
      </div>

      {/* Alertas de ação pendente */}
      {(data.pendingKyc > 0 || data.pendingWithdrawals > 0 || data.pendingContent > 0) && (
        <div className="rounded-xl border border-yellow-800/40 bg-yellow-900/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-yellow-400" />
            <p className="text-sm font-semibold text-yellow-400">Ações pendentes</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            {data.pendingKyc > 0 && (
              <a href="/admin/kyc" className="text-yellow-300 hover:underline">
                {data.pendingKyc} KYC pendente{data.pendingKyc > 1 ? "s" : ""}
              </a>
            )}
            {data.pendingWithdrawals > 0 && (
              <a href="/admin/withdrawals" className="text-yellow-300 hover:underline">
                {data.pendingWithdrawals} saque{data.pendingWithdrawals > 1 ? "s" : ""} pendente{data.pendingWithdrawals > 1 ? "s" : ""}
              </a>
            )}
            {data.pendingContent > 0 && (
              <a href="/admin/content" className="text-yellow-300 hover:underline">
                {data.pendingContent} conteúdo{data.pendingContent > 1 ? "s" : ""} em revisão
              </a>
            )}
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total de usuários"  value={data.users.total}        icon={Users}       color="bg-blue-600"   href="/admin/users" />
        <StatCard label="Criadores"          value={data.users.creators}     icon={Users}       color="bg-purple-600" href="/admin/users?role=CREATOR" />
        <StatCard label="Assinaturas ativas" value={data.activeSubscriptions} icon={TrendingUp} color="bg-green-600" />
        <StatCard label="Receita (30 dias)"  value={`R$ ${data.revenueLastMonth.brl}`} icon={TrendingUp} color="bg-emerald-600" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="KYC pendentes"     value={data.pendingKyc}         icon={CheckSquare} color="bg-yellow-600"  href="/admin/kyc" />
        <StatCard label="Saques pendentes"  value={data.pendingWithdrawals} icon={Wallet}      color="bg-orange-600" href="/admin/withdrawals" />
        <StatCard label="Conteúdo em fila"  value={data.pendingContent}     icon={FileText}    color="bg-indigo-600" href="/admin/content" />
        <StatCard label="Denúncias abertas" value={data.pendingReports}     icon={AlertTriangle} color="bg-red-600"  href="/admin/reports" />
      </div>
    </div>
  );
}
