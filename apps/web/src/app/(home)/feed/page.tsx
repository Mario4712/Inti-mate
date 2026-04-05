"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Users, Star, TrendingUp, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { StoriesBar } from "@/components/stories/StoriesBar";

interface Creator {
  id: string;
  username: string;
  artisticName: string;
  bio: string;
  avatarUrl: string | null;
  category: string;
  subscriberCount: number;
  lowestPlanPrice?: number;
  tags: string[];
}

interface RecommendationItem {
  creator: Creator;
  score: number;
  reason?: string;
}

interface DiscoveryItem {
  id: string;
  username: string;
  artisticName: string;
  bio: string;
  avatarUrl: string | null;
  category: string;
  subscriberCount: number;
}

export default function FeedPage() {
  const [recommended, setRecommended] = useState<RecommendationItem[]>([]);
  const [trending, setTrending] = useState<DiscoveryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/recommendations?limit=12&withExplanations=true").catch(() => ({ data: [] })),
      api.get("/search/discovery?limit=8").catch(() => ({ data: { items: [] } })),
    ]).then(([recRes, trendRes]) => {
      setRecommended(Array.isArray(recRes.data) ? recRes.data : recRes.data?.items ?? []);
      setTrending(trendRes.data?.items ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Stories */}
      <StoriesBar />

      {/* Recomendações personalizadas */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Star size={18} className="text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Recomendados para você</h2>
        </div>

        {recommended.length === 0 ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
            <p className="text-gray-400">Assine alguns criadores para receber recomendações personalizadas.</p>
            <Link href="/discover" className="mt-4 inline-block rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700">
              Descobrir criadores
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recommended.map(({ creator, reason }) => (
              <CreatorCard key={creator.id} creator={creator} reason={reason} />
            ))}
          </div>
        )}
      </section>

      {/* Trending */}
      {trending.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-orange-400" />
              <h2 className="text-lg font-semibold text-white">Em alta agora</h2>
            </div>
            <Link href="/discover" className="text-sm text-purple-400 hover:text-purple-300">
              Ver todos →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trending.slice(0, 4).map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CreatorCard({ creator, reason }: { creator: Creator | DiscoveryItem; reason?: string }) {
  const initial = (creator.artisticName ?? creator.username).charAt(0).toUpperCase();

  return (
    <Link
      href={`/creator/${creator.username}`}
      className="group flex flex-col rounded-xl border border-gray-800 bg-gray-900 p-4 transition-colors hover:border-purple-700 hover:bg-gray-900/80"
    >
      {/* Avatar */}
      <div className="mb-3 flex items-center gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-700">
          {creator.avatarUrl ? (
            <Image src={creator.avatarUrl} alt={creator.artisticName} fill className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg font-bold text-gray-300">
              {initial}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-white group-hover:text-purple-300">
            {creator.artisticName}
          </p>
          <p className="truncate text-xs text-gray-500">@{creator.username}</p>
        </div>
      </div>

      {/* Bio */}
      {creator.bio && (
        <p className="mb-3 line-clamp-2 text-xs text-gray-400">{creator.bio}</p>
      )}

      {/* Meta */}
      <div className="mt-auto flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Users size={12} />
          {creator.subscriberCount?.toLocaleString("pt-BR") ?? 0} assinantes
        </span>
        {creator.category && (
          <span className="rounded-full bg-gray-800 px-2 py-0.5 capitalize">{creator.category}</span>
        )}
      </div>

      {/* Reason */}
      {reason && (
        <p className="mt-2 text-xs italic text-purple-400 line-clamp-1">{reason}</p>
      )}
    </Link>
  );
}
