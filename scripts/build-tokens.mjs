#!/usr/bin/env node
/**
 * design/tokens.json → app/tokens.css
 *
 * Tri sloja (projektni design-system skill):
 *   primitive  → --p-<put>            (sirove vrijednosti)
 *   semantic   → --<put>              (svrha; referencira primitive kroz var())
 *   component  → --<put>              (komponenta; referencira semantic kroz var())
 * Načini pozornice (modes): semantic se nadjačava pod [data-stage="<mode>"].
 * Stranica počinje u mraku (kazalište prije predstave) i prelazi u svijetlo.
 *
 * Reference u JSON-u: "{primitive.color.ink.950}" ili "{semantic.color.bg}".
 * Tailwind v4: generira se i @theme inline blok, pa rade klase bg-bg, text-fg, font-display…
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "design", "tokens.json");
const OUT = path.join(ROOT, "app", "tokens.css");
const T = JSON.parse(fs.readFileSync(SRC, "utf8"));

const varName = (layer, parts) => (layer === "primitive" ? "--p-" : "--") + parts.join("-");

function ref(value) {
  if (typeof value !== "string") return String(value);
  return value.replace(/\{([^}]+)\}/g, (_, p) => {
    const [layer, ...parts] = p.split(".");
    if (!["primitive", "semantic", "component"].includes(layer)) throw new Error(`Nepoznat sloj u referenci: ${p}`);
    // provjera da referenca postoji
    let node = T[layer];
    for (const k of parts) node = node?.[k];
    if (!node || node.$value === undefined) throw new Error(`Referenca ne postoji: {${p}}`);
    return `var(${layer === "semantic" ? semName(parts) : varName(layer, parts)})`;
  });
}

function flatten(obj, layer, prefix = [], out = []) {
  for (const [k, v] of Object.entries(obj || {})) {
    if (k.startsWith("$") || k.startsWith("_")) continue;
    const p = [...prefix, k];
    if (v && typeof v === "object" && v.$value !== undefined) out.push([p, v]);
    else if (v && typeof v === "object") flatten(v, layer, p, out);
  }
  return out;
}

// semantic: grupa određuje prefiks imena (boje su kratke: --bg, --fg …)
const GROUP_PREFIX = { color: "", font: "ff-", fs: "fs-", lh: "lh-", tr: "tr-", space: "sp-", motion: "mo-", radius: "rad-", layer: "z-" };
function semName(p) {
  const pre = GROUP_PREFIX[p[0]];
  if (pre === undefined) throw new Error(`Nepoznata semantička grupa: ${p[0]}`);
  return "--" + pre + p.slice(1).join("-");
}

const lines = [];
lines.push("/* Design tokens — GENERIRANO iz design/tokens.json (scripts/build-tokens.mjs). Ne uređuj ručno. */", "");
lines.push("/* === PRIMITIVE === */", ":root {");
for (const [p, v] of flatten(T.primitive, "primitive")) lines.push(`  ${varName("primitive", p)}: ${ref(v.$value)};`);
lines.push("}", "");

lines.push("/* === SEMANTIC (zadano: svijetla pozornica) === */", ":root {");
const semantic = flatten(T.semantic, "semantic");
for (const [p, v] of semantic) lines.push(`  ${semName(p)}: ${ref(v.$value)};`);
lines.push("}", "");

for (const [mode, body] of Object.entries(T.modes || {})) {
  if (mode.startsWith("$") || mode.startsWith("_")) continue;
  lines.push(`/* === MODE: ${mode} === */`, `[data-stage="${mode}"] {`);
  for (const [p, v] of flatten(body, "semantic")) lines.push(`  ${semName(p)}: ${ref(v.$value)};`);
  lines.push("}", "");
}

lines.push("/* === COMPONENT === */", ":root {");
for (const [p, v] of flatten(T.component, "component")) lines.push(`  ${varName("component", p)}: ${ref(v.$value)};`);
lines.push("}", "");

// Tailwind v4 most: semantičke boje i fontovi kao utility klase
lines.push("/* === TAILWIND @theme (most prema semantičkom sloju) === */", "@theme inline {");
for (const [p] of semantic) {
  const group = p[0];
  const name = p.slice(1).join("-");
  if (group === "color") lines.push(`  --color-${name}: var(${semName(p)});`);
  if (group === "font") lines.push(`  --font-${name}: var(${semName(p)});`);
}
lines.push("}", "");

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const css = lines.join("\n");
if (!fs.existsSync(OUT) || fs.readFileSync(OUT, "utf8") !== css) {
  fs.writeFileSync(OUT, css);
  console.log("[tokens] app/tokens.css generiran");
} else {
  console.log("[tokens] app/tokens.css bez promjena");
}
