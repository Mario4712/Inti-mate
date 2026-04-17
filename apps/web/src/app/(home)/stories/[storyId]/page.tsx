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
  question: string | null;
}

interface PollOption { id: string; text: string; votes: number; pct: number; }
interface Poll { id: string; total: number; myVoteOptionId: string | null; options: PollOption[]; }

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
  const [poll, setPoll] = useState<Poll | null>(null);
  const [pollLoading, setPollLoading] = useState(false);
  const [paused, setPaused] = useState(false);

  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

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

  const startTimer = useCallback((fromElapsed = 0) => {
    clearTimer();
    startTimeRef.current = Date.now() - fromElapsed;
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      elapsedRef.current = elapsed;
      const pct = Math.min((elapsed / STORY_DURATION_MS) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearTimer();
        advance();
      }
    }, 50);
  }, [clearTimer, advance]);

  useEffect(() => {
    if (paused) {
      clearTimer();
    } else {
      startTimer(elapsedRef.current);
    }
  }, [paused, clearTimer, startTimer]);

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

  // Record view + start timer + load poll when story changes
  useEffect(() => {
    if (stories.length === 0) return;
    const story = stories[currentIdx];
    if (!story) return;

    setPoll(null);
    elapsedRef.current = 0;
    api.post(`/stories/${story.id}/view`).catch(() => {});
    startTimer(0);

    // Load poll if story has a question
    if (story.question) {
      setPollLoading(true);
      api.get(`/stories/${story.id}/poll`)
        .then((r) => setPoll(r.data))
        .catch(() => {})
        .finally(() => setPollLoading(false));
    }

    return () => clearTimer();
  }, [currentIdx, stories, startTimer, clearTimer]);

  async function handleVote(optionId: string) {
    if (!poll || poll.myVoteOptionId) return;
    const story = stories[currentIdx];
    const res = await api.post(`/stories/${story.id}/poll/vote`, { optionId }).catch(() => null);
    if (res?.data) setPoll(res.data);
  }

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
      <div
        className="relative w-full max-w-sm h-full max-h-[90vh] rounded-xl overflow-hidden"
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
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

        {/* Poll overlay */}
        {story.question && (
          <div className="absolute bottom-16 left-4 right-4 z-20 rounded-2xl bg-black/70 p-4 backdrop-blur-sm">
            <p className="mb-3 text-center text-sm font-semibold text-white">{story.question}</p>
            {pollLoading ? (
              <p className="text-center text-xs text-gray-400">Carregando enquete...</p>
            ) : poll ? (
              <div className="space-y-2">
                {poll.options.map((opt) => {
                  const voted = poll.myVoteOptionId === opt.id;
                  const revealed = !!poll.myVoteOptionId;
                  return (
                    <button
                      key={opt.id}
                      disabled={revealed}
                      onClick={() => handleVote(opt.id)}
                      className="relative w-full overflow-hidden rounded-xl border border-white/20 px-4 py-2 text-left text-sm font-medium text-white transition-colors hover:border-white/40 disabled:cursor-default"
                    >
                      {revealed && (
                        <div
                          className={`absolute inset-y-0 left-0 rounded-xl transition-all ${voted ? "bg-purple-500/50" : "bg-white/10"}`}
                          style={{ width: `${opt.pct}%` }}
                        />
                      )}
                      <span className="relative">{opt.text}</span>
                      {revealed && (
                        <span className="relative ml-2 text-xs text-gray-300">{opt.pct}%</span>
                      )}
                    </button>
                  );
                })}
                {poll.myVoteOptionId && (
                  <p className="text-center text-xs text-gray-400">{poll.total} {poll.total === 1 ? "voto" : "votos"}</p>
                )}
              </div>
            ) : null}
          </div>
        )}

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
