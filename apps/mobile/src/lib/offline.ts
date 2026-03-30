import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Modo offline — teasers em cache local
 *
 * Estratégia:
 * - Teasers (primeiros 15s de vídeo, thumbnail) são baixados em background
 * - Armazenados em FileSystem.cacheDirectory (limpo automaticamente pelo SO)
 * - Índice em AsyncStorage (leve, rápido)
 * - Conteúdo completo NUNCA cacheado offline (DRM / paywall)
 * - LRU simples: máximo 50 teasers, remove o mais antigo ao atingir limite
 */

const TEASER_DIR     = `${FileSystem.cacheDirectory}teasers/`;
const INDEX_KEY      = "offline_teasers_index";
const MAX_TEASERS    = 50;

interface TeaserEntry {
  mediaId:    string;
  localPath:  string;
  cachedAt:   number;
  thumbnailPath?: string;
}

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(TEASER_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(TEASER_DIR, { intermediates: true });
  }
}

async function readIndex(): Promise<TeaserEntry[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveIndex(index: TeaserEntry[]) {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export async function cacheTeaser(
  mediaId:      string,
  teaserUrl:    string,
  thumbnailUrl?: string,
): Promise<void> {
  await ensureDir();

  const index = await readIndex();
  if (index.find((e) => e.mediaId === mediaId)) return; // já cached

  // LRU: remove o mais antigo se necessário
  if (index.length >= MAX_TEASERS) {
    const oldest = index.sort((a, b) => a.cachedAt - b.cachedAt)[0];
    await FileSystem.deleteAsync(oldest.localPath, { idempotent: true });
    if (oldest.thumbnailPath) {
      await FileSystem.deleteAsync(oldest.thumbnailPath, { idempotent: true });
    }
    index.splice(index.indexOf(oldest), 1);
  }

  const localPath = `${TEASER_DIR}${mediaId}.mp4`;
  await FileSystem.downloadAsync(teaserUrl, localPath);

  let thumbnailPath: string | undefined;
  if (thumbnailUrl) {
    thumbnailPath = `${TEASER_DIR}${mediaId}_thumb.jpg`;
    await FileSystem.downloadAsync(thumbnailUrl, thumbnailPath);
  }

  index.push({ mediaId, localPath, cachedAt: Date.now(), thumbnailPath });
  await saveIndex(index);
}

export async function getCachedTeaser(mediaId: string): Promise<TeaserEntry | null> {
  const index = await readIndex();
  return index.find((e) => e.mediaId === mediaId) ?? null;
}

export async function clearTeaserCache(): Promise<void> {
  const index = await readIndex();
  await Promise.all(
    index.flatMap((e) => [
      FileSystem.deleteAsync(e.localPath, { idempotent: true }),
      e.thumbnailPath
        ? FileSystem.deleteAsync(e.thumbnailPath, { idempotent: true })
        : Promise.resolve(),
    ]),
  );
  await AsyncStorage.removeItem(INDEX_KEY);
}

export async function getTeaserCacheSize(): Promise<number> {
  const info = await FileSystem.getInfoAsync(TEASER_DIR);
  return (info as any).size ?? 0;
}
