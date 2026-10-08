import Link from "next/link";
import { site } from "@/content/site";
import { T } from "@/components/t";
import { Logo } from "@/components/logo";

/** Podnožje (11 §4 red 11). Adresa i impressum su placeholder [TREBA POTVRDU Northwest]. F7: révérence na dnu stranice. */
export function SiteFooter({ onHome = true }: { onHome?: boolean }) {
  const prefix = onHome ? "" : "/";
  return (
    <footer className="site-footer section pb-10" aria-label="Footer">
      <div className="container-page">
        <Logo className="block h-auto w-full" animateOnView title={site.brand.name.text} />
        <div className="mt-14 grid gap-10 border-t pt-8 md:grid-cols-12" style={{ borderColor: "var(--line)" }}>
          <div className="md:col-span-5">
            <T s={site.footer.founder} as="p" style={{ fontSize: "var(--fs-body-l)" }} />
            <T s={site.footer.copyright} as="p" className="muted mt-3" style={{ fontSize: "var(--fs-small)" }} />
          </div>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 md:col-span-4">
            {site.nav.links.map((l) => (
              <li key={l.id}>
                <a href={`${prefix}${l.href}`} className="nav-link label">
                  <T s={l.label} />
                </a>
              </li>
            ))}
            <li>
              <Link href="/start/" className="nav-link label">
                <T s={site.nav.cta} />
              </Link>
            </li>
          </ul>
          <div className="muted md:col-span-3" style={{ fontSize: "var(--fs-small)" }}>
            <T s={site.footer.address} as="p" className="ph" />
            <T s={site.footer.impressum} as="p" className="ph mt-2" />
          </div>
        </div>
        <div data-doll-anchor="footer" aria-hidden="true" className="footer-figure" />
      </div>
    </footer>
  );
}
