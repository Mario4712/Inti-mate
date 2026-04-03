"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";

// LiveKit imports — components-react fornece player pronto
let LiveKitRoom: any = null;
let VideoConference: any = null;
let RoomAudioRenderer: any = null;

try {
  const lk = require("@livekit/components-react");
  LiveKitRoom = lk.LiveKitRoom;
  VideoConference = lk.VideoConference;
  RoomAudioRenderer = lk.RoomAudioRenderer;
} catch {
  // @livekit/components-react não instalado — usa fallback
}

interface LivePlayerProps {
  liveId:    string;
  creatorName: string;
  token?:    string;
  serverUrl?: string;
}

interface SuperChat {
  id:          string;
  senderId:    string;
  message:     string;
  amount:      number;
  color:       string;
  pinnedUntil: string | null;
  createdAt:   string;
}

export function LivePlayer({ liveId, creatorName, token: initialToken, serverUrl }: LivePlayerProps) {
  const [superChats, setSuperChats] = useState<SuperChat[]>([]);
  const [message,    setMessage]    = useState("");
  const [amount,     setAmount]     = useState(500); // centavos default R$5
  const [sending,    setSending]    = useState(false);
  const [lkToken,    setLkToken]    = useState(initialToken ?? "");
  const [lkUrl,      setLkUrl]      = useState(serverUrl ?? "");
  const chatRef = useRef<HTMLDivElement>(null);

  // Busca token LiveKit se não fornecido
  useEffect(() => {
    if (!lkToken) {
      api.post(`/lives/${liveId}/join`)
        .then((res) => {
          setLkToken(res.data.token);
          setLkUrl(res.data.url ?? process.env.NEXT_PUBLIC_LIVEKIT_HOST ?? "ws://localhost:7880");
        })
        .catch(() => {});
    }
  }, [liveId, lkToken]);

  useEffect(() => {
    // Busca super chats ao carregar
    api.get(`/lives/${liveId}/superchat`).then((res) => {
      setSuperChats(res.data);
    }).catch(() => {});

    // Polling simples enquanto WebSocket não está configurado
    const interval = setInterval(() => {
      api.get(`/lives/${liveId}/superchat`).then((res) => setSuperChats(res.data)).catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, [liveId]);

  useEffect(() => {
    // Auto-scroll no chat
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [superChats]);

  const sendSuperChat = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      await api.post(`/lives/${liveId}/superchat`, { amountCents: amount, message });
      setMessage("");
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Erro ao enviar Super Chat");
    } finally {
      setSending(false);
    }
  };

  const pinned = superChats.filter(
    (sc) => sc.pinnedUntil && new Date(sc.pinnedUntil) > new Date(),
  );

  return (
    <div className="flex h-[100dvh] flex-col bg-gray-950 lg:flex-row">
      {/* Player de vídeo (LiveKit embed) */}
      <div className="relative flex-1 bg-black">
        {LiveKitRoom && lkToken && lkUrl ? (
          <LiveKitRoom
            serverUrl={lkUrl}
            token={lkToken}
            connect={true}
            video={false}
            audio={true}
            style={{ height: "100%" }}
          >
            <VideoConference />
            <RoomAudioRenderer />
          </LiveKitRoom>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-gray-500 text-sm">
              {lkToken ? "Conectando ao stream..." : `Player ao vivo de ${creatorName}`}
            </p>
          </div>
        )}

        {/* Super Chats pinados sobrepostos */}
        {pinned.length > 0 && (
          <div className="absolute bottom-16 left-4 right-4 space-y-2">
            {pinned.map((sc) => (
              <div
                key={sc.id}
                className="flex items-start gap-3 rounded-xl p-3 shadow-lg"
                style={{ backgroundColor: sc.color + "22", borderLeft: `3px solid ${sc.color}` }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold" style={{ color: sc.color }}>
                    R$ {(sc.amount / 100).toFixed(2)}
                  </p>
                  <p className="text-sm text-white">{sc.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Painel lateral: super chats + envio */}
      <div className="flex min-h-[240px] w-full flex-col border-t border-gray-800 lg:min-h-0 lg:w-80 lg:border-l lg:border-t-0">
        {/* Histórico */}
        <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2">
          {superChats.length === 0 && (
            <p className="text-center text-xs text-gray-600 mt-8">
              Seja o primeiro a enviar um Super Chat!
            </p>
          )}
          {superChats.map((sc) => (
            <div
              key={sc.id}
              className="rounded-lg p-2"
              style={{ backgroundColor: sc.color + "18" }}
            >
              <span className="text-xs font-bold" style={{ color: sc.color }}>
                R$ {(sc.amount / 100).toFixed(2)}
              </span>
              <p className="text-sm text-gray-200 mt-0.5">{sc.message}</p>
            </div>
          ))}
        </div>

        {/* Formulário */}
        <div className="border-t border-gray-800 p-3 space-y-2">
          <div className="flex gap-2">
            {[200, 500, 1000, 5000].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={`flex-1 rounded-lg py-1 text-xs font-medium transition ${
                  amount === v
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                R${(v / 100).toFixed(0)}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendSuperChat()}
              maxLength={200}
              placeholder="Sua mensagem…"
              className="flex-1 rounded-lg bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button
              onClick={sendSuperChat}
              disabled={sending || !message.trim()}
              className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-purple-500 disabled:opacity-40"
            >
              ✦
            </button>
          </div>
          <p className="text-center text-xs text-gray-600">
            20% de taxa da plataforma aplicada
          </p>
        </div>
      </div>
    </div>
  );
}
