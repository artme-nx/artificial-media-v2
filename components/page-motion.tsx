"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { readSwitches } from "@/config/switches";
import { scrollToY } from "@/lib/scroll";

gsap.registerPlugin(ScrollTrigger, SplitText);

declare global {
  interface Window {
    __lenis?: Lenis;
    /** za testove i "Skip intro": skok na y uz osvježavanje ScrollTriggera */
    __scrollTo?: (y: number) => void;
  }
}

/**
 * Pokret stranice: Lenis (mekani scroll) + ScrollTrigger, otkrivanje redaka (SplitText), pozornica mrak → svjetlo.
 * Progresivno poboljšanje: ništa nije skriveno u CSS-u; skriva se samo ono što je ispod pregiba u trenutku
 * pokretanja, i to tek kad JS radi. Smanjeni pokret: bez mekanog scrolla i bez otkrivanja.
 */
export function PageMotion() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.dataset.motion = reduced ? "reduced" : "full";
    // prijelaz boja pozornice tek nakon prvog prikaza (bez animacije pri učitavanju)
    requestAnimationFrame(() => requestAnimationFrame(() => (document.documentElement.dataset.stageAnim = "1")));
    const sw = readSwitches();
    const ctx = gsap.context(() => {});
    let lenis: Lenis | undefined;
    let raf: ((t: number) => void) | undefined;

    if (!reduced) {
      lenis = new Lenis({ lerp: 0.085, anchors: { offset: 0 }, autoRaf: false });
      window.__lenis = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      raf = (time: number) => lenis!.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
    }

    window.__scrollTo = (y: number) => scrollToY(y, { immediate: true });
    (window as unknown as { __ST: typeof ScrollTrigger }).__ST = ScrollTrigger;

    // ---- pozornica: mrak dok traje uvod, zatim svijetlo (07 napomena; [ODLUKA KRISTIANA] ?svjetlo=0|1) ----
    const setStage = (mode: "dark" | "light") => {
      if (document.documentElement.dataset.stage !== mode) document.documentElement.dataset.stage = mode;
    };
    const intro = document.getElementById("intro");
    if (intro && sw.lightsUp) {
      ScrollTrigger.create({
        trigger: intro,
        start: "top top",
        end: "bottom 45%",
        // onUpdate + onRefresh (ne onToggle): skok preko cijelog raspona ne mijenja isActive, ali mijenja progress
        onUpdate: (self) => setStage(self.progress < 1 ? "dark" : "light"),
        onRefresh: (self) => setStage(self.progress < 1 ? "dark" : "light"),
      });
    } else if (!sw.lightsUp) setStage("dark");

    // ---- otkrivanje redaka ----
    if (!reduced) {
      ctx.add(() => {
        const vh = window.innerHeight;
        for (const el of document.querySelectorAll<HTMLElement>("[data-reveal]")) {
          const below = el.getBoundingClientRect().top > vh * 0.92;
          if (!below) continue; // već vidljivo pri učitavanju: ne skrivamo ništa
          SplitText.create(el, {
            type: "lines",
            mask: "lines",
            autoSplit: true,
            onSplit(self) {
              return gsap.from(self.lines, {
                yPercent: 108,
                duration: 1.15,
                ease: "expo.out",
                stagger: 0.09,
                scrollTrigger: { trigger: el, start: "top 88%", once: true },
              });
            },
          });
        }
      });
    }

    const onLoad = () => ScrollTrigger.refresh();
    // 3D je spreman → manifest postaje visok (CSS uz data-stage3d): preračunaj okidače
    window.addEventListener("stage3d-ready", onLoad);
    window.addEventListener("load", onLoad);
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      window.removeEventListener("load", onLoad);
      window.removeEventListener("stage3d-ready", onLoad);
      ctx.revert();
      ScrollTrigger.getAll().forEach((t) => t.kill());
      if (raf) gsap.ticker.remove(raf);
      lenis?.destroy();
      delete window.__lenis;
    };
  }, []);
  return null;
}
