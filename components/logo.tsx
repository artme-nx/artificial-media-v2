"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import logoDefault from "@/src/brand/logo-default.json";
import type logoAll from "@/src/brand/logo-data.json";
import { readSwitches, type LogoAccent } from "@/config/switches";
import { asset } from "@/lib/asset";

/**
 * Logo runde 3 · geometrija, jednobojno; lutka je I (05-logo runda 3/3b).
 * Naglasak ART/ME je prekidač ?logo=podebljano|tonski|sjena|podebljano-tonski (zadano podebljano) [ODLUKA KRISTIANA].
 * ART ME se samo pokazuje (04-ime §0) — nigdje se ne objašnjava.
 *
 * Riječi su zasebne grupe (data-word = ART | IFICIAL | ME | DIA); lutka-I pripada riječi IFICIAL,
 * pa je uvod (F4) može ugasiti zajedno s njom.
 */
type Variant = (typeof logoAll.variants)[LogoAccent];
/** ostale varijante naglaska (prekidač ?logo=) učitavaju se na zahtjev */
let allVariants: Promise<Record<LogoAccent, Variant>> | null = null;
const loadVariants = () => (allVariants ??= import("@/src/brand/logo-data.json").then((m) => m.default.variants as Record<LogoAccent, Variant>));
export type LogoHandle = { svg: SVGSVGElement | null; play: () => Promise<void> };

const WORDS = ["ART", "IFICIAL", "ME", "DIA"] as const;

export const Logo = forwardRef<LogoHandle, {
  className?: string;
  title?: string;
  /** "auto": varijanta iz prekidača (na klijentu); ili fiksna varijanta */
  variant?: LogoAccent | "auto";
  /** odigraj animaciju sastavljanja kad se komponenta prvi put pojavi u vidnom polju */
  animateOnView?: boolean;
  decorative?: boolean;
  style?: React.CSSProperties;
}>(function Logo({ className, title = "Artificial Media", variant = "auto", animateOnView = false, decorative = false, style }, ref) {
  const svgRef = useRef<SVGSVGElement>(null);
  const figRef = useRef<SVGPathElement>(null);
  // Na poslužitelju i u prvom renderu uvijek zadana varijanta; prekidač ?logo= se primjenjuje nakon hidracije.
  const [auto, setAuto] = useState<LogoAccent>("podebljano");
  const [extra, setExtra] = useState<Record<LogoAccent, Variant> | null>(null);
  const key: LogoAccent = variant === "auto" ? auto : variant;
  useEffect(() => {
    if (variant !== "auto") return;
    const want = readSwitches().logo;
    if (want !== "podebljano") setAuto(want);
  }, [variant]);
  useEffect(() => {
    if (key !== "podebljano" && !extra) void loadVariants().then(setExtra);
  }, [key, extra]);
  const v = (key === "podebljano" || !extra ? logoDefault.variants.podebljano : extra[key]) as Variant;

  const play = useMemo(() => () => playAssembly(svgRef.current, figRef.current, v.figure.d), [v.figure.d]);
  useImperativeHandle(ref, () => ({ svg: svgRef.current, play }), [play]);

  useEffect(() => {
    if (!animateOnView || !svgRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = svgRef.current;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        play();
      }
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [animateOnView, play]);

  return <LogoSvg ref={svgRef} figRef={figRef} v={v} className={className} title={title} decorative={decorative} style={style} />;
});

const LogoSvg = forwardRef<SVGSVGElement, {
  v: Variant;
  figRef: React.RefObject<SVGPathElement | null>;
  className?: string;
  title: string;
  decorative: boolean;
  style?: React.CSSProperties;
}>(function LogoSvg({ v, figRef, className, title, decorative, style }, ref) {
  const [x, y, w, h] = v.viewBox;
  // obrezan viewBox: bez zaštitne zone od 40 jedinica (zaštitnu zonu daje raspored); overflow visible jer kosi
  // potezi prvog i zadnjeg A izlaze malo izvan obreza (inače su "odrezani okomito")
  const pad = 40;
  const vb = `${x + pad} ${y + pad * 0.35} ${w - 2 * pad} ${h - pad * 1.35}`;
  const byWord = (word: string) => v.letters.filter((l) => l.word === word);
  const rest = v.restTone ? 0.55 : 1;
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={vb}
      className={className}
      style={style}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
      fill="currentColor"
      overflow="visible"
      data-logo
    >
      {v.shadow && (
        <g data-shadow opacity={0.38} transform={`translate(${v.shadow.dx},${v.shadow.dy})`}>
          {v.letters.filter((l) => l.role === "emph").map((l, i) => (
            <path key={i} transform={`translate(${l.x},0)`} d={l.d} />
          ))}
        </g>
      )}
      {WORDS.map((word) => (
        <g key={word} data-word={word} opacity={word === "ART" || word === "ME" ? 1 : rest}>
          {byWord(word).map((l, i) => (
            <path key={i} data-letter={l.ch} transform={`translate(${l.x},0)`} d={l.d} />
          ))}
          {word === "IFICIAL" && (
            <path
              ref={figRef}
              data-figure
              fillRule="evenodd"
              transform={`translate(${v.figure.x},${v.figure.y}) scale(${v.figure.scale})`}
              d={v.figure.d}
            />
          )}
        </g>
      ))}
    </svg>
  );
});

let posesPromise: Promise<string[]> | null = null;
function loadPoses() {
  posesPromise ??= fetch(asset("/brand/logo-poses.json"))
    .then((r) => r.json())
    .then((j: { frames: string[] }) => j.frames)
    .catch(() => []);
  return posesPromise;
}

/**
 * Animacija loga (1,6 s): slova dolaze na mjesto, a lutka-I se iz uspravnog "I" namjesti u baletnu pozu
 * (ruka se zaobli iznad glave). Frameovi siluete su iz istog kanona (scripts/gen-logo-assets.py);
 * zadnji frame je sama lutka iz loga, pa nema skoka. Smanjeni pokret: statična verzija (ništa se ne pokreće).
 */
export async function playAssembly(svg: SVGSVGElement | null, fig: SVGPathElement | null, finalD: string) {
  if (!svg || !fig) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const frames = await loadPoses();
  const letters = Array.from(svg.querySelectorAll<SVGPathElement>("[data-letter]"));
  const figX = Number(fig.getAttribute("transform")?.match(/translate\(([-\d.]+)/)?.[1] ?? 0);
  const DUR = 1600;
  // slova: od lutke prema van, s malim pomakom i "razmakom" koji se zatvara
  const anims = letters.map((p) => {
    const lx = Number(p.getAttribute("transform")?.match(/translate\(([-\d.]+)/)?.[1] ?? 0);
    const dist = Math.abs(lx - figX) / 1200;
    const dir = Math.sign(lx - figX) || 1;
    const base = p.getAttribute("transform") ?? "";
    return p.animate(
      [
        { transform: `${cssTranslate(base)} translate(${dir * 46}px, 0px)`, opacity: 0 },
        { transform: `${cssTranslate(base)}`, opacity: 1 },
      ],
      { duration: 900, delay: 180 + dist * 520, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" },
    );
  });
  // lutka: flipbook poza (stop-motion namještanja lutke), zatim točna silueta iz loga
  if (frames.length) {
    const t0 = performance.now();
    await new Promise<void>((resolve) => {
      const step = (t: number) => {
        // vremenska oznaka rAF-a može biti malo prije t0 (početak framea) → bez negativnog napretka
        const u = Math.min(1, Math.max(0, (t - t0) / DUR));
        const i = Math.min(frames.length, Math.floor(easeInOut(u) * (frames.length + 1)));
        fig.setAttribute("d", i >= frames.length ? finalD : frames[i]);
        if (u < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }
  await Promise.all(anims.map((a) => a.finished.catch(() => undefined)));
  fig.setAttribute("d", finalD);
}

const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
// SVG atribut transform="translate(x,0)" → CSS transform (px u jedinicama viewBoxa)
const cssTranslate = (t: string) => {
  const m = t.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
  return m ? `translate(${m[1]}px, ${m[2]}px)` : "";
};
