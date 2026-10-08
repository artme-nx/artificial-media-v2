import type { Page, TestInfo } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/** Faza za QA screenshotove: PHASE=3 → qa/faza-3/ */
export const PHASE = process.env.PHASE || "0";
export const qaDir = () => {
  const d = path.join(process.cwd(), "qa", `faza-${PHASE}`);
  fs.mkdirSync(d, { recursive: true });
  return d;
};
export const shotPath = (info: TestInfo, name: string) => path.join(qaDir(), `${info.project.name}--${name}.png`);

/** Skuplja greške konzole, neuhvaćene iznimke i neuspjele zahtjeve. */
export function watch(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) => {
    const f = r.failure()?.errorText || "";
    // prekinuti zahtjevi pri navigaciji (npr. prefetch) nisu greške stranice
    if (f.includes("ERR_ABORTED")) return;
    errors.push(`requestfailed: ${r.url()} ${f}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url()}`);
  });
  return errors;
}

/** Zabranjeno (03 §13 rječnik, §14 odbačeno, brief §5). Provjerava se vidljivi tekst i meta. */
export const FORBIDDEN = [
  /revolutionary/i, /cutting[- ]edge/i, /next[- ]gen/i, /\bmagic(al)?\b/i, /effortless/i, /\bunleash/i, /game[- ]changing/i,
  /AI[- ]powered/i, /most advanced/i, /film[- ]grade/i, /every platform,? every format/i, /never ages/i, /exactly as intended/i,
  /compresses months into days/i, /virtual production/i, /not generated/i, /tools are everywhere/i, /taste isn'?t/i,
  /refuse to look ordinary/i, /unlimited variations/i, /stop(s|ping)? the scroll/i, /scroll for experience/i,
  /same[- ]day reply/i, /revisions (built in|included)/i, /no retainers/i, /we sign ndas/i,
  /try to tell/i, /find the (line|difference)/i, /Whatwe/, /Starta/,
];
