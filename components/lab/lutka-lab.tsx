"use client";

import { useEffect, useRef, useState } from "react";
import type { LabCam, LabScene } from "@/src/three/scenes/lab-scene";
import type { Engine } from "@/src/three/core/engine";
import type { PoseName } from "@/src/motion/library";

const POSES: PoseName[] = ["kontrapost", "kontrapost_s", "seze", "otvara", "b_enhaut", "b1_enhaut", "b_seconde", "b_bas", "b_reverence", "dirigent", "dirigent_rad", "stoji"];
const CAMS: LabCam[] = ["cijela", "blizu", "glava", "sake", "zglob", "stopala", "struk"];

/**
 * /lab/lutka — testna ruta (noindex, nije u navigaciji). Parametri za automatske screenshotove:
 * ?pose=…&cam=…&struk=A|B&izgled=wood|robot&q=high|medium|low&orbit=1
 */
export function LutkaLab() {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<LabScene | null>(null);
  const [ready, setReady] = useState(false);
  const [pose, setPose] = useState<PoseName>("kontrapost");
  const [cam, setCam] = useState<LabCam>("blizu");
  const [waist, setWaist] = useState<"A" | "B">("A");
  const [ui, setUi] = useState(true);

  useEffect(() => {
    let engine: Engine | null = null;
    let disposed = false;
    const q = new URLSearchParams(location.search);
    (async () => {
      const [{ Engine }, { LabScene }] = await Promise.all([import("@/src/three/core/engine"), import("@/src/three/scenes/lab-scene")]);
      if (disposed || !canvas.current || !host.current) return;
      const p = (q.get("pose") as PoseName) || "kontrapost";
      const c = (q.get("cam") as LabCam) || "blizu";
      const w = q.get("struk") === "B" ? "B" : "A";
      engine = new Engine(canvas.current, { tier: (q.get("q") as "high") || "auto", probe: true });
      const s = new LabScene(host.current, { pose: p, cam: c, waist: w, look: q.get("izgled") === "robot" ? "robot" : "wood", costume: q.get("kostim") === "1" });
      s.autoOrbit = q.get("orbit") === "1";
      sceneRef.current = s;
      const fit = () => engine!.resize(host.current!.clientWidth, host.current!.clientHeight);
      engine.setScene(s);
      fit();
      window.addEventListener("resize", fit);
      setPose(p);
      setCam(c);
      setWaist(w);
      setUi(q.get("ui") !== "0");
      setReady(true);
      (window as unknown as { __lab: unknown }).__lab = { scene: s, engine };
    })();
    return () => {
      disposed = true;
      engine?.dispose();
    };
  }, []);

  return (
    <div className="fixed inset-0" style={{ background: "#121110", color: "#EFEBE3" }}>
      <div ref={host} className="absolute inset-0 touch-none">
        <canvas ref={canvas} className="block h-full w-full" />
      </div>
      <div className="absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2" data-ready={ready} hidden={!ui}>
        {POSES.map((p) => (
          <button key={p} className="lab-btn" aria-pressed={pose === p} onClick={() => { setPose(p); sceneRef.current?.setPose(p); }}>
            {p}
          </button>
        ))}
      </div>
      <div className="absolute bottom-4 left-4 flex flex-wrap gap-2" hidden={!ui}>
        {CAMS.map((c) => (
          <button key={c} className="lab-btn" aria-pressed={cam === c} onClick={() => { setCam(c); sceneRef.current?.setCam(c); }}>
            {c}
          </button>
        ))}
        {(["A", "B"] as const).map((w) => (
          <button key={w} className="lab-btn" aria-pressed={waist === w} onClick={() => { setWaist(w); sceneRef.current?.setWaist(w); }}>
            struk {w}
          </button>
        ))}
      </div>
      <style>{`.lab-btn{font:500 11px/1 var(--ff-sans);letter-spacing:.16em;text-transform:uppercase;padding:.7rem .9rem;border-radius:999px;background:rgba(255,255,255,.06);color:#EFEBE3;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14)}.lab-btn[aria-pressed="true"]{background:#EFEBE3;color:#0B0B0C}`}</style>
    </div>
  );
}
