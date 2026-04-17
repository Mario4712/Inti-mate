"use client";

import { useEffect, useRef, useState } from "react";

interface HlsPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
}

export function HlsPlayer({ src, poster, className, autoPlay = false, onTimeUpdate }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setError(false);

    const isHls = src.includes(".m3u8") || src.includes("/hls/");

    if (isHls && typeof window !== "undefined") {
      let hlsInstance: any = null;

      import("hls.js").then(({ default: Hls }) => {
        if (!Hls.isSupported()) {
          // Safari supports HLS natively
          video.src = src;
          return;
        }

        hlsInstance = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
        });

        hlsInstance.loadSource(src);
        hlsInstance.attachMedia(video);

        hlsInstance.on(Hls.Events.ERROR, (_: any, data: any) => {
          if (data.fatal) setError(true);
        });
      });

      return () => {
        hlsInstance?.destroy();
      };
    } else {
      video.src = src;
    }
  }, [src]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-black text-gray-500 text-sm ${className}`}>
        Erro ao carregar vídeo.
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      poster={poster}
      controls
      autoPlay={autoPlay}
      playsInline
      className={className}
      onTimeUpdate={onTimeUpdate ? (e) => onTimeUpdate((e.target as HTMLVideoElement).currentTime) : undefined}
    />
  );
}
