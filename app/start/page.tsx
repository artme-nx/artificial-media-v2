import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { site } from "@/content/site";

export const metadata: Metadata = { title: `${site.nav.cta.text} — ${site.brand.name.text}` };

export default function Start() {
  return (
    <>
      <SiteNav home="/" />
      <main id="main" className="flex min-h-dvh items-center" style={{ paddingInline: "var(--sp-gutter)" }}>
        <h1 className="display max-w-[18ch]" style={{ fontSize: "var(--fs-display-l)" }}>
          {site.start.heading.text}
        </h1>
      </main>
    </>
  );
}
