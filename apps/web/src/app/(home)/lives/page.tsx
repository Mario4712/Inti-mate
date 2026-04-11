"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Radio, Calendar, Users, Loader2, Lock } from "lucide-react";
import api from "@/lib/api";

interface LiveSession {
  id: string;
  title: string;
  status: "SCHEDULED" | "LIVE" | "ENDED";
  scheduledAt: string | null;
  startedAt: string | null;
  requiresSubscription: boolean;
  viewerCount: number;
  creator: {
    id: string;
    username: string;
    artisticName: string;
    avatarUrl: string | null;
  };
}

export default function LivesPage() {
  const [lives, setLives] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/lives")
      .then((r) => setLives(Array.isArray(r.data) ? r.data : r.data?.items ?? []))
      .catch(() => setLives([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const live = lives.filter((l) => l.status === "LIVE");
  const scheduled = lives.filter((l) => l.status === "SCHEDULED");
  const ended = lives.filter((l) => l.status === "ENDED");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Lives</h1>

      {lives.length === 0 && (
        <div className="py-16 text-center">
          <Radio size={40} className="mx-auto mb-4 text-gray-700" />
          <p className="text-gray-500">Nenhuma live agendada ou ao vivo no momento.</p>
        </div>
      )}

      {live.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-lg font-semibold text-white">Ao vivo agora</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((l) => <LiveCard key={l.id} live={l} />)}
          </div>
        </section>
      )}

      {scheduled.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Agendadas</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {scheduled.map((l) => <LiveCard key={l.id} live={l} />)}
          </div>
        </section>
      )}

      {ended.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Radio size={18} className="text-gray-500" />
            <h2 className="text-lg font-semibold text-white">Encerradas</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ended.map((l) => <LiveCard key={l.id} live={l} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function LiveCard({ live }: { live: LiveSession }) {
  const isLive = live.status === "LIVE";
  return (
    <Link
      href={`/lives/${live.id}`}
      className="group flex flex-col rounded-xl border border-gray-800 bg-gray-900 overflow-hidden transition-colors hover:border-purple-700"
    >
      {/* Thumbnail area */}
      <div className="relative aspect-video w-full bg-gray-800 flex items-center justify-center">
        {live.creator?.avatarUrl ? (
          <Image src={live.creator.avatarUrl} alt="" fill className="object-cover opacity-30" />
        ) : null}
        <div className="relative z-10 flex flex-col items-center gap-2">
          {isLive ? (
            <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              AO VIVO
            </span>
          ) : live.status === "ENDED" ? (
            <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-400">Encerrada</span>
          ) : (
            <span className="rounded-full bg-gray-700 px-3 py-1 text-xs text-gray-300">Agendada</span>
          )}
          {live.requiresSubscription && (
            <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-purple-300">
              <Lock size={10} /> Assinantes
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="mb-2 font-semibold text-white line-clamp-1 group-hover:text-purple-300">
          {live.title}
        </p>
        {live.creator && (
          <div className="flex items-center gap-2">
            <div className="relative h-6 w-6 overflow-hidden rounded-full bg-gray-700 shrink-0">
              {live.creator.avatarUrl ? (
                <Image src={live.creator.avatarUrl} alt="" fill className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xs font-bold text-gray-400">
                  {live.creator.artisticName?.charAt(0) ?? "?"}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 truncate">{live.creator.artisticName}</p>
          </div>
        )}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
          {isLive ? (
            <span className="flex items-center gap-1"><Users size={11} /> {live.viewerCount} ao vivo</span>
          ) : live.scheduledAt ? (
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {new Date(live.scheduledAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
