"use client";

import { useEffect, useState } from "react";
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react";
import api from "@/lib/api";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  metadata: Record<string, any> | null;
}

const TYPE_LABELS: Record<string, string> = {
  NEW_SUBSCRIBER: "Novo assinante",
  NEW_MESSAGE: "Nova mensagem",
  CONTENT_APPROVED: "Conteúdo aprovado",
  CONTENT_REJECTED: "Conteúdo rejeitado",
  PAYMENT_RECEIVED: "Pagamento recebido",
  WITHDRAWAL_PAID: "Saque pago",
  WITHDRAWAL_FAILED: "Falha no saque",
  LIVE_STARTED: "Live iniciada",
  SUBSCRIPTION_CANCELLED: "Assinatura cancelada",
  SUBSCRIPTION_RENEWED: "Assinatura renovada",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  function load(p = 1) {
    setLoading(true);
    api.get(`/notifications?page=${p}&limit=20`)
      .then((r) => {
        setNotifications(Array.isArray(r.data) ? r.data : r.data?.items ?? []);
        setTotal(r.data?.total ?? 0);
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(page); }, [page]);

  async function markRead(id: string) {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }

  async function markAllRead() {
    setMarkingAll(true);
    await api.patch("/notifications/read-all").catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setMarkingAll(false);
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Notificações</h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-purple-400 hover:bg-gray-800 disabled:opacity-50"
          >
            {markingAll ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
            Marcar todas como lidas
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-purple-500" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-16 text-center">
          <Bell size={36} className="mx-auto mb-3 text-gray-700" />
          <p className="text-gray-500">Nenhuma notificação por enquanto.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.isRead && markRead(n.id)}
              className={`w-full rounded-xl px-4 py-3.5 text-left transition-colors ${
                n.isRead ? "bg-transparent hover:bg-gray-900" : "bg-gray-900 hover:bg-gray-800"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? "bg-transparent" : "bg-purple-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs font-medium uppercase tracking-wide ${n.isRead ? "text-gray-600" : "text-purple-400"}`}>
                      {TYPE_LABELS[n.type] ?? n.type}
                    </p>
                    <span className="shrink-0 text-xs text-gray-600">
                      {new Date(n.createdAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {n.title && (
                    <p className={`mt-0.5 text-sm font-medium ${n.isRead ? "text-gray-400" : "text-white"}`}>
                      {n.title}
                    </p>
                  )}
                  {n.body && (
                    <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">{n.body}</p>
                  )}
                </div>
                {!n.isRead && (
                  <Check size={14} className="mt-1 shrink-0 text-gray-600 hover:text-purple-400" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2 pt-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 disabled:opacity-40 hover:bg-gray-800"
          >
            Anterior
          </button>
          <span className="flex items-center px-3 text-sm text-gray-500">
            {page} / {Math.ceil(total / 20)}
          </span>
          <button
            disabled={page >= Math.ceil(total / 20)}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 disabled:opacity-40 hover:bg-gray-800"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
