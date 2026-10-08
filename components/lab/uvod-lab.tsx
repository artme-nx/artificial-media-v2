"use client";

import { useEffect, useRef } from "react";
import type { Engine } from "@/src/three/core/engine";

export function UvodLab() {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let engine: Engine | null = null;
    let disposed = false;
    const q = new URLSearchParams(location.search);
    (async () => {
      const [{ Engine }, { IntroScene }] = await Promise.all([import("@/src/three/core/engine"), import("@/src/three/scenes/intro-scene")]);
      if (disposed || !canvas.current || !host.current) return;
      engine = new Engine(canvas.current, { tier: (q.get("q") as "high") || "auto", probe: true });
      const s = new IntroScene();
      s.progress = Number(q.get("p") ?? 0.25);
      s.dancerLevel = q.get("ples") === "1" ? 1 : 0;
      const fit = () => engine!.resize(host.current!.clientWidth, host.current!.clientHeight);
      engine.setScene(s);
      fit();
      window.addEventListener("resize", fit);
      (window as unknown as { __lab: unknown }).__lab = { scene: s, engine };
    })();
    return () => {
      disposed = true;
      engine?.dispose();
    };
  }, []);
  return (
    <div className="fixed inset-0" style={{ background: "#000" }}>
      <div ref={host} className="absolute inset-0">
        <canvas ref={canvas} className="block h-full w-full" />
      </div>
    </div>
  );
}
