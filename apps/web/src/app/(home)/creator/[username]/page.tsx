"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Loader2, MessageCircle, Users } from "lucide-react";
import api from "@/lib/api";
import { TipButton } from "@/components/tips/TipButton";
import { AiChatButton } from "@/components/ai-persona/AiChatButton";

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  description: string;
}

interface RecentMedia {
  id: string;
  thumbnailUrl: string | null;
  type: "PHOTO" | "VIDEO";
  title: string | null;
}

interface CreatorProfile {
  id: string;
  username: string;
  artisticName: string;
  bio: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  category: string;
  tags: string[];
  country: string;
  subscriberCount: number;
  plans: Plan[];
  recentMedia: RecentMedia[];
}

export default function CreatorProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  async function startChat() {
    if (!creator || startingChat) return;
    setStartingChat(true);
    try {
      const res = await api.post("/messages", {
        recipientId: creator.id,
        body: "Olá!",
      });
      const conversationId = res.data?.conversationId;
      if (conversationId) {
        router.push(`/messages/${conversationId}`);
      } else {
        router.push("/messages");
      }
    } catch {
      router.push("/messages");
    } finally {
      setStartingChat(false);
    }
  }

  useEffect(() => {
    api.get(`/users/creator/${username}`)
      .then((r) => {
        const data = r.data;
        // API retorna monthlyPrice em centavos → converte para reais
        if (data?.plans) {
          data.plans = data.plans.map((p: Plan) => ({
            ...p,
            monthlyPrice: Math.round(Number(p.monthlyPrice)) / 100,
          }));
        }
        setCreator(data);
      })
      .catch((e) => {
        if (e?.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (notFound || !creator) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-400">Criador não encontrado.</p>
        <button onClick={() => router.back()} className="mt-3 text-sm text-purple-400 hover:text-purple-300">← Voltar</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200">
        <ArrowLeft size={16} /> Voltar
      </button>

      {/* Cover */}
      <div className="relative h-40 w-full overflow-hidden rounded-xl bg-gray-800 sm:h-48">
        {creator.coverUrl && (
          <Image src={creator.coverUrl} alt="" fill className="object-cover opacity-60" />
        )}
      </div>

      {/* Header */}
      <div className="relative -mt-12 flex flex-col items-center gap-3 px-4 sm:-mt-16 sm:flex-row sm:items-end sm:gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-gray-950 bg-gray-700 sm:h-32 sm:w-32">
          {creator.avatarUrl ? (
            <Image src={creator.avatarUrl} alt={creator.artisticName} fill className="object-cover" sizes="128px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-gray-500">
              {creator.artisticName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="pb-2 text-center sm:text-left">
          <h1 className="text-xl font-bold text-white sm:text-2xl">{creator.artisticName}</h1>
          <p className="text-sm text-gray-400">@{creator.username}</p>
        </div>
      </div>

      <div className="mt-4 px-4 space-y-4">
        {/* Bio */}
        {creator.bio && <p className="text-gray-300 leading-relaxed">{creator.bio}</p>}

        {/* Tags */}
        {creator.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {creator.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300">#{tag}</span>
            ))}
          </div>
        )}

        {/* Stats + Actions */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1"><Users size={14} /> {creator.subscriberCount.toLocaleString("pt-BR")} assinantes</span>
          {creator.category && <span>{creator.category}</span>}
          <TipButton creatorId={creator.id} creatorName={creator.artisticName} />
          <button
            onClick={startChat}
            disabled={startingChat}
            className="flex items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {startingChat ? <Loader2 size={12} className="animate-spin" /> : <MessageCircle size={12} />}
            Mensagem
          </button>
          <AiChatButton username={creator.username} />
        </div>

        {/* Subscription plans */}
        {creator.plans?.length > 0 && (
          <section className="mt-2">
            <h2 className="mb-3 text-lg font-semibold text-white">Planos de Assinatura</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {creator.plans.map((plan) => (
                <div key={plan.id} className="rounded-xl border border-gray-700 bg-gray-900 p-5">
                  <h3 className="font-semibold text-white">{plan.name}</h3>
                  <p className="mt-1 text-2xl font-bold text-purple-400">
                    R$ {plan.monthlyPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    <span className="text-sm font-normal text-gray-500">/mês</span>
                  </p>
                  {plan.description && <p className="mt-2 text-sm text-gray-400">{plan.description}</p>}
                  <Link
                    href={`/subscribe/${creator.username}?plan=${plan.id}`}
                    className="mt-4 flex w-full items-center justify-center rounded-lg bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 transition-colors"
                  >
                    Assinar por R$ {plan.monthlyPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent content preview */}
        {creator.recentMedia?.length > 0 && (
          <section className="mt-2">
            <h2 className="mb-3 text-lg font-semibold text-white">Conteúdo Recente</h2>
            <div className="grid grid-cols-3 gap-2">
              {creator.recentMedia.map((m) => (
                <div key={m.id} className="aspect-square overflow-hidden rounded-lg bg-gray-800 relative">
                  {m.thumbnailUrl ? (
                    <Image src={m.thumbnailUrl} alt={m.title ?? ""} fill className="object-cover" sizes="150px" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-600 text-xs">
                      {m.type === "VIDEO" ? "Vídeo" : "Foto"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
