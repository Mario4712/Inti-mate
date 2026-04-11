"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Loader2, Radio, Send, Zap } from "lucide-react";
import { io, Socket } from "socket.io-client";
import api from "@/lib/api";

interface LiveSession {
  id: string;
  title: string;
  description: string | null;
  status: "SCHEDULED" | "LIVE" | "ENDED";
  viewerCount: number;
  creator: {
    id: string;
    username: string;
    artisticName: string;
    avatarUrl: string | null;
  };
}

interface SuperChat {
  id: string;
  userId: string;
  username: string;
  message: string;
  amount: number;
  createdAt: string;
}

interface LiveToken {
  token: string;
  wsUrl: string;
}

export default function LiveViewerPage() {
  const { liveId } = useParams<{ liveId: string }>();
  const router = useRouter();

  const [live, setLive] = useState<LiveSession | null>(null);
  const [superChats, setSuperChats] = useState<SuperChat[]>([]);
  const [token, setToken] = useState<LiveToken | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // SuperChat form
  const [scMessage, setScMessage] = useState("");
  const [scAmount, setScAmount] = useState("5");
  const [scSending, setScSending] = useState(false);
  const [scError, setScError] = useState("");
  const [showScForm, setShowScForm] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load live info and try to get viewer token
    Promise.all([
      api.get(`/lives`).then((r) => {
        const all = Array.isArray(r.data) ? r.data : r.data?.items ?? [];
        return all.find((l: LiveSession) => l.id === liveId) ?? null;
      }).catch(() => null),
      api.get(`/lives/${liveId}/superchat`).catch(() => ({ data: [] })),
    ]).then(([liveData, scRes]) => {
      setLive(liveData);
      setSuperChats(Array.isArray(scRes.data) ? scRes.data : []);

      // Only try to get a viewer token when the live is actually LIVE
      if (liveData?.status === "LIVE") {
        api.post(`/lives/${liveId}/join`)
          .then((r) => setToken(r.data))
          .catch((e) => {
            if (e?.response?.status === 403) setAccessDenied(true);
          });
      }
    }).finally(() => setLoading(false));
  }, [liveId]);

  // Socket.io for real-time superchats — only connect when the live is actually live
  useEffect(() => {
    if (!live || live.status !== "LIVE") return;

    const accessToken = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!accessToken) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";
    const socket = io(`${apiUrl}/chat`, {
      auth: { token: accessToken },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("live:join", { liveSessionId: liveId });
    });

    socket.on("live:superchat", (sc: SuperChat) => {
      setSuperChats((prev) => [...prev, sc]);
    });

    return () => {
      socket.emit("live:leave", { liveSessionId: liveId });
      socket.disconnect();
    };
  }, [liveId, live?.status]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [superChats]);

  async function handleSuperChat(e: React.FormEvent) {
    e.preventDefault();
    if (!scMessage.trim()) return;
    const cents = Math.round(parseFloat(scAmount) * 100);
    if (cents < 200) { setScError("Valor mínimo: R$ 2,00"); return; }
    setScError("");
    setScSending(true);
    try {
      await api.post(`/lives/${liveId}/superchat`, { amountCents: cents, message: scMessage.trim() });
      setScMessage("");
      setShowScForm(false);
    } catch (e: any) {
      setScError(e?.response?.data?.message ?? "Erro ao enviar Super Chat.");
    } finally {
      setScSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!live) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-400">Live não encontrada.</p>
        <button onClick={() => router.back()} className="mt-3 text-sm text-purple-400 hover:text-purple-300">← Voltar</button>
      </div>
    );
  }

  if (accessDenied && live.requiresSubscription) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <button onClick={() => router.back()} className="mb-6 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="rounded-xl border border-purple-800/40 bg-purple-950/20 p-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-900/40">
            <Radio size={24} className="text-purple-400" />
          </div>
          <h2 className="text-lg font-bold text-white">Conteúdo exclusivo para assinantes</h2>
          <p className="mt-2 text-sm text-gray-400">
            Esta live é exclusiva para assinantes de{" "}
            <span className="text-purple-300">{live.creator?.artisticName ?? "este criador"}</span>.
            Assine para assistir.
          </p>
          {live.creator && (
            <a
              href={`/creator/${live.creator.username}`}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white hover:bg-purple-700"
            >
              Ver planos de assinatura
            </a>
          )}
        </div>
      </div>
    );
  }

  const AMOUNTS = ["2", "5", "10", "20", "50"];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200">
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Video area */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-900">
            {live.status === "LIVE" ? (
              token ? (
                /* LiveKit video would mount here — placeholder until @livekit/components-react is added */
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <span className="flex items-center gap-2 rounded-full bg-red-600/20 px-3 py-1 text-sm font-semibold text-red-400">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    AO VIVO
                  </span>
                  <p className="text-gray-400 text-sm">Player de vídeo em tempo real</p>
                  <p className="text-xs text-gray-600">Token LiveKit: obtido com sucesso</p>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                </div>
              )
            ) : live.status === "SCHEDULED" ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-500">
                <Radio size={32} className="text-gray-700" />
                <p className="text-sm">Live ainda não começou</p>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-600">
                <p className="text-sm">Esta live foi encerrada</p>
              </div>
            )}
          </div>

          {/* Live info */}
          <div>
            <h1 className="text-xl font-bold text-white">{live.title}</h1>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {live.creator && (
                  <>
                    <div className="relative h-8 w-8 overflow-hidden rounded-full bg-gray-700">
                      {live.creator.avatarUrl ? (
                        <Image src={live.creator.avatarUrl} alt="" fill className="object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-sm font-bold text-gray-400">
                          {live.creator.artisticName?.charAt(0) ?? "?"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-300">{live.creator.artisticName}</p>
                  </>
                )}
              </div>
              {live.status === "LIVE" && (
                <span className="text-sm text-gray-500">{live.viewerCount} assistindo</span>
              )}
            </div>
            {live.description && (
              <p className="mt-2 text-sm text-gray-400">{live.description}</p>
            )}
          </div>
        </div>

        {/* Super Chat sidebar */}
        <div className="flex flex-col rounded-xl border border-gray-800 bg-gray-900 overflow-hidden" style={{ maxHeight: "520px" }}>
          <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
            <span className="text-sm font-semibold text-white">Super Chats</span>
            {live.status === "LIVE" && (
              <button
                onClick={() => setShowScForm((v) => !v)}
                className="flex items-center gap-1 rounded-lg bg-yellow-500/20 px-3 py-1 text-xs font-medium text-yellow-400 hover:bg-yellow-500/30"
              >
                <Zap size={12} /> Enviar
              </button>
            )}
          </div>

          {/* SC form */}
          {showScForm && (
            <form onSubmit={handleSuperChat} className="border-b border-gray-800 p-3 space-y-2 bg-gray-950">
              <div className="flex gap-1.5 flex-wrap">
                {AMOUNTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setScAmount(a)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      scAmount === a ? "bg-yellow-500 text-black" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    R$ {a}
                  </button>
                ))}
              </div>
              <input
                value={scMessage}
                onChange={(e) => setScMessage(e.target.value)}
                placeholder="Sua mensagem..."
                maxLength={200}
                className="w-full rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-yellow-500"
              />
              {scError && <p className="text-xs text-red-400">{scError}</p>}
              <button
                type="submit"
                disabled={scSending || !scMessage.trim()}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-yellow-500 py-2 text-xs font-bold text-black hover:bg-yellow-400 disabled:opacity-50"
              >
                {scSending ? <Loader2 size={13} className="animate-spin" /> : <><Zap size={13} /> Enviar R$ {scAmount}</>}
              </button>
            </form>
          )}

          {/* SC list */}
          <div className="flex-1 overflow-y-auto space-y-2 p-3">
            {superChats.length === 0 && (
              <p className="text-center text-xs text-gray-600 py-4">Ainda não há Super Chats.</p>
            )}
            {superChats.map((sc) => (
              <div key={sc.id} className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-yellow-400">{sc.username}</span>
                  <span className="text-xs font-bold text-yellow-500">R$ {sc.amount.toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-300">{sc.message}</p>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
