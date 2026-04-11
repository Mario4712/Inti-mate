"use client";

import { useEffect, useState } from "react";
import { Radio, Plus, Users, Calendar, ExternalLink, StopCircle } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

interface Live {
  id: string;
  title: string;
  status: string;
  scheduledAt: string | null;
  startedAt: string | null;
  viewerCount: number;
  creatorId: string;
}

export default function LivesPage() {
  const { user } = useAuth();
  const [lives, setLives] = useState<Live[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [endingId, setEndingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    api
      .get(`/lives/creator/${user.id}`)
      .then((r) => setLives(Array.isArray(r.data) ? r.data : r.data?.lives ?? []))
      .catch(() => setError("Não foi possível carregar as lives"))
      .finally(() => setLoading(false));
  }, [user?.id]);

  async function endLive(id: string) {
    if (!confirm("Encerrar esta live?")) return;
    setEndingId(id);
    try {
      await api.patch(`/lives/${id}/end`);
      setLives((prev) => prev.map((l) => l.id === id ? { ...l, status: "ENDED" } : l));
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Erro ao encerrar live");
    } finally {
      setEndingId(null);
    }
  }

  async function createLive() {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post("/lives", {
        title: title.trim(),
        scheduledAt: scheduledAt || undefined,
      });
      setLives((prev) => [data, ...prev]);
      setTitle("");
      setScheduledAt("");
      setShowForm(false);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Erro ao criar live");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Lives</h1>
          <p className="mt-1 text-gray-400">Gerencie suas transmissões ao vivo</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          Nova Live
        </button>
      </div>

      {showForm && (
        <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-200">Criar nova live</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Título</label>
              <input
                type="text"
                className="input"
                placeholder="Título da live"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Agendamento (opcional)</label>
              <input
                type="datetime-local"
                className="input"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={createLive} disabled={creating || !title.trim()} className="btn-primary">
              {creating ? "Criando..." : "Criar"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:border-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-purple-500" />
          </div>
        ) : lives.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-800 py-16">
            <Radio size={40} className="text-gray-700" />
            <p className="mt-3 text-gray-400">Nenhuma live ainda</p>
            <p className="mt-1 text-sm text-gray-600">Crie sua primeira transmissão ao vivo</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lives.map((live) => (
              <div key={live.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-gray-200 line-clamp-2">{live.title}</h3>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      live.status === "LIVE"
                        ? "bg-red-900/50 text-red-400"
                        : live.status === "SCHEDULED"
                          ? "bg-yellow-900/50 text-yellow-400"
                          : "bg-gray-800 text-gray-500"
                    }`}
                  >
                    {live.status === "LIVE" ? "Ao vivo" : live.status === "SCHEDULED" ? "Agendada" : "Encerrada"}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  {live.viewerCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {live.viewerCount} espectadores
                    </span>
                  )}
                  {live.scheduledAt && (
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(live.scheduledAt).toLocaleString("pt-BR")}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  {live.status === "LIVE" && (
                    <a
                      href={`/lives/${live.id}`}
                      className="flex items-center gap-1 text-xs font-medium text-purple-400 hover:text-purple-300"
                    >
                      <ExternalLink size={12} />
                      Assistir ao vivo
                    </a>
                  )}
                  {live.status === "LIVE" && (
                    <button
                      onClick={() => endLive(live.id)}
                      disabled={endingId === live.id}
                      className="flex items-center gap-1 text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      <StopCircle size={12} />
                      {endingId === live.id ? "Encerrando..." : "Encerrar live"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
