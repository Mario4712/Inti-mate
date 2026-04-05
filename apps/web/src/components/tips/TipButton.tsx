"use client";

import { useState } from "react";
import { Heart, Loader2, X } from "lucide-react";
import api from "@/lib/api";

interface Props {
  creatorId: string;
  creatorName: string;
}

const PRESET_AMOUNTS = [2, 5, 10, 20, 50];

export function TipButton({ creatorId, creatorName }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("5");
  const [message, setMessage] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val < 2) { setError("Valor mínimo: R$ 2,00"); return; }
    setError("");
    setSending(true);
    try {
      await api.post("/tips", {
        creatorId,
        amount: val,
        message: message.trim() || undefined,
        isPublic,
      });
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setOpen(false); setAmount("5"); setMessage(""); }, 2000);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Erro ao enviar gorjeta.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-pink-600/20 px-3 py-2 text-sm font-medium text-pink-400 transition-colors hover:bg-pink-600/30"
      >
        <Heart size={15} /> Gorjeta
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-950 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Enviar gorjeta</h2>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-300">
                <X size={18} />
              </button>
            </div>

            {success ? (
              <div className="py-6 text-center">
                <Heart size={36} className="mx-auto mb-2 text-pink-500" />
                <p className="text-lg font-bold text-white">Gorjeta enviada!</p>
                <p className="mt-1 text-sm text-gray-400">Obrigado por apoiar {creatorName}.</p>
              </div>
            ) : (
              <form onSubmit={handleSend} className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs text-gray-400">Valor (R$)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {PRESET_AMOUNTS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setAmount(String(a))}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          amount === String(a) ? "bg-pink-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        }`}
                      >
                        R$ {a}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="2"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-lg bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs text-gray-400">Mensagem (opcional)</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={280}
                    rows={2}
                    placeholder="Deixe uma mensagem..."
                    className="w-full resize-none rounded-lg bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="accent-pink-500"
                  />
                  Exibir meu nome no ranking público
                </label>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={sending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-pink-600 py-3 font-semibold text-white transition-colors hover:bg-pink-700 disabled:opacity-50"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Heart size={16} />}
                  Enviar R$ {parseFloat(amount || "0").toFixed(2)}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
