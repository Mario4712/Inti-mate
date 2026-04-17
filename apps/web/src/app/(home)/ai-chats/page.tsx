"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, MessageSquare, Loader2, ChevronRight } from "lucide-react";
import api from "@/lib/api";

interface PersonaMessage {
  id: string;
  userMsg: string;
  aiReply: string;
  createdAt: string;
  persona?: {
    displayName: string;
    creator?: { username: string; profile?: { artisticName?: string } };
  };
}

interface ConversationGroup {
  username: string;
  artisticName?: string;
  displayName: string;
  lastMessage: string;
  lastAt: string;
  messageCount: number;
}

export default function AiChatsPage() {
  const [conversations, setConversations] = useState<ConversationGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Busca histórico de conversas agrupadas por criador
    // A API /ai-persona/creator/history é do criador — para fãs usamos os dados locais de mensagens
    // O endpoint público disponível é POST /:username/reply — buscamos via notificações ou histórico do fã
    // Por ora, consultamos mensagens do tipo AI_PERSONA nas notificações/mensagens do usuário
    api.get("/notifications?limit=100")
      .then((r) => {
        const notifs = r.data.items ?? r.data ?? [];
        const aiNotifs = notifs.filter((n: any) => n.type === "AI_REPLY" || n.metadata?.isAi);

        // Group by creator username
        const grouped: Record<string, ConversationGroup> = {};
        for (const n of aiNotifs) {
          const username = n.metadata?.creatorUsername ?? n.actorUsername;
          if (!username) continue;
          if (!grouped[username]) {
            grouped[username] = {
              username,
              artisticName: n.metadata?.artisticName,
              displayName:  n.metadata?.personaName ?? "IA Persona",
              lastMessage:  n.body ?? "",
              lastAt:       n.createdAt,
              messageCount: 0,
            };
          }
          grouped[username].messageCount += 1;
          if (n.createdAt > grouped[username].lastAt) {
            grouped[username].lastAt = n.createdAt;
            grouped[username].lastMessage = n.body ?? grouped[username].lastMessage;
          }
        }
        setConversations(Object.values(grouped).sort((a, b) => b.lastAt.localeCompare(a.lastAt)));
      })
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bot size={22} className="text-purple-400" /> Conversas com IA
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Suas conversas com as personas de IA dos criadores que você segue.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500 space-y-3">
          <Bot size={40} className="opacity-30" />
          <p>Você ainda não conversou com nenhuma IA Persona.</p>
          <p className="text-sm">
            Visite o perfil de um criador e clique em{" "}
            <span className="text-purple-400">Chat com IA</span> para começar.
          </p>
          <Link href="/discover" className="mt-2 text-sm text-purple-400 hover:text-purple-300">
            Descobrir criadores →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <Link
              key={conv.username}
              href={`/creator/${conv.username}/ai-chat`}
              className="flex items-center gap-4 rounded-2xl border border-gray-800 bg-gray-900 p-4 hover:border-purple-700/50 hover:bg-gray-900/80 transition-colors"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-600/20 shrink-0">
                <Bot size={20} className="text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white truncate">{conv.displayName}</p>
                  <span className="text-xs text-gray-500 shrink-0">de @{conv.username}</span>
                </div>
                <p className="text-sm text-gray-500 truncate mt-0.5">{conv.lastMessage}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-600">{new Date(conv.lastAt).toLocaleDateString("pt-BR")}</p>
                <div className="mt-1 flex items-center justify-end gap-1 text-xs text-gray-500">
                  <MessageSquare size={11} />
                  {conv.messageCount}
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-600 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
