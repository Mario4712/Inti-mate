"use client";

import { useAuth } from "@/contexts/auth-context";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-white sm:text-3xl">
        Olá, {user?.profile?.artisticName ?? user?.username ?? "Criador"}
      </h1>
      <p className="mt-1 text-gray-400">Bem-vindo ao seu painel de controle</p>

      {/* Stat cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Assinantes Ativos", value: "—", color: "text-purple-400" },
          { label: "Receita (30d)", value: "R$ —", color: "text-green-400" },
          { label: "Conteúdos", value: "—", color: "text-blue-400" },
          { label: "Views (30d)", value: "—", color: "text-amber-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <p className="text-sm text-gray-400">{label}</p>
            <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Placeholder sections */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white">Receita Recente</h2>
          <p className="mt-2 text-sm text-gray-500">
            Gráfico de evolução será implementado em breve.
          </p>
          <div className="mt-4 flex h-40 items-center justify-center rounded-lg border border-dashed border-gray-700 text-gray-600">
            Gráfico
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white">Atividade Recente</h2>
          <p className="mt-2 text-sm text-gray-500">
            Novos assinantes, mensagens, tips.
          </p>
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-gray-800/50 p-3">
                <div className="h-8 w-8 rounded-full bg-gray-700" />
                <div className="flex-1">
                  <div className="h-3 w-32 rounded bg-gray-700" />
                  <div className="mt-1.5 h-2.5 w-20 rounded bg-gray-800" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
