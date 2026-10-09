"use client";

import { useEffect, useRef } from "react";
import type { Engine } from "@/src/three/core/engine";
import { readSwitches } from "@/config/switches";

export function KursorLab() {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let engine: Engine | null = null;
    let disposed = false;
    const q = new URLSearchParams(location.search);
    const offs: Array<() => void> = [];
    (async () => {
      const [{ Engine }, { CursorScene }] = await Promise.all([import("@/src/three/core/engine"), import("@/src/three/scenes/cursor-scene")]);
      if (disposed || !canvas.current || !host.current) return;
      engine = new Engine(canvas.current, { tier: (q.get("q") as "high") || "auto", probe: true, budget: false });
      const s = new CursorScene();
      const sw = readSwitches();
      s.ringOn = sw.maskRing;
      s.mobileMode = sw.cursorMobile;
      s.coarse = window.matchMedia("(pointer: coarse)").matches;
      const fit = () => engine!.resize(host.current!.clientWidth, host.current!.clientHeight);
      engine.setScene(s);
      fit();
      window.addEventListener("resize", fit);
      const el = host.current;
      const mv = (e: PointerEvent) => s.pointerMove(e.clientX, e.clientY, true, e.pointerType === "touch");
      const dn = (e: PointerEvent) => {
        el.setPointerCapture(e.pointerId);
        s.pointerDown(e.clientX, e.clientY, e.pointerType === "touch");
      };
      const up = () => s.pointerUp();
      const lv = (e: PointerEvent) => s.pointerMove(e.clientX, e.clientY, false, e.pointerType === "touch");
      el.addEventListener("pointermove", mv);
      el.addEventListener("pointerdown", dn);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
      el.addEventListener("pointerleave", lv);
      offs.push(() => {
        el.removeEventListener("pointermove", mv);
        el.removeEventListener("pointerdown", dn);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", up);
        el.removeEventListener("pointerleave", lv);
      });
      (window as unknown as { __lab: unknown }).__lab = { scene: s, engine };
    })();
    return () => {
      disposed = true;
      offs.forEach((f) => f());
      engine?.dispose();
    };
  }, []);
  return (
    <div className="fixed inset-0" style={{ background: "#d8d1c5" }}>
      <div ref={host} className="absolute inset-0 touch-none">
        <canvas ref={canvas} className="block h-full w-full" />
      </div>
    </div>
  );
}
