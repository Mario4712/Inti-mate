"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Gavel, Clock, TrendingUp, Loader2, Trophy } from "lucide-react";
import api from "@/lib/api";

interface Bid {
  id: string;
  amount: number;
  createdAt: string;
  bidder: {
    id: string;
    username: string;
    artisticName: string;
    avatarUrl: string | null;
  };
}

interface Auction {
  id: string;
  title: string;
  description: string | null;
  status: "ACTIVE" | "ENDED" | "DELIVERED";
  startingBid: number;
  currentBid: number | null;
  bidCount: number;
  endsAt: string;
  winner: { id: string; artisticName: string } | null;
  creator: {
    id: string;
    username: string;
    artisticName: string;
    avatarUrl: string | null;
  };
  media: { thumbnailUrl: string | null; originalUrl: string | null } | null;
  bids: Bid[];
}

function timeLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Encerrado";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function AuctionDetailPage() {
  const { auctionId } = useParams<{ auctionId: string }>();
  const router = useRouter();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState("");
  const [bidding, setBidding] = useState(false);
  const [bidError, setBidError] = useState("");
  const [bidSuccess, setBidSuccess] = useState("");
  const [countdown, setCountdown] = useState("");

  function load() {
    api.get(`/auctions/${auctionId}`)
      .then((r) => {
        setAuction(r.data);
        const minNext = Math.ceil(((r.data.currentBid ?? r.data.startingBid) / 100) + 1);
        setBidAmount(String(minNext));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [auctionId]);

  // Countdown timer
  useEffect(() => {
    if (!auction || auction.status !== "ACTIVE") return;
    const timer = setInterval(() => setCountdown(timeLeft(auction.endsAt)), 1000);
    setCountdown(timeLeft(auction.endsAt));
    return () => clearInterval(timer);
  }, [auction]);

  async function handleBid(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(bidAmount) * 100);
    const minBid = (auction?.currentBid ?? auction?.startingBid ?? 0) + 100;
    if (cents < minBid) {
      setBidError(`Lance mínimo: R$ ${(minBid / 100).toFixed(2)}`);
      return;
    }
    setBidError("");
    setBidding(true);
    try {
      await api.post(`/auctions/${auctionId}/bid`, { amountCents: cents });
      setBidSuccess(`Lance de R$ ${(cents / 100).toFixed(2)} registrado!`);
      setTimeout(() => setBidSuccess(""), 3000);
      load();
    } catch (e: any) {
      setBidError(e?.response?.data?.message ?? "Erro ao registrar lance.");
    } finally {
      setBidding(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-400">Leilão não encontrado.</p>
        <button onClick={() => router.back()} className="mt-3 text-sm text-purple-400">← Voltar</button>
      </div>
    );
  }

  const currentBidR = (auction.currentBid ?? auction.startingBid) / 100;
  const isActive = auction.status === "ACTIVE";
  const minNext = currentBidR + 1;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200">
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Media */}
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-800">
          {auction.media?.thumbnailUrl ? (
            <Image src={auction.media.thumbnailUrl} alt="" fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Gavel size={48} className="text-gray-700" />
            </div>
          )}
          <div className="absolute top-3 left-3">
            {isActive ? (
              <span className="rounded-full bg-green-600 px-2.5 py-1 text-xs font-bold text-white">ATIVO</span>
            ) : (
              <span className="rounded-full bg-gray-600 px-2.5 py-1 text-xs font-bold text-white">
                {auction.status === "DELIVERED" ? "ENTREGUE" : "ENCERRADO"}
              </span>
            )}
          </div>
        </div>

        {/* Info + bid */}
        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-500">por {auction.creator.artisticName}</p>
            <h1 className="text-xl font-bold text-white">{auction.title}</h1>
            {auction.description && <p className="mt-2 text-sm text-gray-400">{auction.description}</p>}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-gray-900 border border-gray-800 p-3 text-center">
              <p className="text-xs text-gray-600">Início</p>
              <p className="text-sm font-bold text-white">R$ {(auction.startingBid / 100).toFixed(2)}</p>
            </div>
            <div className="rounded-lg bg-purple-900/30 border border-purple-800/50 p-3 text-center">
              <p className="text-xs text-purple-400">Atual</p>
              <p className="text-sm font-bold text-purple-300">R$ {currentBidR.toFixed(2)}</p>
            </div>
            <div className="rounded-lg bg-gray-900 border border-gray-800 p-3 text-center">
              <p className="flex items-center justify-center gap-1 text-xs text-gray-600">
                <TrendingUp size={10} /> Lances
              </p>
              <p className="text-sm font-bold text-white">{auction.bidCount}</p>
            </div>
          </div>

          {/* Countdown */}
          {isActive && (
            <div className="flex items-center gap-2 rounded-lg bg-gray-900 border border-gray-800 px-4 py-3">
              <Clock size={16} className="text-orange-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Tempo restante</p>
                <p className="font-mono text-lg font-bold text-orange-400">{countdown}</p>
              </div>
            </div>
          )}

          {/* Winner */}
          {!isActive && auction.winner && (
            <div className="flex items-center gap-3 rounded-lg bg-yellow-900/20 border border-yellow-700/30 px-4 py-3">
              <Trophy size={20} className="text-yellow-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Vencedor</p>
                <p className="font-semibold text-yellow-300">{auction.winner.artisticName}</p>
              </div>
            </div>
          )}

          {/* Bid form */}
          {isActive && (
            <form onSubmit={handleBid} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs text-gray-400">Seu lance (R$) — mínimo R$ {minNext.toFixed(2)}</label>
                <input
                  type="number"
                  min={minNext}
                  step="0.01"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="w-full rounded-lg bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              {bidError && <p className="text-xs text-red-400">{bidError}</p>}
              {bidSuccess && <p className="text-xs text-green-400">{bidSuccess}</p>}
              <button
                type="submit"
                disabled={bidding}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {bidding ? <Loader2 size={16} className="animate-spin" /> : <Gavel size={16} />}
                Dar lance
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Bid history */}
      {auction.bids && auction.bids.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Histórico de lances</h2>
          <div className="space-y-2">
            {auction.bids.map((bid, i) => (
              <div key={bid.id} className={`flex items-center justify-between rounded-xl px-4 py-3 ${i === 0 ? "border border-purple-700/50 bg-purple-900/20" : "border border-gray-800 bg-gray-900"}`}>
                <div className="flex items-center gap-3">
                  {i === 0 && <TrendingUp size={14} className="text-purple-400" />}
                  <div>
                    <p className="text-sm font-medium text-gray-200">{bid.bidder.artisticName}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(bid.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <p className={`text-sm font-bold ${i === 0 ? "text-purple-300" : "text-gray-400"}`}>
                  R$ {(bid.amount / 100).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
