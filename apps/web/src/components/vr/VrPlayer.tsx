"use client";

import { useEffect, useRef, useState } from "react";

// A-Frame custom elements — declare for JSX/TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "a-scene": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Record<string, any>;
      "a-assets": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Record<string, any>;
      "a-videosphere": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Record<string, any>;
      "a-sky": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Record<string, any>;
      "a-camera": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Record<string, any>;
    }
  }
}

/**
 * Item 48 — Player VR/AR com WebXR
 *
 * Usa A-Frame (via CDN) para renderização 360°/180°.
 * Carrega dinamicamente para não quebrar SSR.
 *
 * Suporte:
 * - Desktop: mouse look / gyroscope
 * - Mobile cardboard: WebXR DeviceOrientation
 * - WebXR headset: imersão completa via VRButton nativo do browser
 *
 * Qualidades: 2K (padrão), 4K (premium), 8K (Verified Tier)
 */

interface WebXrConfig {
  format:               "VR180" | "VR360";
  stereoMode:           "top-bottom" | "side-by-side";
  fovDegrees:           number;
  maxQuality:           "2K" | "4K" | "8K";
  availableQualities:   string[];
}

interface VrPlayerProps {
  mediaId:     string;
  config:      WebXrConfig;
  getUrlFn:    (quality: string) => Promise<{ url: string }>;
}

export default function VrPlayer({ mediaId, config, getUrlFn }: VrPlayerProps) {
  const containerRef       = useRef<HTMLDivElement>(null);
  const [quality, setQuality]   = useState(config.maxQuality);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState<string | null>(null);
  const [aframeLoaded, setAframeLoaded] = useState(false);

  // Carrega A-Frame dinamicamente (evita erro de SSR)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).AFRAME) { setAframeLoaded(true); return; }

    const script = document.createElement("script");
    script.src   = "https://aframe.io/releases/1.5.0/aframe.min.js";
    script.onload = () => setAframeLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    loadUrl(quality);
  }, [quality]);

  async function loadUrl(q: string) {
    setLoading(true);
    setError(null);
    try {
      const { url } = await getUrlFn(q);
      setVideoUrl(url);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Erro ao carregar conteúdo VR");
    } finally {
      setLoading(false);
    }
  }

  const is360 = config.fovDegrees === 360;

  return (
    <div className="relative w-full bg-black rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
      {/* Seletor de qualidade */}
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        {config.availableQualities.map((q) => (
          <button
            key={q}
            onClick={() => setQuality(q as any)}
            className={`px-2 py-1 text-xs rounded font-semibold ${
              quality === q
                ? "bg-pink-600 text-white"
                : "bg-black/60 text-gray-300 hover:bg-black/80"
            }`}
          >
            {q}
          </button>
        ))}
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
          <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <p className="text-red-400 text-sm text-center px-4">{error}</p>
        </div>
      )}

      {/* A-Frame scene */}
      {aframeLoaded && videoUrl && !loading && (
        <div ref={containerRef} className="w-full h-full">
          {/* @ts-ignore — a-scene é um elemento custom do A-Frame */}
          <a-scene
            embedded
            style={{ width: "100%", height: "100%" }}
            vr-mode-ui="enabled: true"
          >
            {/* @ts-ignore */}
            <a-assets>
              {/* @ts-ignore */}
              <video
                id={`vr-video-${mediaId}`}
                src={videoUrl}
                crossOrigin="anonymous"
                autoPlay
                loop
                playsInline
              />
            </a-assets>

            {is360 ? (
              /* 360° — esfera completa */
              /* @ts-ignore */
              <a-videosphere
                src={`#vr-video-${mediaId}`}
                stereo={config.stereoMode === "top-bottom" ? "topbottom" : "leftright"}
              />
            ) : (
              /* 180° — semicírculo frontal */
              /* @ts-ignore */
              <a-video
                src={`#vr-video-${mediaId}`}
                width="4"
                height="2"
                position="0 1.8 -3"
                stereo={config.stereoMode === "top-bottom" ? "topbottom" : "leftright"}
              />
            )}

            {/* @ts-ignore */}
            <a-camera look-controls wasd-controls="enabled: false" />
          </a-scene>
        </div>
      )}

      {/* Badge de formato */}
      <div className="absolute bottom-3 left-3 z-10">
        <span className="bg-pink-600/80 text-white text-xs px-2 py-1 rounded font-semibold">
          {config.format} · {quality}
        </span>
      </div>
    </div>
  );
}
