"use client";

import { useEffect, useRef } from "react";
import { onStage, getStage, type StageState } from "@/lib/stage-store";
import { asset } from "@/lib/asset";

/**
 * Niz slika umjesto 3D-a uživo (11 §3 "Niz slika umjesto videa", F9): na mobitelu i slabim uređajima uvod (kadrovi 2 i
 * 6–10) i baletna scena crtaju se iz unaprijed renderiranih frameova (public/seq/<niz>-desk|mob/NNN.webp). Scroll pomiče
 * slike naprijed i natrag; frameovi se učitavaju postupno (prvo svaki osmi, pa gušće), crta se najbliži učitani.
 * Isti oblik mape daje scripts/video-to-frames.mjs (Seedance videi).
 */
type Seq = { name: "ples" | "uvod" | "balet"; frames: (HTMLImageElement | null)[]; count: number; loaded: Set<number> };
type Manifest = { count: number; width: number; height: number; ext: string };

export function ScrollSequence() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    const variant = window.innerWidth / window.innerHeight < 0.8 ? "mob" : "desk";
    const seqs: Record<Seq["name"], Seq | null> = { ples: null, uvod: null, balet: null };
    let disposed = false;
    let raf = 0;
    let last = "";
    // zona po vidljivosti sekcija (redatelj u ovom načinu vodi samo sekciju "drvo / robot")
    let zone: "intro" | "ballet" | null = "intro";
    const vis = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) vis.set((e.target as HTMLElement).dataset.scene!, e.isIntersecting ? e.intersectionRect.height : 0);
        const i = vis.get("intro") ?? 0, b = vis.get("ballet") ?? 0;
        zone = i > 0.5 || b > 0.5 ? (i >= b ? "intro" : "ballet") : null;
        schedule();
      },
      { threshold: Array.from({ length: 21 }, (_, k) => k / 20) },
    );
    for (const el of document.querySelectorAll<HTMLElement>('[data-scene="intro"], [data-scene="ballet"]')) io.observe(el);

    const load = async (name: Seq["name"]) => {
      const base = asset(`/seq/${name}-${variant}/`);
      const m = (await fetch(`${base}manifest.json`).then((r) => r.json())) as Manifest;
      const s: Seq = { name, count: m.count, frames: new Array(m.count).fill(null), loaded: new Set() };
      seqs[name] = s;
      // postupno: svaki osmi, pa svaki drugi, pa ostali (brz grubi niz, zatim glatkoća)
      const order: number[] = [];
      for (const step of [8, 2, 1]) for (let i = 0; i < m.count; i += step) if (!order.includes(i)) order.push(i);
      for (const i of order) {
        if (disposed) return;
        await new Promise<void>((res) => {
          const img = new Image();
          img.decoding = "async";
          img.onload = () => {
            s.frames[i] = img;
            s.loaded.add(i);
            res();
            draw();
          };
          img.onerror = () => res();
          img.src = `${base}${String(i).padStart(3, "0")}.${m.ext}`;
        });
      }
    };

    const nearest = (s: Seq, f: number) => {
      const i0 = Math.round(f);
      for (let d = 0; d < s.count; d++) {
        if (s.frames[i0 - d]) return s.frames[i0 - d];
        if (s.frames[i0 + d]) return s.frames[i0 + d];
      }
      return null;
    };

    const pick = (st: StageState): { s: Seq | null; f: number; alpha: number } => {
      if (zone === "ballet") return { s: seqs.balet, f: st.balletProgress * ((seqs.balet?.count ?? 1) - 1), alpha: 1 };
      // uvod: kadar 2 (plesačica, vrijeme) ili kadrovi 6–10 (scroll p 0,2..1); između je mrak
      if (st.dancerLevel > 0.001 && st.introProgress < 0.2) return { s: seqs.ples, f: st.dancerPhase * ((seqs.ples?.count ?? 1) - 1), alpha: st.dancerLevel };
      if (st.introProgress >= 0.2) {
        const u = (st.introProgress - 0.2) / 0.8;
        // reflektor "udari": kratko pretapanje iz mraka na početku kadra 6
        return { s: seqs.uvod, f: u * ((seqs.uvod?.count ?? 1) - 1), alpha: Math.min(1, (st.introProgress - 0.2) / 0.025) };
      }
      return { s: null, f: 0, alpha: 0 };
    };

    const draw = () => {
      raf = 0;
      const st = getStage();
      const { s, f, alpha } = pick(st);
      const img = s ? nearest(s, f) : null;
      const key = `${zone}|${s?.name}|${img?.src}|${alpha.toFixed(2)}|${canvas.width}`;
      if (key === last) return;
      last = key;
      ctx.fillStyle = zone === "ballet" ? "#c3bbae" : "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (img) {
        // "cover": slika ispuni platno, centrirana
        const k = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
        const w = img.naturalWidth * k, h = img.naturalHeight * k;
        ctx.globalAlpha = alpha;
        ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
        ctx.globalAlpha = 1;
      }
      canvas.dataset.on = zone ? "1" : "0";
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      last = "";
      schedule();
    };
    fit();
    window.addEventListener("resize", fit);
    const off = onStage(schedule);
    // kadar 2 odmah (prvi ekran), ostatak uvoda pa balet kad je preglednik slobodan
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const later = (f: () => void) => (ric ? ric(f, { timeout: 3000 }) : window.setTimeout(f, 1500));
    void load("ples").then(() => later(() => void load("uvod").then(() => later(() => void load("balet")))));
    document.documentElement.dataset.stage3d = "frames";
    window.dispatchEvent(new Event("stage3d-ready"));
    return () => {
      disposed = true;
      off();
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, []);
  return <canvas ref={ref} className="stage-canvas seq-canvas" aria-hidden="true" data-on="0" />;
}
