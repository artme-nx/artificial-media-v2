import { ScrollTrigger } from "gsap/ScrollTrigger";

/** Skok/klizanje na položaj; radi s Lenisom i bez njega (smanjeni pokret). Nakon skoka osvježi ScrollTrigger. */
export function scrollToY(y: number, opts: { immediate?: boolean; duration?: number } = {}) {
  const lenis = window.__lenis;
  if (lenis) {
    lenis.scrollTo(y, { immediate: !!opts.immediate, force: true, duration: opts.duration, onComplete: () => ScrollTrigger.update() });
    if (opts.immediate) {
      window.scrollTo(0, y);
      ScrollTrigger.update();
    }
  } else {
    window.scrollTo({ top: y, behavior: opts.immediate ? "auto" : "smooth" });
  }
}

export function scrollToId(id: string, opts: { immediate?: boolean } = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  scrollToY(el.getBoundingClientRect().top + window.scrollY, opts);
}
