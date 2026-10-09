"use client";

import { useEffect, useRef } from "react";
import type { Engine } from "@/src/three/core/engine";
import type { StageCam } from "@/src/three/scenes/stage-lab-scene";
import type { PoseName } from "@/src/motion/library";

export function ScenaLab() {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let engine: Engine | null = null;
    let disposed = false;
    const q = new URLSearchParams(location.search);
    (async () => {
      const [{ Engine }, { StageLabScene }] = await Promise.all([import("@/src/three/core/engine"), import("@/src/three/scenes/stage-lab-scene")]);
      if (disposed || !canvas.current || !host.current) return;
      engine = new Engine(canvas.current, { tier: (q.get("q") as "high") || "auto", probe: true, budget: false });
      const s = new StageLabScene(host.current, {
        cam: (q.get("cam") as StageCam) || "still",
        pose: (q.get("pose") as PoseName) || undefined,
        yaw: q.has("okret") ? Number(q.get("okret")) : undefined,
        rows: q.has("redovi") ? Number(q.get("redovi")) : 3,
        play: q.has("svira") ? q.get("svira") === "1" : undefined,
        custom: q.has("cpos")
          ? {
              pos: q.get("cpos")!.split(",").map(Number) as [number, number, number],
              target: (q.get("ctgt") ?? "0,1.45,0.4").split(",").map(Number) as [number, number, number],
              mm: Number(q.get("mm") ?? 50),
              fStop: Number(q.get("f") ?? 2),
              focus: q.has("cfoc") ? (q.get("cfoc")!.split(",").map(Number) as [number, number, number]) : [0, 1.5, 0.4],
            }
          : undefined,
      });
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
    <div className="fixed inset-0" style={{ background: "#020202" }}>
      <div ref={host} className="absolute inset-0 touch-none">
        <canvas ref={canvas} className="block h-full w-full" />
      </div>
    </div>
  );
}
