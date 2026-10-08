"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { site } from "@/content/site";
import { T } from "@/components/t";
import { setStage } from "@/lib/stage-store";

gsap.registerPlugin(ScrollTrigger);

/**
 * Manifest (03 §29) preko baletne scene (11 §4 red 3, F5; 07 6. 10.).
 * Kad je 3D spreman, sekcija je visoka i scroll vodi scenu (radi i unatrag); sloj s tekstom je sticky:
 * prvi redak dok je kamera iznad lutke (en haut → port de bras), drugi dok se kamera spušta i odmiče (bras bas),
 * a na kraju lutka sama u krugu svjetla napravi révérence. Bez 3D-a (smanjeni pokret, bez WebGL2): obična sekcija.
 */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** 0 → 1 između a0 i a1, 1 → 0 između b0 i b1 (meko) */
function window01(p: number, a0: number, a1: number, b0: number, b1: number) {
  const s = (x: number) => x * x * (3 - 2 * x);
  return Math.min(s(clamp01((p - a0) / (a1 - a0))), 1 - s(clamp01((p - b0) / (b1 - b0))));
}

export function ManifestSection() {
  const [a, b] = site.manifest.lines;
  const sec = useRef<HTMLElement>(null);
  const lineA = useRef<HTMLDivElement>(null);
  const lineB = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sec.current!;
    let st: ScrollTrigger | null = null;
    const show = (node: HTMLDivElement | null, v: number) => {
      if (!node) return;
      node.style.opacity = String(v);
      node.style.transform = `translate3d(0, ${(1 - v) * 18}px, 0)`;
      node.style.filter = v < 0.999 ? `blur(${(1 - v) * 6}px)` : "";
    };
    const apply = (p: number) => {
      setStage({ balletProgress: p });
      show(lineA.current, window01(p, 0.02, 0.1, 0.34, 0.42));
      show(lineB.current, window01(p, 0.44, 0.53, 0.76, 0.84));
    };
    const setup = () => {
      if (st || document.documentElement.dataset.stage3d !== "ready") return;
      // visina sekcije se upravo promijenila (CSS uz data-stage3d) — preračunaj sve okidače
      ScrollTrigger.refresh();
      st = ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => apply(self.progress),
        onRefresh: (self) => apply(self.progress),
      });
      apply(st.progress);
    };
    setup();
    window.addEventListener("stage3d-ready", setup);
    return () => {
      window.removeEventListener("stage3d-ready", setup);
      st?.kill();
      for (const n of [lineA.current, lineB.current]) if (n) n.removeAttribute("style");
    };
  }, []);

  return (
    <section id="manifest" ref={sec} data-scene="ballet" aria-label="Manifest" className="section manifest">
      <div className="manifest-sticky">
        <div className="container-page manifest-grid grid min-h-[80dvh] content-center gap-[var(--sp-stack-xl)]">
          <div ref={lineA} className="manifest-a">
            <T s={a} as="p" className="statement manifest-line max-w-[14ch]" data-reveal style={{ fontSize: "var(--fs-display-l)" }} />
          </div>
          <div ref={lineB} className="manifest-b justify-self-end">
            <T s={b} as="p" className="statement manifest-line max-w-[15ch] text-right italic" data-reveal style={{ fontSize: "var(--fs-display-l)" }} />
          </div>
        </div>
      </div>
      <div className="manifest-fade" aria-hidden="true" />
    </section>
  );
}
