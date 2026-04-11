"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Bot, Send, Loader2, AlertCircle } from "lucide-react";
import api from "@/lib/api";

interface Message {
  role: "user" | "ai";
  text: string;
  timestamp: Date;
}

interface PersonaInfo {
  enabled: boolean;
  displayName: string | null;
}

export default function AiChatPage() {
  const { username } = useParams<{ username: string }>();
  const creatorId = username;
  const router = useRouter();
  const [persona, setPersona] = useState<PersonaInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [dailyLimitHit, setDailyLimitHit] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get(`/ai-persona/${creatorId}/info`).then((r) => setPersona(r.data)).catch(() => {});
  }, [creatorId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text, timestamp: new Date() }]);
    setSending(true);

    try {
      const res = await api.post(`/ai-persona/${creatorId}/reply`, { message: text });
      const reply = res.data?.reply ?? res.data?.message ?? "...";
      setMessages((prev) => [...prev, { role: "ai", text: reply, timestamp: new Date() }]);
    } catch (e: any) {
      if (e?.response?.status === 429) {
        setDailyLimitHit(true);
        setMessages((prev) => [...prev, {
          role: "ai",
          text: "Você atingiu o limite de 50 mensagens por dia com a IA. Tente novamente amanhã!",
          timestamp: new Date(),
        }]);
      } else {
        setMessages((prev) => [...prev, {
          role: "ai",
          text: "Desculpe, não consegui processar sua mensagem agora. Tente novamente.",
          timestamp: new Date(),
        }]);
      }
    } finally {
      setSending(false);
    }
  }

  const personaName = persona?.displayName ?? "IA";
  const isEnabled = persona?.enabled ?? true;

  return (
    <div className="mx-auto flex max-w-2xl flex-col" style={{ height: "calc(100vh - 140px)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-200">
          <ArrowLeft size={20} />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-600/30">
          <Bot size={18} className="text-purple-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{personaName}</p>
          <p className="text-xs text-purple-400">IA • Automatizado</p>
        </div>
      </div>

      {!isEnabled && (
        <div className="my-4 flex items-center gap-2 rounded-lg bg-yellow-900/20 border border-yellow-700/30 px-4 py-3 text-sm text-yellow-400">
          <AlertCircle size={15} />
          Este criador não tem IA Persona ativa no momento.
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 py-4">
        {messages.length === 0 && (
          <div className="py-8 text-center">
            <Bot size={36} className="mx-auto mb-3 text-gray-700" />
            <p className="text-sm text-gray-500">
              Converse com a IA de {personaName}. As respostas são geradas automaticamente.
            </p>
            <p className="mt-1 text-xs text-gray-600">Limite: 50 mensagens por dia</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "ai" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-600/20 mr-2 mt-1">
                <Bot size={14} className="text-purple-400" />
              </div>
            )}
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
              msg.role === "user"
                ? "rounded-br-sm bg-purple-600 text-white"
                : "rounded-bl-sm bg-gray-800 text-gray-100"
            }`}>
              <p className="whitespace-pre-wrap break-words">{msg.text}</p>
              <p className={`mt-1 text-right text-[10px] ${msg.role === "user" ? "text-purple-300" : "text-gray-600"}`}>
                {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-600/20 mr-2 mt-1">
              <Bot size={14} className="text-purple-400" />
            </div>
            <div className="rounded-2xl rounded-bl-sm bg-gray-800 px-4 py-3">
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
        {dailyLimitHit ? (
          <p className="text-center text-xs text-gray-500">Limite diário atingido. Volte amanhã!</p>
        ) : (
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!isEnabled}
              placeholder={isEnabled ? `Mensagem para ${personaName}...` : "IA indisponível"}
              className="flex-1 rounded-xl bg-gray-800 px-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending || !isEnabled}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white transition-colors hover:bg-purple-700 disabled:opacity-40"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
