"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Send, Loader2, Lock } from "lucide-react";
import { io, Socket } from "socket.io-client";
import api from "@/lib/api";

interface Participant {
  id: string;
  username: string;
  artisticName: string;
  avatarUrl: string | null;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  mediaUrl: string | null;
  pricePaid: number | null;
  locked?: boolean;
  status: string;
  createdAt: string;
}

interface ConversationDetail {
  id: string;
  creator: Participant;
  fan: Participant;
}

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const router = useRouter();

  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load initial data
  useEffect(() => {
    api.get("/auth/me").then((r) => setMyId(r.data?.id ?? null)).catch(() => {});

    api.get(`/messages/conversations/${conversationId}`)
      .then((r) => {
        const data = r.data;
        setConversation(data.conversation ?? null);
        setMessages((data.messages ?? []).reverse());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [conversationId]);

  // Socket.io connection
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    const socket = io(`${apiUrl}/chat`, {
      auth: { token },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("conversation:join", { conversationId });
      socket.emit("message:read", { conversationId });
    });

    socket.on("message:new", (msg: Message) => {
      if (msg.conversationId !== conversationId) return;
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (msg.senderId !== myId) {
        socket.emit("message:read", { conversationId });
      }
    });

    socket.on("message:typing", () => {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 3000);
    });

    socket.on("message:read", () => {
      setMessages((prev) =>
        prev.map((m) => (m.status !== "READ" ? { ...m, status: "READ" } : m))
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [conversationId, myId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = useCallback(async () => {
    const body = input.trim();
    if (!body || sending) return;

    setSending(true);
    setInput("");

    // Try WS first; fall back to REST
    const socket = socketRef.current;
    if (socket?.connected && myId && conversation) {
      const recipientId = myId === conversation.fan.id ? conversation.creator.id : conversation.fan.id;
      socket.emit("message:send", { recipientId, body });
      setSending(false);
    } else {
      try {
        await api.post("/messages", { conversationId, body });
        const r = await api.get(`/messages/conversations/${conversationId}`);
        setMessages((r.data.messages ?? []).reverse());
      } catch {
        setInput(body);
      } finally {
        setSending(false);
      }
    }
  }, [input, sending, myId, conversation, conversationId]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
      return;
    }
    // Send typing indicator
    if (socketRef.current?.connected) {
      socketRef.current.emit("message:typing", { conversationId });
    }
    if (typingTimeout) clearTimeout(typingTimeout);
    setTypingTimeout(setTimeout(() => setTypingTimeout(null), 2000));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const other = myId && conversation
    ? myId === conversation.fan.id ? conversation.creator : conversation.fan
    : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col" style={{ height: "calc(100vh - 120px)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-200"
        >
          <ArrowLeft size={20} />
        </button>
        {other && (
          <>
            <div className="relative h-9 w-9 overflow-hidden rounded-full bg-gray-700">
              {other.avatarUrl ? (
                <Image src={other.avatarUrl} alt={other.artisticName} fill className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-sm font-bold text-gray-300">
                  {other.artisticName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{other.artisticName}</p>
              <p className="text-xs text-gray-500">@{other.username}</p>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 py-4 px-1">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-600">Sem mensagens. Diga olá!</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.senderId === myId;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  isMine
                    ? "rounded-br-sm bg-purple-600 text-white"
                    : "rounded-bl-sm bg-gray-800 text-gray-100"
                }`}
              >
                {msg.locked ? (
                  <span className="flex items-center gap-1.5 text-gray-400 italic">
                    <Lock size={12} /> Mensagem paga — desbloqueie para ver
                  </span>
                ) : (
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                )}
                <p className={`mt-1 text-right text-[10px] ${isMine ? "text-purple-300" : "text-gray-600"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  {isMine && msg.status === "READ" && " ✓✓"}
                </p>
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-gray-800 px-4 py-2.5">
              <span className="flex gap-1 text-gray-500">
                <span className="animate-bounce">●</span>
                <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>●</span>
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 pt-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escreva uma mensagem..."
            className="flex-1 rounded-xl bg-gray-800 px-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 outline-none focus:ring-1 focus:ring-purple-500"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white transition-colors hover:bg-purple-700 disabled:opacity-40"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
