"use client";

import { site } from "@/content/site";
import { T } from "@/components/t";
import { setStageIntent } from "@/lib/stage-bus";

/**
 * Usluge (11 §4 red 7). Otvaranje: W1. Nazivi iz 03 §8; opisi sa statusom (placeholder gdje opisa nema).
 * Interakcija 2 (07): prelazak preko usluge pomakne lutku u pozu koja je opisuje (F7, preko stage-bus).
 */
export function ServicesSection() {
  return (
    <section id="services" aria-labelledby="services-h" className="section services">
      <div className="container-page grid gap-[var(--sp-stack-l)] md:grid-cols-12">
        <div className="md:col-span-5">
          <h2 id="services-h" className="statement md:sticky md:top-[calc(var(--nav-height)+2rem)]" style={{ fontSize: "var(--fs-display-m)", maxWidth: "12ch" }}>
            <T s={site.services.opener} />
          </h2>
          <div data-stage-anchor="services" aria-hidden="true" className="services-figure mt-10 hidden aspect-[3/4] w-full max-w-[22rem] md:sticky md:top-[calc(var(--nav-height)+12rem)] md:block" />
        </div>
        <ul className="md:col-span-7 md:col-start-6">
          {site.services.items.map((it) => (
            <li
              key={it.id}
              className="service-row"
              onPointerEnter={() => setStageIntent({ servicePose: it.pose })}
              onPointerLeave={() => setStageIntent({ servicePose: null })}
              onFocus={() => setStageIntent({ servicePose: it.pose })}
              onBlur={() => setStageIntent({ servicePose: null })}
            >
              <h3 className="statement" style={{ fontSize: "var(--fs-display-s)" }}>
                <T s={it.name} />
              </h3>
              <T s={it.body} as="p" className={`prose mt-4 ${it.body.status === "placeholder" ? "ph" : ""}`} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
