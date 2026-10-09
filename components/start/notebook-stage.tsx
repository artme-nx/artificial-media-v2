"use client";

import { useEffect, useRef } from "react";
import { notebook } from "@/lib/notebook";
import { asset } from "@/lib/asset";

/**
 * "Lutka bilježi" (/start, F8): lutka iz profila pod reflektorom s bilježnicom i olovkom. Sluša samo događaje forme
 * (ime polja i vrstu događaja — tekst iz forme ne odlazi nikamo). Bez WebGL2 nema lutke; forma radi potpuno i bez nje.
 * Smanjeni pokret: mirna slika iste poze s otvorenom bilježnicom.
 */
export function NotebookStage() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el || !document.createElement("canvas").getContext("webgl2")) return;
    let disposed = false;
    let view: import("@/src/three/doll/notebook-view").NotebookView | null = null;
    const canvas = document.createElement("canvas");
    canvas.className = "doll-canvas";
    canvas.setAttribute("aria-hidden", "true");
    el.appendChild(canvas);
    const fit = () => view?.resize(el.clientWidth, el.clientHeight);
    const ro = new ResizeObserver(fit);
    const io = new IntersectionObserver((e) => view?.setRunning(e.some((x) => x.isIntersecting)), { threshold: 0.01 });
    let off: (() => void) | null = null;
    // lutka je dekoracija: three.js se učitava na prvu interakciju (pokazivač, dodir, tipka, scroll) ili nakon 4 s,
    // da prvi prikaz i forma nikad ne čekaju; do tada poster iste poze
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      for (const ev of EVENTS) window.removeEventListener(ev, start);
      clearTimeout(timer);
      void boot();
    };
    const EVENTS = ["pointermove", "pointerdown", "keydown", "touchstart", "scroll", "focusin"] as const;
    for (const ev of EVENTS) window.addEventListener(ev, start, { passive: true, once: true });
    const timer = window.setTimeout(start, 4000);
    const boot = async () => {
      const { NotebookView } = await import("@/src/three/doll/notebook-view");
      if (disposed) return;
      view = new NotebookView(canvas);
      await view.ready; // shaderi prevedeni paralelno; poster ostaje dok lutka ne može crtati
      if (disposed) return;
      fit();
      ro.observe(el);
      io.observe(el);
      off = notebook.on((e) => {
        view?.event(e);
        el.dataset.state = notebook.state; // za testove i QA
      });
      notebook.onSent(() => view!.waitSent());
      el.dataset.state = notebook.state;
      el.dataset.ready = "1";
      if (process.env.NODE_ENV !== "production") (window as unknown as { __notebookView?: unknown }).__notebookView = view;
    };
    return () => {
      disposed = true;
      clearTimeout(timer);
      for (const ev of EVENTS) window.removeEventListener(ev, start);
      off?.();
      notebook.onSent(null);
      ro.disconnect();
      io.disconnect();
      view?.dispose();
      canvas.remove();
    };
  }, []);
  return (
    <div ref={host} data-notebook-stage aria-hidden="true" className="notebook-stage">
      {/* poster (ista poza) dok se 3D ne učita; nestane kad lutka krene */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <picture>
        <source media="(max-width: 767px)" srcSet={asset("/posters/start-mob.webp")} />
        <img className="notebook-poster" src={asset("/posters/start-desk.webp")} alt="" width={640} height={900} decoding="async" fetchPriority="high" />
      </picture>
    </div>
  );
}
