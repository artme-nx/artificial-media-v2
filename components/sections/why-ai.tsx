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
        <p className="statement mt-8 max-w-[22ch]" data-reveal data-status={site.whyAi.lead.status} data-source={site.whyAi.lead.source} style={{ fontSize: "var(--fs-display-l)" }}>
          {/* prijelom po rečenicama (paralelizam); textContent je točno izvorni string */}
          {site.whyAi.lead.text.split(/(?<=\.) /).map((part, i, all) => (
            <span key={i} className="block">
              {part}
              {i < all.length - 1 ? " " : null}
            </span>
          ))}
        </p>
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
