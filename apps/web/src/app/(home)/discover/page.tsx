"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, SlidersHorizontal, Users, X, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { Suspense } from "react";

const CATEGORIES = ["", "arte", "fitness", "musica", "gaming", "culinaria", "moda", "educacao", "lifestyle"];

interface Creator {
  id: string;
  username: string;
  artisticName: string;
  bio: string;
  avatarUrl: string | null;
  category: string;
  subscriberCount: number;
  lowestPlanPrice?: number;
  tags: string[];
}

export default function DiscoverPage() {
  return (
    <Suspense>
      <DiscoverContent />
    </Suspense>
  );
}

function DiscoverContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const [showFilters, setShowFilters] = useState(false);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const search = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    if (maxPrice) params.set("maxPriceCents", String(Number(maxPrice) * 100));
    params.set("page", String(page));
    params.set("limit", "12");

    api.get(`/search/creators?${params}`).then((res) => {
      setCreators(res.data?.items ?? []);
      setTotal(res.data?.total ?? 0);
    }).catch(() => {
      setCreators([]);
    }).finally(() => setLoading(false));
  }, [query, category, maxPrice, page]);

  useEffect(() => { search(); }, [search]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    search();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    router.push(`/discover?${params}`);
  }

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, categoria, tags..."
            className="w-full rounded-lg bg-gray-800 py-2.5 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-500 outline-none focus:ring-1 focus:ring-purple-500"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              <X size={14} />
            </button>
          )}
        </div>
        <button type="submit" className="rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700">
          Buscar
        </button>
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={`rounded-lg border px-3 py-2.5 text-sm transition-colors ${showFilters ? "border-purple-500 bg-purple-600/10 text-purple-400" : "border-gray-700 text-gray-400 hover:border-gray-600"}`}
        >
          <SlidersHorizontal size={16} />
        </button>
      </form>

      {/* Filters */}
      {showFilters && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 flex flex-wrap gap-4">
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs text-gray-400">Categoria</label>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="">Todas</option>
              {CATEGORIES.filter(Boolean).map((c) => (
                <option key={c} value={c} className="capitalize">{c}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs text-gray-400">Preço máximo (R$/mês)</label>
            <input
              type="number"
              min={0}
              value={maxPrice}
              onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
              placeholder="Sem limite"
              className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          {(category || maxPrice) && (
            <div className="flex items-end">
              <button
                onClick={() => { setCategory(""); setMaxPrice(""); setPage(1); }}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c || "all"}
            onClick={() => { setCategory(c); setPage(1); }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${
              category === c
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
            }`}
          >
            {c || "Todos"}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-purple-500" />
        </div>
      ) : creators.length === 0 ? (
        <div className="py-16 text-center text-gray-500">
          <p>Nenhum criador encontrado.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">{total} criador{total !== 1 ? "es" : ""} encontrado{total !== 1 ? "s" : ""}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {creators.map((creator) => (
              <Link
                key={creator.id}
                href={`/creator/${creator.username}`}
                className="group flex flex-col rounded-xl border border-gray-800 bg-gray-900 p-4 transition-colors hover:border-purple-700"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-700">
                    {creator.avatarUrl ? (
                      <Image src={creator.avatarUrl} alt={creator.artisticName} fill className="object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-lg font-bold text-gray-300">
                        {creator.artisticName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white group-hover:text-purple-300">
                      {creator.artisticName}
                    </p>
                    <p className="truncate text-xs text-gray-500">@{creator.username}</p>
                  </div>
                </div>
                {creator.bio && (
                  <p className="mb-3 line-clamp-2 text-xs text-gray-400">{creator.bio}</p>
                )}
                <div className="mt-auto flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {creator.subscriberCount?.toLocaleString("pt-BR") ?? 0}
                  </span>
                  {creator.lowestPlanPrice != null && (
                    <span className="text-green-400 font-medium">
                      a partir de R$ {creator.lowestPlanPrice.toFixed(2)}
                    </span>
                  )}
                </div>
                {creator.tags?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {creator.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {total > 12 && (
            <div className="flex justify-center gap-2 pt-4">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 disabled:opacity-40 hover:bg-gray-800"
              >
                Anterior
              </button>
              <span className="flex items-center px-4 text-sm text-gray-500">
                Página {page} de {Math.ceil(total / 12)}
              </span>
              <button
                disabled={page >= Math.ceil(total / 12)}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 disabled:opacity-40 hover:bg-gray-800"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
