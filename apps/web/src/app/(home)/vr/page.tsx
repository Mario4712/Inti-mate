"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Glasses, Loader2, Globe, Layers } from "lucide-react";
import api from "@/lib/api";

interface VrContent {
  id: string;
  format: "VR180" | "VR360";
  resolution: string;
  stereoMode: string;
  fovDegrees: number;
  media?: {
    id: string;
    title?: string;
    thumbnailUrl?: string;
    creator?: { username: string; profile?: { artisticName?: string } };
  };
}

export default function VrGalleryPage() {
  const [items, setItems] = useState<VrContent[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/vr-content?page=${page}&limit=20`)
      .then((r) => {
        setItems(r.data.items ?? r.data ?? []);
        setTotal(r.data.total ?? (r.data?.length ?? 0));
      })
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Glasses size={22} className="text-purple-400" /> Conteúdo VR
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Experiências imersivas em VR180 e VR360. Melhor com headset WebXR.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
          <Glasses size={40} className="mb-3 opacity-30" />
          <p>Nenhum conteúdo VR disponível.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/vr/${item.media?.id ?? item.id}`}
                className="group overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 hover:border-purple-700/50 transition-colors"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gray-800 overflow-hidden">
                  {item.media?.thumbnailUrl ? (
                    <img
                      src={item.media.thumbnailUrl}
                      alt={item.media.title ?? "VR"}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Glasses size={32} className="text-gray-600" />
                    </div>
                  )}
                  {/* VR badge */}
                  <span className="absolute top-2 left-2 rounded-full bg-purple-600/90 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
                    {item.format}
                  </span>
                </div>

                <div className="p-4">
                  <h2 className="font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                    {item.media?.title ?? `Conteúdo VR`}
                  </h2>
                  {item.media?.creator && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      @{item.media.creator.profile?.artisticName ?? item.media.creator.username}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Globe size={11} /> {item.fovDegrees}°
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers size={11} /> {item.stereoMode}
                    </span>
                    <span>{item.resolution}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {total > 20 && (
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={items.length < 20}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
