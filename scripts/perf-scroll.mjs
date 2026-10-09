#!/usr/bin/env node
/**
 * Mjerenje glatkoće scrolla (11 §6 "ne šteka"): pravi Chromium s GPU-om, viewport i DPR kao na stvarnom zaslonu,
 * scroll kotačićem kroz Lenis od vrha do dna. Bilježi razmak između frameova (rAF) po sekciji, DPR redatelja
 * i duge frameove glavne niti (Long Animation Frames s izvorom skripte).
 *
 *   node scripts/perf-scroll.mjs [--url=http://localhost:3108/artificial-media-v2/] [--w=1470] [--h=830] [--dpr=2]
 *                                [--step=40] [--interval=33] [--warm=3000] [--max=120] [--q=dpr=1] [--json=putanja.json]
 */
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

const arg = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const url = arg("url", "http://localhost:3108/artificial-media-v2/");
const W = +arg("w", 1470), H = +arg("h", 830), DPR = +arg("dpr", 2);
const STEP = +arg("step", 40), INTERVAL = +arg("interval", 33), WARM = +arg("warm", 3000);
const extra = arg("q", ""); // npr. --q=dpr=1 (stalni DPR redatelja) ili --q=izvor=frames
const MAX = +arg("max", 120) * 1000;

const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-webgl"],
});
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR });
const page = await ctx.newPage();
await page.addInitScript(() => {
  const P = (window.__perf = { t: [], y: [], dpr: [], loaf: [], on: false });
  const loop = (now) => {
    if (P.on) {
      P.t.push(now);
      P.y.push(window.scrollY);
      P.dpr.push(window.__fps?.dpr ?? 0);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  try {
    new PerformanceObserver((list) => {
      if (!P.on) return;
      for (const e of list.getEntries())
        P.loaf.push({
          start: e.startTime,
          dur: e.duration,
          block: e.blockingDuration,
          y: window.scrollY,
          scripts: (e.scripts || []).map((s) => ({ inv: s.invoker, src: (s.sourceURL || "").split("/").pop(), fn: s.sourceFunctionName, dur: Math.round(s.duration) })),
        });
    }).observe({ type: "long-animation-frame", buffered: false });
  } catch {}
});
const sep = url.includes("?") ? "&" : "?";
await page.goto(`${url}${sep}probe=1${extra ? "&" + extra : ""}`);
await page.waitForLoadState("load");
await page.waitForFunction(() => ["ready", "frames", "off"].includes(document.documentElement.dataset.stage3d ?? ""), null, { timeout: 30000 }).catch(() => {});
await page.mouse.move(W * 0.62, H * 0.55);
await page.waitForTimeout(WARM);
await page.evaluate(() => (window.__perf.on = true));
const t0 = Date.now();
for (let i = 0; ; i++) {
  await page.mouse.wheel(0, STEP);
  await page.waitForTimeout(INTERVAL);
  if (i % 25 === 0) {
    const done = await page.evaluate(() => window.scrollY + innerHeight >= document.documentElement.scrollHeight - 4);
    if (done || Date.now() - t0 > MAX) break;
  }
}
await page.waitForTimeout(1500);
const data = await page.evaluate(() => {
  const P = window.__perf;
  P.on = false;
  const ids = ["intro", "manifest", "work", "worlds", "atelier", "services", "why-ai", "brief", "faq", "footer"];
  const secs = [];
  for (const id of ids) {
    const el = id === "footer" ? document.querySelector("footer") : document.getElementById(id);
    if (el) secs.push({ id, top: el.getBoundingClientRect().top + window.scrollY });
  }
  secs.sort((a, b) => a.top - b.top);
  return { t: P.t, y: P.y, dpr: P.dpr, loaf: P.loaf, secs, ih: innerHeight, tier: window.__fps?.tier ?? "-", source: document.documentElement.dataset.source, hitches: window.__fps?.hitches ?? [] };
});
await browser.close();

const sectionAt = (y) => {
  let s = data.secs[0]?.id ?? "?";
  for (const x of data.secs) if (y + data.ih / 2 >= x.top) s = x.id;
  return s;
};
const groups = new Map();
for (let i = 1; i < data.t.length; i++) {
  const dt = data.t[i] - data.t[i - 1];
  const s = sectionAt(data.y[i]);
  if (!groups.has(s)) groups.set(s, { dts: [], dpr: [] });
  groups.get(s).dts.push(dt);
  groups.get(s).dpr.push(data.dpr[i]);
}
const pct = (a, p) => {
  const b = [...a].sort((x, y) => x - y);
  return b[Math.min(b.length - 1, Math.floor(p * b.length))] ?? 0;
};
const row = (name, dts, dprs) => {
  const mean = dts.reduce((a, b) => a + b, 0) / Math.max(1, dts.length);
  const d = dprs.filter((x) => x > 0);
  return {
    sekcija: name,
    frameovi: dts.length,
    fps: +(1000 / mean).toFixed(1),
    p50: +pct(dts, 0.5).toFixed(1),
    p95: +pct(dts, 0.95).toFixed(1),
    max: +Math.max(0, ...dts).toFixed(0),
    ">25ms": dts.filter((x) => x > 25).length,
    ">50ms": dts.filter((x) => x > 50).length,
    ">100ms": dts.filter((x) => x > 100).length,
    dpr: d.length ? `${Math.min(...d).toFixed(2)}–${Math.max(...d).toFixed(2)}` : "-",
  };
};
const rows = [];
const all = [], allD = [];
for (const s of data.secs.map((x) => x.id)) {
  const g = groups.get(s);
  if (!g) continue;
  rows.push(row(s, g.dts, g.dpr));
  all.push(...g.dts);
  allD.push(...g.dpr);
}
rows.push(row("UKUPNO", all, allD));
console.log(`${url} · ${W}×${H} @${DPR} · izvor ${data.source} · razina ${data.tier} · korak ${STEP}px/${INTERVAL}ms`);
console.table(rows);
const loaf = data.loaf.sort((a, b) => b.dur - a.dur).slice(0, 12);
console.log(`Long Animation Frames: ${data.loaf.length} (> 50 ms); najdulji:`);
for (const l of loaf)
  console.log(
    `  ${Math.round(l.dur)} ms (blok ${Math.round(l.block)}) @ ${sectionAt(l.y)} · ` +
      l.scripts
        .sort((a, b) => b.dur - a.dur)
        .slice(0, 3)
        .map((s) => `${s.inv} ${s.src}${s.fn ? ":" + s.fn : ""} ${s.dur}ms`)
        .join(" | "),
  );
if (data.hitches.length) {
  console.log(`Trzaji redatelja (> 40 ms u update + render):`);
  for (const h of data.hitches) console.log(`  ${h.scene}: update ${h.update} ms, render ${h.render} ms, novih shadera ${h.programs}`);
}
const json = arg("json", "");
if (json) writeFileSync(json, JSON.stringify({ rows, loaf: data.loaf }, null, 1));
