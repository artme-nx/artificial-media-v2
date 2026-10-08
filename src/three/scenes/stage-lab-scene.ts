import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Engine, StageScene } from "../core/engine";
import type { Tier } from "../core/post";
import { lensCamera, depthOfField } from "../core/camera";
import { Theatre } from "./theatre";
import { PoseAnimator } from "@/src/motion/animator";
import { getPose, type PoseName } from "@/src/motion/library";

/**
 * /lab/scena (F3): mirni kadar dirigenta s orkestrom — filmski still iz 10-lik §3 [SCENA].
 * ?cam=still|rear|front &okret=0|180 &pose=… &redovi=0..3 &svira=0|1
 */
export type StageCam = "still" | "rear" | "front" | "siroko" | "bok";
const CAMS: Record<StageCam, { mm: number; pos: [number, number, number]; target: [number, number, number]; fStop: number; focus?: [number, number, number] }> = {
  still: { mm: 50, pos: [-3.0, 1.05, 3.1], target: [0.6, 1.35, -1.2], fStop: 2.0, focus: [0, 1.45, 0.4] },
  rear: { mm: 50, pos: [1.6, 1.55, 5.6], target: [-0.1, 1.45, -1.5], fStop: 2.2, focus: [0, 1.45, 0.4] },
  front: { mm: 85, pos: [0.55, 1.55, 4.3], target: [0, 1.38, 0.4], fStop: 2.0 },
  bok: { mm: 85, pos: [4.6, 1.42, 2.2], target: [-0.4, 1.45, -0.9], fStop: 2.0, focus: [0, 1.5, 0.4] },
  siroko: { mm: 35, pos: [0, 2.2, 9.5], target: [0, 1.4, -2.5], fStop: 4, focus: [0, 1.45, 0.4] },
};

export class StageLabScene implements StageScene {
  scene = new THREE.Scene();
  camera = lensCamera(50);
  theatre = new Theatre();
  animator: PoseAnimator;
  controls: OrbitControls | null = null;
  private engine: Engine | null = null;
  private camName: StageCam;
  private focus = new THREE.Vector3();
  private t = 0;
  playing: boolean;

  constructor(private dom: HTMLElement, o: { cam?: StageCam; pose?: PoseName; yaw?: number; rows?: number; play?: boolean } = {}) {
    this.scene.background = new THREE.Color("#020202");
    this.scene.add(this.theatre.group);
    this.camName = o.cam ?? "still";
    const pose = getPose(o.pose ?? "dirigent_rad");
    this.animator = new PoseAnimator(pose);
    this.theatre.conductor.group.rotation.y = THREE.MathUtils.degToRad(o.yaw ?? 180);
    this.theatre.conductor.setPose(pose);
    const rows = o.rows ?? 3;
    this.theatre.levels.rows = [0, 1, 2].map((i) => (i < rows ? 1 : 0));
    this.theatre.applyLevels();
    this.playing = !!o.play;
    this.theatre.orchestra.playing = this.playing ? 1 : 0;
  }

  activate(engine: Engine) {
    this.engine = engine;
    this.scene.environment = this.theatre.environment(engine.renderer);
    this.scene.environmentIntensity = 0.7;
    this.theatre.conductor.viewCamera = this.camera;
    this.controls = new OrbitControls(this.camera, this.dom);
    this.controls.enableDamping = true;
    this.controls.addEventListener("change", () => engine.invalidate());
    this.setCam(this.camName);
  }

  setCam(name: StageCam) {
    this.camName = name;
    const c = CAMS[name];
    this.camera.setFocalLength(c.mm);
    this.camera.position.set(...c.pos);
    this.controls?.target.set(...c.target);
    this.camera.lookAt(...c.target);
    this.camera.updateProjectionMatrix();
    this.focus.set(...(c.focus ?? c.target));
    const dist = this.camera.position.distanceTo(this.focus);
    this.engine?.post.configure({
      exposure: 1.0,
      ao: { radius: 0.25, falloff: 0.6, intensity: 2.0 },
      volumetric: {
        lights: this.theatre.volumetricLights(),
        settings: { density: 0.09, ambientDensity: 0.002, ambientColor: "#8a96b0", heightFalloff: 0.1, floorY: 0, noiseScale: 0.32, noiseAmount: 0.9, g: 0.6, intensity: 1 },
      },
      dof: { focus: dist, range: Math.max(0.3, depthOfField(c.mm, c.fStop, dist).range), bokeh: 4.5 },
      bloom: { intensity: 0.35, threshold: 4.0, smoothing: 0.4, radius: 0.6 },
      vignette: { darkness: 0.62, offset: 0.24 },
      grain: 0.14,
    });
  }

  setTier(t: Tier) {
    const map = t === "high" ? 2048 : 1024;
    this.theatre.key.shadow.mapSize.set(map, map);
  }

  update(dt: number) {
    this.t += dt;
    this.controls?.update();
    const p = this.animator.update(dt);
    this.theatre.conductor.setPose(p);
    const beat = (this.t * 1.6) % 4;
    this.theatre.orchestra.update(this.t, beat);
    if (this.engine) {
      this.theatre.contact.update(this.engine.renderer, this.scene);
      this.theatre.dust.update(dt, this.camera, this.engine.height);
    }
    return true;
  }

  deactivate() {
    this.controls?.dispose();
  }
}
