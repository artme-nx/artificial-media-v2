"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { site } from "@/content/site";
import { ui } from "@/content/ui";
import { reels, type Reel } from "@/content/reels";
import { T } from "@/components/t";

/**
 * Reelovi (11 §4 red 4): filtri Video / Web / AI tools, oznaka client / spec (03 §7 R3), pravi omjeri kadra.
 * Radova još nema: elegantni prazni slotovi označeni kao placeholder — nikad izmišljeni rad.
 * F5: lutka se okreće prema reelu koji je aktivan (data-reel-active).
 */
const ASPECT: Record<Reel["aspect"], string> = { "16:9": "16 / 9", "9:16": "9 / 16", "4:5": "4 / 5" };
const RATIO: Record<Reel["aspect"], number> = { "16:9": 16 / 9, "9:16": 9 / 16, "4:5": 4 / 5 };

export function ReelsSection() {
  const [filter, setFilter] = useState<string>("all");
  const shown = useMemo(() => (filter === "all" ? reels : reels.filter((r) => r.category === filter)), [filter]);
  const listRef = useRef<HTMLUListElement>(null);

  // aktivni reel (07, interakcija 4: lutka se okrene prema videu koji se pušta): pod mišem ili fokusom,
  // inače onaj najbliži sredini ekrana. Radova još nema, pa "pušta se" = aktivni slot.
  useEffect(() => {
    const ul = listRef.current;
    if (!ul) return;
    let pinned: HTMLElement | null = null;
    let raf = 0;
    const mark = (el: HTMLElement | null) => {
      for (const f of ul.querySelectorAll<HTMLElement>("[data-reel-active]")) if (f !== el) f.removeAttribute("data-reel-active");
      if (el) el.dataset.reelActive = "1";
    };
    const nearest = () => {
      raf = 0;
      if (pinned) return;
      const mid = window.innerHeight / 2;
      let best: HTMLElement | null = null;
      let bd = Infinity;
      for (const f of ul.querySelectorAll<HTMLElement>("figure[data-reel]")) {
        const r = f.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) continue;
        const d = Math.abs(r.top + r.height / 2 - mid) + Math.abs(r.left + r.width / 2 - window.innerWidth / 2) * 0.25;
        if (d < bd) (bd = d), (best = f);
      }
      mark(best);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(nearest);
    };
    const enter = (e: Event) => {
      const f = (e.target as HTMLElement).closest<HTMLElement>("figure[data-reel]");
      if (f) (pinned = f), mark(f);
    };
    const leave = () => {
      pinned = null;
      onScroll();
    };
    ul.addEventListener("pointerover", enter);
    ul.addEventListener("focusin", enter);
    ul.addEventListener("pointerleave", leave);
    ul.addEventListener("focusout", leave);
    window.addEventListener("scroll", onScroll, { passive: true });
    nearest();
    return () => {
      cancelAnimationFrame(raf);
      ul.removeEventListener("pointerover", enter);
      ul.removeEventListener("focusin", enter);
      ul.removeEventListener("pointerleave", leave);
      ul.removeEventListener("focusout", leave);
      window.removeEventListener("scroll", onScroll);
    };
  }, [shown]);

  // zadnji red: ako je skoro pun, popuni ga do ruba (bez punila); ako je rijedak, punilo čuva mjerilo kadrova
  useLayoutEffect(() => {
    const ul = listRef.current;
    if (!ul) return;
    const measure = () => {
      ul.dataset.lastFull = "0";
      const items = Array.from(ul.querySelectorAll<HTMLElement>("li[data-item]"));
      if (!items.length) return;
      const lastTop = items[items.length - 1].offsetTop;
      const lastRow = items.filter((li) => li.offsetTop === lastTop);
      const used = lastRow.reduce((a, li) => a + li.getBoundingClientRect().width, 0);
      ul.dataset.lastFull = used / ul.clientWidth > 0.78 ? "1" : "0";
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(ul);
    return () => ro.disconnect();
  }, [shown]);

  return (
    <section id="work" aria-labelledby="reels-h" className="section reels">
      <div className="container-page">
        <div className="reels-head flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 id="reels-h" className="statement" style={{ fontSize: "var(--fs-display-m)" }}>
              <T s={site.reels.label} />
            </h2>
            <T s={site.reels.note} as="p" className="muted mt-4" style={{ fontSize: "var(--fs-body)" }} />
          </div>
          {/* mala lutka koja gleda aktivni reel (dekoracija; canvas dolazi iz DollStage) */}
          <div className="reels-doll" data-doll-anchor="reels" aria-hidden="true" />
          <div role="group" aria-label={ui.reelFilterLabel} className="-ml-1 flex flex-wrap gap-x-5">
            {site.reels.filters.map((f) => (
              <button key={f.id} type="button" className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                <T s={f.label} />
              </button>
            ))}
          </div>
        </div>

        {/* "justified" redovi: svaki kadar u svom pravom omjeru, svi u redu iste visine (flex-grow ∝ omjer) */}
        <ul ref={listRef} className="reel-rows mt-12 md:mt-16" aria-live="polite">
          {shown.map((r) => (
            <li key={r.id} data-item data-aspect={r.aspect} style={{ flex: `${RATIO[r.aspect]} 1 calc(${RATIO[r.aspect]} * var(--reel-row-h))` }}>
              <ReelSlot reel={r} />
            </li>
          ))}
          <li aria-hidden="true" className="reel-filler" />
        </ul>
      </div>
    </section>
  );
}

function ReelSlot({ reel }: { reel: Reel }) {
  const cat = site.reels.filters.find((f) => f.id === reel.category)?.label.text ?? reel.category;
  return (
    <figure className="reel reel-marks" style={{ aspectRatio: ASPECT[reel.aspect] }} data-reel={reel.id} data-status={reel.status}>
      <div className="reel-center">
        <div className="text-center">
          <p className="label muted reel-ph">{ui.reelPlaceholder}</p>
          <p className="reel-ratio mt-3" style={{ fontSize: "var(--fs-title)" }}>
            {reel.aspect}
          </p>
        </div>
      </div>
      <figcaption className="reel-cap">
        <span className="label muted">{cat}</span>
        <span className="label muted" title="03 §7 R3">{reel.kind ?? "client / spec"}</span>
      </figcaption>
    </figure>
  );
}
