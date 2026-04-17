"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Calendar, ExternalLink, Loader2, Medal } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

interface Tournament {
  id: string;
  name: string;
  metric: string;
  prizePoolBRL: number;
  startsAt: string;
  endsAt: string;
  status: string;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  score: number;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:   "bg-green-500/20 text-green-400",
  UPCOMING: "bg-blue-500/20 text-blue-400",
  ENDED:    "bg-gray-500/20 text-gray-400",
  PAID:     "bg-purple-500/20 text-purple-400",
};

const METRIC_LABELS: Record<string, string> = {
  NEW_SUBSCRIBERS: "Novos assinantes",
  REVENUE:         "Receita",
  CONTENT_VIEWS:   "Visualizações",
};

export default function CreatorTournamentsPage() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [myPositions, setMyPositions] = useState<Record<string, LeaderboardEntry | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/tournaments").then(async (r) => {
      const all: Tournament[] = r.data ?? [];
      setTournaments(all);

      const positions: Record<string, LeaderboardEntry | null> = {};
      await Promise.all(
        all.map(async (t) => {
          try {
            const lb = await api.get(`/tournaments/${t.id}/leaderboard`);
            const mine = (lb.data ?? []).find((e: LeaderboardEntry) => e.userId === user?.id);
            positions[t.id] = mine ?? null;
          } catch {
            positions[t.id] = null;
          }
        }),
      );
      setMyPositions(positions);
    }).finally(() => setLoading(false));
  }, [user?.id]);

  const enrolled = tournaments.filter((t) => myPositions[t.id] !== undefined && myPositions[t.id] !== null);
  const notEnrolled = tournaments.filter((t) => !myPositions[t.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Meus Torneios</h1>
        <p className="mt-1 text-sm text-gray-400">Acompanhe sua posição nos torneios que você participa.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        </div>
      ) : (
        <>
          {/* Enrolled */}
          {enrolled.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Participando</h2>
              {enrolled.map((t) => {
                const pos = myPositions[t.id];
                return (
                  <div key={t.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4 flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-lg shrink-0 ${
                      pos?.rank === 1 ? "bg-yellow-400/20" : pos?.rank === 2 ? "bg-gray-300/20" : pos?.rank === 3 ? "bg-amber-600/20" : "bg-gray-700"
                    }`}>
                      {pos?.rank === 1 ? "🥇" : pos?.rank === 2 ? "🥈" : pos?.rank === 3 ? "🥉" : <Medal size={18} className="text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{t.name}</p>
                      <p className="text-xs text-gray-500">
                        {METRIC_LABELS[t.metric]} · até {new Date(t.endsAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {pos && (
                        <>
                          <p className="text-sm font-bold text-white">#{pos.rank}</p>
                          <p className="text-xs text-gray-500">{pos.score.toLocaleString("pt-BR")} pts</p>
                        </>
                      )}
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[t.status] ?? ""}`}>
                        {t.status}
                      </span>
                    </div>
                    <Link href={`/tournaments/${t.id}`} className="shrink-0 p-2 text-gray-500 hover:text-gray-300">
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          {/* Available */}
          {notEnrolled.filter((t) => t.status !== "ENDED" && t.status !== "PAID").length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Disponíveis para participar</h2>
              {notEnrolled
                .filter((t) => t.status !== "ENDED" && t.status !== "PAID")
                .map((t) => (
                  <div key={t.id} className="rounded-xl border border-dashed border-gray-700 bg-gray-900/50 p-4 flex items-center gap-4">
                    <Trophy size={20} className="text-yellow-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-300 truncate">{t.name}</p>
                      <p className="text-xs text-gray-500">
                        R$ {t.prizePoolBRL.toLocaleString("pt-BR")} · {new Date(t.startsAt).toLocaleDateString("pt-BR")} → {new Date(t.endsAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Link
                      href={`/tournaments/${t.id}`}
                      className="rounded-lg bg-purple-600/20 px-3 py-1.5 text-xs font-semibold text-purple-400 hover:bg-purple-600/30 shrink-0"
                    >
                      Ver torneio
                    </Link>
                  </div>
                ))}
            </div>
          )}

          {enrolled.length === 0 && notEnrolled.filter((t) => t.status !== "ENDED").length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Trophy size={36} className="mb-3 opacity-30" />
              <p className="mb-4">Nenhum torneio ativo no momento.</p>
              <Link href="/tournaments" className="text-sm text-purple-400 hover:text-purple-300">
                Ver todos os torneios →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
