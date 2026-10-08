import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Engine, StageScene } from "../core/engine";
import type { Tier } from "../core/post";
import { lensCamera, depthOfField } from "../core/camera";
import { buildEnvironment } from "../core/env";
import { configurePCSSSpot } from "../core/pcss";
import { ContactShadows, enableContact } from "../core/contact-shadows";
import { Figure, UNIT, type Look, type Waist } from "../figure/figure";
import { PoseAnimator } from "@/src/motion/animator";
import { getPose, type PoseName } from "@/src/motion/library";
import { HeadLook, reachTo } from "@/src/motion/look";
import type { Vec3 } from "@/src/figure/kanon";

/**
 * /lab/lutka (F2): lutka u studijskom svjetlu, okretanje mišem, izbor poze, struk A/B, drvo/robot.
 * Studio: tamna topla cyclorama, veliki softbox (PCSS), dva rim svjetla straga, mekana ispuna, kontaktna sjena.
 */
export type LabCam = "cijela" | "blizu" | "glava" | "sake" | "zglob" | "stopala" | "struk";

// kadrovi: cilj je dio lutke (iz rasporeda kanona), kamera je pomaknuta od cilja (m) — objektiv u mm
const CAMS: Record<LabCam, { mm: number; part: string; t?: number; offset: [number, number, number]; fStop: number; aim?: [number, number, number]; fit?: boolean }> = {
  cijela: { mm: 50, part: "pelvis", t: 0.6, offset: [1.25, 0.2, 5.0], fStop: 5.6, fit: true },
  // hero: 3/4 rakurs (~32°), glava na gornjoj trećini i lijevo od sredine, fokus na prstenu vrata
  blizu: { mm: 85, part: "neck", t: 0.5, offset: [1.78, 0.1, 2.25], fStop: 2.8, aim: [0.11, -0.02, 0] },
  glava: { mm: 100, part: "head", t: 0.45, offset: [0.55, 0.05, 1.25], fStop: 2.8 },
  sake: { mm: 100, part: "handR", t: 0.55, offset: [0.75, 0.05, 1.05], fStop: 5.6 },
  zglob: { mm: 100, part: "shoulderR", offset: [0.75, 0.12, 0.55], fStop: 4 },
  stopala: { mm: 85, part: "ankleR", offset: [0.6, 0.35, 1.3], fStop: 5.6 },
  struk: { mm: 85, part: "waist", offset: [0.95, 0.12, 1.25], fStop: 4 },
};

export class LabScene implements StageScene {
  scene = new THREE.Scene();
  camera = lensCamera(85);
  figure: Figure;
  animator: PoseAnimator;
  controls: OrbitControls | null = null;
  private key: THREE.SpotLight;
  private rimL: THREE.SpotLight;
  private rimR: THREE.SpotLight;
  private fill: THREE.SpotLight;
  private contact = new ContactShadows({ width: 3.2, depth: 3.2, far: 0.6, blur: 1.4, opacity: 0.95, darkness: 2.4 });
  private engine: Engine | null = null;
  private camName: LabCam = "blizu";
  private focus = new THREE.Vector3(0, 1.5, 0);
  autoOrbit = false;
  /** točka oštrine (ne mora biti točka u koju kamera gleda) */
  focusPoint = new THREE.Vector3();
  private orbitT = 0;
  look = new HeadLook();
  reach: Vec3 | null = null; // IK: šaka L seže do točke (Shift + miš)
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2();

  constructor(private dom: HTMLElement, opts: { look?: Look; waist?: Waist; pose?: PoseName; cam?: LabCam; costume?: boolean } = {}) {
    this.scene.background = new THREE.Color("#0d0c0b");
    this.figure = new Figure({ look: opts.look ?? "wood", waist: opts.waist ?? "A", costume: !!opts.costume });
    if (opts.costume) this.figure.setBaton(true);
    this.figure.viewCamera = this.camera;
    this.scene.add(this.figure.group);
    enableContact(this.figure.group);
    const start = getPose(opts.pose ?? "kontrapost");
    this.animator = new PoseAnimator(start);
    this.figure.setPose(start);

    // cyclorama: pod koji se mekano savija u zid
    const cyc = new THREE.Mesh(
      cycloramaGeometry(14, 6, 7, 1.6),
      new THREE.MeshPhysicalMaterial({ color: "#56504a", roughness: 0.8, metalness: 0, clearcoat: 0.08, clearcoatRoughness: 0.6, side: THREE.DoubleSide }),
    );
    cyc.receiveShadow = true;
    this.scene.add(cyc);
    this.scene.add(this.contact.group);

    // svjetla (candela, fizikalne jedinice): bočni key kroz veliki softbox, dva rim svjetla straga,
    // slaba hladna ispuna i svjetlosni krug na pozadini iza lutke
    this.key = new THREE.SpotLight("#fff0e0", 30, 0, THREE.MathUtils.degToRad(22), 0.95, 2);
    this.key.position.set(-3.2, 3.6, 2.1);
    this.key.target.position.set(0, 1.25, 0);
    configurePCSSSpot(this.key, 1.1, 2048);
    this.rimL = new THREE.SpotLight("#dfe8ff", 42, 0, THREE.MathUtils.degToRad(14), 0.8, 2);
    this.rimL.position.set(-2.2, 3.4, -3.3);
    this.rimL.target.position.set(0.05, 1.45, 0);
    this.rimR = new THREE.SpotLight("#ffe9d6", 26, 0, THREE.MathUtils.degToRad(14), 0.8, 2);
    this.rimR.position.set(2.8, 2.5, -2.7);
    this.rimR.target.position.set(-0.05, 1.3, 0);
    this.fill = new THREE.SpotLight("#dfe6ff", 7, 0, THREE.MathUtils.degToRad(45), 1, 2);
    this.fill.position.set(3.4, 1.5, 3.3);
    this.fill.target.position.set(0, 1.2, 0);
    for (const l of [this.key, this.rimL, this.rimR, this.fill]) this.scene.add(l, l.target);
    const bg = new THREE.SpotLight("#ffcf9a", 140, 0, THREE.MathUtils.degToRad(20), 1, 2);
    bg.position.set(0.0, 3.4, 2.0);
    bg.target.position.set(0.0, 1.35, -3.2);
    this.scene.add(bg, bg.target);
    this.scene.add(new THREE.HemisphereLight("#2c2824", "#0b0a09", 0.25));

    this.setCam(opts.cam ?? "blizu", true);
  }

  activate(engine: Engine) {
    this.engine = engine;
    this.scene.environment = buildEnvironment(engine.renderer, {
      top: "#1a1918",
      horizon: "#24211e",
      bottom: "#070707",
      // fotografski studio: veliki softboxi i bijele "kartice" da čelik i u širokom kadru drži srednje sivu
      boxes: [
        { dir: [-0.6, 0.5, 0.62], size: [26, 18], intensity: 4.5, color: "#fff6ec", softness: 0.55 },
        { dir: [0.75, 0.12, 0.65], size: [20, 24], intensity: 2.4, color: "#eef2ff", softness: 0.7 },
        { dir: [-0.65, 0.3, -0.7], size: [7, 24], intensity: 4.0, color: "#eef3ff", softness: 0.4 },
        { dir: [0.7, 0.25, -0.65], size: [7, 24], intensity: 3.6, color: "#fff4ea", softness: 0.4 },
        { dir: [0, 1, 0.1], size: [26, 26], intensity: 2.2, color: "#fffaf3", softness: 0.85 },
        { dir: [0, -0.15, 1], size: [30, 9], intensity: 1.4, color: "#ffffff", softness: 0.85 },
        { dir: [0, -0.6, 0.4], size: [30, 14], intensity: 1.6, color: "#d9d3cc", softness: 0.9 },
        { dir: [0, -0.5, -0.8], size: [30, 12], intensity: 1.0, color: "#c9c3bb", softness: 0.9 },
      ],
    });
    this.scene.environmentIntensity = 1.0;
    this.controls = new OrbitControls(this.camera, this.dom);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 0.4;
    this.controls.maxDistance = 9;
    this.controls.maxPolarAngle = Math.PI * 0.53;
    this.controls.target.copy(this.focus);
    this.controls.addEventListener("change", () => engine.invalidate());
    this.dom.addEventListener("pointermove", this.onPointer);
    this.dom.addEventListener("pointerleave", () => (this.look.target = null));
    this.configurePost();
  }

  /** Kursor → točka u ravnini kroz glavu (okomito na kameru) → prostor lutke (jedinice glave). */
  private onPointer = (e: PointerEvent) => {
    const r = this.dom.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
    // lutka gleda gledatelja: točka na ravnini na pola puta do kamere, pomaknuta za položaj kursora
    const head = this.partPoint("head", 0.5);
    const toCam = this.camera.position.clone().sub(head);
    const n = toCam.clone().normalize();
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, head.clone().add(toCam.multiplyScalar(0.5)));
    const hit = new THREE.Vector3();
    if (!this.ray.ray.intersectPlane(plane, hit)) return;
    // pojačaj bočni pomak (kursor na rubu ekrana = granica ±35°)
    const off = hit.clone().sub(this.camera.position.clone().lerp(head, 0.5));
    hit.add(off.multiplyScalar(1.6));
    const local = this.figure.body.worldToLocal(hit.clone());
    this.look.target = [local.x, local.y, local.z];
    this.reach = e.shiftKey ? [local.x, local.y, local.z] : null;
  };

  private configurePost() {
    if (!this.engine) return;
    const c = CAMS[this.camName];
    const dist = this.camera.position.distanceTo(this.controls?.target ?? this.focus);
    const dof = depthOfField(c.mm, c.fStop, dist);
    this.engine.post.configure({
      exposure: 0.95,
      ao: { radius: 0.05, falloff: 0.4, intensity: 3.4 },
      // blagi studijski haze: stražnji topli rim svjetli kroz zrak iza lutke
      volumetric: {
        lights: [{ light: this.rimR, density: 1.0 }, { light: this.rimL, density: 0.7 }],
        settings: { density: 0.022, ambientDensity: 0.0, heightFalloff: 0.15, floorY: 0, noiseScale: 0.45, noiseAmount: 0.7, g: 0.45, intensity: 1 },
      },
      dof: { focus: dist, range: Math.max(0.05, dof.range), bokeh: 2.2 },
      bloom: { intensity: 0.18, threshold: 4.0, smoothing: 0.3, radius: 0.4 },
      vignette: { darkness: 0.5, offset: 0.3 },
      grain: 0.07,
    });
  }

  /** Točka dijela lutke u svijetu (m). */
  partPoint(name: string, t = 0.5) {
    const p = this.figure.map[name];
    const v = new THREE.Vector3();
    if (!p) return v.set(0, 1, 0);
    if (p.k === "ball") v.set(...p.c);
    else v.set(p.S[0] + p.M.y[0] * p.L * t, p.S[1] + p.M.y[1] * p.L * t, p.S[2] + p.M.y[2] * p.L * t);
    return this.figure.toWorld(v);
  }

  /** Obujam lutke (m) za trenutnu pozu. */
  bounds() {
    const box = new THREE.Box3();
    for (const p of this.figure.parts) {
      if (p.k === "ball") box.expandByPoint(this.figure.toWorld(new THREE.Vector3(...p.c)));
      else {
        box.expandByPoint(this.figure.toWorld(new THREE.Vector3(...p.S)));
        box.expandByPoint(this.figure.toWorld(new THREE.Vector3(p.S[0] + p.M.y[0] * p.L, p.S[1] + p.M.y[1] * p.L, p.S[2] + p.M.y[2] * p.L)));
      }
    }
    box.expandByScalar(0.06);
    box.min.y = 0;
    return box;
  }

  setCam(name: LabCam, immediate = false) {
    this.camName = name;
    const c = CAMS[name];
    this.camera.setFocalLength(c.mm);
    this.focus.copy(this.partPoint(c.part, c.t ?? 0.5));
    this.camera.position.copy(this.focus).add(new THREE.Vector3(...c.offset));
    if (c.fit) {
      // cijeli kadar: lutka zauzima ~78 % visine kadra, ispod stopala malo više zraka
      const b = this.bounds();
      const size = b.getSize(new THREE.Vector3()), center = b.getCenter(new THREE.Vector3());
      const vfov = THREE.MathUtils.degToRad(this.camera.fov);
      const dist = (size.y / 0.78) / (2 * Math.tan(vfov / 2));
      const dir = new THREE.Vector3(...c.offset).normalize();
      this.focus.set(center.x, center.y + size.y * 0.01, center.z);
      this.camera.position.copy(this.focus).add(dir.multiplyScalar(dist));
    }
    this.focusPoint = this.focus.clone();
    if (c.aim) this.focus.add(new THREE.Vector3(...c.aim));
    this.controls?.target.copy(this.focus);
    this.camera.lookAt(this.focus);
    this.camera.updateProjectionMatrix();
    this.configurePost();
    void immediate;
    this.engine?.invalidate();
  }

  setPose(name: PoseName, dur = 0.5) {
    this.animator.go(getPose(name), dur);
    this.engine?.invalidate();
  }
  setWaist(w: Waist) {
    this.figure.setWaist(w);
    this.engine?.invalidate();
  }

  setTier(t: Tier) {
    const map = t === "high" ? 2048 : 1024;
    for (const l of [this.key]) {
      l.shadow.mapSize.set(map, map);
      l.shadow.map?.dispose();
      (l.shadow as unknown as { map: null }).map = null;
    }
  }

  update(dt: number) {
    if (this.autoOrbit && this.controls) {
      this.orbitT += dt * 0.12;
      const r = Math.hypot(this.camera.position.x - this.controls.target.x, this.camera.position.z - this.controls.target.z);
      this.camera.position.x = this.controls.target.x + Math.sin(this.orbitT) * r;
      this.camera.position.z = this.controls.target.z + Math.cos(this.orbitT) * r;
    }
    this.controls?.update();
    const p = this.animator.update(dt);
    // pogled glave prati kursor (±35°, meko kašnjenje); IK šake na Shift
    this.look.update(this.figure.parts.length ? this.figure.parts : [], dt);
    this.look.apply(p);
    if (this.reach && this.figure.parts.length) reachTo(p, this.figure.parts, "L", this.reach, 1);
    this.figure.setPose(p);
    if (this.engine) this.contact.update(this.engine.renderer, this.scene);
    // fokus prati točku u koju kamera gleda
    if (this.controls && this.engine) {
      const dist = this.camera.position.distanceTo(this.focusPoint.lengthSq() > 0 ? this.focusPoint : this.controls.target);
      const c = CAMS[this.camName];
      this.engine.post.dof.cocMaterial.focusDistance = dist;
      this.engine.post.dof.cocMaterial.focusRange = Math.max(0.05, depthOfField(c.mm, c.fStop, dist).range);
    }
    return true; // disanje: lutka nikad nije sasvim mirna
  }

  deactivate() {
    this.dom.removeEventListener("pointermove", this.onPointer);
    this.controls?.dispose();
  }
}

/** Pod koji se zaobljeno savija u stražnji zid (studijska cyclorama). */
function cycloramaGeometry(width: number, depth: number, height: number, radius: number) {
  const prof: Array<[number, number]> = [];
  const N = 24;
  prof.push([depth, 0]);
  prof.push([-depth / 2 + radius, 0]);
  for (let i = 1; i <= N; i++) {
    const a = (i / N) * (Math.PI / 2);
    prof.push([-depth / 2 + radius - Math.sin(a) * radius, radius - Math.cos(a) * radius]);
  }
  prof.push([-depth / 2, height]);
  const g = new THREE.BufferGeometry();
  const pos: number[] = [], idx: number[] = [];
  const W = 2;
  prof.forEach(([z, y]) => {
    for (let k = 0; k < W; k++) pos.push((k / (W - 1) - 0.5) * width, y, z);
  });
  for (let i = 0; i < prof.length - 1; i++) {
    const a = i * W, b = (i + 1) * W;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  void UNIT;
  return g;
}
