import * as THREE from "three";
import { lookAtAngles, armIK, dirToAngles, type Pose, type Part, type Vec3, type BallPart } from "@/src/figure/kanon";

/** Kritično prigušena opruga (bez prebačaja): meko kašnjenje pogleda i ruke. */
export class Spring {
  v = 0;
  constructor(public x = 0, public omega = 7) {}
  step(target: number, dt: number) {
    const w = this.omega, x0 = this.x - target;
    const e = Math.exp(-w * dt);
    const nx = (x0 + (this.v + w * x0) * dt) * e;
    this.v = (this.v - w * (this.v + w * x0) * dt) * e;
    this.x = target + nx;
    return this.x;
  }
}

/**
 * Pogled glave i vrata prema točki (07: ±35°, meko kašnjenje, da ne izgleda robotski).
 * weight 0..1: koliko pogled nadjačava koreografiju (u koreografiranim trenucima 0).
 */
export class HeadLook {
  yaw = new Spring(0, 6.5);
  pitch = new Spring(0, 6.5);
  weight = new Spring(0, 3);
  target: Vec3 | null = null;
  enabled = true;
  limit = 35;

  update(parts: Part[], dt: number) {
    let ty = 0, tp = 0;
    if (this.target && this.enabled) {
      const a = lookAtAngles(parts, this.target, this.limit);
      ty = a.head.yaw / 0.65;
      tp = a.head.pitch / 0.65;
    }
    this.yaw.step(ty, dt);
    this.pitch.step(tp, dt);
    this.weight.step(this.target && this.enabled ? 1 : 0, dt);
  }

  /** glava do ±35°, vrat i prsa prate (30 % i 15 %), da se smjer čita i na glavi bez lica */
  apply(p: Pose) {
    const w = this.weight.x;
    p.chest.yaw += this.yaw.x * 0.15 * w;
    p.chest.pitch += this.pitch.x * 0.08 * w;
    p.neck.yaw += this.yaw.x * 0.3 * w;
    p.neck.pitch += this.pitch.x * 0.3 * w;
    p.head.yaw += this.yaw.x * w;
    p.head.pitch += this.pitch.x * w;
  }
}

/** Šaka seže do točke (IK za dvije kosti; lakat prema dolje i van). Za F6 (namjesti pozu) i F8 (pisanje). */
export function reachTo(p: Pose, parts: Part[], side: "L" | "R", target: Vec3, weight = 1, pole?: Vec3) {
  const sh = (parts.find((q) => q.n === "shoulder" + side) as BallPart).c;
  const out = side === "L" ? -1 : 1;
  const ik = armIK(sh, target, pole ?? [out * 0.6, -1, -0.2]);
  const arm = side === "L" ? p.armL : p.armR;
  for (let i = 0; i < 2; i++) {
    arm.th[i] = arm.th[i] + (ik.th[i] - arm.th[i]) * weight;
    arm.ph[i] = arm.ph[i] + (ik.ph[i] - arm.ph[i]) * weight;
  }
  // šaka nastavlja smjer podlaktice
  const fore = new THREE.Vector3(...ik.wrist).sub(new THREE.Vector3(...ik.elbow)).normalize();
  const [th, ph] = dirToAngles([fore.x, fore.y, fore.z]);
  arm.th[2] = arm.th[2] + (th - arm.th[2]) * weight;
  arm.ph[2] = arm.ph[2] + (ph - arm.ph[2]) * weight;
  return ik;
}
