import type { MetadataRoute } from "next";
import { apiServer } from "@/lib/api-server";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://inti.mate";

interface CreatorSlug {
  username:  string;
  updatedAt: string;
}

async function getActiveCreators(): Promise<CreatorSlug[]> {
  try {
    const res = await apiServer("/users/creators/sitemap", {
      next: { revalidate: 3600 }, // revalida a cada hora
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const creators = await getActiveCreators();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url:              `${BASE_URL}/`,
      lastModified:     new Date(),
      changeFrequency:  "daily",
      priority:         1.0,
    },
    {
      url:              `${BASE_URL}/search`,
      lastModified:     new Date(),
      changeFrequency:  "hourly",
      priority:         0.9,
    },
    {
      url:              `${BASE_URL}/terms`,
      lastModified:     new Date(),
      changeFrequency:  "monthly",
      priority:         0.3,
    },
    {
      url:              `${BASE_URL}/privacy`,
      lastModified:     new Date(),
      changeFrequency:  "monthly",
      priority:         0.3,
    },
  ];

  const creatorPages: MetadataRoute.Sitemap = creators.map((c) => ({
    url:             `${BASE_URL}/creator/${c.username}`,
    lastModified:    new Date(c.updatedAt),
    changeFrequency: "daily" as const,
    priority:        0.7,
  }));

  return [...staticPages, ...creatorPages];
}
