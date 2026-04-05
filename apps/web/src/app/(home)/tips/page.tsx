"use client";

import { useEffect, useState } from "react";
import { Heart, Loader2, Clock } from "lucide-react";
import api from "@/lib/api";

interface Tip {
  id: string;
  amount: number;
  message: string | null;
  createdAt: string;
  creator: {
    id: string;
    artisticName: string;
    username: string;
    avatarUrl: string | null;
  };
}

export default function TipsHistoryPage() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.get(`/tips/mine?page=${page}&limit=20`)
      .then((r) => {
        setTips(Array.isArray(r.data) ? r.data : r.data?.items ?? []);
        setTotal(r.data?.total ?? 0);
      })
      .catch(() => setTips([]))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-white">Minhas Gorjetas</h1>
      <p className="text-sm text-gray-500">Histórico de gorjetas enviadas para criadores.</p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-purple-500" />
        </div>
      ) : tips.length === 0 ? (
        <div className="py-16 text-center">
          <Heart size={36} className="mx-auto mb-3 text-gray-700" />
          <p className="text-gray-500">Você ainda não enviou nenhuma gorjeta.</p>
          <p className="mt-1 text-xs text-gray-600">Visite o perfil de um criador para enviar uma.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tips.map((tip) => (
            <div key={tip.id} className="flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-600/20">
                <Heart size={18} className="text-pink-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  R$ {tip.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} →{" "}
                  <a href={`/creator/${tip.creator.username}`} className="text-purple-400 hover:underline">
                    {tip.creator.artisticName}
                  </a>
                </p>
                {tip.message && (
                  <p className="mt-0.5 truncate text-xs text-gray-500">"{tip.message}"</p>
                )}
                <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-600">
                  <Clock size={10} />
                  {new Date(tip.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <span className="shrink-0 text-sm font-bold text-pink-400">
                R$ {tip.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-2 pt-2">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 disabled:opacity-40 hover:bg-gray-800">
            Anterior
          </button>
          <span className="flex items-center px-3 text-sm text-gray-500">{page} / {Math.ceil(total / 20)}</span>
          <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 disabled:opacity-40 hover:bg-gray-800">
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
