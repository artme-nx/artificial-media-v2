import Link from "next/link";
import { site } from "@/content/site";
import { T } from "@/components/t";

/** CTA blok (11 §4 red 9): gumb "Brief us" → /start. Lutka mala, gleda kursor (F7). */
export function CtaSection() {
  return (
    <section id="brief" aria-labelledby="cta-h" className="section cta">
      <div className="container-page grid items-center gap-12 md:grid-cols-12">
        <div className="md:col-span-6 md:col-start-2">
          <h2 id="cta-h" className="statement max-w-[16ch]" style={{ fontSize: "var(--fs-display-l)" }}>
            <T s={site.cta.line} />
          </h2>
          <Link href="/start/" className="btn btn-primary mt-10">
            <T s={site.cta.button} />
          </Link>
        </div>
        <div data-doll-anchor="cta" aria-hidden="true" className="cta-figure hidden aspect-[3/4] w-full max-w-[16rem] justify-self-start md:col-span-4 md:block" />
      </div>
    </section>
  );
}
