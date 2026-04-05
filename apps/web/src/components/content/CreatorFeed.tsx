"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Lock, Play, Eye, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/lib/api";

interface MediaItem {
  id: string;
  title: string;
  type: "PHOTO" | "VIDEO";
  status: string;
  thumbnailUrl: string | null;
  viewCount: number;
  durationSec: number | null;
  visibility: string;
  createdAt: string;
}

interface Props {
  creatorId: string;
  creatorUsername: string;
  isSubscribed?: boolean;
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function CreatorFeed({ creatorId, creatorUsername, isSubscribed = false }: Props) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/content/creator/${creatorId}?page=${page}&limit=9`)
      .then((res) => {
        setItems(res.data?.items ?? []);
        setTotal(res.data?.total ?? 0);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [creatorId, page]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">Nenhum conteúdo publicado ainda.</p>
    );
  }

  const totalPages = Math.ceil(total / 9);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => {
          const locked = item.visibility !== "PUBLIC" && !isSubscribed;
          return (
            <Link
              key={item.id}
              href={`/content/${item.id}`}
              className="group relative aspect-square overflow-hidden rounded-lg bg-gray-800 block"
            >
              {/* Thumbnail */}
              {item.thumbnailUrl ? (
                <Image
                  src={item.thumbnailUrl}
                  alt={item.title ?? ""}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className={`object-cover transition-transform group-hover:scale-105 ${locked ? "blur-sm opacity-50" : ""}`}
                />
              ) : (
                <div className={`flex h-full w-full items-center justify-center text-gray-600 ${locked ? "opacity-50" : ""}`}>
                  {item.type === "VIDEO" ? <Play size={32} /> : <Eye size={32} />}
                </div>
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Lock badge */}
              {locked && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60">
                    <Lock size={18} className="text-purple-400" />
                  </div>
                </div>
              )}

              {/* Video badge */}
              {item.type === "VIDEO" && !locked && (
                <div className="absolute top-2 left-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
                  <Play size={10} />
                  {item.durationSec ? formatDuration(item.durationSec) : "Vídeo"}
                </div>
              )}

              {/* Views */}
              <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Eye size={10} />
                {item.viewCount.toLocaleString("pt-BR")}
              </div>

              {/* Title overlay */}
              {item.title && (
                <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="truncate text-xs font-medium text-white">{item.title}</p>
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 disabled:opacity-40"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 disabled:opacity-40"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
