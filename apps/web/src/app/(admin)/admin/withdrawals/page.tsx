"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, CheckCircle, Loader2, X } from "lucide-react";
import api from "@/lib/api";

interface WithdrawalRow {
  id: string;
  userId: string;
  username: string;
  artisticName: string;
  amountBrl: string;
  pixKeyType: string | null;
  pixKey: string | null;
  status: string;
  scheduledDate: string | null;
  processedAt: string | null;
  createdAt: string;
}

const STATUS_TABS = [
  { value: "PENDING",    label: "Pendentes" },
  { value: "PROCESSING", label: "Em processo" },
  { value: "COMPLETED",  label: "Concluídos" },
  { value: "FAILED",     label: "Falhos" },
];

export default function AdminWithdrawalsPage() {
  const [items, setItems] = useState<WithdrawalRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusTab, setStatusTab] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [failModal, setFailModal] = useState<WithdrawalRow | null>(null);
  const [failReason, setFailReason] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/withdrawals?status=${statusTab}&page=${page}&limit=20`)
      .then((r) => {
        setItems(r.data.items);
        setTotal(r.data.pagination.total);
        setPages(r.data.pagination.pages);
      })
      .finally(() => setLoading(false));
  }, [statusTab, page]);

  useEffect(() => { load(); }, [load]);

  async function handleProcess(id: string, newStatus: "COMPLETED" | "FAILED", reason?: string) {
    setActionLoading(id);
    setError("");
    try {
      await api.patch(`/admin/withdrawals/${id}/process`, { status: newStatus, ...(reason ? { failureReason: reason } : {}) });
      setFailModal(null);
      setFailReason("");
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
        <h1 className="text-2xl font-bold text-white">Saques</h1>
        <p className="mt-1 text-gray-400">{total} saque{total !== 1 ? "s" : ""}</p>
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

      <div className="overflow-hidden rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800 bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Criador</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Valor</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Chave PIX</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Solicitado em</th>
              {statusTab === "PENDING" && (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Ações</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr><td colSpan={5} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-600" /></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-gray-500">Nenhum saque neste status</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="bg-gray-900/50 hover:bg-gray-900">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{item.artisticName || item.username}</p>
                  <p className="text-xs text-gray-500">@{item.username}</p>
                </td>
                <td className="px-4 py-3 font-semibold text-green-400">
                  R$ {item.amountBrl}
                </td>
                <td className="px-4 py-3">
                  {item.pixKey ? (
                    <div>
                      <p className="text-xs text-gray-400 uppercase">{item.pixKeyType}</p>
                      <p className="text-xs text-gray-300 font-mono">{item.pixKey}</p>
                    </div>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                </td>
                {statusTab === "PENDING" && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {actionLoading === item.id ? (
                        <Loader2 size={14} className="animate-spin text-gray-500" />
                      ) : (
                        <>
                          <button
                            onClick={() => handleProcess(item.id, "COMPLETED")}
                            className="flex items-center gap-1.5 rounded-lg bg-green-700/20 px-3 py-1.5 text-xs font-semibold text-green-400 hover:bg-green-700/30"
                          >
                            <CheckCircle size={12} /> Pago
                          </button>
                          <button
                            onClick={() => { setFailModal(item); setFailReason(""); }}
                            className="flex items-center gap-1.5 rounded-lg bg-red-700/20 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-700/30"
                          >
                            <X size={12} /> Falhou
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

      {/* Modal falha */}
      {failModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-950 p-6 space-y-4">
            <h2 className="font-bold text-white">Marcar saque como falho</h2>
            <p className="text-sm text-gray-400">
              Criador: <span className="text-white">@{failModal.username}</span>
              <span className="ml-2 font-semibold text-green-400">R$ {failModal.amountBrl}</span>
            </p>
            <p className="text-xs text-gray-500">O valor será devolvido ao saldo do criador.</p>
            <textarea
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
              placeholder="Motivo da falha (opcional)..."
              rows={3}
              className="w-full resize-none rounded-lg bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-red-500"
            />
            <div className="flex gap-3">
              <button onClick={() => setFailModal(null)} className="flex-1 rounded-lg border border-gray-700 py-2 text-sm text-gray-400">
                Cancelar
              </button>
              <button
                onClick={() => handleProcess(failModal.id, "FAILED", failReason || undefined)}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Confirmar falha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
