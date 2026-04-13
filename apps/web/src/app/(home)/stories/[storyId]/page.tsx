"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/lib/api";

interface StoryItem {
  id: string;
  creatorId: string;
  mediaUrl: string;
  mediaType: string;
  expiresAt: string;
  viewed: boolean;
  viewCount: number;
}

const STORY_DURATION_MS = 5000;

export default function StoryViewerPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const searchParams = useSearchParams();
  const creatorId = searchParams.get("creator") ?? "";
  const router = useRouter();

  const [stories, setStories] = useState<StoryItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
  }, []);

  const advance = useCallback(() => {
    setCurrentIdx((idx) => {
      if (idx + 1 < stories.length) return idx + 1;
      router.back();
      return idx;
    });
  }, [stories.length, router]);

  const startTimer = useCallback(() => {
    clearTimer();
    setProgress(0);
    startTimeRef.current = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / STORY_DURATION_MS) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearTimer();
        advance();
      }
    }, 50);
  }, [clearTimer, advance]);

  // Load stories for this creator
  useEffect(() => {
    if (!creatorId) return;
    api.get(`/stories/creator/${creatorId}`)
      .then((r) => {
        const list: StoryItem[] = r.data ?? [];
        setStories(list);
        const idx = list.findIndex((s) => s.id === storyId);
        setCurrentIdx(idx >= 0 ? idx : 0);
      })
      .catch(() => router.back())
      .finally(() => setLoading(false));
  }, [creatorId, storyId, router]);

  // Record view + start timer when story changes
  useEffect(() => {
    if (stories.length === 0) return;
    const story = stories[currentIdx];
    if (!story) return;

    api.post(`/stories/${story.id}/view`).catch(() => {});
    startTimer();

    return () => clearTimer();
  }, [currentIdx, stories, startTimer, clearTimer]);

  if (loading || stories.length === 0) return null;

  const story = stories[currentIdx];
  if (!story) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{ width: i < currentIdx ? "100%" : i === currentIdx ? `${progress}%` : "0%" }}
            />
          </div>
        ))}
      </div>

      {/* Close button */}
      <button
        onClick={() => router.back()}
        className="absolute top-8 right-4 z-10 rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
      >
        <X size={18} />
      </button>

      {/* Media */}
      <div className="relative w-full max-w-sm h-full max-h-[90vh] rounded-xl overflow-hidden">
        {story.mediaType.startsWith("image") ? (
          <Image
            src={story.mediaUrl}
            alt="Story"
            fill
            className="object-contain"
            priority
          />
        ) : (
          <video
            key={story.id}
            src={story.mediaUrl}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-contain"
            onEnded={advance}
          />
        )}

        {/* Tap zones */}
        <button
          className="absolute left-0 top-0 h-full w-1/3 z-10"
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          aria-label="Story anterior"
        />
        <button
          className="absolute right-0 top-0 h-full w-1/3 z-10"
          onClick={advance}
          aria-label="Próximo story"
        />

        {/* Navigation arrows (desktop) */}
        {currentIdx > 0 && (
          <button
            onClick={() => setCurrentIdx((i) => i - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 hidden sm:flex rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        {currentIdx < stories.length - 1 && (
          <button
            onClick={advance}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 hidden sm:flex rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
