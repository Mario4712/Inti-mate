"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import api from "@/lib/api";

interface ReportRow {
  id: string;
  contentId: string | null;
  reportedUserId: string | null;
  reporterUsername: string;
  reportedUsername: string | null;
  reason: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
}

const STATUS_TABS = [
  { value: "PENDING",  label: "Pendentes" },
  { value: "RESOLVED", label: "Resolvidos" },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING:  "bg-yellow-500/20 text-yellow-400",
  RESOLVED: "bg-green-500/20 text-green-400",
};

export default function AdminReportsPage() {
  const [items, setItems] = useState<ReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusTab, setStatusTab] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/reports?status=${statusTab}&page=${page}&limit=20`)
      .then((r) => {
        setItems(r.data.items);
        setTotal(r.data.pagination.total);
        setPages(r.data.pagination.pages);
      })
      .catch(() => setError("Erro ao carregar denúncias"))
      .finally(() => setLoading(false));
  }, [statusTab, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Denúncias</h1>
        <p className="mt-1 text-gray-400">{total} denúncia{total !== 1 ? "s" : ""}</p>
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
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Denunciante</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Denunciado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Motivo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr><td colSpan={5} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-600" /></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-gray-500">Nenhuma denúncia neste status</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="bg-gray-900/50 hover:bg-gray-900">
                <td className="px-4 py-3 text-sm text-gray-300">
                  @{item.reporterUsername}
                </td>
                <td className="px-4 py-3 text-sm text-gray-300">
                  {item.reportedUsername ? `@${item.reportedUsername}` : (
                    item.contentId ? (
                      <span className="text-xs text-gray-500">Conteúdo #{item.contentId.slice(0, 8)}</span>
                    ) : "—"
                  )}
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="text-xs text-gray-400 truncate">{item.reason}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status] ?? "bg-gray-700 text-gray-400"}`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                </td>
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
    </div>
  );
}
