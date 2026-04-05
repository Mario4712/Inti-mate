"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot } from "lucide-react";
import api from "@/lib/api";

interface Props {
  creatorId: string;
}

export function AiChatButton({ creatorId }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    api.get(`/ai-persona/${creatorId}/info`)
      .then((r) => { setEnabled(r.data?.enabled ?? false); setDisplayName(r.data?.displayName ?? null); })
      .catch(() => {});
  }, [creatorId]);

  if (!enabled) return null;

  return (
    <Link
      href={`/creator/${creatorId}/ai-chat`}
      className="flex items-center gap-1.5 rounded-lg bg-purple-600/20 px-3 py-2 text-sm font-medium text-purple-400 transition-colors hover:bg-purple-600/30"
    >
      <Bot size={15} /> Chat com IA {displayName ? `(${displayName})` : ""}
    </Link>
  );
}
