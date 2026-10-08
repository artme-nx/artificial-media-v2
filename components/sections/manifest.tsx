import { site } from "@/content/site";
import { T } from "@/components/t";

/** Manifest (03 §29). Preko baletne scene (F5). */
export function ManifestSection() {
  const [a, b] = site.manifest.lines;
  return (
    <section id="manifest" aria-label="Manifest" className="section manifest">
      <div className="container-page grid min-h-[80dvh] content-center gap-[var(--sp-stack-xl)]">
        <T s={a} as="p" className="statement manifest-line max-w-[14ch]" data-reveal style={{ fontSize: "var(--fs-display-l)" }} />
        <T s={b} as="p" className="statement manifest-line max-w-[15ch] justify-self-end text-right italic" data-reveal style={{ fontSize: "var(--fs-display-l)" }} />
      </div>
    </section>
  );
}
