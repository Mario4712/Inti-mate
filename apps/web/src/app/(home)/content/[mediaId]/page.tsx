"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Eye, Heart, Lock, Loader2, Play, Share2 } from "lucide-react";
import api from "@/lib/api";

interface MediaDetail {
  id: string;
  title: string;
  description: string;
  type: "PHOTO" | "VIDEO";
  status: string;
  visibility: string;
  originalUrl: string | null;
  processedUrl: string | null;
  thumbnailUrl: string | null;
  viewCount: number;
  durationSec: number | null;
  createdAt: string;
  creator: {
    id: string;
    username: string;
    artisticName: string;
    avatarUrl: string | null;
  };
  isSubscribed: boolean;
  hasPpvAccess: boolean;
  ppvPrice?: number;
}

export default function ContentViewerPage() {
  const { mediaId } = useParams<{ mediaId: string }>();
  const router = useRouter();
  const [media, setMedia] = useState<MediaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/content/${mediaId}`)
      .then((res) => setMedia(res.data))
      .catch((e) => {
        if (e?.response?.status === 403) setError("forbidden");
        else setError("notfound");
      })
      .finally(() => setLoading(false));
  }, [mediaId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error === "notfound" || !media) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-400">Conteúdo não encontrado.</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-purple-400 hover:text-purple-300">
          ← Voltar
        </button>
      </div>
    );
  }

  const hasAccess = media.isSubscribed || media.hasPpvAccess || media.visibility === "PUBLIC";
  const contentUrl = media.processedUrl ?? media.originalUrl;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200"
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      {/* Media */}
      <div className="relative overflow-hidden rounded-xl bg-gray-900">
        {hasAccess && contentUrl ? (
          media.type === "VIDEO" ? (
            <video
              src={contentUrl}
              controls
              className="w-full max-h-[60vh] bg-black"
              poster={media.thumbnailUrl ?? undefined}
            />
          ) : (
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <Image
                src={contentUrl}
                alt={media.title ?? "Conteúdo"}
                fill
                className="object-contain"
              />
            </div>
          )
        ) : (
          /* Locked state */
          <div className="relative flex flex-col items-center justify-center min-h-[340px] px-6 py-12 text-center">
            {media.thumbnailUrl && (
              <Image
                src={media.thumbnailUrl}
                alt="Preview"
                fill
                className="object-cover opacity-20 blur-sm"
              />
            )}
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800/80">
                <Lock size={28} className="text-purple-400" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">Conteúdo exclusivo</p>
                <p className="mt-1 text-sm text-gray-400">
                  Assine {media.creator.artisticName} para ter acesso completo.
                </p>
              </div>
              <Link
                href={`/subscribe/${media.creator.id}`}
                className="rounded-lg bg-purple-600 px-6 py-2.5 font-semibold text-white hover:bg-purple-700"
              >
                Assinar agora
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-3">
        <h1 className="text-xl font-bold text-white">{media.title}</h1>

        <div className="flex items-center justify-between">
          <Link
            href={`/creator/${media.creator.username}`}
            className="flex items-center gap-2 group"
          >
            <div className="relative h-8 w-8 overflow-hidden rounded-full bg-gray-700">
              {media.creator.avatarUrl ? (
                <Image src={media.creator.avatarUrl} alt={media.creator.artisticName} fill className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-sm font-bold text-gray-300">
                  {media.creator.artisticName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-white group-hover:text-purple-300">
                {media.creator.artisticName}
              </p>
              <p className="text-xs text-gray-500">@{media.creator.username}</p>
            </div>
          </Link>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1"><Eye size={14} /> {media.viewCount.toLocaleString("pt-BR")}</span>
            <button className="flex items-center gap-1 hover:text-red-400 transition-colors">
              <Heart size={14} />
            </button>
            <button className="flex items-center gap-1 hover:text-purple-400 transition-colors">
              <Share2 size={14} />
            </button>
          </div>
        </div>

        {media.description && (
          <p className="text-sm text-gray-400 leading-relaxed">{media.description}</p>
        )}

        <p className="text-xs text-gray-600">
          {new Date(media.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
      </div>
    </div>
  );
}
