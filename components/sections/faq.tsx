"use client";

import { useState } from "react";
import { site } from "@/content/site";
import { T } from "@/components/t";

/** FAQ (03 §30: F1–F8, F11, F13; F2 prema §32). Pristupačan accordion: button + aria-expanded + region. */
export function FaqSection() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section id="faq" aria-labelledby="faq-h" className="section faq">
      <div className="container-page grid gap-12 md:grid-cols-12">
        <h2 id="faq-h" className="statement md:col-span-4" style={{ fontSize: "var(--fs-display-m)" }}>
          <T s={site.faq.heading} />
        </h2>
        <div className="md:col-span-8">
          {site.faq.items.map((it) => {
            const isOpen = open === it.id;
            return (
              <div key={it.id} className="faq-item">
                <h3>
                  <button
                    type="button"
                    className="faq-q"
                    aria-expanded={isOpen}
                    aria-controls={`faq-a-${it.id}`}
                    id={`faq-q-${it.id}`}
                    onClick={() => setOpen(isOpen ? null : it.id)}
                  >
                    <T s={it.q} />
                    <span className="faq-icon" aria-hidden="true" />
                  </button>
                </h3>
                <div id={`faq-a-${it.id}`} role="region" aria-labelledby={`faq-q-${it.id}`} className="faq-a" data-open={isOpen}>
                  <div>
                    <T s={it.a} as="p" className="prose pb-8" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
