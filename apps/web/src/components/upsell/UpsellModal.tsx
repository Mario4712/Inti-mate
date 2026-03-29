"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

interface UpsellModalProps {
  type:       "exit_intent" | "post_purchase" | "welcome_trial";
  creatorId?: string;
  creatorName?: string;
  planId?:    string;
  trialDays?: number;
  relatedCount?: number;          // para post_purchase: "X conteúdos a mais"
  onAccept:   () => void;
  onDismiss:  () => void;
}

const SESSION_KEY = "upsell_dismissed";
const MAX_SHOWS_PER_SESSION = 1; // cada tipo abre no máximo 1x por sessão

function hasShownThisSession(type: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const data = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "{}");
    return (data[type] ?? 0) >= MAX_SHOWS_PER_SESSION;
  } catch {
    return false;
  }
}

function markShown(type: string) {
  if (typeof window === "undefined") return;
  try {
    const data = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "{}");
    data[type] = (data[type] ?? 0) + 1;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {}
}

export function UpsellModal({
  type, creatorName, trialDays = 7, relatedCount = 0,
  onAccept, onDismiss,
}: UpsellModalProps) {
  const [visible, setVisible] = useState(false);
  const hasMarked = useRef(false);

  useEffect(() => {
    if (hasShownThisSession(type)) {
      onDismiss();
      return;
    }
    setVisible(true);
    if (!hasMarked.current) {
      markShown(type);
      hasMarked.current = true;
    }
  }, [type, onDismiss]);

  const dismiss = () => {
    setVisible(false);
    onDismiss();
  };

  if (!visible) return null;

  const content = {
    exit_intent: {
      title:   `Antes de sair…`,
      body:    `${creatorName ?? "Este criador"} tem conteúdo exclusivo esperando por você.`,
      accept:  "Ver planos",
      dismiss: "Não, obrigado",
    },
    post_purchase: {
      title:   "Você vai adorar isso também",
      body:    relatedCount > 0
        ? `${creatorName ?? "Este criador"} tem mais ${relatedCount} conteúdos exclusivos disponíveis para assinantes.`
        : `Assine ${creatorName ?? "este criador"} para acesso ilimitado.`,
      accept:  "Ver mais",
      dismiss: "Fechar",
    },
    welcome_trial: {
      title:   `${trialDays} dias grátis para você`,
      body:    `Experimente a assinatura de ${creatorName ?? "este criador"} por ${trialDays} dias sem cobrança.`,
      accept:  `Começar trial grátis`,
      dismiss: "Agora não",
    },
  }[type];

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upsell-title"
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-700 p-6 shadow-2xl">
        {/* Botão X — sempre visível, sem loop de reabertura */}
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 rounded-full p-1 text-gray-400 transition hover:bg-gray-700 hover:text-white"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        <h2 id="upsell-title" className="pr-8 text-lg font-semibold text-white">
          {content.title}
        </h2>
        <p className="mt-2 text-sm text-gray-300">{content.body}</p>

        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={() => { setVisible(false); onAccept(); }}
            className="w-full rounded-xl bg-purple-600 py-2.5 text-sm font-medium text-white transition hover:bg-purple-500 active:scale-95"
          >
            {content.accept}
          </button>
          <button
            onClick={dismiss}
            className="w-full rounded-xl py-2 text-sm text-gray-400 transition hover:text-white"
          >
            {content.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
}
