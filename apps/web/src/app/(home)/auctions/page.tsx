"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Gavel, Clock, Loader2, TrendingUp } from "lucide-react";
import api from "@/lib/api";

interface Auction {
  id: string;
  title: string;
  description: string | null;
  status: "ACTIVE" | "ENDED" | "DELIVERED";
  startingBid: number;
  currentBid: number | null;
  bidCount: number;
  endsAt: string;
  creator: {
    id: string;
    username: string;
    artisticName: string;
    avatarUrl: string | null;
  };
  media: { thumbnailUrl: string | null } | null;
}

function timeLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Encerrado";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch from multiple creators — here we list all via a general endpoint
    // The API has GET /auctions/creator/:creatorId; we use the feed/recommendations to get creators
    api.get("/recommendations?limit=20")
      .then(async (r) => {
        const creators: any[] = r.data?.items ?? [];
        const results = await Promise.all(
          creators.slice(0, 6).map((c: any) =>
            api.get(`/auctions/creator/${c.id}`).then((res) => res.data ?? []).catch(() => [])
          )
        );
        const all = (results.flat() as Auction[]).filter((a) => a.status === "ACTIVE");
        setAuctions(all);
      })
      .catch(() => setAuctions([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Gavel size={24} className="text-purple-400" />
        <h1 className="text-2xl font-bold text-white">Leilões</h1>
      </div>

      {auctions.length === 0 ? (
        <div className="py-16 text-center">
          <Gavel size={40} className="mx-auto mb-4 text-gray-700" />
          <p className="text-gray-500">Nenhum leilão ativo no momento.</p>
          <p className="mt-1 text-xs text-gray-600">Assine criadores para ver seus leilões exclusivos.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {auctions.map((a) => (
            <Link
              key={a.id}
              href={`/auctions/${a.id}`}
              className="group rounded-xl border border-gray-800 bg-gray-900 overflow-hidden hover:border-purple-700 transition-colors"
            >
              <div className="relative aspect-video w-full bg-gray-800">
                {a.media?.thumbnailUrl ? (
                  <Image src={a.media.thumbnailUrl} alt="" fill className="object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Gavel size={32} className="text-gray-700" />
                  </div>
                )}
                <span className="absolute top-2 right-2 rounded-full bg-purple-600 px-2.5 py-0.5 text-xs font-bold text-white">
                  AO VIVO
                </span>
              </div>
              <div className="p-4">
                <p className="font-semibold text-white line-clamp-1 group-hover:text-purple-300">{a.title}</p>
                <p className="mt-1 text-xs text-gray-500 line-clamp-2">{a.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Lance atual</p>
                    <p className="text-lg font-bold text-purple-400">
                      R$ {((a.currentBid ?? a.startingBid) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="flex items-center gap-1 text-xs text-gray-600">
                      <Clock size={11} /> {timeLeft(a.endsAt)}
                    </p>
                    <p className="flex items-center justify-end gap-1 text-xs text-gray-500">
                      <TrendingUp size={11} /> {a.bidCount} lance{a.bidCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  {a.creator.avatarUrl && (
                    <div className="relative h-4 w-4 overflow-hidden rounded-full bg-gray-700">
                      <Image src={a.creator.avatarUrl} alt="" fill className="object-cover" />
                    </div>
                  )}
                  {a.creator.artisticName}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
