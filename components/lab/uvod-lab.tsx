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
      const render = q.get("render") === "1";
      engine = new Engine(canvas.current, { tier: render ? "high" : (q.get("q") as "high") || "auto", probe: true, budget: false, fixedDpr: render ? window.devicePixelRatio : undefined });
      const s = new IntroScene();
      s.progress = Number(q.get("p") ?? 0.25);
      s.dancerLevel = q.get("ples") === "1" ? 1 : 0;
      s.dancerPhase = Number(q.get("faza") ?? 1);
      const fit = () => engine!.resize(host.current!.clientWidth, host.current!.clientHeight);
      engine.setScene(s);
      fit();
      window.addEventListener("resize", fit);
      if (render) engine.post.renderQuality();
      // F9 render niza slika: postavi kadar, preskoči izglađivanje, pričekaj nekoliko frameova
      const eng = engine;
      const frames = (n: number) => new Promise<void>((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      (window as unknown as { __render: unknown }).__render = async (p: number, opt: { ples?: number; faza?: number } = {}) => {
        s.progress = p;
        if (opt.ples !== undefined) s.dancerLevel = opt.ples;
        if (opt.faza !== undefined) s.dancerPhase = opt.faza;
        s.snap();
        eng.invalidate();
        await frames(6);
        s.snap();
        await frames(4);
      };
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
