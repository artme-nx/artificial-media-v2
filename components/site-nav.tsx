import Link from "next/link";
import { site } from "@/content/site";
import { ui } from "@/content/ui";

/** Navigacija: logo, četiri linka, jedan CTA (brief §5). Vidljiva od prve sekunde, i tijekom uvoda. */
export function SiteNav({ home = "/" }: { home?: string }) {
  return (
    <header className="fixed inset-x-0 top-0" style={{ zIndex: "var(--z-nav)" }}>
      <a href="#main" className="sr-only-focusable label absolute left-4 top-4 bg-bg px-4 py-3">
        {ui.skipToContent}
      </a>
      <nav
        aria-label="Primary"
        className="mx-auto flex items-center justify-between"
        style={{ height: "var(--nav-height)", paddingInline: "var(--sp-gutter)", maxWidth: "var(--sp-page)" }}
      >
        <Link href={home} className="label" aria-label={site.brand.name.text}>
          {site.brand.name.text}
        </Link>
        <ul className="hidden items-center md:flex" style={{ gap: "var(--nav-link-gap)" }}>
          {site.nav.links.map((l) => (
            <li key={l.id}>
              <a href={`${home === "/" ? "" : home}${l.href}`} className="label">
                {l.label.text}
              </a>
            </li>
          ))}
        </ul>
        <Link
          href="/start/"
          className="label inline-flex items-center"
          style={{
            height: "var(--button-height-s)",
            paddingInline: "var(--button-pad-x)",
            borderRadius: "var(--button-radius)",
            background: "var(--button-primary-bg)",
            color: "var(--button-primary-fg)",
          }}
        >
          {site.nav.cta.text}
        </Link>
      </nav>
    </header>
  );
}
