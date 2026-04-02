"use client";

import { useEffect, useState } from "react";
import { Users, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/lib/api";

interface Subscriber {
  id: string;
  status: string;
  interval: string;
  currentPeriodEnd: string;
  plan: { name: string };
}

interface PageData {
  items: Subscriber[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export default function SubscribersPage() {
  const [data, setData] = useState<PageData | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/subscriptions/subscribers?page=${page}`)
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Assinantes</h1>
          <p className="mt-1 text-gray-400">
            {data ? `${data.pagination.total} assinante${data.pagination.total !== 1 ? "s" : ""} ativo${data.pagination.total !== 1 ? "s" : ""}` : "Carregando..."}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-purple-500" />
        </div>
      ) : !data?.items.length ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <Users size={48} className="text-gray-700" />
          <p className="mt-4 text-lg font-medium text-gray-400">Nenhum assinante ainda</p>
          <p className="mt-1 text-sm text-gray-600">Compartilhe seu perfil para atrair novos fãs</p>
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500">
                  <th className="pb-3 font-medium">Plano</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Intervalo</th>
                  <th className="pb-3 font-medium">Renovação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.items.map((sub) => (
                  <tr key={sub.id}>
                    <td className="py-3 font-medium text-gray-200">{sub.plan.name}</td>
                    <td className="py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          sub.status === "ACTIVE"
                            ? "bg-green-900/40 text-green-400"
                            : "bg-yellow-900/40 text-yellow-400"
                        }`}
                      >
                        {sub.status === "ACTIVE" ? "Ativo" : sub.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400">{sub.interval === "MONTHLY" ? "Mensal" : sub.interval}</td>
                    <td className="py-3 text-gray-400">
                      {new Date(sub.currentPeriodEnd).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm text-gray-400">
                Página {page} de {data.pagination.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data!.pagination.pages, p + 1))}
                disabled={page >= data.pagination.pages}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
