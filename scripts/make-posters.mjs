#!/usr/bin/env node
/**
 * F9: posteri (mirne slike) za svaku 3D sekciju — smanjeni pokret, bez WebGL2, slabi uređaji (11 F9).
 * Uvod i balet: odabrani frameovi iz renderiranih nizova (public/seq); "drvo / robot": render iz /lab/kursor
 * s maskom na prsima (dev server na :3107). Izlaz: public/posters/<sekcija>-desk|mob.webp
 */
import { chromium } from "@playwright/test";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3107";
const SEQ = path.join(process.cwd(), "public", "seq");
const OUT = path.join(process.cwd(), "public", "posters");
fs.mkdirSync(OUT, { recursive: true });

// iz nizova: uvod (kadar 9 — dirigent pred orkestrom), balet (en haut izbliza)
for (const [name, seq, u] of [["uvod", "uvod", 0.62], ["balet", "balet", 0.12]]) {
  for (const v of ["desk", "mob"]) {
    const dir = path.join(SEQ, `${seq}-${v}`);
    const m = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
    const i = Math.round(u * (m.count - 1));
    const src = path.join(dir, `${String(i).padStart(3, "0")}.${m.ext}`);
    await sharp(src).webp({ quality: 80 }).toFile(path.join(OUT, `${name}-${v}.webp`));
    console.log(`${name}-${v} ← ${path.relative(process.cwd(), src)}`);
  }
}

// drvo / robot: maska na prsima, prsten
const browser = await chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
for (const [v, w, h] of [["desk", 1600, 900], ["mob", 720, 1280]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/lab/kursor/?q=high`);
  await p.waitForFunction(() => window.__fps && window.__fps.frames > 30, null, { timeout: 60000 });
  const s = await p.evaluate(() => window.__lab.scene.partScreen("chest"));
  await p.mouse.move(s.x + 20, s.y - 30, { steps: 8 });
  await p.waitForTimeout(1800);
  const png = await p.screenshot();
  await sharp(png).resize(w, h, { kernel: "lanczos3" }).webp({ quality: 80 }).toFile(path.join(OUT, `kursor-${v}.webp`));
  console.log(`kursor-${v} ← /lab/kursor`);
  await ctx.close();
}
// /start: lutka s bilježnicom (prozirna pozadina; poster dok se 3D ne učita)
for (const [v, w, h] of [["desk", 1440, 900], ["mob", 390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/start/`);
  await p.mouse.move(5, 5);
  await p.waitForSelector('[data-notebook-stage][data-ready="1"]', { timeout: 60000 });
  await p.waitForTimeout(2500);
  const url = await p.evaluate(() => window.__notebookView.snapshot());
  const png = Buffer.from(url.split(",")[1], "base64");
  await sharp(png).webp({ quality: 82, alphaQuality: 90 }).toFile(path.join(OUT, `start-${v}.webp`));
  console.log(`start-${v} ← /start`);
  await ctx.close();
}
await browser.close();
