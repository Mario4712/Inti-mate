"use client";

import { useEffect, useState, useCallback } from "react";
import { ShieldCheck, ShieldOff, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/lib/api";

interface VerifiedUser {
  userId: string;
  status: string;
  grantedAt: string;
}

export default function AdminVerifiedTierPage() {
  const [items, setItems] = useState<VerifiedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const LIMIT = 20;

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/verified-tier?page=${page}&limit=${LIMIT}`)
      .then((r) => {
        setItems(r.data.items ?? []);
        setTotal(r.data.total ?? 0);
        setPages(Math.ceil((r.data.total ?? 0) / LIMIT) || 1);
      })
      .catch(() => setMessage({ type: "error", text: "Erro ao carregar lista." }))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function handleRevoke(userId: string) {
    if (!confirm("Revogar Acesso Verificado deste usuário?")) return;
    setActionLoading(userId);
    setMessage(null);
    try {
      await api.patch(`/admin/verified-tier/${userId}/revoke`);
      setMessage({ type: "success", text: "Acesso revogado." });
      load();
    } catch (e: any) {
      setMessage({ type: "error", text: e?.response?.data?.message ?? "Erro ao revogar." });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleApprove(userId: string) {
    setActionLoading(userId);
    setMessage(null);
    try {
      await api.patch(`/admin/verified-tier/${userId}/approve`);
      setMessage({ type: "success", text: "Acesso Verificado concedido." });
      load();
    } catch (e: any) {
      setMessage({ type: "error", text: e?.response?.data?.message ?? "Erro ao conceder acesso." });
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Acesso Verificado</h1>
        <p className="mt-1 text-sm text-gray-400">
          {total} usuário{total !== 1 ? "s" : ""} com Acesso Verificado ativo.
        </p>
      </div>

      {message && (
        <div className={`rounded-lg px-4 py-2 text-sm ${
          message.type === "success" ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
        }`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <ShieldCheck size={32} className="mb-3 opacity-40" />
          <p>Nenhum usuário com Acesso Verificado ativo.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/60 text-left text-xs text-gray-400">
                <th className="px-4 py-3">ID do usuário</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Concedido em</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {items.map((item) => (
                <tr key={item.userId} className="bg-gray-950 hover:bg-gray-900/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">{item.userId}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.status === "ACTIVE"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(item.grantedAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {actionLoading === item.userId ? (
                      <Loader2 size={14} className="inline animate-spin text-gray-500" />
                    ) : item.status === "ACTIVE" ? (
                      <button
                        onClick={() => handleRevoke(item.userId)}
                        className="flex items-center gap-1.5 rounded-lg bg-red-700/20 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-700/30 ml-auto"
                      >
                        <ShieldOff size={12} /> Revogar
                      </button>
                    ) : (
                      <button
                        onClick={() => handleApprove(item.userId)}
                        className="flex items-center gap-1.5 rounded-lg bg-green-700/20 px-3 py-1.5 text-xs font-semibold text-green-400 hover:bg-green-700/30 ml-auto"
                      >
                        <ShieldCheck size={12} /> Restaurar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
    </div>
  );
}
