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
 * ?cam=still|detalj|straga|bok|siroko|nisko &okret=° &pose=… &redovi=0..3 &svira=0|1; ručna kamera ?cpos=x,y,z&ctgt=…&cfoc=…&mm=&f=
 * still: dirigent okrenut prema kameri, orkestar iza njega izvan fokusa (kao kadar 10 uvoda i Blender rendere, ali kao filmski still).
 */
export type StageCam = "still" | "detalj" | "straga" | "bok" | "siroko" | "nisko" | "saka";
type CamSpec = { mm: number; pos: [number, number, number]; target: [number, number, number]; fStop: number; focus?: [number, number, number]; yaw?: number; pose?: PoseName; play?: boolean };
export const STAGE_CAMS: Record<StageCam, CamSpec> = {
  still: { mm: 40, pos: [0.8, 1.05, 5.8], target: [0, 1.18, 0.2], fStop: 2.0, focus: [0, 1.3, 0.4], yaw: 0, pose: "dirigent_poziv", play: true },
  detalj: { mm: 85, pos: [0.6, 1.62, 3.0], target: [0.05, 1.5, 0.4], fStop: 2.8, focus: [0, 1.5, 0.5], yaw: 0, pose: "dirigent_poziv", play: true },
  straga: { mm: 50, pos: [2.2, 1.25, 3.6], target: [-0.3, 1.5, -0.6], fStop: 2.0, focus: [0, 1.5, 0.4], yaw: 150, pose: "dirigent_rad", play: true },
  bok: { mm: 85, pos: [4.6, 1.42, 2.2], target: [-0.4, 1.45, -0.9], fStop: 2.0, focus: [0, 1.5, 0.4], yaw: 180, pose: "dirigent_rad", play: true },
  siroko: { mm: 35, pos: [-1.6, 2.6, 8.8], target: [0.2, 1.6, -1.2], fStop: 2.8, focus: [0, 1.45, 0.4], yaw: 180, pose: "dirigent_rad", play: true },
  nisko: { mm: 50, pos: [3.0, 1.05, 3.1], target: [-0.6, 1.35, -1.2], fStop: 2.0, focus: [0, 1.45, 0.4], yaw: 180, pose: "dirigent_rad", play: true },
  // šaka s palicom (krupno): položaj se računa iz šake lutke (pos/target su pomaci od šake)
  saka: { mm: 100, pos: [-1.15, 0.15, 0.35], target: [0, 0, 0], fStop: 2.8, yaw: 0, pose: "dirigent_poziv", play: true },
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

  custom: CamSpec | null = null;

  constructor(private dom: HTMLElement, o: { cam?: StageCam; pose?: PoseName; yaw?: number; rows?: number; play?: boolean; custom?: CamSpec } = {}) {
    this.custom = o.custom ?? null;
    this.scene.background = new THREE.Color("#020202");
    this.scene.add(this.theatre.group);
    this.camName = o.cam && o.cam in STAGE_CAMS ? o.cam : "still";
    const spec = this.custom ?? STAGE_CAMS[this.camName];
    const pose = getPose(o.pose ?? spec.pose ?? "dirigent_rad");
    this.animator = new PoseAnimator(pose);
    this.theatre.conductor.group.rotation.y = THREE.MathUtils.degToRad(o.yaw ?? spec.yaw ?? 180);
    this.theatre.conductor.setPose(pose);
    const rows = o.rows ?? 3;
    this.theatre.levels.rows = [0, 1, 2].map((i) => (i < rows ? 1 : 0));
    this.theatre.applyLevels();
    this.playing = o.play ?? spec.play ?? false;
    this.theatre.orchestra.playing = this.playing ? 1 : 0;
  }

  activate(engine: Engine) {
    this.engine = engine;
    this.scene.environment = this.theatre.environment(engine.renderer);
    this.scene.environmentIntensity = 0.85;
    this.theatre.conductor.viewCamera = this.camera;
    this.controls = new OrbitControls(this.camera, this.dom);
    this.controls.enableDamping = true;
    this.controls.addEventListener("change", () => engine.invalidate());
    this.setCam(this.camName);
  }

  setCam(name: StageCam) {
    this.camName = name;
    let c = this.custom ?? STAGE_CAMS[name];
    if (!this.custom && name === "saka") {
      // kamera prema šaci s palicom (desna ruka lutke = L u kanonu)
      this.theatre.conductor.setPose(this.animator.update(0));
      this.theatre.conductor.group.updateMatrixWorld(true);
      const h = this.theatre.conductor.toWorld(new THREE.Vector3(...(this.theatre.conductor.map.handL as { S: [number, number, number] }).S));
      const at = (o: [number, number, number]) => [h.x + o[0], h.y + o[1], h.z + o[2]] as [number, number, number];
      c = { ...c, pos: at(c.pos), target: at(c.target), focus: at(c.target) };
    }
    this.camera.setFocalLength(c.mm);
    this.camera.position.set(...c.pos);
    this.controls?.target.set(...c.target);
    this.camera.lookAt(...c.target);
    this.camera.updateProjectionMatrix();
    this.focus.set(...(c.focus ?? c.target));
    const dist = this.camera.position.distanceTo(this.focus);
    this.engine?.post.configure({
      exposure: 1.0,
      ao: { radius: 0.12, falloff: 0.6, intensity: 1.4 },
      volumetric: {
        lights: this.theatre.volumetricLights(),
        settings: { density: 0.09, ambientDensity: 0.0006, ambientColor: "#7d8088", heightFalloff: 0.1, floorY: 0, noiseScale: 0.32, noiseAmount: 0.9, g: 0.42, intensity: 1 },
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
