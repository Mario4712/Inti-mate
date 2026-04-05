"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import api from "@/lib/api";

interface Story {
  id: string;
  mediaUrl: string;
  mediaType: string;
  expiresAt: string;
  viewCount: number;
}

interface CreatorStories {
  creator: {
    id: string;
    username: string;
    artisticName: string;
    avatarUrl: string | null;
  };
  stories: Story[];
  hasUnseen: boolean;
}

export function StoriesBar() {
  const [feed, setFeed] = useState<CreatorStories[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<{ creatorIdx: number; storyIdx: number } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    api.get("/stories/feed")
      .then((r) => setFeed(Array.isArray(r.data) ? r.data : r.data?.items ?? []))
      .catch(() => setFeed([]))
      .finally(() => setLoading(false));
  }, []);

  function openStory(creatorIdx: number, storyIdx = 0) {
    setViewing({ creatorIdx, storyIdx });
    const story = feed[creatorIdx]?.stories[storyIdx];
    if (story) {
      api.post(`/stories/${story.id}/view`).catch(() => {});
    }
    startTimer(creatorIdx, storyIdx);
  }

  function startTimer(creatorIdx: number, storyIdx: number) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => goNext(creatorIdx, storyIdx), 5000);
  }

  function goNext(creatorIdx: number, storyIdx: number) {
    const creator = feed[creatorIdx];
    if (!creator) return;
    if (storyIdx + 1 < creator.stories.length) {
      openStory(creatorIdx, storyIdx + 1);
    } else if (creatorIdx + 1 < feed.length) {
      openStory(creatorIdx + 1, 0);
    } else {
      closeViewer();
    }
  }

  function goPrev(creatorIdx: number, storyIdx: number) {
    if (storyIdx > 0) {
      openStory(creatorIdx, storyIdx - 1);
    } else if (creatorIdx > 0) {
      const prevCreator = feed[creatorIdx - 1];
      openStory(creatorIdx - 1, prevCreator.stories.length - 1);
    }
  }

  function closeViewer() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setViewing(null);
  }

  if (loading || feed.length === 0) return null;

  const viewingCreator = viewing ? feed[viewing.creatorIdx] : null;
  const viewingStory = viewingCreator ? viewingCreator.stories[viewing!.storyIdx] : null;

  return (
    <>
      {/* Horizontal scroll bar */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
        {feed.map((cs, i) => (
          <button
            key={cs.creator.id}
            onClick={() => openStory(i)}
            className="flex shrink-0 flex-col items-center gap-1"
          >
            <div className={`relative h-14 w-14 rounded-full p-0.5 ${cs.hasUnseen ? "bg-gradient-to-tr from-purple-500 to-pink-500" : "bg-gray-700"}`}>
              <div className="relative h-full w-full overflow-hidden rounded-full bg-gray-800">
                {cs.creator.avatarUrl ? (
                  <Image src={cs.creator.avatarUrl} alt={cs.creator.artisticName} fill className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-lg font-bold text-gray-400">
                    {cs.creator.artisticName.charAt(0)}
                  </span>
                )}
              </div>
            </div>
            <span className="max-w-[56px] truncate text-[10px] text-gray-400">
              {cs.creator.artisticName}
            </span>
          </button>
        ))}
      </div>

      {/* Story viewer overlay */}
      {viewing && viewingStory && viewingCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={closeViewer}>
          <div
            className="relative h-full max-h-[90vh] w-full max-w-sm overflow-hidden rounded-2xl bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress bars */}
            <div className="absolute top-3 left-3 right-3 z-10 flex gap-1">
              {viewingCreator.stories.map((_, i) => (
                <div key={i} className="h-0.5 flex-1 rounded-full bg-white/30 overflow-hidden">
                  <div
                    className={`h-full bg-white rounded-full ${i < viewing.storyIdx ? "w-full" : i === viewing.storyIdx ? "animate-progress" : "w-0"}`}
                    style={i === viewing.storyIdx ? { animationDuration: "5s", animationTimingFunction: "linear", width: "100%" } : {}}
                  />
                </div>
              ))}
            </div>

            {/* Creator info */}
            <div className="absolute top-8 left-3 z-10 flex items-center gap-2">
              <div className="relative h-8 w-8 overflow-hidden rounded-full bg-gray-700">
                {viewingCreator.creator.avatarUrl ? (
                  <Image src={viewingCreator.creator.avatarUrl} alt="" fill className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs font-bold text-gray-400">
                    {viewingCreator.creator.artisticName.charAt(0)}
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-white">{viewingCreator.creator.artisticName}</p>
            </div>

            {/* Close */}
            <button onClick={closeViewer} className="absolute right-3 top-8 z-10 text-white">
              <X size={20} />
            </button>

            {/* Media */}
            <div className="relative h-full w-full">
              {viewingStory.mediaType.startsWith("video") ? (
                <video
                  key={viewingStory.id}
                  src={viewingStory.mediaUrl}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                  onEnded={() => goNext(viewing.creatorIdx, viewing.storyIdx)}
                />
              ) : (
                <Image
                  key={viewingStory.id}
                  src={viewingStory.mediaUrl}
                  alt=""
                  fill
                  className="object-cover"
                />
              )}
            </div>

            {/* Nav zones */}
            <button
              className="absolute left-0 top-0 h-full w-1/3"
              onClick={() => goPrev(viewing.creatorIdx, viewing.storyIdx)}
            />
            <button
              className="absolute right-0 top-0 h-full w-1/3"
              onClick={() => goNext(viewing.creatorIdx, viewing.storyIdx)}
            />
          </div>
        </div>
      )}
    </>
  );
}
