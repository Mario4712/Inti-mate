"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MessageCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";

interface Participant {
  id: string;
  username: string;
  artisticName: string;
  avatarUrl: string | null;
}

interface Conversation {
  id: string;
  creator: Participant;
  fan: Participant;
  lastMessage: {
    body: string;
    createdAt: string;
    senderId: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    api.get("/auth/me").then((r) => setMyId(r.data?.id ?? null)).catch(() => {});
    api.get("/messages/conversations")
      .then((r) => setConversations(Array.isArray(r.data) ? r.data : r.data?.items ?? []))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <MessageCircle size={40} className="mx-auto mb-4 text-gray-600" />
        <p className="text-gray-400">Nenhuma conversa ainda.</p>
        <p className="mt-1 text-sm text-gray-600">
          Visite o perfil de um criador e envie uma mensagem.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-1">
      <h1 className="mb-4 text-xl font-bold text-white">Mensagens</h1>
      {conversations.map((conv) => {
        const other = myId === conv.fan.id ? conv.creator : conv.fan;
        const isUnread = conv.unreadCount > 0;
        return (
          <Link
            key={conv.id}
            href={`/messages/${conv.id}`}
            className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-gray-800"
          >
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gray-700">
              {other.avatarUrl ? (
                <Image src={other.avatarUrl} alt={other.artisticName} fill className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-lg font-bold text-gray-300">
                  {other.artisticName.charAt(0).toUpperCase()}
                </span>
              )}
              {isUnread && (
                <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-gray-950 bg-purple-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className={`truncate text-sm font-medium ${isUnread ? "text-white" : "text-gray-300"}`}>
                  {other.artisticName}
                </p>
                {conv.lastMessage && (
                  <span className="ml-2 shrink-0 text-xs text-gray-600">
                    {new Date(conv.lastMessage.createdAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
              <p className={`truncate text-xs ${isUnread ? "text-gray-300" : "text-gray-500"}`}>
                {conv.lastMessage
                  ? conv.lastMessage.senderId === myId
                    ? `Você: ${conv.lastMessage.body}`
                    : conv.lastMessage.body
                  : "Nenhuma mensagem"}
              </p>
            </div>
            {isUnread && (
              <span className="ml-1 shrink-0 rounded-full bg-purple-600 px-1.5 py-0.5 text-xs font-bold text-white">
                {conv.unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
