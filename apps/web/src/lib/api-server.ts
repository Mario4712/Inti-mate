/**
 * Helper para fetch server-side (Server Components, generateMetadata, sitemap).
 * Usa a fetch nativa do Next.js para aproveitar o cache de rota e ISR.
 */
const API_BASE = process.env.API_INTERNAL_URL
  ?? process.env.NEXT_PUBLIC_API_URL
  ?? "http://localhost:3001";

export function apiServer(
  path: string,
  init?: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } },
): Promise<Response> {
  const url = `${API_BASE}/api/v1${path}`;
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}
