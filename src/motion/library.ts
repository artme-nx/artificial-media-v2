/**
 * Biblioteka poza — podaci, ne kod (11 §3: format spreman za snimljeni pokret).
 * Kanonske poze (src/brand/kanon.json): kontrapost, seze, otvara, b_enhaut, b_seconde, b_bas, b_reverence.
 * Dirigent: iz brand/09-blender/lutka-v2.json (raspored dijelova → kutovi, poseFromParts).
 * Dodatne poze (iznad kanona) su u src/motion/poses-extra.json.
 */
import lutkaV2 from "@/src/brand/lutka-v2.json";
import extra from "./poses-extra.json";
import { kanonPose, normalizePose, poseFromParts, HAND_RELAXED, HAND_OPEN, HAND_GRIP, HAND_HOLD, HAND_ELEGANT, type Pose, type Part, clonePose } from "@/src/figure/kanon";

export const KANON_POSES = ["kontrapost", "seze", "otvara", "b_enhaut", "b_seconde", "b_bas", "b_reverence"] as const;
export type PoseName = (typeof KANON_POSES)[number] | "dirigent" | keyof typeof extra;

const HANDS = { relaxed: HAND_RELAXED, open: HAND_OPEN, grip: HAND_GRIP, hold: HAND_HOLD, elegant: HAND_ELEGANT } as const;
type ExtraPose = Record<string, unknown> & { handL?: keyof typeof HANDS | object; handR?: keyof typeof HANDS | object; _base?: string };

const cache = new Map<string, Pose>();

function handOf(v: unknown) {
  if (typeof v === "string") return clonePose(HANDS[v as keyof typeof HANDS]);
  return v;
}

export function getPose(name: PoseName): Pose {
  const hit = cache.get(name);
  if (hit) return clonePose(hit);
  let p: Pose;
  if ((KANON_POSES as readonly string[]).includes(name)) {
    const ballet = name.startsWith("b_");
    p = kanonPose(name, ballet ? { handL: HAND_ELEGANT, handR: HAND_ELEGANT } : {});
    if (name === "otvara") { p.handL = { ...HAND_OPEN }; p.handR = { ...HAND_OPEN }; }
  } else if (name === "dirigent") {
    p = poseFromParts((lutkaV2 as unknown as { pose: Part[] }).pose.map(toPart), { handL: HAND_GRIP, handR: HAND_OPEN });
  } else {
    const e = (extra as Record<string, ExtraPose>)[name];
    if (!e) throw new Error(`nepoznata poza: ${name}`);
    const base = e._base ? getPose(e._base as PoseName) : null;
    const merged = { ...(base ?? {}), ...e } as Record<string, unknown>;
    delete merged._base;
    delete merged._opis;
    merged.handL = handOf(merged.handL ?? "relaxed");
    merged.handR = handOf(merged.handR ?? "relaxed");
    p = normalizePose(merged as unknown as Pose);
  }
  cache.set(name, p);
  return clonePose(p);
}

// lutka-v2.json zapisuje M kao 3 retka; lutka-core očekuje {x, y, z} stupce
function toPart(q: Record<string, unknown>): Part {
  if (q.k === "ball") return q as unknown as Part;
  const M = q.M as number[][];
  return { ...(q as object), M: { x: [M[0][0], M[1][0], M[2][0]], y: [M[0][1], M[1][1], M[2][1]], z: [M[0][2], M[1][2], M[2][2]] } } as unknown as Part;
}

export function allPoseNames(): PoseName[] {
  return [...KANON_POSES, "dirigent", ...(Object.keys(extra) as PoseName[])];
}
