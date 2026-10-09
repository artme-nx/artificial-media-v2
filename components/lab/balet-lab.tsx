"use client";

import { useEffect, useRef } from "react";
import type { Engine } from "@/src/three/core/engine";
import { readSwitches } from "@/config/switches";

export function BaletLab() {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let engine: Engine | null = null;
    let disposed = false;
    const q = new URLSearchParams(location.search);
    (async () => {
      const [{ Engine }, { BalletScene }] = await Promise.all([import("@/src/three/core/engine"), import("@/src/three/scenes/ballet-scene")]);
      if (disposed || !canvas.current || !host.current) return;
      const render = q.get("render") === "1";
      engine = new Engine(canvas.current, { tier: render ? "high" : (q.get("q") as "high") || "auto", probe: true, budget: false, fixedDpr: render ? window.devicePixelRatio : undefined });
      const s = new BalletScene();
      s.progress = Number(q.get("p") ?? 0);
      s.orbit = readSwitches().balletOrbit;
      const fit = () => engine!.resize(host.current!.clientWidth, host.current!.clientHeight);
      engine.setScene(s);
      fit();
      window.addEventListener("resize", fit);
      if (render) engine.post.renderQuality();
      const eng = engine;
      const frames = (n: number) => new Promise<void>((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      (window as unknown as { __render: unknown }).__render = async (p: number) => {
        s.progress = p;
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
    <div className="fixed inset-0" style={{ background: "#e9e3d8" }}>
      <div ref={host} className="absolute inset-0">
        <canvas ref={canvas} className="block h-full w-full" />
      </div>
    </div>
  );
}
