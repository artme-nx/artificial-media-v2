"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { site } from "@/content/site";
import { ui } from "@/content/ui";
import { T, kernW } from "@/components/t";
import { Logo, type LogoHandle } from "@/components/logo";
import { readSwitches } from "@/config/switches";
import { setStage } from "@/lib/stage-store";
import { scrollToId } from "@/lib/scroll";

gsap.registerPlugin(ScrollTrigger);

/**
 * Kazališni uvod (07 Otvaranje, 11 §4 red 1, F4).
 * U DOM-u je H1 jedna rečenica (tražilice, čitači zaslona); uvod je prikazuje u dva dijela.
 *  1  mrak, "Where art meets intelligence," filmskom animacijom slova, pa nestane        (samo, [PRETPOSTAVKA])
 *  2  "boundaries disappear." preko drvene lutke u protusvjetlu (3D)                       (samo)
 *  3  "ARTIFICIAL MEDIA" u logu, lutka je I (animacija loga)                               (samo)
 *  4  titranje: IFICIAL (s lutkom-I) i DIA se ugase, ART i ME se primaknu u "ART ME"      (scroll, radi unatrag)
 *  5  i ART ME se ugasi; mrak                                                              (scroll)
 *  6–10  3D: reflektor, dirigent, orkestar, tri takta 4/4, naklon                          (scroll; src/three/scenes/intro-scene.ts)
 * Navigacija i "Brief us" su dostupni cijelo vrijeme; "Skip intro" i preskakanje scrollom; statična verzija za smanjeni pokret.
 */
const AUTO_TOTAL = 6.2; // s (najviše ~6 s, 11 F4)

/** Titranje kao svjetlo koje zatreperi: deterministička krivulja (isti scroll = isto stanje). */
function flicker(u: number, seed: number) {
  if (u <= 0) return 1;
  if (u >= 1) return 0;
  const cuts: Array<[number, number]> = [
    [0.08, 0], [0.13, 0.85], [0.2, 0], [0.24, 1], [0.33, 0.15], [0.37, 0.7], [0.45, 0], [0.52, 0.55], [0.57, 0], [0.63, 0.35], [0.68, 0], [0.74, 0.18], [0.78, 0],
  ];
  let v = 1;
  for (const [t, val] of cuts) if (u >= t + seed * 0.03) v = val;
  return v;
}

export function IntroSection() {
  const section = useRef<HTMLElement>(null);
  const part1 = useRef<HTMLSpanElement>(null);
  const part2 = useRef<HTMLSpanElement>(null);
  const eyebrow = useRef<HTMLParagraphElement>(null);
  const logoWrap = useRef<HTMLDivElement>(null);
  const logo = useRef<LogoHandle>(null);
  const skip = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sw = readSwitches();
    const sec = section.current!;
    if (reduced) {
      // statična verzija: cijeli H1, logo, bez automatike i bez scroll-animacija
      root.dataset.intro = "static";
      delete root.dataset.introLive;
      setStage({ introAutoDone: true, introProgress: 0 });
      return;
    }
    root.dataset.intro = "cinema";
    root.dataset.introLive = "1";
    const ctx = gsap.context(() => {});
    const svg = logo.current?.svg;
    const words = (w: string) => (svg ? Array.from(svg.querySelectorAll<SVGGElement>(`[data-word="${w}"]`)) : []);
    const [gART, gIFICIAL, gME, gDIA] = ["ART", "IFICIAL", "ME", "DIA"].map((w) => words(w)[0]);

    // ---- ART i ME: koliko se trebaju primaknuti (u jedinicama viewBoxa)
    let shiftART = 0, shiftME = 0;
    if (gART && gME && svg) {
      const a = gART.getBBox(), m = gME.getBBox();
      const vb = svg.viewBox.baseVal;
      const space = 78; // razmak riječi u logu (0,78 visine verzala)
      const total = a.width + space + m.width;
      const left = vb.x + (vb.width - total) / 2;
      shiftART = left - a.x;
      shiftME = left + a.width + space - m.x;
    }

    // ---- automatski dio (kadrovi 1–3)
    let autoDone = false;
    const finishAuto = (immediate: boolean) => {
      if (autoDone) return;
      autoDone = true;
      if (auto.progress() < 1) auto.progress(1);
      auto.pause();
      if (immediate) {
        gsap.set(logoWrap.current, { autoAlpha: 1 });
        gsap.set([part1.current, part2.current], { opacity: 0 });
      }
      setStage({ introAutoDone: true, dancerLevel: 0, dancerPhase: 1 });
      root.dataset.introAuto = "done";
      // veliki logo je na ekranu samo ako smo još u kadrovima 3–5 (preskakanje skokom niže ga ne smije ostaviti)
      const sec = section.current;
      const p = sec ? Math.min(1, Math.max(0, -sec.getBoundingClientRect().top / Math.max(1, sec.offsetHeight - window.innerHeight))) : 0;
      if (p < 0.19) root.dataset.introLogo = "1";
      else delete root.dataset.introLogo;
    };
    // kadar 1 (prvi dio naslova) se animira čistim CSS-om od prvog prikaza (ne čeka JS); GSAP preuzima ostatak,
    // usklađen s vremenom od učitavanja stranice
    root.dataset.introOk = "1";
    const dancer = { v: 0, phase: 0 };
    const auto = gsap.timeline({ paused: true, onComplete: () => finishAuto(false) });
    const titleOut = { opacity: 0, letterSpacing: "0.12em", filter: "blur(10px)", duration: 0.6, ease: "power2.in" };
    if (sw.introAutoplay) {
      gsap.set(logoWrap.current, { autoAlpha: 0 });
      auto
        .to(part1.current, { ...titleOut }, 2.15)
        .to(dancer, { v: 1, duration: 1.0, ease: "power2.inOut", onUpdate: () => setStage({ dancerLevel: dancer.v }) }, 2.3)
        // port de bras: bras bas → à la seconde → en haut → poza slova I iz loga (kadar 3 je ta ista lutka u logu)
        .fromTo(dancer, { phase: 0 }, { phase: 1, duration: 2.15, ease: "power1.inOut", onUpdate: () => setStage({ dancerPhase: dancer.phase }) }, 2.3)
        .fromTo(part2.current, { "--reveal": "100%", letterSpacing: "0.12em", filter: "blur(12px)" }, { "--reveal": "0%", letterSpacing: "0em", filter: "blur(0px)", duration: 1.3, ease: "power2.out" }, 2.55)
        .to(part2.current, { ...titleOut }, 4.35)
        // plesačica se ugasi prije loga (kadar 3 je samo logo; lutka-I je u logu)
        .to(dancer, { v: 0, duration: 0.55, ease: "power2.in", onUpdate: () => setStage({ dancerLevel: dancer.v }) }, 4.35)
        .set(logoWrap.current, { autoAlpha: 1 }, 4.95)
        .call(() => {
          root.dataset.introLogo = "1";
          void logo.current?.play();
        }, undefined, 4.95)
        .to({}, { duration: AUTO_TOTAL - 4.95 }, 4.95);
      // CSS animacija prvog dijela je krenula pri prvom prikazu: nastavi od tog trenutka
      const since = Math.max(0, performance.now() / 1000 - 0.1);
      if (since > AUTO_TOTAL) finishAuto(true);
      else {
        auto.seek(since, false);
        auto.play();
      }
    } else {
      finishAuto(true);
    }
    ctx.add(() => auto);
    // za testove i QA: zaustavi automatski dio u trenutku t (s) — ponovljivi screenshotovi kadrova 1–3
    (window as unknown as { __intro?: { seek: (t: number) => void } }).__intro = {
      seek: (t: number) => {
        auto.pause();
        auto.seek(Math.min(t, AUTO_TOTAL), false);
        if (t < 4.95) delete root.dataset.introLogo;
        if (t < AUTO_TOTAL) {
          autoDone = false;
          delete root.dataset.introAuto;
          setStage({ introAutoDone: false });
        } else finishAuto(false);
      },
    };

    // preskakanje automatskog dijela scrollom
    const onScrollSkip = () => {
      if (window.scrollY > 4 && !autoDone) finishAuto(true);
    };
    window.addEventListener("scroll", onScrollSkip, { passive: true });

    // ---- scroll dio (kadrovi 4–10)
    const st = ScrollTrigger.create({
      trigger: sec,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        const p = self.progress;
        setStage({ introProgress: p });
        // kadar 4: titranje + ART ME (p 0,03–0,14); kadar 5: ART ME se ugasi (p 0,14–0,19)
        const u4 = Math.min(1, Math.max(0, (p - 0.03) / 0.11));
        const slide = gsap.parseEase("power2.inOut")(Math.min(1, Math.max(0, (u4 - 0.55) / 0.45)));
        const fade5 = 1 - Math.min(1, Math.max(0, (p - 0.14) / 0.05));
        const flick5 = p > 0.14 && p < 0.19 ? flicker((p - 0.14) / 0.05, 2) : 1;
        if (gIFICIAL) gIFICIAL.style.opacity = String(flicker(u4, 0));
        if (gDIA) gDIA.style.opacity = String(flicker(u4, 1));
        if (gART) gART.style.transform = `translateX(${shiftART * slide}px)`;
        if (gME) gME.style.transform = `translateX(${shiftME * slide}px)`;
        if (logoWrap.current && autoDone) logoWrap.current.style.opacity = String(Math.max(0, Math.min(fade5, flick5)));
        if (autoDone) {
          if (p < 0.19) root.dataset.introLogo = "1";
          else delete root.dataset.introLogo;
        }
        root.dataset.introFrame = p < 0.03 ? "3" : p < 0.14 ? "4" : p < 0.2 ? "5" : p < 0.3 ? "6" : p < 0.46 ? "7" : p < 0.6 ? "8" : p < 0.86 ? "9" : "10";
        if (skip.current) skip.current.dataset.hidden = p > 0.97 ? "1" : "0";
      },
    });
    ctx.add(() => st);

    return () => {
      delete root.dataset.introLogo;
      window.removeEventListener("scroll", onScrollSkip);
      ctx.revert();
      delete root.dataset.intro;
    };
  }, []);

  return (
    <section id="intro" ref={section} data-scene="intro" data-stage-zone="dark" aria-labelledby="h1" className="intro relative">
      <div className="intro-sticky">
        <div className="intro-copy" style={{ paddingInline: "var(--sp-gutter)" }}>
          <p ref={eyebrow} className="label eyebrow intro-eyebrow">
            <T s={site.hero.eyebrow} />
          </p>
          <h1 id="h1" className="statement intro-h1" style={{ fontSize: "var(--fs-display-xl)" }} aria-label={site.hero.h1.text}>
            <span ref={part1} data-h1-part="1" className="intro-part">
              {kernW(site.hero.h1Part1.text)}
            </span>{" "}
            <span ref={part2} data-h1-part="2" className="intro-part italic">
              {site.hero.h1Part2.text}
            </span>
          </h1>
          <div ref={logoWrap} className="intro-logo" aria-hidden="true">
            <Logo ref={logo} decorative className="h-auto w-full" />
          </div>
          <div className="intro-static-cta">
            <Link href="/start/" className="btn btn-primary">
              <T s={site.nav.cta} />
            </Link>
          </div>
        </div>
        <button ref={skip} type="button" className="intro-skip label" onClick={() => scrollToId("manifest", { immediate: true })}>
          {ui.skipIntro}
        </button>
      </div>
    </section>
  );
}
