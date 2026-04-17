"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Star, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

interface ReviewItem {
  id: string;
  rating: number;
  body: string | null;
  createdAt: string;
  fan: {
    username: string;
    profile: { artisticName: string | null; avatarUrl: string | null } | null;
  };
}

interface ReviewsData {
  items: ReviewItem[];
  total: number;
  avgRating: number | null;
  pagination: { page: number; limit: number; pages: number };
}

interface MyReview {
  id: string;
  rating: number;
  body: string | null;
}

function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(s)}
          onMouseEnter={() => !readonly && setHovered(s)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={readonly ? "cursor-default" : "cursor-pointer"}
        >
          <Star
            size={18}
            className={
              s <= (hovered || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-600"
            }
          />
        </button>
      ))}
    </div>
  );
}

export function ReviewsSection({ creatorId }: { creatorId: string }) {
  const { user } = useAuth();
  const [data, setData] = useState<ReviewsData | null>(null);
  const [myReview, setMyReview] = useState<MyReview | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [page, setPage] = useState(1);

  const fetchReviews = useCallback(async (p = 1) => {
    const res = await api.get(`/reviews/creator/${creatorId}?page=${p}&limit=10`);
    setData(res.data);
  }, [creatorId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchReviews(1),
      api.get(`/reviews/creator/${creatorId}/mine`).then((r) => setMyReview(r.data)).catch(() => setMyReview(null)),
    ]).finally(() => setLoading(false));
  }, [creatorId, fetchReviews]);

  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setBody(myReview.body ?? "");
    }
  }, [myReview]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post(`/reviews/creator/${creatorId}`, { rating, body: body || undefined });
      setMyReview({ id: res.data.id, rating, body: body || null });
      await fetchReviews(1);
      setPage(1);
    } catch {
      // forbidden = not a subscriber; show nothing extra
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!myReview) return;
    setDeleting(true);
    try {
      await api.delete(`/reviews/${myReview.id}`);
      setMyReview(null);
      setRating(5);
      setBody("");
      await fetchReviews(1);
      setPage(1);
    } finally {
      setDeleting(false);
    }
  }

  async function goToPage(p: number) {
    setPage(p);
    await fetchReviews(p);
  }

  const isSelf = user?.id === creatorId;

  return (
    <section className="mt-6 border-t border-gray-800 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Avaliações</h2>
        {data?.avgRating != null && (
          <div className="flex items-center gap-1.5">
            <Star size={16} className="fill-yellow-400 text-yellow-400" />
            <span className="font-semibold text-white">{data.avgRating.toFixed(1)}</span>
            <span className="text-sm text-gray-500">({data.total})</span>
          </div>
        )}
      </div>

      {/* Submit / edit form — only for non-creator */}
      {!isSelf && myReview !== undefined && (
        <div className="mb-6 rounded-xl border border-gray-700 bg-gray-900 p-4">
          <p className="mb-3 text-sm font-medium text-gray-300">
            {myReview ? "Sua avaliação" : "Avalie este criador (apenas assinantes ativos)"}
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <StarRating value={rating} onChange={setRating} />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Comentário (opcional)"
              maxLength={1000}
              rows={3}
              className="w-full resize-none rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none focus:ring-1 focus:ring-purple-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting || rating < 1}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : myReview ? "Atualizar" : "Enviar"}
              </button>
              {myReview && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 rounded-lg border border-red-800 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                >
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Excluir
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        </div>
      ) : data?.items.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">Nenhuma avaliação ainda.</p>
      ) : (
        <div className="space-y-4">
          {data?.items.map((r) => (
            <div key={r.id} className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-700 text-sm font-semibold text-gray-300">
                    {(r.fan.profile?.artisticName ?? r.fan.username).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">
                      {r.fan.profile?.artisticName ?? r.fan.username}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <StarRating value={r.rating} readonly />
              </div>
              {r.body && <p className="mt-3 text-sm text-gray-300 leading-relaxed">{r.body}</p>}
            </div>
          ))}

          {/* Pagination */}
          {data && data.pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              {Array.from({ length: data.pagination.pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                    p === page
                      ? "bg-purple-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
