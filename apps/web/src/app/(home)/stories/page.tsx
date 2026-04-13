"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Eye } from "lucide-react";
import api from "@/lib/api";

interface StoryItem {
  id: string;
  creatorId: string;
  mediaUrl: string;
  mediaType: string;
  expiresAt: string;
  viewed: boolean;
  viewCount: number;
}

interface CreatorGroup {
  creatorId: string;
  username: string;
  artisticName: string;
  avatarUrl: string | null;
  hasUnviewed: boolean;
  stories: StoryItem[];
}

export default function StoriesPage() {
  const [groups, setGroups] = useState<CreatorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api.get("/stories/feed")
      .then(async (r) => {
        const stories: StoryItem[] = r.data ?? [];
        if (stories.length === 0) { setGroups([]); return; }

        // Agrupar por criador
        const map = new Map<string, StoryItem[]>();
        for (const s of stories) {
          const arr = map.get(s.creatorId) ?? [];
          arr.push(s);
          map.set(s.creatorId, arr);
        }

        // Buscar perfis dos criadores
        const ids = [...map.keys()];
        const profileRes = await Promise.allSettled(
          ids.map((id) => api.get(`/users/${id}/profile`).then((r) => r.data))
        );

        const result: CreatorGroup[] = ids.map((id, i) => {
          const profile = profileRes[i].status === "fulfilled" ? profileRes[i].value : null;
          const storyList = map.get(id)!;
          return {
            creatorId:    id,
            username:     profile?.username     ?? id.slice(0, 8),
            artisticName: profile?.artisticName ?? profile?.username ?? "Criador",
            avatarUrl:    profile?.avatarUrl    ?? null,
            hasUnviewed:  storyList.some((s) => !s.viewed),
            stories:      storyList,
          };
        });

        // Não visualizados primeiro
        result.sort((a, b) => (b.hasUnviewed ? 1 : 0) - (a.hasUnviewed ? 1 : 0));
        setGroups(result);
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-purple-500" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-gray-500">
        <p className="text-lg font-medium text-white mb-2">Nenhum story disponível</p>
        <p className="text-sm">Stories aparecem aqui quando criadores que você assina publicam.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Stories</h1>

      {/* Tira de avatares */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {groups.map((g) => (
          <button
            key={g.creatorId}
            onClick={() => router.push(`/stories/${g.stories[0].id}?creator=${g.creatorId}`)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
          >
            <div className={`relative h-16 w-16 rounded-full p-0.5 ${g.hasUnviewed ? "bg-gradient-to-tr from-purple-500 to-pink-500" : "bg-gray-700"}`}>
              <div className="relative h-full w-full overflow-hidden rounded-full border-2 border-gray-950 bg-gray-800">
                {g.avatarUrl ? (
                  <Image src={g.avatarUrl} alt={g.artisticName} fill className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xl font-bold text-gray-300">
                    {g.artisticName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <span className="w-16 truncate text-center text-xs text-gray-400">{g.artisticName}</span>
          </button>
        ))}
      </div>

      {/* Lista de stories por criador */}
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.creatorId} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="relative h-9 w-9 overflow-hidden rounded-full bg-gray-700">
                {g.avatarUrl ? (
                  <Image src={g.avatarUrl} alt={g.artisticName} fill className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-sm font-bold text-gray-400">
                    {g.artisticName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{g.artisticName}</p>
                <p className="text-xs text-gray-500">@{g.username} · {g.stories.length} story{g.stories.length !== 1 ? "s" : ""}</p>
              </div>
              {g.hasUnviewed && (
                <span className="ml-auto rounded-full bg-purple-600 px-2 py-0.5 text-xs font-medium text-white">Novo</span>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {g.stories.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => router.push(`/stories/${s.id}?creator=${g.creatorId}`)}
                  className={`relative flex-shrink-0 h-24 w-16 overflow-hidden rounded-lg border-2 transition-opacity ${s.viewed ? "border-gray-700 opacity-60" : "border-purple-500"}`}
                >
                  {s.mediaType.startsWith("image") ? (
                    <Image src={s.mediaUrl} alt={`Story ${idx + 1}`} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gray-800">
                      <span className="text-xs text-gray-400">Vídeo</span>
                    </div>
                  )}
                  <div className="absolute bottom-1 right-1 flex items-center gap-0.5 text-xs text-white/70">
                    <Eye size={10} />
                    <span>{s.viewCount}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
