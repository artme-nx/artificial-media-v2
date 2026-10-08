"use client";

import { useEffect, useRef, useState } from "react";
import { readSwitches } from "@/config/switches";
import { ScrollSequence } from "./scroll-sequence";
import { asset } from "@/lib/asset";

/**
 * Jedan trajni canvas iza sadržaja (11 §3). 3D se učitava nakon prvog prikaza i nikad ne usporava put do CTA-a.
 * Izvor scena uvoda i baleta (prekidač ?izvor=auto|realtime|frames, 11 §3):
 *  - realtime: 3D uživo (jaki desktopi; auto = desktop razine high/medium);
 *  - frames: unaprijed renderirani nizovi slika (mobitel i slabi uređaji); sekcija "drvo / robot" ostaje uživo;
 *  - smanjeni pokret ili bez WebGL2: posteri (mirne slike), bez 3D-a.
 */
type Mode = "realtime" | "frames" | "off";

function chooseMode(): { mode: Mode; webgl: boolean } {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gl = document.createElement("canvas").getContext("webgl2");
  // smanjeni pokret: posteri (bez scroll-animacija i bez 3D-a)
  if (reduced) return { mode: "off", webgl: !!gl };
  // bez WebGL2: nizovi slika rade (2D canvas), sekcija "drvo / robot" dobiva poster
  if (!gl) return { mode: "frames", webgl: false };
  const sw = readSwitches();
  if (sw.source === "realtime") return { mode: "realtime", webgl: true };
  if (sw.source === "frames") return { mode: "frames", webgl: true };
  const coarse = window.matchMedia("(pointer: coarse)").matches && Math.min(window.innerWidth, window.innerHeight) < 820;
  if (coarse) return { mode: "frames", webgl: true };
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  const gpu = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
  if (/SwiftShader|llvmpipe|Software/i.test(gpu) || sw.quality === "low") return { mode: "frames", webgl: true };
  return { mode: "realtime", webgl: true };
}

export function StageCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  useEffect(() => {
    const { mode: m, webgl } = chooseMode();
    const root = document.documentElement;
    root.dataset.source = m;
    // poster sekcije "drvo / robot" kad nema 3D-a uživo; putanje postera kroz asset() (basePath)
    if (m === "off" || !webgl) root.dataset.cursor = "poster";
    const v = window.innerWidth / window.innerHeight < 0.8 ? "mob" : "desk";
    root.style.setProperty("--poster-uvod", `url("${asset(`/posters/uvod-${v}.webp`)}")`);
    root.style.setProperty("--poster-kursor", `url("${asset(`/posters/kursor-${v}.webp`)}")`);
    setMode(m);
    if (m === "off") {
      root.dataset.stage3d = "off";
      return;
    }
    if (!webgl) return; // samo nizovi slika (ScrollSequence)
    let dir: { dispose: () => void } | null = null;
    let cancelled = false;
    const boot = async () => {
      const { Director } = await import("@/src/three/director");
      if (cancelled || !ref.current) return;
      // u načinu "frames" redatelj vodi samo sekciju "drvo / robot" (uvod i balet su nizovi slika)
      const d = new Director(ref.current, { zones: m === "frames" ? ["cursor"] : ["intro", "ballet", "cursor"] });
      dir = d;
      await d.start();
    };
    // realtime: nakon prvog prikaza i kad je preglednik slobodan (ne blokira H1 i CTA).
    // frames: 3D (samo "drvo / robot") se učitava tek kad se ta sekcija približi (mobitel ne parsira three.js unaprijed).
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    let id: number | undefined;
    let io: IntersectionObserver | null = null;
    if (m === "realtime") id = ric ? ric(() => void boot(), { timeout: 700 }) : window.setTimeout(() => void boot(), 250);
    else {
      const target = document.querySelector('[data-scene="cursor"]');
      if (target) {
        io = new IntersectionObserver(
          (e) => {
            if (e.some((x) => x.isIntersecting)) {
              io?.disconnect();
              void boot();
            }
          },
          { rootMargin: "150% 0px 150% 0px" },
        );
        io.observe(target);
      }
    }
    return () => {
      cancelled = true;
      if (id !== undefined && !ric) clearTimeout(id);
      io?.disconnect();
      dir?.dispose();
    };
  }, []);
  return (
    <>
      <canvas ref={ref} className="stage-canvas" aria-hidden="true" data-on="0" />
      {mode === "frames" && <ScrollSequence />}
    </>
  );
}
