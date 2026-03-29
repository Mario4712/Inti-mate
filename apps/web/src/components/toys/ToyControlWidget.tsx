"use client";

import { useState } from "react";
import api from "@/lib/api";

interface ToyControlWidgetProps {
  sessionId:    string;
  maxIntensity: number;          // cap definido pelo criador
  pricePerMin:  number;          // centavos
  minPayCents:  number;
}

const DURATION_OPTIONS = [
  { label: "30s", seconds: 30  },
  { label: "1m",  seconds: 60  },
  { label: "2m",  seconds: 120 },
  { label: "5m",  seconds: 300 },
];

export function ToyControlWidget({
  sessionId,
  maxIntensity,
  pricePerMin,
  minPayCents,
}: ToyControlWidgetProps) {
  const [intensity, setIntensity] = useState(Math.min(30, maxIntensity));
  const [duration,  setDuration]  = useState(60);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [success,   setSuccess]   = useState(false);

  const cost = Math.max(minPayCents, Math.ceil((duration / 60) * pricePerMin));

  const handleActivate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await api.post(`/toys/session/${sessionId}/control`, { durationSec: duration, intensity });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Erro ao ativar controle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5 space-y-4 max-w-sm">
      <div>
        <h3 className="font-semibold text-white">Controle Remoto</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Intensidade máxima permitida: {maxIntensity}%
        </p>
      </div>

      {/* Intensidade */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Intensidade: <span className="text-white font-medium">{intensity}%</span>
        </label>
        <input
          type="range"
          min={0}
          max={maxIntensity}
          value={intensity}
          onChange={(e) => setIntensity(Number(e.target.value))}
          className="w-full accent-purple-500"
        />
      </div>

      {/* Duração */}
      <div>
        <p className="text-xs text-gray-400 mb-1">Duração</p>
        <div className="flex gap-2">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.seconds}
              onClick={() => setDuration(opt.seconds)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition ${
                duration === opt.seconds
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custo */}
      <div className="rounded-xl bg-gray-800 px-4 py-3 text-center">
        <p className="text-2xl font-bold text-white">
          R$ {(cost / 100).toFixed(2)}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          R$ {(pricePerMin / 100).toFixed(2)}/min · inclui taxa 20%
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-900/40 px-3 py-2 text-xs text-red-400">{error}</p>
      )}

      {success && (
        <p className="rounded-lg bg-green-900/40 px-3 py-2 text-xs text-green-400">
          Controle ativado! Aproveite 🎉
        </p>
      )}

      <button
        onClick={handleActivate}
        disabled={loading}
        className="w-full rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white transition hover:bg-purple-500 active:scale-95 disabled:opacity-40"
      >
        {loading ? "Ativando…" : "Ativar Controle"}
      </button>

      <p className="text-center text-xs text-gray-600">
        O criador definiu os limites desta sessão e pode encerrá-la a qualquer momento.
      </p>
    </div>
  );
}
