#!/usr/bin/env node
/**
 * F9: renderira nizove slika iz 3D-a u najvišoj kvaliteti (11 F9: više uzoraka, više koraka dima, supersampling;
 * Chromium s GPU-om, ne softverski) za uvod (kadrovi 2 i 6–10) i baletnu scenu: desktop vodoravno i mobitel uspravno.
 * Izlaz: public/seq/<niz>-<varijanta>/NNN.webp + manifest.json (isti oblik daje scripts/video-to-frames.mjs).
 *
 * Pokretanje (dev server na :3107 mora raditi): node scripts/render-sequences.mjs [niz…] [--only=desk|mob]
 * Rad u serijama (stanka između serija), da M5 ne radi dugo na 100 %.
 */
import { chromium } from "@playwright/test";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3107";
const OUT = path.join(process.cwd(), "public", "seq");
const BATCH = 20;
const PAUSE_MS = 4000;

/** nizovi: ruta laba, raspon napretka, broj frameova */
const SEQS = {
  // kadar 2 uvoda: plesačica u protusvjetlu (faza port de bras 0..1); vrijeme vodi napredak
  ples: { route: "/lab/uvod/", count: 24, frame: (u) => ({ p: 0, ples: 1, faza: u }) },
  // kadrovi 6–10 uvoda: scroll p 0,2..1
  uvod: { route: "/lab/uvod/", count: 96, frame: (u) => ({ p: 0.2 + 0.8 * u, ples: 0, faza: 1 }) },
  // manifest: baletna scena p 0..1
  balet: { route: "/lab/balet/", count: 96, frame: (u) => ({ p: u }) },
};
const VARIANTS = {
  desk: { w: 1600, h: 900, dpr: 2, quality: 72 },
  mob: { w: 720, h: 1280, dpr: 2, quality: 70 },
};

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith("--only="))?.slice(7);
const names = args.filter((a) => !a.startsWith("--"));
const todo = (names.length ? names : Object.keys(SEQS)).filter((n) => SEQS[n]);
const probe = args.includes("--probe"); // samo 3 frame-a po nizu (provjera)

const browser = await chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const gpu = await (async () => {
  const p = await browser.newPage();
  const r = await p.evaluate(() => {
    const c = document.createElement("canvas").getContext("webgl2");
    const d = c?.getExtension("WEBGL_debug_renderer_info");
    return d ? String(c.getParameter(d.UNMASKED_RENDERER_WEBGL)) : "?";
  });
  await p.close();
  return r;
})();
if (/SwiftShader|llvmpipe|Software/i.test(gpu)) {
  console.error(`Softverski renderer (${gpu}) — prekidam (11 F9: Chromium s GPU-om).`);
  process.exit(1);
}
console.log(`GPU: ${gpu}`);

for (const name of todo) {
  const seq = SEQS[name];
  for (const [vname, v] of Object.entries(VARIANTS)) {
    if (only && only !== vname) continue;
    const dir = path.join(OUT, `${name}-${vname}`);
    fs.mkdirSync(dir, { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: v.dpr });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => console.error("pageerror", e.message));
    await page.goto(`${BASE}${seq.route}?render=1&q=high`);
    await page.waitForFunction(() => typeof window.__render === "function" && window.__fps && window.__fps.frames > 20, null, { timeout: 90000 });
    await page.waitForTimeout(1500);
    let bytes = 0;
    const n = probe ? 3 : seq.count;
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0 : i / (n - 1);
      const f = seq.frame(u);
      await page.evaluate(({ p, ples, faza }) => window.__render(p, { ples, faza }), { p: f.p, ples: f.ples, faza: f.faza });
      const png = await page.screenshot({ type: "png" });
      const file = path.join(dir, `${String(i).padStart(3, "0")}.webp`);
      // supersampling: render u 2×, smanjenje Lanczosom
      await sharp(png).resize(v.w, v.h, { kernel: "lanczos3" }).webp({ quality: v.quality, effort: 5 }).toFile(file);
      bytes += fs.statSync(file).size;
      if ((i + 1) % BATCH === 0 && i + 1 < seq.count) {
        process.stdout.write(`  ${name}-${vname}: ${i + 1}/${seq.count} — stanka\n`);
        await page.waitForTimeout(PAUSE_MS);
      }
    }
    if (probe) {
      console.log(`${name}-${vname}: proba ${n} frame-a, ${(bytes / 1024).toFixed(0)} KB`);
      await ctx.close();
      continue;
    }
    fs.writeFileSync(
      path.join(dir, "manifest.json"),
      JSON.stringify({ name, variant: vname, count: seq.count, width: v.w, height: v.h, ext: "webp", source: "realtime-render", rendered: new Date().toISOString().slice(0, 10) }, null, 2),
    );
    console.log(`${name}-${vname}: ${seq.count} frameova, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
    await ctx.close();
    await new Promise((r) => setTimeout(r, PAUSE_MS));
  }
}
await browser.close();
