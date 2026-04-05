"use client";

import { useEffect, useState } from "react";
import {
  Gift, Copy, Check, Loader2, Flame, Star, Users, TrendingUp,
} from "lucide-react";
import api from "@/lib/api";

interface ReferralCode {
  code: string;
  usageCount: number;
  bonusEarned: number;
}

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalBonusEarned: number;
  pendingBonus: number;
}

interface Streak {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  badges: string[];
}

export default function ReferralsPage() {
  const [code, setCode] = useState<ReferralCode | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [applyCode, setApplyCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState({ text: "", ok: true });

  useEffect(() => {
    Promise.all([
      api.get("/referrals/my-code").catch(() => ({ data: null })),
      api.get("/referrals/stats").catch(() => ({ data: null })),
      api.get("/referrals/streak").catch(() => ({ data: null })),
    ]).then(([codeRes, statsRes, streakRes]) => {
      setCode(codeRes.data);
      setStats(statsRes.data);
      setStreak(streakRes.data);
    }).finally(() => setLoading(false));

    // Record daily activity
    api.post("/referrals/activity").catch(() => {});
  }, []);

  function copyCode() {
    if (!code) return;
    navigator.clipboard.writeText(code.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!applyCode.trim()) return;
    setApplying(true);
    setApplyMsg({ text: "", ok: true });
    try {
      await api.post("/referrals/apply", { code: applyCode.trim().toUpperCase() });
      setApplyMsg({ text: "Código aplicado com sucesso!", ok: true });
      setApplyCode("");
    } catch (e: any) {
      setApplyMsg({ text: e?.response?.data?.message ?? "Código inválido ou expirado.", ok: false });
    } finally {
      setApplying(false);
    }
  }

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/register?ref=${code?.code}`
    : "";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Gift size={24} className="text-purple-400" />
        <h1 className="text-2xl font-bold text-white">Indicações & Streak</h1>
      </div>

      {/* Referral code */}
      {code && (
        <div className="rounded-xl border border-purple-700/40 bg-purple-900/20 p-5">
          <p className="mb-1 text-sm font-medium text-purple-300">Seu código de indicação</p>
          <div className="flex items-center gap-3">
            <span className="flex-1 rounded-lg bg-gray-900 px-4 py-3 font-mono text-2xl font-bold tracking-widest text-white">
              {code.code}
            </span>
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-3 text-sm font-medium text-white hover:bg-purple-700"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Compartilhe o link:{" "}
            <span className="text-purple-400 break-all">{shareUrl}</span>
          </p>
        </div>
      )}

      {/* Stats cards */}
      {stats && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 uppercase mb-1">
              <Users size={12} /> Indicações totais
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalReferrals}</p>
            <p className="text-xs text-gray-600">{stats.activeReferrals} ativos</p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 uppercase mb-1">
              <TrendingUp size={12} /> Bônus total
            </div>
            <p className="text-2xl font-bold text-green-400">
              R$ {(stats.totalBonusEarned / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            {stats.pendingBonus > 0 && (
              <p className="text-xs text-yellow-400">
                + R$ {(stats.pendingBonus / 100).toFixed(2)} pendente
              </p>
            )}
          </div>
        </div>
      )}

      {/* Streak */}
      {streak && (
        <div className="rounded-xl border border-orange-700/30 bg-orange-900/10 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/20">
              <Flame size={24} className="text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-300">{streak.currentStreak} dias</p>
              <p className="text-xs text-gray-500">streak atual · recorde: {streak.longestStreak} dias</p>
            </div>
          </div>
          {streak.badges && streak.badges.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs text-gray-400">
                <Star size={12} /> Conquistas
              </p>
              <div className="flex flex-wrap gap-2">
                {streak.badges.map((badge) => (
                  <span key={badge} className="rounded-full bg-orange-900/40 border border-orange-700/30 px-3 py-1 text-xs text-orange-300">
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Apply code */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-300">Aplicar código de indicação</h2>
        <form onSubmit={handleApply} className="flex gap-2">
          <input
            value={applyCode}
            onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
            placeholder="CÓDIGO"
            maxLength={20}
            className="flex-1 rounded-lg bg-gray-800 px-3 py-2.5 font-mono text-sm text-gray-200 uppercase outline-none focus:ring-1 focus:ring-purple-500"
          />
          <button
            type="submit"
            disabled={applying || !applyCode.trim()}
            className="rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {applying ? <Loader2 size={14} className="animate-spin" /> : "Aplicar"}
          </button>
        </form>
        {applyMsg.text && (
          <p className={`mt-2 text-xs ${applyMsg.ok ? "text-green-400" : "text-red-400"}`}>
            {applyMsg.text}
          </p>
        )}
        <p className="mt-2 text-xs text-gray-600">Disponível apenas nos primeiros 30 dias após o cadastro.</p>
      </div>
    </div>
  );
}
