#!/usr/bin/env node
/**
 * Uvoz snimljenog pokreta (11 §3, 07 Ideje 7. 10.): balerina → Higgsfield Genjutsu (prijenos pokreta) →
 * Blender: retarget na RIG_lutka (brand/09-blender, 20 kostiju) → izvoz glTF/GLB (Y gore) → ova skripta →
 * src/motion/clips/<ime>.json u formatu "kanon-parts-frames".
 *
 *   node scripts/import-motion.mjs ulaz.glb src/motion/clips/balerina.json [--fps 30]
 *   node scripts/import-motion.mjs --selftest
 *
 * Kako radi: za svaki frame izračuna svjetsku matricu svake kosti; svaki dio lutke (iz lutka-v2.json "rest")
 * prati svoju kost: dio(t) = Kost(t) · Kost(rest)⁻¹ · dio(rest). Pri učitavanju na stranici frameovi se pretvore
 * u kutove kanona (poseFromParts), pa vrijede iste provjere (sudari, pod) kao za ručne poze.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LV2 = JSON.parse(fs.readFileSync(path.join(ROOT, "src/brand/lutka-v2.json"), "utf8"));
const U = LV2.unit;
const SIDE = { L: ".R", R: ".L" }; // L/R u kanonu = strane ekrana; u Blenderu .L/.R = strane lutke
function boneOf(n) {
  const base = { pelvis: "zdjelica", chest: "prsa", waist: "struk", neck: "vrat", head: "glava" };
  if (base[n]) return base[n];
  for (const [pre, b] of [["hip", "bedro"], ["thigh", "bedro"], ["knee", "potkoljenica"], ["shin", "potkoljenica"], ["ankle", "stopalo"], ["foot", "stopalo"], ["shoulder", "nadlaktica"], ["upper", "nadlaktica"], ["elbow", "podlaktica"], ["fore", "podlaktica"], ["wrist", "saka"], ["hand", "saka"]])
    if (n.startsWith(pre) && SIDE[n.slice(pre.length)]) return b + SIDE[n.slice(pre.length)];
  throw new Error(`nema kosti za ${n}`);
}

// ---- 4x4 matrice (stupčano, kao glTF) ----
const I4 = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
function inv(m) {
  // samo kruta transformacija (rotacija + pomak)
  const R = [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]];
  const t = [m[12], m[13], m[14]];
  const o = I4();
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) o[c * 4 + r] = R[r * 3 + c];
  for (let r = 0; r < 3; r++) o[12 + r] = -(o[r] * t[0] + o[4 + r] * t[1] + o[8 + r] * t[2]);
  return o;
}
function trs(t = [0, 0, 0], q = [0, 0, 0, 1], s = [1, 1, 1]) {
  const [x, y, z, w] = q;
  const xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
  return [
    (1 - 2 * (yy + zz)) * s[0], 2 * (xy + wz) * s[0], 2 * (xz - wy) * s[0], 0,
    2 * (xy - wz) * s[1], (1 - 2 * (xx + zz)) * s[1], 2 * (yz + wx) * s[1], 0,
    2 * (xz + wy) * s[2], 2 * (yz - wx) * s[2], (1 - 2 * (xx + yy)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ];
}
const partMat = (p) => (p.k === "ball"
  ? [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, p.c[0] * U, p.c[1] * U, p.c[2] * U, 1]
  : [p.M[0][0], p.M[1][0], p.M[2][0], 0, p.M[0][1], p.M[1][1], p.M[2][1], 0, p.M[0][2], p.M[1][2], p.M[2][2], 0, p.S[0] * U, p.S[1] * U, p.S[2] * U, 1]);
const toPart = (p, m) => (p.k === "ball"
  ? { n: p.n, k: "ball", c: [m[12] / U, m[13] / U, m[14] / U], r: p.r }
  : { n: p.n, k: "lathe", prof: p.prof, hp: p.hp, dz: p.dz, sole: p.sole, L: p.L, S: [m[12] / U, m[13] / U, m[14] / U], M: { x: [m[0], m[1], m[2]], y: [m[4], m[5], m[6]], z: [m[8], m[9], m[10]] } });

/** Svjetske matrice kostiju u restu i u frameu → dijelovi lutke za taj frame. */
export function partsFromBones(restWorld, frameWorld) {
  return LV2.rest.map((p) => {
    const b = boneOf(p.n);
    if (!restWorld[b] || !frameWorld[b]) throw new Error(`kost ${b} nedostaje u glTF-u`);
    return toPart(p, mul(mul(frameWorld[b], inv(restWorld[b])), partMat(p)));
  });
}

// ---- glTF/GLB ----
function readGltf(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32LE(0) === 0x46546c67) {
    let off = 12, json = null, bin = null;
    while (off < buf.length) {
      const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
      const chunk = buf.subarray(off + 8, off + 8 + len);
      if (type === 0x4e4f534a) json = JSON.parse(chunk.toString("utf8"));
      else if (type === 0x004e4942) bin = chunk;
      off += 8 + len;
    }
    return { json, buffers: [bin] };
  }
  const json = JSON.parse(buf.toString("utf8"));
  const buffers = json.buffers.map((b) => (b.uri.startsWith("data:") ? Buffer.from(b.uri.split(",")[1], "base64") : fs.readFileSync(path.join(path.dirname(file), b.uri))));
  return { json, buffers };
}
function accessor(g, i) {
  const a = g.json.accessors[i], v = g.json.bufferViews[a.bufferView];
  const n = { SCALAR: 1, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
  const buf = g.buffers[v.buffer];
  const off = (v.byteOffset || 0) + (a.byteOffset || 0);
  const out = new Float32Array(a.count * n);
  const stride = v.byteStride || n * 4;
  for (let k = 0; k < a.count; k++) for (let j = 0; j < n; j++) out[k * n + j] = buf.readFloatLE(off + k * stride + j * 4);
  return { data: out, n, count: a.count };
}
function sampleChannel(times, values, n, t, path) {
  if (t <= times[0]) return Array.from(values.slice(0, n));
  const last = times.length - 1;
  if (t >= times[last]) return Array.from(values.slice(last * n, last * n + n));
  let i = 0;
  while (times[i + 1] < t) i++;
  const u = (t - times[i]) / (times[i + 1] - times[i]);
  const a = values.slice(i * n, i * n + n), b = values.slice((i + 1) * n, (i + 1) * n + n);
  if (path === "rotation") {
    let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    const s = d < 0 ? -1 : 1;
    const q = [0, 1, 2, 3].map((k) => a[k] * (1 - u) + b[k] * s * u);
    const l = Math.hypot(...q);
    return q.map((x) => x / l);
  }
  return [0, 1, 2].map((k) => a[k] * (1 - u) + b[k] * u);
}
function worldMatrices(g, overrides) {
  const nodes = g.json.nodes, parent = new Map();
  nodes.forEach((nd, i) => (nd.children || []).forEach((c) => parent.set(c, i)));
  const local = nodes.map((nd, i) => {
    if (nd.matrix && !overrides.has(i)) return nd.matrix.slice();
    const o = overrides.get(i) || {};
    return trs(o.translation || nd.translation, o.rotation || nd.rotation, o.scale || nd.scale);
  });
  const world = new Array(nodes.length);
  const get = (i) => (world[i] ??= parent.has(i) ? mul(get(parent.get(i)), local[i]) : local[i]);
  const byName = {};
  nodes.forEach((nd, i) => { if (nd.name) byName[nd.name.replace(/^.*[|:]/, "")] = get(i); });
  return byName;
}

export function importGltf(file, fps = 30) {
  const g = readGltf(file);
  const anim = g.json.animations?.[0];
  if (!anim) throw new Error("glTF nema animacije");
  const chans = anim.channels.map((c) => {
    const s = anim.samplers[c.sampler];
    return { node: c.target.node, path: c.target.path, times: accessor(g, s.input).data, values: accessor(g, s.output) };
  });
  const end = Math.max(...chans.map((c) => c.times[c.times.length - 1]));
  const rest = worldMatrices(g, new Map());
  const frames = [];
  for (let f = 0; f <= Math.round(end * fps); f++) {
    const t = f / fps, ov = new Map();
    for (const c of chans) {
      const o = ov.get(c.node) || {};
      o[c.path] = sampleChannel(c.times, c.values.data, c.values.n, t, c.path);
      ov.set(c.node, o);
    }
    frames.push(partsFromBones(rest, worldMatrices(g, ov)));
  }
  return { format: "kanon-parts-frames", fps, frames };
}

// ---- samoprovjera: kosti iz lutka-v2.json (rest → pose dirigenta) moraju dati isti raspored ----
function selftest() {
  const restWorld = {}, frameWorld = {};
  const R = Object.fromEntries(LV2.rest.map((p) => [p.n, p])), P = Object.fromEntries(LV2.pose.map((p) => [p.n, p]));
  for (const p of LV2.rest) {
    if (p.k === "ball") continue;
    const b = boneOf(p.n);
    restWorld[b] = partMat(R[p.n]);
    frameWorld[b] = partMat(P[p.n]);
  }
  // struk (samo kugla, bez tokarenog dijela): čisti pomak između resta i poze
  restWorld.struk = partMat(R.waist);
  frameWorld.struk = partMat(P.waist);
  const parts = partsFromBones(restWorld, frameWorld);
  let worst = 0;
  for (const q of parts) {
    const ref = P[q.n];
    const a = q.k === "ball" ? q.c : q.S, b = ref.k === "ball" ? ref.c : ref.S;
    worst = Math.max(worst, ...a.map((v, i) => Math.abs(v - b[i])));
  }
  console.log(`samoprovjera: najveće odstupanje ${worst.toExponential(2)} (jedinice glave)`);
  if (worst > 0.05) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args[0] === "--selftest") selftest();
  else if (args.length >= 2) {
    const fps = Number(args[args.indexOf("--fps") + 1]) || 30;
    const clip = importGltf(args[0], fps);
    fs.mkdirSync(path.dirname(args[1]), { recursive: true });
    fs.writeFileSync(args[1], JSON.stringify(clip));
    console.log(`${args[1]}: ${clip.frames.length} frameova @ ${fps} fps`);
  } else {
    console.log("upotreba: node scripts/import-motion.mjs ulaz.glb izlaz.json [--fps 30] | --selftest");
  }
}
