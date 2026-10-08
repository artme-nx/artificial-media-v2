"use client";

import { useEffect } from "react";
import type { DollMode } from "@/src/three/doll/doll-view";
import { onStageIntent } from "@/lib/stage-bus";

/**
 * Mala lutka u sekcijama (11 §4: reelovi, F7 usluge / CTA / podnožje): jedan mali prozirni canvas koji se seli
 * u sidro sekcije koja je na ekranu ([data-doll-anchor]). Učitava se lijeno; bez WebGL2 nema lutke (dekoracija).
 */
export function DollStage() {
  useEffect(() => {
    if (!document.createElement("canvas").getContext("webgl2")) return;
    let disposed = false;
    let view: import("@/src/three/doll/doll-view").DollView | null = null;
    let active: HTMLElement | null = null;
    const canvas = document.createElement("canvas");
    canvas.className = "doll-canvas";
    canvas.setAttribute("aria-hidden", "true");
    const ratio = new Map<Element, number>();
    const fit = () => {
      if (view && active) view.resize(active.clientWidth, active.clientHeight);
    };
    const ro = new ResizeObserver(fit);
    const pick = () => {
      let best: HTMLElement | null = null;
      let br = 0.04;
      for (const [el, r] of ratio) if (r > br) (best = el as HTMLElement), (br = r);
      if (!view) return;
      if (best !== active) {
        if (active) ro.unobserve(active);
        active = best;
        if (active) {
          active.appendChild(canvas);
          ro.observe(active);
          const mode = (active.dataset.dollAnchor || "reels") as DollMode;
          view.lookSource = mode === "reels" ? () => reelTarget() ?? mouseTarget() : mouseTarget;
          view.setMode(mode, (active.dataset.dollPose as never) || "stoji");
          fit();
          if (mode === "footer" && pendingBow) {
            pendingBow = false;
            view.reverence();
          }
        }
      }
      view.setRunning(!!active);
    };
    // globalno (F7): kad lutka miruje, glava prati kursor (±35°, s kašnjenjem), osim u koreografiranim trenucima
    let mouse: { x: number; y: number } | null = null;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") mouse = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    const mouseTarget = () => mouse;
    // usluge: poza po usluzi (07, interakcija 2)
    const offIntent = onStageIntent((st) => {
      if (view && active?.dataset.dollAnchor === "service") view.pose((st.servicePose as never) || "stoji");
    });
    // podnožje: révérence kad korisnik stigne do dna (jednom po dolasku)
    let atBottom = false;
    let pendingBow = false;
    const onScroll = () => {
      const bottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 6;
      if (bottom && !atBottom) {
        if (view && active?.dataset.dollAnchor === "footer") view.reverence();
        else pendingBow = true; // sidro podnožja se aktivira malo kasnije (IntersectionObserver)
      }
      if (!bottom) pendingBow = false;
      atBottom = bottom;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratio.set(e.target, e.isIntersecting ? e.intersectionRatio : 0);
        pick();
      },
      { threshold: [0, 0.05, 0.25, 0.5, 0.75, 1] },
    );
    const boot = async () => {
      const { DollView } = await import("@/src/three/doll/doll-view");
      if (disposed) return;
      view = new DollView(canvas);
      for (const el of document.querySelectorAll("[data-doll-anchor]")) io.observe(el);
      pick();
    };
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const id = ric ? ric(() => void boot(), { timeout: 2000 }) : window.setTimeout(() => void boot(), 800);
    return () => {
      disposed = true;
      if (!ric) clearTimeout(id);
      io.disconnect();
      ro.disconnect();
      offIntent();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      view?.dispose();
      canvas.remove();
    };
  }, []);
  return null;
}

/** Reelovi (07, interakcija 4): lutka gleda aktivni reel (pod mišem/fokusom, inače onaj najbliži sredini ekrana). */
function reelTarget() {
  const el = document.querySelector<HTMLElement>('[data-reel-active="1"]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
