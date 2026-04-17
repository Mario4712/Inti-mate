"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Calendar, Users, Loader2, Clock } from "lucide-react";
import api from "@/lib/api";

interface Tournament {
  id: string;
  name: string;
  description: string;
  metric: string;
  prizePoolBRL: number;
  startsAt: string;
  endsAt: string;
  status: string;
  _count?: { participants: number };
}

const STATUS_TABS = [
  { value: "",         label: "Todos" },
  { value: "ACTIVE",   label: "Ativos" },
  { value: "UPCOMING", label: "Em breve" },
  { value: "ENDED",    label: "Encerrados" },
];

const METRIC_LABELS: Record<string, string> = {
  NEW_SUBSCRIBERS:  "Novos assinantes",
  REVENUE:          "Receita",
  CONTENT_VIEWS:    "Visualizações",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:   "bg-green-500/20 text-green-400",
  UPCOMING: "bg-blue-500/20 text-blue-400",
  ENDED:    "bg-gray-500/20 text-gray-400",
  PAID:     "bg-purple-500/20 text-purple-400",
};

export default function TournamentsPage() {
  const [items, setItems] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get(`/tournaments${statusTab ? `?status=${statusTab}` : ""}`)
      .then((r) => setItems(r.data ?? []))
      .finally(() => setLoading(false));
  }, [statusTab]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Torneios</h1>
        <p className="mt-1 text-sm text-gray-400">Compita com outros criadores e ganhe prêmios em dinheiro.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-800 bg-gray-900 p-1 w-fit">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setStatusTab(t.value)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              statusTab === t.value ? "bg-purple-700 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
          <Trophy size={36} className="mb-3 opacity-30" />
          <p>Nenhum torneio encontrado.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <Link
              key={t.id}
              href={`/tournaments/${t.id}`}
              className="group flex flex-col rounded-2xl border border-gray-800 bg-gray-900 p-5 transition-colors hover:border-purple-700/50 hover:bg-gray-900/80"
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[t.status] ?? "bg-gray-700 text-gray-400"}`}>
                  {t.status}
                </span>
                <span className="text-xs text-gray-500">{METRIC_LABELS[t.metric] ?? t.metric}</span>
              </div>

              <h2 className="font-semibold text-white group-hover:text-purple-300 transition-colors mb-1 line-clamp-2">
                {t.name}
              </h2>
              <p className="text-xs text-gray-500 line-clamp-2 mb-4">{t.description}</p>

              <div className="mt-auto space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Trophy size={12} className="text-yellow-400" />
                  <span className="font-semibold text-yellow-400">
                    R$ {t.prizePoolBRL.toLocaleString("pt-BR")}
                  </span>
                  <span>em prêmios</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar size={12} />
                  {new Date(t.startsAt).toLocaleDateString("pt-BR")} → {new Date(t.endsAt).toLocaleDateString("pt-BR")}
                </div>
                {t._count && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Users size={12} />
                    {t._count.participants} participante{t._count.participants !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
