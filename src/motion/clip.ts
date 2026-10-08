/**
 * Klipovi pokreta — podaci, ne kod (11 §3). Dva formata:
 *
 * 1) "kanon-pose-keys": ključne poze u kutovima kanona (ručno režirano)
 *    { "format": "kanon-pose-keys", "duration": 4, "ease": "ballet",
 *      "keys": [ { "t": 0, "pose": "b_enhaut" }, { "t": 0.4, "pose": { ...poza... } } ] }
 *
 * 2) "kanon-parts-frames": raspored dijelova po frameu (snimljeni pokret: balerina → Higgsfield Genjutsu →
 *    Blender RIG_lutka → glTF → scripts/import-motion.mjs). Pri učitavanju se svaki frame pretvori u kutove
 *    kanona (poseFromParts), pa vrijede iste provjere (sudari, pod) i isti prijelazi.
 *    { "format": "kanon-parts-frames", "fps": 30, "frames": [ [ {n, k, S, M | c}, ... ], ... ] }
 */
import { blendPose, poseFromParts, type Pose, type Part } from "@/src/figure/kanon";
import { getPose, type PoseName } from "./library";
import { easeBallet, easeInOut, smootherstep } from "./animator";

export type PoseKeysClip = { format: "kanon-pose-keys"; duration: number; ease?: "ballet" | "inout" | "smooth" | "linear"; keys: Array<{ t: number; pose: PoseName | Pose }> };
export type PartsFramesClip = { format: "kanon-parts-frames"; fps: number; frames: Part[][] };
export type Clip = PoseKeysClip | PartsFramesClip;

const EASE = { ballet: easeBallet, inout: easeInOut, smooth: smootherstep, linear: (u: number) => u };

export class ClipPlayer {
  private poses: Pose[] | null = null;
  constructor(public clip: Clip) {
    if (clip.format === "kanon-parts-frames") this.poses = clip.frames.map((f) => poseFromParts(f));
  }
  get duration() {
    return this.clip.format === "kanon-pose-keys" ? this.clip.duration : (this.poses!.length - 1) / this.clip.fps;
  }
  /** Poza u normaliziranom vremenu u ∈ [0, 1] (scroll ili vrijeme). Radi i unatrag. */
  sample(u: number): Pose {
    u = Math.min(1, Math.max(0, u));
    if (this.clip.format === "kanon-parts-frames") {
      const f = u * (this.poses!.length - 1);
      const i = Math.floor(f);
      return i >= this.poses!.length - 1 ? this.poses![this.poses!.length - 1] : blendPose(this.poses![i], this.poses![i + 1], f - i);
    }
    const { keys } = this.clip;
    const ease = EASE[this.clip.ease ?? "smooth"];
    const pose = (k: { pose: PoseName | Pose }) => (typeof k.pose === "string" ? getPose(k.pose) : k.pose);
    if (u <= keys[0].t) return pose(keys[0]);
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (u <= b.t) return blendPose(pose(a), pose(b), ease(b.t === a.t ? 1 : (u - a.t) / (b.t - a.t)));
    }
    return pose(keys[keys.length - 1]);
  }
}
