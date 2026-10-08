/**
 * Jezgra lutke: kanon v2 (src/brand/kanon.json + lutka-core.js, kopije iz brand/) i proširenja iznad kanona.
 *
 * Kanon se ne mijenja. Ovdje su samo slojevi iznad njega:
 *  - Pose = kanonska poza + šake (5 prstiju: savijanje i raširenost), za 10-lik §1 (šake s 5 prstiju)
 *  - poseFromParts: obrnuto od layout() — iz rasporeda dijelova (npr. lutka-v2.json, snimljeni pokret) natrag u kutove
 *  - armIK: dvije kosti (rame → lakat → zapešće), kao prep2.py
 *  - lookAt: ograničen pogled glave i vrata (±35°)
 *
 * Koordinate (kanon): y gore, z prema gledatelju, x desno na ekranu; L/R = strane ekrana. Jedinica = visina glave.
 */
import Core, { type KanonPose, type Part, type LathePart, type BallPart, type Vec3 } from "@/src/brand/lutka-core.js";
import kanonJson from "@/src/brand/kanon.json";

export type { KanonPose, Part, LathePart, BallPart, Vec3 };

export const K = kanonJson as unknown as {
  gap: number;
  socket: number;
  joints: Record<"waist" | "shoulder" | "elbow" | "wrist" | "hip" | "knee" | "ankle", number>;
  lengths: Record<string, number>;
  attach: Record<string, number>;
  depth: Record<string, number>;
  profiles: Record<string, Array<[number, number]>>;
  profiles_h: Record<string, Array<[number, number]>>;
  poses: Record<string, KanonPose & { _opis?: string }>;
};

export const lt = Core.create(K);
export const sampleProfile = Core.sampleProfile;
export const rAt = Core.rAt;

/** Šaka: savijanje prstiju [palac, kažiprst, srednji, prstenjak, mali] 0..1, raširenost 0..1, palac prema dlanu 0..1. */
export type HandState = { curl: [number, number, number, number, number]; spread: number; thumb: number };
export type Pose = KanonPose & { handL: HandState; handR: HandState };

export const HAND_RELAXED: HandState = { curl: [0.25, 0.22, 0.28, 0.34, 0.4], spread: 0.25, thumb: 0.3 };
export const HAND_OPEN: HandState = { curl: [0.05, 0.04, 0.05, 0.07, 0.1], spread: 0.6, thumb: 0.1 };
export const HAND_GRIP: HandState = { curl: [0.55, 0.62, 0.78, 0.86, 0.9], spread: 0.1, thumb: 0.7 }; // palica, olovka
export const HAND_HOLD: HandState = { curl: [0.35, 0.5, 0.55, 0.6, 0.62], spread: 0.08, thumb: 0.5 }; // bilježnica
/** Otvorena šaka dirigenta: prsti skupljeni i blago savijeni (ne raširena "zvijezda", ne kažiprst) */
export const HAND_ELEGANT: HandState = { curl: [0.12, 0.14, 0.18, 0.24, 0.3], spread: 0.12, thumb: 0.25 };

/** Brza duboka kopija poze (obični objekti, nizovi brojeva); bez JSON-a jer se zove za svakog robota u svakom frameu. */
const clone = <T,>(o: T): T => {
  if (Array.isArray(o)) return o.map((x) => clone(x)) as unknown as T;
  if (o && typeof o === "object") {
    const out: Record<string, unknown> = {};
    for (const k in o) out[k] = clone((o as Record<string, unknown>)[k]);
    return out as T;
  }
  return o;
};
export const clonePose = <T,>(p: T): T => clone(p);

/** Kanonska poza (+ zadane šake) po imenu iz kanon.json. */
export function kanonPose(name: string, hands: Partial<Pick<Pose, "handL" | "handR">> = {}): Pose {
  const p = lt.pose(name) as KanonPose;
  return normalizePose({ ...clone(p), ...hands });
}

/** Ispuni sve ključeve (da blend nikad ne miješa undefined) i makni opise. */
export function normalizePose(p: Partial<Pose> & KanonPose): Pose {
  const out = clone(p) as Pose & { _opis?: string };
  delete out._opis;
  out.handL = out.handL ? clone(out.handL) : clone(HAND_RELAXED);
  out.handR = out.handR ? clone(out.handR) : clone(HAND_RELAXED);
  for (const s of ["legL", "legR"] as const) if (out[s].fp === undefined) out[s].fp = 0;
  if (out.touch === undefined && out.support) out.touch = -1;
  return out;
}

/** Glatki prijelaz između poza (kutovi kanona + šake). Oslonac (support) se uzima od bliže poze. */
export function blendPose(a: Pose, b: Pose, u: number): Pose {
  const o = Core.blend(stripSupport(a), stripSupport(b), u) as Pose;
  const near = u < 0.5 ? a : b;
  if (near.support) {
    o.support = near.support;
    o.touch = near.touch ?? -1;
  }
  return o;
}
function stripSupport(p: Pose): Pose {
  const q = { ...p } as Partial<Pose>;
  delete q.support;
  delete q.touch;
  return q as Pose;
}

export function layout(p: Pose | KanonPose): Part[] {
  return lt.layout(p);
}

// ---------------------------------------------------------------- vektori i matrice (kao lutka-core)
const RAD = Math.PI / 180;
export const DEG = 180 / Math.PI;
type M3 = number[]; // 3x3, redom po recima
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sc = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: Vec3) => Math.sqrt(dot(a, a));
const unit = (a: Vec3): Vec3 => sc(a, 1 / (len(a) || 1));
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const vec = { sub, add, sc, dot, len, unit, cross };

const fromCols = (x: Vec3, y: Vec3, z: Vec3): M3 => [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]];
const transpose = (A: M3): M3 => [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]];
const mul = (A: M3, B: M3): M3 => {
  const C = new Array(9).fill(0);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) C[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c];
  return C;
};
/** body(o) = Ry(yaw)·Rx(pitch)·Rz(−tilt) → {tilt, pitch, yaw} */
function decompose(B: M3) {
  const pitch = Math.asin(Math.max(-1, Math.min(1, -B[5])));
  const c = Math.atan2(B[3], B[4]);
  const yaw = Math.atan2(B[2], B[8]);
  return { tilt: -c * DEG, pitch: pitch * DEG, yaw: yaw * DEG };
}
const ang = (d: Vec3) => [Math.atan2(d[0], -d[1]) * DEG, Math.asin(Math.max(-1, Math.min(1, d[2]))) * DEG] as const;

/** Okvir kao u lutka-core (os, smjer prema naprijed, roll). */
export function frame(axis: Vec3, hint: Vec3, roll = 0) {
  const y = unit(axis);
  let z = sub(hint, sc(y, dot(hint, y)));
  if (len(z) < 1e-6) {
    const alt: Vec3 = Math.abs(y[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    z = sub(alt, sc(y, dot(alt, y)));
  }
  z = unit(z);
  let x = cross(y, z);
  if (roll) {
    const c = Math.cos(roll * RAD), s = Math.sin(roll * RAD);
    const nx = sub(sc(x, c), sc(z, s)), nz = add(sc(x, s), sc(z, c));
    x = nx;
    z = nz;
  }
  return { x, y, z };
}
const rollOf = (actualX: Vec3, axis: Vec3, hint: Vec3) => {
  const b = frame(axis, hint, 0);
  return Math.atan2(-dot(actualX, b.z), dot(actualX, b.x)) * DEG;
};

/**
 * Obrnuto od layout(): raspored dijelova → kutovi kanona. Služi za pozu dirigenta iz lutka-v2.json
 * i za uvoz snimljenog pokreta (svaki frame se pretvori u raspored dijelova, pa ovdje u pozu).
 */
export function poseFromParts(parts: Part[], hands?: Partial<Pick<Pose, "handL" | "handR">>): Pose {
  const P = Object.fromEntries(parts.map((p) => [p.n, p])) as Record<string, Part>;
  const L = (n: string) => P[n] as LathePart;
  const B = (n: string) => P[n] as BallPart;
  const Mof = (p: LathePart): M3 => fromCols(p.M.x, p.M.y, p.M.z);

  const pel = L("pelvis");
  const Mp = fromCols(sc(pel.M.x, -1), sc(pel.M.y, -1), pel.M.z);
  const Mc = Mof(L("chest"));
  const Mn = Mof(L("neck"));
  const Mh = Mof(L("head"));
  const pelvis = decompose(Mp);
  const chest = decompose(Mc);
  const neck = decompose(mul(transpose(Mc), Mn));
  const hb = decompose(mul(transpose(Mn), Mh));
  const head = { tilt: hb.tilt, pitch: hb.pitch - K.attach.head_pitch, yaw: hb.yaw };
  const fwC: Vec3 = [Mc[2], Mc[5], Mc[8]];
  const fwP: Vec3 = pel.M.z;

  const arm = (s: "L" | "R") => {
    const u = unit(sub(B("elbow" + s).c, B("shoulder" + s).c));
    const f = unit(sub(B("wrist" + s).c, B("elbow" + s).c));
    const h = L("hand" + s).M.y;
    const [tu, pu] = ang(u), [tf, pf] = ang(f), [th, ph] = ang(h);
    return {
      th: [tu, tf, th] as [number, number, number],
      ph: [pu, pf, ph] as [number, number, number],
      roll: [rollOf(L("upper" + s).M.x, u, fwC), rollOf(L("fore" + s).M.x, f, fwC), rollOf(L("hand" + s).M.x, h, fwC)] as [number, number, number],
    };
  };
  const leg = (s: "L" | "R") => {
    const t = unit(sub(B("knee" + s).c, B("hip" + s).c));
    const n = unit(sub(B("ankle" + s).c, B("knee" + s).c));
    const af = L("foot" + s).M.y;
    const fp = Math.asin(Math.max(-1, Math.min(1, -af[1]))) * DEG;
    const yaw = Math.atan2(af[0], af[2]) * DEG;
    const [tt, pt] = ang(t), [tn, pn] = ang(n);
    return { th: [tt, tn] as [number, number], ph: [pt, pn] as [number, number], foot: yaw - pelvis.yaw, fp: Math.abs(fp) < 0.5 ? 0 : fp };
  };
  void fwP;
  return normalizePose({ pelvis, chest, neck, head, armL: arm("L"), armR: arm("R"), legL: leg("L"), legR: leg("R"), ...hands });
}

/**
 * IK za dvije kosti (kao brand/09-blender/prep2.py): rame S, cilj zapešća T, smjer laka (pole).
 * Vraća kutove nadlaktice i podlaktice u kanonu.
 */
export function armIK(S: Vec3, T: Vec3, pole: Vec3) {
  const LA = K.lengths.upper_arm_bone, LF = K.lengths.forearm_bone;
  const d = sub(T, S);
  const Ld = len(d);
  const Lc = Math.min(Math.max(Ld, Math.abs(LA - LF) + 1e-3), LA + LF - 1e-3);
  const u = sc(d, 1 / (Ld || 1));
  const cosA = (LA * LA + Lc * Lc - LF * LF) / (2 * LA * Lc);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const v = unit(sub(pole, sc(u, dot(pole, u))));
  const E = add(add(S, sc(u, LA * cosA)), sc(v, LA * sinA));
  const W = add(S, sc(u, Lc));
  const [tu, pu] = ang(unit(sub(E, S)));
  const [tf, pf] = ang(unit(sub(W, E)));
  return { th: [tu, tf] as [number, number], ph: [pu, pf] as [number, number], elbow: E, wrist: W, reach: Ld / (LA + LF) };
}

/** Smjer (jedinični vektor) → kutovi uda (th, ph). */
export const dirToAngles = (d: Vec3) => ang(unit(d));

/**
 * Pogled glave prema točki (u prostoru lutke): yaw/pitch ograničeni na ±35° (07: "glava i vrat ±35°"),
 * 35 % pokreta ide na vrat, 65 % na glavu.
 */
export function lookAtAngles(parts: Part[], target: Vec3, limit = 35) {
  const P = Object.fromEntries(parts.map((p) => [p.n, p])) as Record<string, Part>;
  const chest = P.chest as LathePart, head = P.head as LathePart;
  const hc = add(head.S, sc(head.M.y, head.L * 0.5));
  const d = sub(target, hc);
  // u okviru prsa
  const lx = dot(d, chest.M.x), ly = dot(d, chest.M.y), lz = dot(d, chest.M.z);
  let yaw = Math.atan2(lx, Math.max(lz, 1e-3)) * DEG;
  let pitch = Math.atan2(-ly, Math.hypot(lx, lz)) * DEG;
  if (lz < 0) yaw = Math.sign(lx || 1) * limit; // iza leđa: okreni do granice
  yaw = Math.max(-limit, Math.min(limit, yaw));
  pitch = Math.max(-limit * 0.8, Math.min(limit * 0.8, pitch));
  return { neck: { yaw: yaw * 0.35, pitch: pitch * 0.35 }, head: { yaw: yaw * 0.65, pitch: pitch * 0.65 } };
}

export function partMap(parts: Part[]) {
  return Object.fromEntries(parts.map((p) => [p.n, p])) as Record<string, Part>;
}
