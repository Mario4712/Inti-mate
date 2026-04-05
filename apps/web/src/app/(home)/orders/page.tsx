"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, Loader2, Download, Clock, CheckCircle, XCircle } from "lucide-react";
import api from "@/lib/api";

interface Order {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "DELIVERED" | "CANCELLED";
  totalPaid: number;
  message: string | null;
  deliveryUrl: string | null;
  createdAt: string;
  deliveredAt: string | null;
  item: {
    id: string;
    title: string;
    type: string;
    deliveryDays: number;
  };
  creator: {
    id: string;
    artisticName: string;
    username: string;
  };
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Aguardando",
  IN_PROGRESS: "Em andamento",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "text-yellow-400",
  IN_PROGRESS: "text-blue-400",
  DELIVERED: "text-green-400",
  CANCELLED: "text-gray-500",
};

const TYPE_LABEL: Record<string, string> = {
  PHOTO_PACK: "Pack de Fotos",
  VIDEO_PACK: "Pack de Vídeos",
  CUSTOM_REQUEST: "Pedido Personalizado",
  VOICE_MESSAGE: "Mensagem de Voz",
  OTHER: "Outro",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.get(`/digital-items/orders/mine?page=${page}&limit=20`)
      .then((r) => {
        setOrders(Array.isArray(r.data) ? r.data : r.data?.items ?? []);
        setTotal(r.data?.total ?? 0);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <ShoppingBag size={22} className="text-purple-400" />
        <h1 className="text-2xl font-bold text-white">Meus Pedidos</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-purple-500" />
        </div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center">
          <ShoppingBag size={36} className="mx-auto mb-3 text-gray-700" />
          <p className="text-gray-500">Nenhum pedido ainda.</p>
          <a href="/shop" className="mt-2 inline-block text-sm text-purple-400 hover:underline">Explorar loja →</a>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-white">{order.item.title}</p>
                    <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                      {TYPE_LABEL[order.item.type] ?? order.item.type}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    por {order.creator.artisticName} · prazo {order.item.deliveryDays} dias úteis
                  </p>
                  {order.message && (
                    <p className="mt-1 text-xs text-gray-600 italic">"{order.message}"</p>
                  )}
                  <p className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                    <Clock size={10} />
                    {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-white">
                    R$ {order.totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className={`mt-1 flex items-center justify-end gap-1 text-xs font-medium ${STATUS_COLOR[order.status]}`}>
                    {order.status === "DELIVERED" && <CheckCircle size={11} />}
                    {order.status === "CANCELLED" && <XCircle size={11} />}
                    {STATUS_LABEL[order.status]}
                  </p>
                </div>
              </div>

              {order.deliveryUrl && (
                <a
                  href={order.deliveryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-2 rounded-lg bg-green-900/30 px-3 py-2 text-sm font-medium text-green-400 hover:bg-green-900/50 transition-colors"
                >
                  <Download size={15} /> Baixar conteúdo
                </a>
              )}
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
