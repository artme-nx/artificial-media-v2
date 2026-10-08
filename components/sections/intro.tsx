import Link from "next/link";
import { site } from "@/content/site";
import { T } from "@/components/t";

/**
 * Uvod (11 §4 red 1). U DOM-u je H1 jedna rečenica; dva dijela su spanovi koje uvod (F4) prikazuje odvojeno.
 * Ovo je ujedno statična verzija (smanjeni pokret, bez WebGL2): nadnaslov, H1, CTA.
 */
export function IntroSection() {
  return (
    <section id="intro" data-stage-zone="dark" aria-labelledby="h1" className="intro relative">
      <div className="intro-stage flex min-h-dvh flex-col items-center justify-center text-center" style={{ paddingInline: "var(--sp-gutter)" }}>
        <T s={site.hero.eyebrow} as="p" className="label eyebrow" />
        <h1 id="h1" className="statement mt-8 md:mt-10" style={{ fontSize: "var(--fs-display-xl)", maxWidth: "15ch" }}>
          <span data-h1-part="1" className="block">{site.hero.h1Part1.text}</span>{" "}
          <span data-h1-part="2" className="block italic">{site.hero.h1Part2.text}</span>
        </h1>
        <div className="mt-12 flex items-center gap-4 md:mt-14">
          <Link href="/start/" className="btn btn-primary">
            <T s={site.nav.cta} />
          </Link>
        </div>
      </div>
    </section>
  );
}
