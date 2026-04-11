"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import api from "@/lib/api";

interface KycRow {
  id: string;
  userId: string;
  username: string;
  email: string;
  artisticName: string;
  status: string;
  documentType: string | null;
  verifiedAt: string | null;
  rejectedAt: string | null;
  rejectedReason: string | null;
  createdAt: string;
}

const STATUS_TABS = [
  { value: "PENDING",  label: "Pendentes" },
  { value: "APPROVED", label: "Aprovados" },
  { value: "REJECTED", label: "Rejeitados" },
];

export default function AdminKycPage() {
  const [items, setItems] = useState<KycRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusTab, setStatusTab] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [rejectModal, setRejectModal] = useState<KycRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/kyc?status=${statusTab}&page=${page}&limit=20`)
      .then((r) => {
        setItems(r.data.items);
        setTotal(r.data.pagination.total);
        setPages(r.data.pagination.pages);
      })
      .finally(() => setLoading(false));
  }, [statusTab, page]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(userId: string) {
    setActionLoading(userId);
    setError("");
    try {
      await api.patch(`/admin/kyc/${userId}/approve`);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Erro");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(item: KycRow) {
    if (!rejectReason.trim()) return;
    setActionLoading(item.userId);
    setError("");
    try {
      await api.patch(`/admin/kyc/${item.userId}/reject`, { reason: rejectReason });
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
        <h1 className="text-2xl font-bold text-white">Verificação de identidade (KYC)</h1>
        <p className="mt-1 text-gray-400">{total} verificação{total !== 1 ? "ões" : ""}</p>
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
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Usuário</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Documento</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Enviado em</th>
              {statusTab === "REJECTED" && (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Motivo</th>
              )}
              {statusTab === "PENDING" && (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Ações</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr><td colSpan={5} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-600" /></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-gray-500">Nenhum KYC neste status</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="bg-gray-900/50 hover:bg-gray-900">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{item.artisticName || item.username}</p>
                  <p className="text-xs text-gray-500">@{item.username} · {item.email}</p>
                </td>
                <td className="px-4 py-3 text-gray-300">{item.documentType ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                </td>
                {statusTab === "REJECTED" && (
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-xs text-red-400 truncate">{item.rejectedReason ?? "—"}</p>
                  </td>
                )}
                {statusTab === "PENDING" && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {actionLoading === item.userId ? (
                        <Loader2 size={14} className="animate-spin text-gray-500" />
                      ) : (
                        <>
                          <button
                            onClick={() => handleApprove(item.userId)}
                            className="flex items-center gap-1.5 rounded-lg bg-green-700/20 px-3 py-1.5 text-xs font-semibold text-green-400 hover:bg-green-700/30"
                          >
                            <CheckCircle size={12} /> Aprovar
                          </button>
                          <button
                            onClick={() => { setRejectModal(item); setRejectReason(""); }}
                            className="flex items-center gap-1.5 rounded-lg bg-red-700/20 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-700/30"
                          >
                            <X size={12} /> Rejeitar
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

      {/* Modal rejeitar */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-950 p-6 space-y-4">
            <h2 className="font-bold text-white">Rejeitar KYC</h2>
            <p className="text-sm text-gray-400">Usuário: <span className="text-white">@{rejectModal.username}</span></p>
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
