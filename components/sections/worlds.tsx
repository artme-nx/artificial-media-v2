import { site } from "@/content/site";

/**
 * "We don't build campaigns. We build worlds." (03 §26, §29) — kratak tipografski moment.
 * Jedan string iz content/site.ts; rečenice su samo vizualno u dva retka (tekst u DOM-u je točno isti).
 */
export function WorldsSection() {
  const s = site.worlds.line;
  const [first, second] = s.text.split(/(?<=\.)\s+/);
  return (
    <section id="worlds" aria-label="Worlds" className="section worlds">
      <div className="container-page flex min-h-[70dvh] items-center justify-center text-center">
        <p className="statement worlds-line" data-status={s.status} data-source={s.source} style={{ fontSize: "var(--fs-display-l)" }}>
          <span className="block" data-reveal>{first}</span>{" "}
          <span className="block italic" data-reveal style={{ fontSize: "1.45em" }}>{second}</span>
        </p>
      </div>
    </section>
  );
}
