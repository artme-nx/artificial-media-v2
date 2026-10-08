"use client";

import { useEffect, useRef } from "react";

/**
 * Jedan trajni canvas iza sadržaja (11 §3). 3D se učitava nakon prvog prikaza i nikad ne usporava put do CTA-a.
 * Bez WebGL2 ili uz smanjeni pokret: ne učitava se (tekst i mirne slike).
 */
export function StageCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gl2 = !!document.createElement("canvas").getContext("webgl2");
    if (reduced || !gl2) {
      document.documentElement.dataset.stage3d = "off";
      return;
    }
    let dir: { dispose: () => void } | null = null;
    let cancelled = false;
    const boot = async () => {
      const { Director } = await import("@/src/three/director");
      if (cancelled || !ref.current) return;
      const d = new Director(ref.current);
      dir = d;
      await d.start();
    };
    // nakon prvog prikaza i kad je preglednik slobodan (ne blokira H1 i CTA)
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const id = ric ? ric(() => void boot(), { timeout: 700 }) : window.setTimeout(() => void boot(), 250);
    return () => {
      cancelled = true;
      if (!ric) clearTimeout(id);
      dir?.dispose();
    };
  }, []);
  return <canvas ref={ref} className="stage-canvas" aria-hidden="true" data-on="0" />;
}
