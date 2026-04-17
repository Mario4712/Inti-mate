"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Check, CreditCard, Loader2, Lock, Users } from "lucide-react";
import api from "@/lib/api";

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  isActive: boolean;
}

interface Creator {
  id: string;
  username: string;
  artisticName: string;
  bio: string;
  avatarUrl: string | null;
  subscriberCount: number;
}

export default function SubscribePage() {
  // O parâmetro da URL agora é username (ex: /subscribe/joaosilva?plan=...)
  const { creatorId: usernameParam } = useParams<{ creatorId: string }>();
  const router = useRouter();

  const [creator, setCreator] = useState<Creator | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [interval, setInterval] = useState<"MONTHLY" | "QUARTERLY" | "YEARLY">("MONTHLY");
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Detecta se é UUID (ID) ou username
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(usernameParam)
    || /^c[a-z0-9]{24}$/i.test(usernameParam); // cuid format

  useEffect(() => {
    if (!usernameParam) return;

    const creatorEndpoint = isUuid
      ? null // sem endpoint por UUID — requer username
      : api.get(`/users/creator/${usernameParam}`).catch(() => ({ data: null }));

    const creatorPromise = creatorEndpoint ?? Promise.resolve({ data: null });

    creatorPromise.then(async (creatorRes) => {
      const creatorData = creatorRes.data;
      if (creatorData) {
        setCreator(creatorData);
        const creatorId = creatorData.id;

        // Verifica se já é assinante ativo — redireciona se sim
        try {
          const subsRes = await api.get("/subscriptions/mine");
          const subs = Array.isArray(subsRes.data) ? subsRes.data : (subsRes.data?.items ?? []);
          const alreadySubscribed = subs.some(
            (s: any) => s.creatorId === creatorId && ["ACTIVE", "PAST_DUE"].includes(s.status)
          );
          if (alreadySubscribed) {
            router.replace(`/creator/${creatorData.username}`);
            return;
          }
        } catch { /* não bloqueia se falhar */ }

        // Busca planos do criador
        api.get(`/subscriptions/plans/creator/${creatorId}`)
          .then((plansRes) => {
            const activePlans = (Array.isArray(plansRes.data) ? plansRes.data : [])
              .filter((p: Plan) => p.isActive)
              .map((p: Plan) => ({
                ...p,
                monthlyPrice: Math.round(Number(p.monthlyPrice)) / 100,
              }));
            setPlans(activePlans);
            if (activePlans.length > 0) setSelectedPlan(activePlans[0].id);
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));
  }, [usernameParam, isUuid]);

  const multiplier = interval === "MONTHLY" ? 1 : interval === "QUARTERLY" ? 3 * 0.95 : 12 * 0.85;
  const discount = interval === "QUARTERLY" ? "5% off" : interval === "YEARLY" ? "15% off" : null;

  async function handleSubscribe() {
    if (!selectedPlan || !creator) return;
    setError("");
    setSubscribing(true);
    try {
      // SubscribeDto espera: planId, provider, paymentToken
      // Para MVP/mock, usamos provider "pagarme" com token mock
      await api.post("/subscriptions/subscribe", {
        planId: selectedPlan,
        provider: "pagarme",
        paymentToken: "mock-token",
      });
      setSuccess(true);
      setTimeout(() => router.push(`/creator/${creator.username}`), 2500);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? "";
      if (msg.includes("assinatura ativa")) {
        router.replace(`/creator/${creator!.username}`);
        return;
      }
      setError(msg || "Erro ao processar assinatura. Tente novamente.");
    } finally {
      setSubscribing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
            <Check size={32} className="text-green-400" />
          </div>
        </div>
        <h2 className="mb-2 text-2xl font-bold text-white">Assinatura confirmada!</h2>
        <p className="text-gray-400">Você agora tem acesso ao conteúdo exclusivo de {creator?.artisticName}.</p>
        <p className="mt-2 text-sm text-gray-500">Redirecionando...</p>
      </div>
    );
  }

  const selected = plans.find((p) => p.id === selectedPlan);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-white">Assinar criador</h1>

      {/* Creator info */}
      {creator && (
        <div className="mb-6 flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gray-700">
            {creator.avatarUrl ? (
              <Image src={creator.avatarUrl} alt={creator.artisticName} fill className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xl font-bold text-gray-300">
                {creator.artisticName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="font-semibold text-white">{creator.artisticName}</p>
            <p className="text-sm text-gray-400">@{creator.username}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
              <Users size={11} /> {creator.subscriberCount?.toLocaleString("pt-BR")} assinantes
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Plans */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Escolha um plano</h2>
          {plans.length === 0 ? (
            <p className="text-sm text-gray-500">Este criador não possui planos ativos.</p>
          ) : (
            plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                  selectedPlan === plan.id
                    ? "border-purple-500 bg-purple-600/10"
                    : "border-gray-700 bg-gray-900 hover:border-gray-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{plan.name}</span>
                  <span className="text-lg font-bold text-purple-400">
                    R$ {(Number(plan.monthlyPrice) * multiplier).toFixed(2)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-400">{plan.description}</p>
                <p className="mt-1 text-xs text-gray-500">R$ {Number(plan.monthlyPrice).toFixed(2)}/mês</p>
              </button>
            ))
          )}
        </div>

        {/* Interval + checkout */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Período</h2>
            {(["MONTHLY", "QUARTERLY", "YEARLY"] as const).map((iv) => {
              const labels = { MONTHLY: "Mensal", QUARTERLY: "Trimestral", YEARLY: "Anual" };
              const discounts = { MONTHLY: null, QUARTERLY: "5% off", YEARLY: "15% off" };
              return (
                <button
                  key={iv}
                  onClick={() => setInterval(iv)}
                  className={`flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                    interval === iv
                      ? "border-purple-500 bg-purple-600/10 text-white"
                      : "border-gray-700 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  <span>{labels[iv]}</span>
                  {discounts[iv] && (
                    <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                      {discounts[iv]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Summary */}
          {selected && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Plano</span>
                <span>{selected.name}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Período</span>
                <span>{{ MONTHLY: "Mensal", QUARTERLY: "Trimestral", YEARLY: "Anual" }[interval]}</span>
              </div>
              {discount && (
                <div className="flex justify-between text-green-400">
                  <span>Desconto</span>
                  <span>{discount}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-800 pt-2 font-semibold text-white">
                <span>Total</span>
                <span>R$ {(Number(selected.monthlyPrice) * multiplier).toFixed(2)}</span>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          <button
            onClick={handleSubscribe}
            disabled={!selectedPlan || subscribing || plans.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
          >
            {subscribing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Lock size={16} />
                Confirmar assinatura
              </>
            )}
          </button>
          <p className="text-center text-xs text-gray-500 flex items-center justify-center gap-1">
            <CreditCard size={12} /> Pagamento seguro via PIX / Cartão
          </p>
        </div>
      </div>
    </div>
  );
}
