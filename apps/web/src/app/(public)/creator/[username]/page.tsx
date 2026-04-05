import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { apiServer } from "@/lib/api-server";
import { CreatorFeed } from "@/components/content/CreatorFeed";
import { TipButton } from "@/components/tips/TipButton";
import { DigitalShop } from "@/components/shop/DigitalShop";
import { AiChatButton } from "@/components/ai-persona/AiChatButton";

interface CreatorProfile {
  id:           string;
  username:     string;
  artisticName: string;
  bio:          string;
  avatarUrl:    string | null;
  coverUrl:     string | null;
  category:     string;
  tags:         string[];
  country:      string;
  subscriberCount: number;
  plans: Array<{
    id:           string;
    name:         string;
    monthlyPrice: number;
    description:  string;
  }>;
  recentMedia: Array<{
    id:          string;
    thumbnailUrl: string | null;
    type:        "PHOTO" | "VIDEO";
    title:       string | null;
  }>;
}

async function getCreatorProfile(username: string): Promise<CreatorProfile | null> {
  try {
    const res = await apiServer(`/users/creator/${username}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Metadata dinâmica ──────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  const creator = await getCreatorProfile(params.username);
  if (!creator) return { title: "Criador não encontrado" };

  const title       = `${creator.artisticName} (@${creator.username})`;
  const description = creator.bio?.slice(0, 160) || `Assine ${creator.artisticName} na Inti.mate`;
  const url         = `https://inti.mate/creator/${creator.username}`;
  const image       = creator.avatarUrl ?? "https://inti.mate/og-default.jpg";

  return {
    title,
    description,
    openGraph: {
      type:        "profile",
      url,
      title,
      description,
      images:      [{ url: image, width: 400, height: 400 }],
      siteName:    "Inti.mate",
      locale:      "pt_BR",
    },
    twitter: {
      card:        "summary",
      title,
      description,
      images:      [image],
    },
    // Páginas públicas de criador SÃO indexadas (sem conteúdo adulto exposto)
    robots: { index: true, follow: true },
    alternates: { canonical: url },
  };
}

// ─── JSON-LD Schema Markup ──────────────────────────────────

function CreatorJsonLd({ creator }: { creator: CreatorProfile }) {
  const schema = {
    "@context":   "https://schema.org",
    "@type":      "Person",
    name:         creator.artisticName,
    url:          `https://inti.mate/creator/${creator.username}`,
    image:        creator.avatarUrl,
    description:  creator.bio,
    sameAs:       [],
    memberOf: {
      "@type": "Organization",
      name:    "Inti.mate",
      url:     "https://inti.mate",
    },
  };

  // Sanitiza para prevenir XSS via </script> em campos do usuário
  const jsonLd = JSON.stringify(schema).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd }}
    />
  );
}

// ─── Página pública do criador ──────────────────────────────

export default async function CreatorPublicPage({
  params,
}: {
  params: { username: string };
}) {
  const creator = await getCreatorProfile(params.username);
  if (!creator) notFound();

  return (
    <>
      <CreatorJsonLd creator={creator} />

      <main className="min-h-screen bg-gray-950 text-gray-100">
        {/* Cover */}
        <div className="relative h-48 w-full bg-gray-800">
          {creator.coverUrl && (
            <Image
              src={creator.coverUrl}
              alt=""
              fill
              className="object-cover opacity-60"
              priority
            />
          )}
        </div>

        {/* Header */}
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="relative -mt-12 flex flex-col items-center gap-3 sm:-mt-16 sm:flex-row sm:items-end sm:gap-4">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-gray-950 bg-gray-700 sm:h-32 sm:w-32">
              {creator.avatarUrl ? (
                <Image
                  src={creator.avatarUrl}
                  alt={`Foto de ${creator.artisticName}`}
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl text-gray-500">
                  {creator.artisticName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="pb-2 text-center sm:text-left">
              <h1 className="text-xl font-bold sm:text-2xl">{creator.artisticName}</h1>
              <p className="text-sm text-gray-400">@{creator.username}</p>
            </div>
          </div>

          {/* Bio */}
          {creator.bio && (
            <p className="mt-4 text-gray-300 leading-relaxed">{creator.bio}</p>
          )}

          {/* Tags */}
          {creator.tags?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {creator.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Stats + Actions */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400 sm:justify-start sm:gap-6">
            <span>{creator.subscriberCount.toLocaleString("pt-BR")} assinantes</span>
            {creator.category && <span>{creator.category}</span>}
            <TipButton creatorId={creator.id} creatorName={creator.artisticName} />
            <AiChatButton creatorId={creator.id} />
          </div>

          {/* Planos de assinatura */}
          {creator.plans?.length > 0 && (
            <section className="mt-8" aria-labelledby="plans-heading">
              <h2 id="plans-heading" className="mb-4 text-xl font-semibold">
                Planos de Assinatura
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {creator.plans.map((plan) => (
                  <article
                    key={plan.id}
                    className="rounded-xl border border-gray-700 bg-gray-900 p-5"
                  >
                    <h3 className="font-semibold">{plan.name}</h3>
                    <p className="mt-1 text-2xl font-bold text-purple-400">
                      R${" "}
                      {plan.monthlyPrice.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                      <span className="text-sm font-normal text-gray-400">/mês</span>
                    </p>
                    {plan.description && (
                      <p className="mt-2 text-sm text-gray-400">{plan.description}</p>
                    )}
                    <a
                      href={`/subscribe/${creator.id}`}
                      className="mt-4 block w-full rounded-lg bg-purple-600 px-4 py-2 text-center font-medium transition hover:bg-purple-500"
                    >
                      Assinar
                    </a>
                  </article>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                * 20% de taxa da plataforma aplicada sobre cada cobrança.
              </p>
            </section>
          )}

          {/* Loja Digital */}
          <DigitalShop creatorId={creator.id} />

          {/* Feed de conteúdo com paywall */}
          <section className="mt-8 mb-16" aria-labelledby="content-heading">
            <h2 id="content-heading" className="mb-4 text-xl font-semibold">
              Conteúdo
            </h2>
            <CreatorFeed creatorId={creator.id} creatorUsername={creator.username} />
          </section>
        </div>
      </main>
    </>
  );
}
