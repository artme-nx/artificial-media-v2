"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { site } from "@/content/site";
import { ui } from "@/content/ui";
import { T } from "@/components/t";
import { Logo } from "@/components/logo";

/**
 * Navigacija: logo, četiri linka, jedan CTA (brief §5). Vidljiva od prve sekunde, i tijekom uvoda (11 §4 red 0).
 * Mobilni meni je sibling headera (ne dijete), s vlastitim z-indexom — bez zarobljavanja u containing blocku.
 */
export function SiteNav({ onHome = true }: { onHome?: boolean }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const prefix = onHome ? "" : "/";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.documentElement.dataset.menu = "open";
    window.addEventListener("keydown", onKey);
    return () => {
      delete document.documentElement.dataset.menu;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header className="site-nav pointer-events-none fixed inset-x-0 top-0" style={{ zIndex: "var(--z-nav)" }}>
        <a href="#main" className="sr-only-focusable label pointer-events-auto absolute left-4 top-4 bg-bg px-4 py-3">
          {ui.skipToContent}
        </a>
        <nav
          aria-label="Primary"
          className="mx-auto grid grid-cols-[1fr_auto] items-center md:grid-cols-[1fr_auto_1fr]"
          style={{ height: "var(--nav-height)", paddingInline: "var(--sp-gutter)", maxWidth: "var(--sp-page)" }}
        >
          <Link href="/" className="nav-logo pointer-events-auto inline-flex items-center self-center justify-self-start" aria-label={site.brand.name.text}>
            <Logo decorative className="block h-[0.95rem] w-auto md:h-[1.05rem]" />
          </Link>
          <ul className="pointer-events-auto hidden items-center md:flex" style={{ gap: "var(--nav-link-gap)" }}>
            {site.nav.links.map((l) => (
              <li key={l.id}>
                <a href={`${prefix}${l.href}`} className="nav-link label">
                  <T s={l.label} />
                </a>
              </li>
            ))}
          </ul>
          <div className="pointer-events-auto flex items-center justify-self-end gap-3">
            <Link href="/start/" className="btn btn-primary btn-s">
              <T s={site.nav.cta} />
            </Link>
            <button
              ref={toggleRef}
              type="button"
              className="nav-toggle md:hidden"
              aria-expanded={open}
              aria-controls={menuId}
              aria-label={open ? ui.close : ui.menu}
              onClick={() => setOpen((o) => !o)}
            >
              <span aria-hidden="true" data-open={open} />
            </button>
          </div>
        </nav>
      </header>
      <div
        id={menuId}
        className="nav-sheet md:hidden"
        data-open={open}
        hidden={!open}
        style={{ zIndex: "calc(var(--z-nav) - 1)" }}
      >
        <ul className="flex flex-col" style={{ gap: "var(--sp-stack-s)" }}>
          {site.nav.links.map((l) => (
            <li key={l.id}>
              <a href={`${prefix}${l.href}`} className="display block py-2" style={{ fontSize: "var(--fs-display-m)" }} onClick={() => setOpen(false)}>
                <T s={l.label} />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
