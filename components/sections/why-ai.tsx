import { site } from "@/content/site";
import { T } from "@/components/t";

/** Why AI? (03 §33): WA1 + tri retka Possible / Fixed / Human (proposal). Mirno, svijetlo. */
export function WhyAiSection() {
  return (
    <section id="why-ai" aria-labelledby="why-h" className="section why">
      <div className="container-page">
        <h2 id="why-h" className="label eyebrow">
          <T s={site.whyAi.heading} />
        </h2>
        <T s={site.whyAi.lead} as="p" className="statement mt-8 max-w-[18ch]" data-reveal style={{ fontSize: "var(--fs-display-l)" }} />
        <dl className="mt-[var(--sp-stack-xl)] grid gap-10 md:grid-cols-3 md:gap-8">
          {site.whyAi.rows.map((r) => (
            <div key={r.label.text} className="border-t pt-6" style={{ borderColor: "var(--line-strong)" }}>
              <dt className="label">
                <T s={r.label} />
              </dt>
              <dd className="mt-5 max-w-[28ch]" style={{ fontSize: "var(--fs-body-l)", lineHeight: "var(--lh-body)" }}>
                <T s={r.text} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
