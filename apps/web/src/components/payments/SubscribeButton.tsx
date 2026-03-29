"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { subscriptionsApi } from "@/lib/api";

interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  description?: string;
}

interface Props {
  plan: Plan;
  creatorName: string;
  onSuccess?: () => void;
}

export function SubscribeButton({ plan, creatorName, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  async function handleSubscribe() {
    setError("");
    setLoading(true);
    try {
      // Em produção: integrar com SDK do Pagar.me para tokenizar cartão
      // Aqui usamos um token mock para dev
      await subscriptionsApi.subscribe({
        planId: plan.id,
        provider: "pagarme",
        paymentToken: "mock_token_dev",
      });
      setShowModal(false);
      onSuccess?.();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Erro ao processar pagamento");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className="btn-primary w-full"
        onClick={() => setShowModal(true)}
      >
        Assinar — R$ {(plan.priceMonthly / 100).toFixed(2).replace(".", ",")}/mês
      </button>

      {/* Modal de confirmação */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Confirmar assinatura</h3>
            <p className="text-sm text-gray-400 mb-4">
              Você está assinando o plano <strong className="text-white">{plan.name}</strong> de{" "}
              <strong className="text-white">{creatorName}</strong>
            </p>

            {/* Breakdown de preço transparente */}
            <div className="rounded-lg bg-gray-800 p-3 text-sm space-y-1 mb-4">
              <div className="flex justify-between text-gray-300">
                <span>Valor do plano</span>
                <span>R$ {(plan.priceMonthly / 100).toFixed(2).replace(".", ",")}</span>
              </div>
              <div className="flex justify-between text-gray-500 text-xs">
                <span>Taxa da plataforma (20%)</span>
                <span>retida internamente</span>
              </div>
              <div className="flex justify-between font-bold text-white border-t border-gray-700 pt-1 mt-1">
                <span>Total cobrado</span>
                <span>R$ {(plan.priceMonthly / 100).toFixed(2).replace(".", ",")}</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              A assinatura renova automaticamente. Você pode cancelar a qualquer momento.
            </p>

            {error && (
              <div className="mb-3 rounded-lg bg-red-900/30 border border-red-800 px-3 py-2 text-xs text-red-300">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                className="btn-secondary flex-1"
                onClick={() => setShowModal(false)}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                className="btn-primary flex-1"
                onClick={handleSubscribe}
                disabled={loading}
              >
                {loading ? <><Loader2 size={14} className="animate-spin" /> Processando</> : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
