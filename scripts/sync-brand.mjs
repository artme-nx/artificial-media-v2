#!/usr/bin/env node
/**
 * sync-brand — jedan izvor istine za lutku i logo.
 *
 * Kopira iz ../brand/ (samo čita, nikad ne piše u brand/) u src/brand/:
 *   - 05-logo/figura/kanon.json      → src/brand/kanon.json
 *   - 05-logo/figura/lutka-core.js   → src/brand/lutka-core.js
 *   - 09-blender/lutka-v2.json       → src/brand/lutka-v2.json
 *   - 05-logo/runda3/out/r3b-*-mono*.svg i r3-geometrija-mono.svg → src/brand/logo/
 * i iz SVG-ova složi src/brand/logo-data.json (slova po ulozi: ART/IFICIAL/ME/DIA, lutka-I).
 *
 * Na vrh svake kopije upiše izvor, datum i "ne uređuj ovdje".
 * Pokreće se automatski prije `dev` i `build` (predev/prebuild).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRAND = path.resolve(ROOT, "..", "brand");
const OUT = path.join(ROOT, "src", "brand");
const NOTE = "ne uređuj ovdje — kopija iz brand/ (scripts/sync-brand.mjs); promjena ide u izvor";

if (!fs.existsSync(BRAND)) {
  // Na CI-u ili izvan ~/premium_web_stranice brand/ ne postoji: koriste se već commitane kopije.
  if (fs.existsSync(path.join(OUT, "kanon.json"))) {
    console.log("[sync-brand] brand/ nije dostupan; koristim commitane kopije u src/brand/");
    process.exit(0);
  }
  console.error("[sync-brand] brand/ nije pronađen i nema kopija u src/brand/");
  process.exit(1);
}

fs.mkdirSync(path.join(OUT, "logo"), { recursive: true });

function mtimeISO(file) {
  return fs.statSync(file).mtime.toISOString().slice(0, 10);
}
function rel(file) {
  return path.relative(path.resolve(ROOT, ".."), file);
}
function writeIfChanged(file, content) {
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === content) return false;
  fs.writeFileSync(file, content);
  return true;
}

let changed = 0;

// --- JSON: zaglavlje kao ključ "_sync" (lutka-core preskače ključeve s "_") ---
for (const [src, dst] of [
  ["05-logo/figura/kanon.json", "kanon.json"],
  ["09-blender/lutka-v2.json", "lutka-v2.json"],
]) {
  const from = path.join(BRAND, src);
  const data = JSON.parse(fs.readFileSync(from, "utf8"));
  const out = { _sync: { izvor: rel(from), datum_izvora: mtimeISO(from), napomena: NOTE }, ...data };
  if (writeIfChanged(path.join(OUT, dst), JSON.stringify(out, null, 1) + "\n")) changed++;
}

// --- JS: blok komentar na vrhu ---
{
  const from = path.join(BRAND, "05-logo/figura/lutka-core.js");
  const head = `/* IZVOR: ${rel(from)} · datum izvora: ${mtimeISO(from)}\n   ${NOTE} */\n`;
  if (writeIfChanged(path.join(OUT, "lutka-core.js"), head + fs.readFileSync(from, "utf8"))) changed++;
}

// --- Logo SVG-ovi: komentar prije korijenskog elementa ---
const LOGO_DIR = path.join(BRAND, "05-logo/runda3/out");
const VARIANTS = ["podebljano", "tonski", "sjena", "podebljano-tonski"];
const svgFiles = ["r3-geometrija-mono.svg"];
for (const v of VARIANTS) svgFiles.push(`r3b-${v}-mono.svg`, `r3b-${v}-mono-negativ.svg`);
for (const f of svgFiles) {
  const from = path.join(LOGO_DIR, f);
  const head = `<!-- IZVOR: ${rel(from)} · datum izvora: ${mtimeISO(from)} · ${NOTE} -->\n`;
  if (writeIfChanged(path.join(OUT, "logo", f), head + fs.readFileSync(from, "utf8"))) changed++;
}

// --- logo-data.json: struktura za animaciju (titranje IFICIAL/DIA, ART ME, lutka-I) ---
const EMPH = ["A", "R", "T", "M", "E"];
const EMPH_WORD = ["ART", "ART", "ART", "ME", "ME"];
const REST = ["F", "I", "C", "I", "A", "L", "D", "I", "A"];
const REST_WORD = ["IFICIAL", "IFICIAL", "IFICIAL", "IFICIAL", "IFICIAL", "IFICIAL", "DIA", "DIA", "DIA"];

function parseVariant(file) {
  const s = fs.readFileSync(path.join(LOGO_DIR, file), "utf8");
  const viewBox = s.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const groups = [...s.matchAll(/<g fill="([^"]+)"(?: transform="translate\(([^,]+),([^)]+)\)")?>(.*?)<\/g>/g)].map((m) => ({
    fill: m[1],
    shift: m[2] ? [Number(m[2]), Number(m[3])] : null,
    paths: [...m[4].matchAll(/<path transform="translate\(([^,]+),0\)" d="([^"]+)"\/>/g)].map((p) => ({ x: Number(p[1]), d: p[2] })),
  }));
  const fig = s.match(/<path fill="[^"]+" fill-rule="evenodd" transform="translate\(([^,]+),([^)]+)\) scale\(([^)]+)\)" d="([^"]+)"\/>/);
  const shadowG = groups.find((g) => g.shift);
  const main = groups.filter((g) => !g.shift);
  const [emphG, restG] = main;
  if (!emphG || emphG.paths.length !== 5 || !restG || restG.paths.length !== 9 || !fig) {
    throw new Error(`[sync-brand] neočekivana struktura loga: ${file}`);
  }
  return {
    viewBox,
    restTone: restG.fill !== emphG.fill, // tonski: ostala slova utišana
    shadow: shadowG ? { dx: shadowG.shift[0], dy: shadowG.shift[1] } : null,
    letters: [
      ...emphG.paths.map((p, i) => ({ ch: EMPH[i], role: "emph", word: EMPH_WORD[i], x: p.x, d: p.d })),
      ...restG.paths.map((p, i) => ({ ch: REST[i], role: "rest", word: REST_WORD[i], x: p.x, d: p.d })),
    ].sort((a, b) => a.x - b.x),
    figure: { x: Number(fig[1]), y: Number(fig[2]), scale: Number(fig[3]), d: fig[4] },
  };
}

const logo = { _sync: { izvor: rel(LOGO_DIR), datum_izvora: mtimeISO(path.join(LOGO_DIR, "r3b-podebljano-mono.svg")), napomena: NOTE }, variants: {} };
for (const v of VARIANTS) logo.variants[v] = parseVariant(`r3b-${v}-mono.svg`);
if (writeIfChanged(path.join(OUT, "logo-data.json"), JSON.stringify(logo) + "\n")) changed++;
// zadana varijanta (podebljano) ide u početni JS; ostale se učitavaju tek kad ih ?logo= zatraži (manje JS-a na startu)
const def = { _sync: logo._sync, variants: { podebljano: logo.variants.podebljano } };
if (writeIfChanged(path.join(OUT, "logo-default.json"), JSON.stringify(def) + "\n")) changed++;

console.log(`[sync-brand] src/brand/ ažuriran (${changed} promjena)`);
