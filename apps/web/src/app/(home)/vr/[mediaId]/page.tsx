"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Glasses, Loader2, AlertTriangle, Maximize2 } from "lucide-react";
import api from "@/lib/api";

interface WebXrConfig {
  format: "VR180" | "VR360";
  stereoMode: string;
  fovDegrees: number;
  maxQuality: "2K" | "4K" | "8K";
}

interface AccessUrl {
  url: string;
  expiresAt: string;
}

export default function VrPlayerPage() {
  const { mediaId } = useParams<{ mediaId: string }>();
  const [config, setConfig] = useState<WebXrConfig | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quality, setQuality] = useState<"2K" | "4K" | "8K">("2K");
  const [vrSupported, setVrSupported] = useState(false);

  useEffect(() => {
    if ("xr" in navigator) {
      (navigator as any).xr?.isSessionSupported("immersive-vr").then((supported: boolean) => {
        setVrSupported(supported);
      });
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    api.get(`/vr-content/${mediaId}/webxr-config`)
      .then((r) => {
        setConfig(r.data);
        return api.get(`/vr-content/${mediaId}/access/${quality}`);
      })
      .then((r: any) => setVideoUrl(r.data.url))
      .catch((e) => setError(e?.response?.data?.message ?? "Erro ao carregar conteúdo VR."))
      .finally(() => setLoading(false));
  }, [mediaId, quality]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto" />
          <p className="text-gray-400 text-sm">Carregando experiência VR...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3 max-w-sm">
          <AlertTriangle size={36} className="text-yellow-400 mx-auto" />
          <p className="text-white font-medium">Não foi possível carregar</p>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const is360 = config?.format === "VR360";
  const isSideBySide = config?.stereoMode === "side-by-side";

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Glasses size={18} className="text-purple-400" />
          <span className="font-semibold text-white">{config?.format}</span>
          <span className="text-xs text-gray-500">· {config?.fovDegrees}° · {config?.stereoMode}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quality selector */}
          <div className="flex gap-1 rounded-lg border border-gray-700 p-0.5">
            {(["2K", "4K", "8K"] as const)
              .filter((q) => {
                const order = { "2K": 1, "4K": 2, "8K": 3 };
                return order[q] <= order[config?.maxQuality ?? "2K"];
              })
              .map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                    quality === q ? "bg-purple-600 text-white" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {q}
                </button>
              ))}
          </div>

          {vrSupported && (
            <span className="flex items-center gap-1 rounded-lg bg-green-700/20 px-2.5 py-1 text-xs font-medium text-green-400">
              <Glasses size={12} /> VR disponível
            </span>
          )}
        </div>
      </div>

      {/* A-Frame VR player */}
      {videoUrl && (
        <div className="relative w-full rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
          {/* A-Frame loaded via CDN in script — rendered as custom element */}
          <a-scene
            embedded
            vr-mode-ui={vrSupported ? "enabled: true" : "enabled: false"}
            style={{ width: "100%", height: "100%" }}
          >
            {is360 ? (
              /* 360° video sphere */
              <a-videosphere
                src="#vr-video"
                rotation="0 -90 0"
                {...(isSideBySide
                  ? { "stereo-video": "eye: left; src: #vr-video" }
                  : {})}
              />
            ) : (
              /* VR180 — hemisphere */
              <a-entity
                geometry="primitive: sphere; radius: 100; phiLength: 180; thetaLength: 180"
                material={`shader: flat; src: #vr-video; side: back`}
                rotation="0 90 0"
              />
            )}

            <a-assets>
              <video id="vr-video" src={videoUrl} crossOrigin="anonymous" loop autoPlay playsInline />
            </a-assets>

            <a-camera />
          </a-scene>

          {/* Fallback for non-WebXR */}
          <noscript>
            <video src={videoUrl} controls className="w-full h-full" />
          </noscript>
        </div>
      )}

      {!vrSupported && (
        <div className="flex items-center gap-2 rounded-xl bg-yellow-900/20 border border-yellow-700/30 px-4 py-3 text-sm text-yellow-300">
          <AlertTriangle size={14} className="shrink-0" />
          Seu dispositivo não suporta WebXR. O vídeo será exibido em modo 2D. Use um headset VR para a experiência completa.
        </div>
      )}

      <p className="text-xs text-gray-600 text-center">
        Qualidade atual: {quality} · URL expira em 2 horas
      </p>
    </div>
  );
}
