import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { StatusOverlay } from "@/components/status-overlay";
import { BriefForm } from "@/components/start/brief-form";
import { site } from "@/content/site";
import { T } from "@/components/t";

export const metadata: Metadata = { title: `${site.nav.cta.text} — ${site.brand.name.text}` };

/** /start (11 §4 red 12): forma lijevo, lutka desno iz profila pod reflektorom (F8). */
export default function Start() {
  return (
    <>
      <SiteNav onHome={false} />
      <main id="main" className="start section pt-[calc(var(--nav-height)+var(--sp-stack-l))]">
        <div className="container-page grid gap-[var(--sp-stack-l)] md:grid-cols-12">
          <div className="md:col-span-6 lg:col-span-5">
            <h1 className="statement" style={{ fontSize: "var(--fs-display-l)", maxWidth: "12ch" }}>
              <T s={site.start.heading} />
            </h1>
            <T s={site.start.promise} as="p" className="muted mt-6 max-w-[36ch]" style={{ fontSize: "var(--fs-body)" }} />
            <div className="mt-14">
              <BriefForm />
            </div>
          </div>
          <div data-stage-anchor="start" aria-hidden="true" className="start-figure order-first h-[38vh] md:order-none md:col-span-6 md:col-start-7 md:h-auto md:min-h-[70vh] lg:col-span-6 lg:col-start-7" />
        </div>
      </main>
      <SiteFooter onHome={false} />
      <StatusOverlay />
    </>
  );
}
