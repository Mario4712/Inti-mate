import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://inti.mate";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow:  ["/", "/creator/", "/search"],
        // Bloqueia áreas privadas, conteúdo adulto direto e APIs
        disallow: [
          "/dashboard/",
          "/settings/",
          "/messages/",
          "/notifications/",
          "/api/",
          "/*?*", // evita indexar URLs com query string (canonical já cobre)
        ],
      },
      // Bloqueia crawlers de IA de scraping de conteúdo dos criadores
      {
        userAgent: ["GPTBot", "ChatGPT-User", "CCBot", "anthropic-ai"],
        disallow: ["/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host:    BASE_URL,
  };
}
