"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Trophy, Users, Calendar, Medal, Loader2, CheckCircle, XCircle } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

interface Tournament {
  id: string;
  name: string;
  description: string;
  metric: string;
  prizePoolBRL: number;
  startsAt: string;
  endsAt: string;
  status: string;
  rulesJson: Record<string, unknown>;
  prizeDistrib?: { rank: number; pct: number }[];
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  artisticName?: string;
  score: number;
}

const METRIC_LABELS: Record<string, string> = {
  NEW_SUBSCRIBERS: "Novos assinantes",
  REVENUE:         "Receita gerada",
  CONTENT_VIEWS:   "Visualizações",
};

export default function TournamentDetailPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      api.get(`/tournaments/${tournamentId}`),
      api.get(`/tournaments/${tournamentId}/leaderboard`),
    ]).then(([t, lb]) => {
      setTournament(t.data);
      setLeaderboard(lb.data ?? []);
      const isin = (lb.data ?? []).some((e: LeaderboardEntry) => e.userId === user?.id);
      setEnrolled(isin);
    }).finally(() => setLoading(false));
  }, [tournamentId, user?.id]);

  async function handleEnter() {
    setEnrolling(true);
    setMessage(null);
    try {
      await api.post(`/tournaments/${tournamentId}/enter`);
      setEnrolled(true);
      setMessage({ type: "success", text: "Inscrição realizada! Boa sorte!" });
      const lb = await api.get(`/tournaments/${tournamentId}/leaderboard`);
      setLeaderboard(lb.data ?? []);
    } catch (e: any) {
      setMessage({ type: "error", text: e?.response?.data?.message ?? "Erro ao se inscrever." });
    } finally {
      setEnrolling(false);
    }
  }

  async function handleLeave() {
    setEnrolling(true);
    setMessage(null);
    try {
      await api.delete(`/tournaments/${tournamentId}/enter`);
      setEnrolled(false);
      setMessage({ type: "success", text: "Inscrição cancelada." });
    } catch (e: any) {
      setMessage({ type: "error", text: e?.response?.data?.message ?? "Erro ao cancelar inscrição." });
    } finally {
      setEnrolling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!tournament) return <p className="text-gray-500 py-20 text-center">Torneio não encontrado.</p>;

  const isActive = tournament.status === "ACTIVE";
  const isUpcoming = tournament.status === "UPCOMING";
  const canEnter = (isActive || isUpcoming) && user?.role === "CREATOR";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={20} className="text-yellow-400" />
              <span className="text-xs text-gray-500">{METRIC_LABELS[tournament.metric] ?? tournament.metric}</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{tournament.name}</h1>
            <p className="text-gray-400 text-sm">{tournament.description}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-bold text-yellow-400">
              R$ {tournament.prizePoolBRL.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-gray-500 mt-1">em prêmios</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1.5">
            <Calendar size={14} />
            {new Date(tournament.startsAt).toLocaleDateString("pt-BR")} → {new Date(tournament.endsAt).toLocaleDateString("pt-BR")}
          </span>
          <span className="flex items-center gap-1.5">
            <Users size={14} />
            {leaderboard.length} participante{leaderboard.length !== 1 ? "s" : ""}
          </span>
        </div>

        {message && (
          <div className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            message.type === "success" ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
          }`}>
            {message.type === "success" ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {message.text}
          </div>
        )}

        {canEnter && (
          <div className="mt-5">
            {enrolled ? (
              <button
                onClick={handleLeave}
                disabled={enrolling}
                className="flex items-center gap-2 rounded-xl border border-red-700/50 px-5 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-900/20 disabled:opacity-50"
              >
                {enrolling ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Cancelar inscrição
              </button>
            ) : (
              <button
                onClick={handleEnter}
                disabled={enrolling}
                className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {enrolling ? <Loader2 size={14} className="animate-spin" /> : <Trophy size={14} />}
                Participar do torneio
              </button>
            )}
          </div>
        )}
      </div>

      {/* Prize distribution */}
      {tournament.prizeDistrib && tournament.prizeDistrib.length > 0 && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Medal size={16} className="text-yellow-400" /> Distribuição de prêmios
          </h2>
          <div className="space-y-2">
            {tournament.prizeDistrib.map((entry) => (
              <div key={entry.rank} className="flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`} {entry.rank}º lugar
                </span>
                <span className="text-white font-medium">
                  {entry.pct}% · R$ {((tournament.prizePoolBRL * entry.pct) / 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Trophy size={16} className="text-purple-400" /> Leaderboard
        </h2>
        {leaderboard.length === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm">Nenhum participante ainda.</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry) => (
              <div
                key={entry.userId}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm ${
                  entry.userId === user?.id ? "bg-purple-700/20 border border-purple-700/40" : "bg-gray-800/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-7 text-center font-bold ${
                    entry.rank === 1 ? "text-yellow-400" : entry.rank === 2 ? "text-gray-300" : entry.rank === 3 ? "text-amber-600" : "text-gray-500"
                  }`}>
                    {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                  </span>
                  <span className="text-gray-200">{entry.artisticName ?? entry.username}</span>
                  {entry.userId === user?.id && (
                    <span className="text-xs text-purple-400">(você)</span>
                  )}
                </div>
                <span className="font-semibold text-white">{entry.score.toLocaleString("pt-BR")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
