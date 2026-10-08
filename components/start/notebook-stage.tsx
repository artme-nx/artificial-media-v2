"use client";

import { useEffect, useRef } from "react";
import { notebook } from "@/lib/notebook";

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
    (async () => {
      const { NotebookView } = await import("@/src/three/doll/notebook-view");
      if (disposed) return;
      view = new NotebookView(canvas);
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
    })();
    return () => {
      disposed = true;
      off?.();
      notebook.onSent(null);
      ro.disconnect();
      io.disconnect();
      view?.dispose();
      canvas.remove();
    };
  }, []);
  return <div ref={host} data-notebook-stage aria-hidden="true" className="notebook-stage" />;
}
