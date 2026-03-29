"use client";

import { useEffect, useState } from "react";

/**
 * Detecta intenção de saída pelo movimento do mouse para fora do viewport (topo).
 * Dispara no máximo 1x por sessão.
 */
export function useExitIntent(enabled = true): boolean {
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const STORAGE_KEY = "exit_intent_shown";
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    const handleMouseOut = (e: MouseEvent) => {
      // Sai pelo topo da janela
      if (e.clientY <= 0 && !triggered) {
        setTriggered(true);
        sessionStorage.setItem(STORAGE_KEY, "1");
      }
    };

    document.addEventListener("mouseleave", handleMouseOut);
    return () => document.removeEventListener("mouseleave", handleMouseOut);
  }, [enabled, triggered]);

  return triggered;
}
