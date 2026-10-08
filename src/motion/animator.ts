import { blendPose, type Pose, clonePose } from "@/src/figure/kanon";

/**
 * Pokret kao balet, ne kao lutka na koncu (11 §2): poze se mijenjaju glatko (interpolacija kutova kanona s easingom,
 * 0,3–0,6 s), a preko toga ide sekundarni pokret — disanje i polagano prebacivanje težine.
 */
export const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
export const easeBallet = (u: number) => {
  // spori početak, mekani dolazak (kao cubic-bezier(0.45, 0, 0.2, 1))
  const a = u * u * (3 - 2 * u);
  return a + (1 - a) * a * 0.15 * (1 - u);
};
export const smootherstep = (u: number) => u * u * u * (u * (u * 6 - 15) + 10);

export type Secondary = { breath: number; sway: number; breathRate?: number };

/**
 * Skupine tijela s kašnjenjem prijelaza (11 §2 "pokret kao balet"; QC F2): kukovi i noge vode,
 * prsa kasne ~60 ms, ruke ~120 ms, šake ~140 ms, vrat i glava zadnji (~160 ms).
 */
const GROUPS = [
  { keys: ["pelvis", "legL", "legR"], delay: 0 },
  { keys: ["chest"], delay: 0.06 },
  { keys: ["armL", "armR"], delay: 0.12 },
  { keys: ["handL", "handR"], delay: 0.14 },
  { keys: ["neck", "head"], delay: 0.16 },
] as const;

/** Blaga podprigušena opruga napretka 0 → 1 (malo prebaci i smiri se). */
class ProgressSpring {
  x = 1;
  v = 0;
  step(dt: number, w: number, zeta = 0.78) {
    const n = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = -w * w * (this.x - 1) - 2 * zeta * w * this.v;
      this.v += a * h;
      this.x += this.v * h;
    }
  }
}

export class PoseAnimator {
  current: Pose;
  private from: Pose;
  private to: Pose;
  private t = 1;
  private dur = 0.45;
  private ease = easeInOut;
  /** stupnjevani prijelaz s oprugama (zadano); false = jedan easing za cijelo tijelo */
  staggered = true;
  private springs = GROUPS.map(() => new ProgressSpring());
  private elapsed = 1e9;
  secondary: Secondary = { breath: 1, sway: 1, breathRate: 0.23 };
  private time = 0;
  /** pomak koji se dodaje nakon interpolacije (npr. pogled glave) */
  overlay: ((p: Pose, time: number) => void) | null = null;

  constructor(start: Pose) {
    this.current = start;
    this.from = start;
    this.to = start;
  }

  /** Prijelaz u pozu (0,3–0,6 s po zadanome). */
  go(target: Pose, duration = 0.45, ease = easeInOut) {
    this.from = this.sampleBase();
    this.to = target;
    this.t = 0;
    this.dur = Math.max(0.001, duration);
    this.ease = ease;
    this.elapsed = 0;
    for (const s of this.springs) {
      s.x = 0;
      s.v = 0;
    }
  }

  /** Odmah, bez prijelaza (npr. scroll izravno vodi pozu). */
  set(target: Pose) {
    this.from = this.to = target;
    this.t = 1;
    this.elapsed = 1e9;
    for (const s of this.springs) {
      s.x = 1;
      s.v = 0;
    }
  }

  get busy() {
    return this.t < 1 || this.springs.some((s) => Math.abs(s.x - 1) > 1e-3 || Math.abs(s.v) > 1e-3);
  }

  private sampleBase(): Pose {
    if (!this.staggered) return this.t >= 1 ? this.to : blendPose(this.from, this.to, this.ease(this.t));
    if (!this.busy) return this.to;
    // svaka skupina tijela ima svoj napredak (opruga + kašnjenje)
    const out = clonePose(this.to) as Record<string, unknown>;
    GROUPS.forEach((g, i) => {
      const u = this.springs[i].x;
      const b = blendPose(this.from, this.to, u) as unknown as Record<string, unknown>;
      for (const k of g.keys) out[k] = b[k];
      if (i === 0) {
        // oslonac (support) prati noge, ne ciljnu pozu
        if (b.support) {
          out.support = b.support;
          out.touch = b.touch;
        } else {
          delete out.support;
          delete out.touch;
        }
      }
    });
    return out as unknown as Pose;
  }

  update(dt: number): Pose {
    this.time += dt;
    if (this.t < 1) this.t = Math.min(1, this.t + dt / this.dur);
    if (this.staggered && this.elapsed < 1e8) {
      this.elapsed += dt;
      // vlastita frekvencija tako da se skupina smiri za ~trajanje prijelaza
      const w = 7.5 / this.dur;
      GROUPS.forEach((g, i) => {
        if (this.elapsed > g.delay) this.springs[i].step(dt, w);
      });
    }
    const p = clonePose(this.sampleBase()) as Pose;
    applySecondary(p, this.time, this.secondary);
    this.overlay?.(p, this.time);
    this.current = p;
    return p;
  }
}

/** Disanje (prsa i ramena, ~14 udaha u minuti) i polagano prebacivanje težine. */
export function applySecondary(p: Pose, time: number, s: Secondary) {
  const rate = s.breathRate ?? 0.23;
  const b = Math.sin(time * Math.PI * 2 * rate) * s.breath;
  p.chest.pitch -= b * 0.7;
  p.neck.pitch += b * 0.35;
  p.head.pitch += b * 0.25;
  // ramena se blago dižu na udah
  p.armL.th[0] -= b * 0.5;
  p.armR.th[0] += b * 0.5;
  const w = Math.sin(time * 0.31 + 1.3) * s.sway;
  p.pelvis.tilt += w * 0.45;
  p.chest.tilt -= w * 0.35;
  p.head.tilt += w * 0.25;
}
