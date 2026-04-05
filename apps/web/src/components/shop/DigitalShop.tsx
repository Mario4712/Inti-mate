"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, Package, Loader2, X, Send } from "lucide-react";
import api from "@/lib/api";

interface DigitalItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  price: number;
  deliveryDays: number;
  isActive: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  PHOTO_PACK: "Pack de Fotos",
  VIDEO_PACK: "Pack de Vídeos",
  CUSTOM_REQUEST: "Pedido Personalizado",
  VOICE_MESSAGE: "Mensagem de Voz",
  OTHER: "Outro",
};

interface Props {
  creatorId: string;
}

export function DigitalShop({ creatorId }: Props) {
  const [items, setItems] = useState<DigitalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState<DigitalItem | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderError, setOrderError] = useState("");

  useEffect(() => {
    api.get(`/digital-items/catalog/${creatorId}`)
      .then((r) => setItems((Array.isArray(r.data) ? r.data : r.data?.items ?? []).filter((i: DigitalItem) => i.isActive)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [creatorId]);

  async function handleOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!ordering) return;
    setSending(true);
    setOrderError("");
    try {
      await api.post("/digital-items/orders", {
        itemId: ordering.id,
        message: message.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setOrdering(null); setMessage(""); }, 2500);
    } catch (e: any) {
      setOrderError(e?.response?.data?.message ?? "Erro ao realizar pedido.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <>
      <section className="mt-8" aria-labelledby="shop-heading">
        <div className="mb-4 flex items-center gap-2">
          <ShoppingBag size={18} className="text-purple-400" />
          <h2 id="shop-heading" className="text-xl font-semibold text-white">Loja Digital</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setOrdering(item)}
              className="flex items-start gap-3 rounded-xl border border-gray-700 bg-gray-900 p-4 text-left transition-colors hover:border-purple-600"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-600/20">
                <Package size={18} className="text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white">{item.title}</p>
                <p className="mt-0.5 text-xs text-gray-500">{TYPE_LABEL[item.type] ?? item.type} · {item.deliveryDays} dias úteis</p>
                {item.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-gray-600">{item.description}</p>
                )}
              </div>
              <p className="shrink-0 text-sm font-bold text-purple-400">
                R$ {item.price.toFixed(2)}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Order modal */}
      {ordering && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-950 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Confirmar pedido</h2>
              <button onClick={() => setOrdering(null)} className="text-gray-500 hover:text-gray-300">
                <X size={18} />
              </button>
            </div>

            {success ? (
              <div className="py-6 text-center">
                <ShoppingBag size={36} className="mx-auto mb-2 text-green-500" />
                <p className="text-lg font-bold text-white">Pedido realizado!</p>
                <p className="mt-1 text-sm text-gray-400">Acompanhe em <a href="/orders" className="text-purple-400 hover:underline">Meus Pedidos</a>.</p>
              </div>
            ) : (
              <form onSubmit={handleOrder} className="space-y-4">
                <div className="rounded-lg bg-gray-900 p-3">
                  <p className="font-semibold text-white">{ordering.title}</p>
                  <p className="text-xs text-gray-500">{TYPE_LABEL[ordering.type]} · prazo {ordering.deliveryDays} dias úteis</p>
                  <p className="mt-2 text-xl font-bold text-purple-400">R$ {ordering.price.toFixed(2)}</p>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs text-gray-400">Mensagem para o criador (opcional)</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    placeholder="Explique o que você espera receber..."
                    className="w-full resize-none rounded-lg bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {orderError && <p className="text-xs text-red-400">{orderError}</p>}

                <button
                  type="submit"
                  disabled={sending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Pedir — R$ {ordering.price.toFixed(2)}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
