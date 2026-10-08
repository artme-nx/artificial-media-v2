/**
 * Automatske provjere kao brand/05-logo/figura/test_paritet.py (11 §3):
 * nijedan dio ne prolazi kroz drugi (osim namjernih ležišta) i stopala ne propadaju kroz pod.
 * Isti algoritam kao lutka.py (sections / inside / collisions), prenesen u TypeScript.
 */
import { lt, rAt, type Part, type LathePart, type BallPart, type Vec3 } from "./kanon";

const ADJ: Record<string, string[]> = {
  waist: ["chest", "pelvis"], hipL: ["pelvis", "thighL"], hipR: ["pelvis", "thighR"],
  kneeL: ["thighL", "shinL"], kneeR: ["thighR", "shinR"], ankleL: ["shinL", "footL"], ankleR: ["shinR", "footR"],
  shoulderL: ["chest", "upperL"], shoulderR: ["chest", "upperR"], elbowL: ["upperL", "foreL"], elbowR: ["upperR", "foreR"],
  wristL: ["foreL", "handL"], wristR: ["foreR", "handR"],
};
const SEG_ADJ: Array<[string, string]> = [["chest", "neck"], ["neck", "head"], ["hipL", "hipR"], ["thighL", "thighR"]];

function allowedPairs() {
  const a = new Set<string>();
  const add = (x: string, y: string) => { a.add(`${x}|${y}`); a.add(`${y}|${x}`); };
  for (const [b, segs] of Object.entries(ADJ)) for (const s of segs) add(b, s);
  for (const [x, y] of SEG_ADJ) add(x, y);
  for (const s of ["L", "R"]) {
    add("hand" + s, "wrist" + s); add("fore" + s, "wrist" + s);
    add("pelvis", "thigh" + s);
    add("foot" + s, "ankle" + s); add("shin" + s, "foot" + s);
    add("chest", "upper" + s);
  }
  add("waist", "hipL"); add("waist", "hipR");
  return a;
}
const ALLOWED = allowedPairs();

function halfHeights(p: LathePart, t: number, r: number): [number, number] {
  const hz = p.hp ? rAt(lt.sph[p.hp], t) : r * p.dz;
  const hb = p.sole != null ? Math.min(hz, p.sole) : hz;
  return [hz, hb];
}

/** Točke na površini dijela (kao lutka.py surface_points: 24 kuta, 4 koraka profila). */
function surfacePoints(p: Part): Vec3[] {
  const out: Vec3[] = [];
  if (p.k === "ball") {
    for (let i = 0; i < 9; i++) {
      const v = -1.4 + (2.8 * i) / 8;
      for (let j = 0; j < 24; j++) {
        const u = (j / 24) * Math.PI * 2;
        out.push([p.c[0] + Math.cos(v) * Math.cos(u) * p.r, p.c[1] + Math.sin(v) * p.r, p.c[2] + Math.cos(v) * Math.sin(u) * p.r]);
      }
    }
    return out;
  }
  const sp = (lt as unknown as { sp: Record<string, Array<[number, number]>> }).sp[p.prof];
  // lutka.py: sample_profile(..., 4) — gušće uzorkovanje nije potrebno za provjeru
  for (const [t, r] of sp) {
    const [hz, hb] = halfHeights(p, t, r);
    const c: Vec3 = [p.S[0] + p.M.y[0] * t * p.L, p.S[1] + p.M.y[1] * t * p.L, p.S[2] + p.M.y[2] * t * p.L];
    for (let j = 0; j < 24; j++) {
      const a = (j / 24) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const zs = sa < 0 ? sa * hb : sa * hz;
      out.push([c[0] + r * ca * p.M.x[0] + zs * p.M.z[0], c[1] + r * ca * p.M.x[1] + zs * p.M.z[1], c[2] + r * ca * p.M.x[2] + zs * p.M.z[2]]);
    }
  }
  return out;
}

/** Dubina prodiranja točke u dio (pozitivno = unutra); kao lutka.py inside(). */
function inside(p: Part, P: Vec3): number {
  if (p.k === "ball") return p.r - Math.hypot(P[0] - p.c[0], P[1] - p.c[1], P[2] - p.c[2]);
  const d: Vec3 = [P[0] - p.S[0], P[1] - p.S[1], P[2] - p.S[2]];
  const q = [d[0] * p.M.x[0] + d[1] * p.M.x[1] + d[2] * p.M.x[2], d[0] * p.M.y[0] + d[1] * p.M.y[1] + d[2] * p.M.y[2], d[0] * p.M.z[0] + d[1] * p.M.z[1] + d[2] * p.M.z[2]];
  const t = q[1] / p.L;
  if (t < 0 || t > 1) return -1;
  const sp = (lt as unknown as { sp: Record<string, Array<[number, number]>> }).sp[p.prof];
  const r = Math.max(rAt(sp, t), 1e-6);
  const [hz, hb] = halfHeights(p, t, r);
  const h = Math.max(q[2] < 0 ? hb : hz, 1e-6);
  const rho = Math.sqrt((q[0] / r) ** 2 + (q[2] / h) ** 2);
  return (1 - rho) * Math.min(r, h);
}

export function collisions(parts: Part[], tol = 0.004) {
  const pts = new Map(parts.map((p) => [p.n, surfacePoints(p)]));
  const out: Array<[string, string, number]> = [];
  for (const a of parts)
    for (const b of parts) {
      if (a === b || ALLOWED.has(`${a.n}|${b.n}`)) continue;
      let worst = -Infinity;
      for (const P of pts.get(a.n)!) worst = Math.max(worst, inside(b, P));
      if (worst > tol) out.push([a.n, b.n, Math.round(worst * 1000) / 1000]);
    }
  return out;
}

/** Najniža točka svakog stopala (jedinice glave); pod je y = 0. */
export function feetLows(parts: Part[]) {
  const lows: Record<string, number> = {};
  for (const p of parts) {
    if (p.n !== "footL" && p.n !== "footR") continue;
    const lp = p as LathePart;
    const sp = (lt as unknown as { sp: Record<string, Array<[number, number]>> }).sp[lp.prof];
    let low = Infinity;
    for (const [t, r] of sp) {
      const [hz, hb] = halfHeights(lp, t, r);
      const cy = lp.S[1] + lp.M.y[1] * t * lp.L;
      for (let j = 0; j < 24; j++) {
        const a = (j / 24) * Math.PI * 2;
        const y = cy + r * Math.cos(a) * lp.M.x[1] + (Math.sin(a) < 0 ? Math.sin(a) * hb : Math.sin(a) * hz) * lp.M.z[1];
        low = Math.min(low, y);
      }
    }
    lows[p.n] = low;
  }
  return lows;
}

export type { BallPart };
