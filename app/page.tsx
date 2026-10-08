import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { site } from "@/content/site";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main id="main">
        <section
          className="flex min-h-dvh flex-col items-center justify-center text-center"
          style={{ paddingInline: "var(--sp-gutter)" }}
        >
          <p className="label" style={{ color: "var(--fg-muted)" }}>
            {site.hero.eyebrow.text}
          </p>
          <h1 className="display mt-8 max-w-[16ch]" style={{ fontSize: "var(--fs-display-xl)" }}>
            {site.hero.h1.text}
          </h1>
          <Link
            href="/start/"
            className="label mt-12 inline-flex items-center"
            style={{
              height: "var(--button-height)",
              paddingInline: "var(--button-pad-x)",
              borderRadius: "var(--button-radius)",
              background: "var(--button-primary-bg)",
              color: "var(--button-primary-fg)",
            }}
          >
            {site.nav.cta.text}
          </Link>
        </section>
        <section id="work" aria-label={site.reels.label.text} className="min-h-[50vh]" />
        <section id="services" aria-label="Services" className="min-h-[50vh]" />
        <section id="why-ai" aria-label={site.whyAi.heading.text} className="min-h-[50vh]" />
        <section id="faq" aria-label={site.faq.heading.text} className="min-h-[50vh]" />
      </main>
      <footer className="label" style={{ padding: "var(--sp-gutter)" }}>
        <p>{site.footer.copyright.text}</p>
        <p className="mt-3">{site.footer.founder.text}</p>
      </footer>
    </>
  );
}
