"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle, ChevronLeft, ChevronRight, Image as ImageIcon, Loader2, Video, X } from "lucide-react";
import api from "@/lib/api";

interface ContentRow {
  id: string;
  creatorId: string;
  type: "PHOTO" | "VIDEO";
  status: string;
  thumbnailUrl: string | null;
  title: string | null;
  artisticName: string;
  username: string;
  createdAt: string;
}

const STATUS_TABS = [
  { value: "PENDING_REVIEW", label: "Em revisão" },
  { value: "APPROVED",       label: "Aprovados" },
  { value: "REJECTED",       label: "Rejeitados" },
  { value: "FLAGGED",        label: "Sinalizados" },
];

export default function AdminContentPage() {
  const [items, setItems] = useState<ContentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusTab, setStatusTab] = useState("PENDING_REVIEW");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [rejectModal, setRejectModal] = useState<ContentRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/content?status=${statusTab}&page=${page}&limit=20`)
      .then((r) => {
        setItems(r.data.items);
        setTotal(r.data.pagination.total);
        setPages(r.data.pagination.pages);
      })
      .finally(() => setLoading(false));
  }, [statusTab, page]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id: string) {
    setActionLoading(id);
    setError("");
    try {
      await api.patch(`/admin/content/${id}/approve`);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Erro");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(item: ContentRow) {
    if (!rejectReason.trim()) return;
    setActionLoading(item.id);
    setError("");
    try {
      await api.patch(`/admin/content/${item.id}/reject`, { reason: rejectReason });
      setRejectModal(null);
      setRejectReason("");
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Erro");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Moderação de conteúdo</h1>
        <p className="mt-1 text-gray-400">{total} item{total !== 1 ? "s" : ""}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-800 bg-gray-900 p-1">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setStatusTab(t.value); setPage(1); }}
            className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
              statusTab === t.value ? "bg-red-700 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-gray-600" /></div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-gray-500">Nenhum conteúdo neste status.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
              {/* Thumbnail */}
              <div className="relative aspect-video w-full bg-gray-800 flex items-center justify-center">
                {item.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  item.type === "VIDEO"
                    ? <Video size={28} className="text-gray-600" />
                    : <ImageIcon size={28} className="text-gray-600" />
                )}
                <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-gray-300">
                  {item.type}
                </span>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-white truncate">{item.title ?? "Sem título"}</p>
                  <p className="text-xs text-gray-500">@{item.username} · {new Date(item.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>

                {statusTab === "PENDING_REVIEW" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(item.id)}
                      disabled={actionLoading === item.id}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-700/20 py-2 text-xs font-semibold text-green-400 hover:bg-green-700/30 disabled:opacity-50"
                    >
                      {actionLoading === item.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                      Aprovar
                    </button>
                    <button
                      onClick={() => { setRejectModal(item); setRejectReason(""); }}
                      disabled={actionLoading === item.id}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-700/20 py-2 text-xs font-semibold text-red-400 hover:bg-red-700/30 disabled:opacity-50"
                    >
                      <X size={12} /> Rejeitar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginação */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500">Página {page} de {pages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-gray-400 disabled:opacity-40">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-gray-400 disabled:opacity-40">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modal rejeitar */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-950 p-6 space-y-4">
            <h2 className="font-bold text-white">Rejeitar conteúdo</h2>
            <p className="text-sm text-gray-400">Por @{rejectModal.username}</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo da rejeição (obrigatório)..."
              rows={3}
              className="w-full resize-none rounded-lg bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-red-500"
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)} className="flex-1 rounded-lg border border-gray-700 py-2 text-sm text-gray-400">
                Cancelar
              </button>
              <button onClick={() => handleReject(rejectModal)} disabled={!rejectReason.trim()}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white disabled:opacity-50">
                Rejeitar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
