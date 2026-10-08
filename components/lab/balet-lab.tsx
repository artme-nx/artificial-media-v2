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
      engine = new Engine(canvas.current, { tier: (q.get("q") as "high") || "auto", probe: true });
      const s = new BalletScene();
      s.progress = Number(q.get("p") ?? 0);
      s.orbit = readSwitches().balletOrbit;
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
    <div className="fixed inset-0" style={{ background: "#e9e3d8" }}>
      <div ref={host} className="absolute inset-0">
        <canvas ref={canvas} className="block h-full w-full" />
      </div>
    </div>
  );
}
