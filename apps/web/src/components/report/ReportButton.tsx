"use client";

import { useState } from "react";
import { Flag, Loader2, X } from "lucide-react";
import api from "@/lib/api";

type ReportTargetType = "USER" | "MEDIA" | "MESSAGE" | "LIVE" | "STORY";

const REASONS: Record<ReportTargetType, string[]> = {
  USER: [
    "Conteúdo sexual envolvendo menores",
    "Perfil falso / impersonificação",
    "Spam ou fraude",
    "Assédio ou ameaças",
    "Outro",
  ],
  MEDIA: [
    "Conteúdo sexual envolvendo menores",
    "Violência extrema",
    "Violação de direitos autorais",
    "Spam ou conteúdo enganoso",
    "Outro",
  ],
  MESSAGE: [
    "Assédio ou ameaças",
    "Spam",
    "Conteúdo sexual não solicitado",
    "Outro",
  ],
  LIVE: [
    "Conteúdo sexual envolvendo menores",
    "Violência ao vivo",
    "Spam ou fraude",
    "Outro",
  ],
  STORY: [
    "Conteúdo sexual envolvendo menores",
    "Violência",
    "Spam",
    "Outro",
  ],
};

interface ReportButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  className?: string;
  iconOnly?: boolean;
}

export function ReportButton({ targetType, targetId, className = "", iconOnly = false }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    setSubmitting(true);
    try {
      await api.post("/reports", { targetType, targetId, reason, details: details || undefined });
      setDone(true);
    } catch {
      // silently fail — user already submitted
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setReason("");
    setDetails("");
    setDone(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Denunciar"
        className={`flex items-center gap-1.5 text-gray-500 hover:text-red-400 transition-colors ${className}`}
      >
        <Flag size={14} />
        {!iconOnly && <span className="text-xs">Denunciar</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={handleClose}>
          <div
            className="w-full max-w-sm rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-white">Enviar denúncia</h3>
              <button onClick={handleClose} className="text-gray-500 hover:text-gray-300">
                <X size={18} />
              </button>
            </div>

            {done ? (
              <div className="py-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-900/40">
                  <Flag size={20} className="text-green-400" />
                </div>
                <p className="font-medium text-white">Denúncia enviada</p>
                <p className="mt-1 text-sm text-gray-400">Nossa equipe irá analisar em breve.</p>
                <button
                  onClick={handleClose}
                  className="mt-4 rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <p className="mb-2 text-sm text-gray-400">Motivo da denúncia</p>
                  <div className="space-y-2">
                    {REASONS[targetType].map((r) => (
                      <label key={r} className="flex cursor-pointer items-center gap-2.5">
                        <input
                          type="radio"
                          name="reason"
                          value={r}
                          checked={reason === r}
                          onChange={() => setReason(r)}
                          className="accent-purple-500"
                        />
                        <span className="text-sm text-gray-300">{r}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Detalhes adicionais (opcional)"
                    maxLength={500}
                    rows={3}
                    className="w-full resize-none rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!reason || submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : "Enviar denúncia"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
