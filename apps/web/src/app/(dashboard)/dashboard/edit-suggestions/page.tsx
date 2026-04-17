"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, Loader2, ChevronLeft, ChevronRight, Lightbulb } from "lucide-react";
import api from "@/lib/api";

interface Suggestion {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  note: string | null;
  status: string;
  revenueSharePct: number | null;
  createdAt: string;
  fan: { username: string; artisticName: string | null } | null;
  media: { id: string; title: string | null } | null;
}

const STATUS_TABS = [
  { value: "PENDING",  label: "Pendentes" },
  { value: "APPROVED", label: "Aceitas" },
  { value: "REJECTED", label: "Rejeitadas" },
];

const TYPE_LABELS: Record<string, string> = {
  cut:        "Corte",
  caption:    "Legenda",
  soundtrack: "Trilha sonora",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:  "bg-yellow-500/20 text-yellow-400",
  APPROVED: "bg-green-500/20 text-green-400",
  REJECTED: "bg-red-500/20 text-red-400",
};

export default function EditSuggestionsPage() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusTab, setStatusTab] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Accept modal state
  const [acceptModal, setAcceptModal] = useState<Suggestion | null>(null);
  const [revenueSharePct, setRevenueSharePct] = useState(10);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/edit-suggestions/creator?status=${statusTab}&page=${page}&limit=20`)
      .then((r) => {
        setItems(r.data.items ?? r.data ?? []);
        setTotal(r.data.pagination?.total ?? (r.data?.length ?? 0));
        setPages(r.data.pagination?.pages ?? 1);
      })
      .catch(() => setError("Erro ao carregar sugestões"))
      .finally(() => setLoading(false));
  }, [statusTab, page]);

  useEffect(() => { load(); }, [load]);

  async function handleAccept(id: string, pct: number) {
    setActionLoading(id);
    setError("");
    try {
      await api.post(`/edit-suggestions/${id}/accept`, { revenueSharePct: pct });
      setAcceptModal(null);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Erro ao aceitar sugestão");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(id: string) {
    setActionLoading(id);
    setError("");
    try {
      await api.post(`/edit-suggestions/${id}/reject`);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Erro ao rejeitar sugestão");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Sugestões de edição</h1>
        <p className="mt-1 text-gray-400 text-sm">
          Fãs podem sugerir cortes, legendas e trilhas sonoras para seus conteúdos.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-800 bg-gray-900 p-1">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setStatusTab(t.value); setPage(1); }}
            className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
              statusTab === t.value ? "bg-purple-700 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
          <Lightbulb size={32} className="mb-3 opacity-40" />
          <p>Nenhuma sugestão neste status.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-purple-400 bg-purple-500/10 rounded px-2 py-0.5">
                      {TYPE_LABELS[item.type] ?? item.type}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status] ?? "bg-gray-700 text-gray-400"}`}>
                      {item.status}
                    </span>
                    {item.revenueSharePct != null && (
                      <span className="text-xs text-green-400">+{item.revenueSharePct}% revenue share</span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mb-1">
                    De <span className="text-gray-300">@{item.fan?.username}</span>
                    {item.media && (
                      <> · Conteúdo: <span className="text-gray-300">{item.media.title ?? item.media.id.slice(0, 8)}</span></>
                    )}
                    <span className="ml-2">{new Date(item.createdAt).toLocaleDateString("pt-BR")}</span>
                  </p>

                  {item.note && (
                    <p className="text-sm text-gray-300 mt-1">"{item.note}"</p>
                  )}

                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">Ver payload</summary>
                    <pre className="mt-1 text-xs text-gray-400 bg-gray-800 rounded p-2 overflow-x-auto">
                      {JSON.stringify(item.payload, null, 2)}
                    </pre>
                  </details>
                </div>

                {statusTab === "PENDING" && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {actionLoading === item.id ? (
                      <Loader2 size={14} className="animate-spin text-gray-500" />
                    ) : (
                      <>
                        <button
                          onClick={() => { setAcceptModal(item); setRevenueSharePct(10); }}
                          className="flex items-center gap-1.5 rounded-lg bg-green-700/20 px-3 py-1.5 text-xs font-semibold text-green-400 hover:bg-green-700/30"
                        >
                          <CheckCircle size={12} /> Aceitar
                        </button>
                        <button
                          onClick={() => handleReject(item.id)}
                          className="flex items-center gap-1.5 rounded-lg bg-red-700/20 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-700/30"
                        >
                          <XCircle size={12} /> Rejeitar
                        </button>
                      </>
                    )}
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

      {/* Accept modal */}
      {acceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-950 p-6 space-y-4">
            <h2 className="font-bold text-white">Aceitar sugestão</h2>
            <p className="text-sm text-gray-400">
              Defina o percentual de receita a compartilhar com <span className="text-white">@{acceptModal.fan?.username}</span> pelo uso desta sugestão.
            </p>
            <div className="space-y-2">
              <label className="text-xs text-gray-400">Revenue share: <span className="text-white font-semibold">{revenueSharePct}%</span></label>
              <input
                type="range" min={0} max={50} step={5}
                value={revenueSharePct}
                onChange={(e) => setRevenueSharePct(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-xs text-gray-600">
                <span>0%</span><span>25%</span><span>50%</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAcceptModal(null)} className="flex-1 rounded-lg border border-gray-700 py-2 text-sm text-gray-400">
                Cancelar
              </button>
              <button
                onClick={() => handleAccept(acceptModal.id, revenueSharePct)}
                className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
