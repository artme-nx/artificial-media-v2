import * as THREE from "three";
import type { Engine, StageScene } from "../core/engine";
import type { Tier } from "../core/post";
import { lensCamera, depthOfField } from "../core/camera";
import { buildEnvironment } from "../core/env";
import { configurePCSSSpot } from "../core/pcss";
import { ContactShadows, enableContact } from "../core/contact-shadows";
import { DustMotes } from "../core/dust";
import { Figure } from "../figure/figure";
import { extendMaterial } from "../materials/extend";
import { smootherstep, applySecondary } from "@/src/motion/animator";
import { getPose, type PoseName } from "@/src/motion/library";
import { blendPose, type Pose, type LathePart } from "@/src/figure/kanon";

/**
 * Manifest (11 §4 red 3, F5; 07 6. 10.): baletna scena na svijetloj pozornici u dimu.
 * Scroll p ∈ [0, 1] (radi i unatrag):
 *  - kamera počinje iznad lutke i blizu (glava, rame, ruka zaobljena iznad glave), iza njih protusvjetlo kroz dim;
 *  - spušta se i odmiče, uz lagano kruženje ~50° (07 [PRETPOSTAVKA], prekidač ?kruzenje=0|1);
 *  - port de bras: en haut → à la seconde → bras bas → dubok révérence (ispravak Probe 1: naklon, ne korak natrag);
 *  - kraj: cijela lutka, manja u kadru, u krugu gornjeg reflektora u dimu.
 */
const POSES: Array<[number, PoseName]> = [
  [0, "b_enhaut_s"],
  [0.12, "b_enhaut_s"],
  [0.36, "b_seconde_s"],
  [0.54, "b_bas_s"],
  [0.66, "b_reverence_pocetak"], // plié, trup kreće, glava još gore
  [0.76, "b_reverence_duboka"], // dno naklona (glava zadnja)
  [0.86, "b_reverence_duboka"], // vrh naklona se zadrži
  [0.96, "b_zavrsna"], // kraj: lutka stoji u krugu svjetla
  [1, "b_zavrsna"],
];

/** Kamera u cilindričnim koordinatama oko lutke (lutka gleda prema +z): kut (°), udaljenost, visina, cilj, objektiv. */
type BalletCam = { p: number; az: number; dist: number; h: number; tx: number; ty: number; tz: number; mm: number };
const CAM: BalletCam[] = [
  { p: 0.0, az: -6, dist: 1.15, h: 2.42, tx: -0.2, ty: 1.55, tz: -0.35, mm: 50 }, // iznad i blizu (gleda odozgo): glava, rame, ruka en haut
  { p: 0.32, az: 10, dist: 2.3, h: 1.98, tx: -0.3, ty: 1.38, tz: -0.15, mm: 45 }, // spušta se, port de bras
  { p: 0.62, az: 22, dist: 4.0, h: 1.62, tx: 0, ty: 0.98, tz: 0, mm: 40 }, // odmiče se, bras bas (cijela lutka)
  { p: 0.82, az: 40, dist: 4.6, h: 1.55, tx: 0, ty: 0.85, tz: 0, mm: 40 }, // révérence iz 3/4, malo odozgo
  { p: 1.0, az: 36, dist: 7.2, h: 2.6, tx: 0, ty: 0.9, tz: 0, mm: 35 }, // kraj: visoko i široko — lutka sama u krugu svjetla, snopovi kroz dim
];

function floorMaterial() {
  const m = new THREE.MeshPhysicalMaterial({ color: "#bfb7aa", roughness: 0.78, metalness: 0, clearcoat: 0.15, clearcoatRoughness: 0.5, envMapIntensity: 0.6 });
  return extendMaterial(m, {
    key: "ballet-floor",
    hooks: {
      color_fragment: /* glsl */ `
        {
          // svijetle daske pozornice, blago istrošene (proceduralno)
          vec3 p = vWorldPos;
          float plank = abs( fract( p.x * 3.2 ) - 0.5 );
          float seam = 1.0 - smoothstep( 0.475, 0.5, plank );
          float wear = fbm3( vec3( p.x * 0.5, 0.0, p.z * 0.5 ) );
          diffuseColor.rgb *= ( 0.94 + 0.08 * wear ) * ( 1.0 - ( 1.0 - seam ) * 0.18 );
        }
      `,
    },
  });
}

/** Cyclorama: zakrivljena svijetla pozadina (pod prelazi u zid bez kuta), mekani gradijent. */
function cycloramaGeometry() {
  const shape: THREE.Vector2[] = [];
  const R = 2.2;
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * (Math.PI / 2);
    shape.push(new THREE.Vector2(-R + Math.sin(a) * R, R - Math.cos(a) * R));
  }
  shape.push(new THREE.Vector2(0, 12));
  // izvuci u širinu (x): profil u ravnini (z, y)
  const g = new THREE.BufferGeometry();
  const W = 30, nx = 8;
  const pos: number[] = [], idx: number[] = [];
  for (let j = 0; j < shape.length; j++)
    for (let i = 0; i <= nx; i++) pos.push(-W / 2 + (W * i) / nx, shape[j].y, shape[j].x);
  for (let j = 0; j < shape.length - 1; j++)
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b = a + nx + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export class BalletScene implements StageScene {
  scene = new THREE.Scene();
  camera = lensCamera(50);
  figure: Figure;
  back: THREE.SpotLight;
  key: THREE.SpotLight;
  top: THREE.SpotLight;
  /** dva visoka snopa u pozadini (koncertni dim): vidljivi stupovi svjetla iza lutke */
  beams: THREE.SpotLight[] = [];
  contact = new ContactShadows({ width: 3, depth: 3, far: 1.2, blur: 2.2, opacity: 0.85, darkness: 1.9 });
  dust: DustMotes;
  /** napredak scrolla kroz manifest */
  progress = 0;
  /** kruženje kamere (07 [PRETPOSTAVKA]) */
  orbit = true;
  private smoothP = 0;
  private time = 0;
  private engine: Engine | null = null;
  private v = new THREE.Vector3();
  private t = new THREE.Vector3();

  constructor() {
    // svijetla, ali ne bijela pozornica: topla siva u kojoj se vidi sjaj protusvjetla i snop kroz dim
    // topla svijetlosiva pozornica (07: svijetla pozadina s dimom)
    this.scene.background = new THREE.Color("#c3bbae");
    this.scene.fog = new THREE.Fog("#c3bbae", 8, 24);
    // pod i cyclorama (svijetla pozornica)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMaterial());
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    const cyc = new THREE.Mesh(cycloramaGeometry(), new THREE.MeshStandardMaterial({ color: "#bdb5a8", roughness: 0.95 }));
    cyc.position.z = -7;
    cyc.receiveShadow = true;
    this.scene.add(cyc);
    this.scene.add(this.contact.group);

    // lutka (drvo, bez kostima)
    this.figure = new Figure({ look: "wood" });
    this.scene.add(this.figure.group);
    enableContact(this.figure.group);
    this.figure.setPose(getPose("b_enhaut"));

    // topli ključ odozgo-sprijeda (kao u kazalištu): stožac kroz dim, prava sjena lutke na podu
    this.key = new THREE.SpotLight("#ffe6cc", 220, 0, THREE.MathUtils.degToRad(15), 0.6, 2);
    this.key.position.set(0.9, 6.6, 2.4);
    this.key.target.position.set(0, 1.0, 0);
    configurePCSSSpot(this.key, 0.9, 2048);
    // hladni rub straga-desno (silueta)
    this.back = new THREE.SpotLight("#e3ebff", 160, 0, THREE.MathUtils.degToRad(14), 0.6, 2);
    this.back.position.set(2.2, 5.0, -3.6);
    this.back.target.position.set(0, 1.3, 0);
    // gornji reflektor: pali se pri kraju (mekani krug svjetla oko lutke)
    this.top = new THREE.SpotLight("#fff4e6", 0, 0, THREE.MathUtils.degToRad(12.5), 0.75, 2);
    this.top.position.set(0.15, 7.4, 0.3);
    this.top.target.position.set(0, 0, 0);
    configurePCSSSpot(this.top, 0.35, 2048);
    // dva visoka snopa u pozadini: padaju na zid (stupovi svjetla kroz dim), ne prave dodatne krugove na podu
    for (const [x, z, tx] of [[-2.8, -4.0, -1.9], [3.0, -4.4, 2.2]]) {
      const b = new THREE.SpotLight("#fff8ef", 110, 0, THREE.MathUtils.degToRad(7), 0.9, 2);
      b.position.set(x, 8.6, z);
      b.target.position.set(tx, 0, z - 1.6);
      this.beams.push(b);
    }
    // pozadinski snopovi ostaju samo kao meki sjaj na zidu (bez krugova na podu i bez vlastitog dima)
    for (const b of this.beams) b.intensity = 0;
    for (const L of [this.back, this.key, this.top, ...this.beams]) this.scene.add(L, L.target);
    this.scene.add(new THREE.HemisphereLight("#fffaf2", "#a8a093", 0.22));

    this.dust = new DustMotes({ count: 700, box: new THREE.Box3(new THREE.Vector3(-2, 0.2, -3), new THREE.Vector3(2, 4.5, 1.6)), size: 0.006 });
    this.dust.setLights([this.key, this.top]);
    this.dust.uniforms.gain.value = 0.6;
    this.scene.add(this.dust.points);
  }

  showAllForCompile() {
    const prev = this.top.intensity;
    this.top.intensity = 1;
    return () => (this.top.intensity = prev);
  }

  /** Okruženje (odrazi) — gradi se jednom; redatelj ga zove i prije kompajliranja shadera. */
  prepareEnvironment(renderer: THREE.WebGLRenderer) {
    this.scene.environment ??= buildEnvironment(renderer, {
      top: "#f4efe6",
      horizon: "#e6e0d5",
      bottom: "#b9b2a6",
      boxes: [
        { dir: [-0.6, 0.7, 0.6], size: [10, 8], intensity: 3.2, color: "#fffaf2", softness: 0.7 },
        { dir: [0.2, 0.4, -1], size: [12, 8], intensity: 2.4, color: "#fff4e6", softness: 0.8 },
        { dir: [0.8, 0.3, 0.4], size: [6, 10], intensity: 1.2, color: "#ffffff", softness: 0.8 },
      ],
    });
  }

  activate(engine: Engine) {
    this.engine = engine;
    this.prepareEnvironment(engine.renderer);
    this.scene.environmentIntensity = 0.6;
    this.figure.viewCamera = this.camera;
    engine.post.configure({
      exposure: 1.05,
      ao: { radius: 0.1, falloff: 0.6, intensity: 1.3 },
      volumetric: {
        lights: [
          // svijetla pozornica: snop se u dimu vidi tek s jačim raspršenjem (scale djeluje samo na dim, ne na površine)
          // na svijetloj pozadini stožac se vidi tek s jakim raspršenjem (scale djeluje samo na dim)
          { light: this.key, density: 1.4, shadow: true, scale: 5.5, tint: "#ffd9b3" },
          { light: this.top, density: 1.4, shadow: true, scale: 5 },
        ],
        settings: { density: 0.08, ambientDensity: 0.0009, ambientColor: "#efe8dc", heightFalloff: 0.15, floorY: 0, noiseScale: 0.28, noiseAmount: 0.7, g: 0.5, intensity: 1 },
      },
      dof: { focus: 2, range: 1.2, bokeh: 3 },
      bloom: { intensity: 0.2, threshold: 9, smoothing: 0.4, radius: 0.6 },
      vignette: { darkness: 0.32, offset: 0.3 },
      grain: 0.05,
    });
  }

  setTier(t: Tier) {
    const map = t === "high" ? 2048 : 1024;
    this.key.shadow.mapSize.set(map, map);
    this.top.shadow.mapSize.set(map, map);
  }

  private pose(p: number, t: number): Pose {
    let pose = getPose(POSES[0][1]);
    for (let k = 0; k < POSES.length - 1; k++) {
      const [a, na] = POSES[k], [b, nb] = POSES[k + 1];
      if (p >= a && p <= b) {
        pose = b === a ? getPose(na) : blendPose(getPose(na), getPose(nb), smootherstep((p - a) / (b - a)));
        break;
      }
    }
    applySecondary(pose, t, { breath: 1, sway: 0.3 });
    return pose;
  }

  private cameraAt(p: number) {
    let i = 0;
    while (i < CAM.length - 2 && CAM[i + 1].p < p) i++;
    const a = CAM[i], b = CAM[i + 1];
    const u = smootherstep(Math.min(1, Math.max(0, (p - a.p) / (b.p - a.p))));
    const L = (x: number, y: number) => x + (y - x) * u;
    // bez kruženja kut ostaje na sredini puta (lutka iz istog 3/4 kuta)
    const az = THREE.MathUtils.degToRad(this.orbit ? L(a.az, b.az) : 26);
    // portret (mobitel): malo dalje i cilj više — lutka niže u kadru, tekst manifesta iznad i ispod nje
    const port = this.camera.aspect < 0.8;
    const dist = L(a.dist, b.dist) * (port ? 1.18 : 1), h = L(a.h, b.h) + (port ? 0.12 : 0);
    this.v.set(Math.sin(az) * dist, h + Math.sin(this.time * 0.4) * 0.006, Math.cos(az) * dist);
    this.t.set(port ? 0 : L(a.tx, b.tx), L(a.ty, b.ty) + (port ? 0.32 : 0), L(a.tz, b.tz));
    this.camera.position.copy(this.v);
    this.camera.lookAt(this.t);
    const mm = L(a.mm, b.mm);
    if (Math.abs(this.camera.getFocalLength() - mm) > 0.01) this.camera.setFocalLength(mm);
  }

  update(dt: number) {
    this.time += dt;
    this.smoothP += (this.progress - this.smoothP) * Math.min(1, dt * 10);
    const p = this.smoothP;
    this.figure.setPose(this.pose(p, this.time));
    // svjetla: protusvjetlo cijelo vrijeme; gornji reflektor se pali pri kraju (krug svjetla), protusvjetlo se malo povuče
    const topOn = smootherstep(Math.min(1, Math.max(0, (p - 0.7) / 0.22)));
    this.top.intensity = 260 * topOn;
    if (topOn > 0.001 && !this.top.shadow.autoUpdate) this.top.shadow.needsUpdate = true;
    this.top.shadow.autoUpdate = topOn > 0.001;
    this.back.intensity = 160;
    this.key.intensity = 220 * (1 - 0.5 * topOn);
    // krug gornjeg reflektora centriran na lutku (zdjelica), ne na ishodište
    const pel = this.figure.map.pelvis as LathePart | undefined;
    if (pel) {
      const c = this.figure.toWorld(new THREE.Vector3(...pel.S));
      this.top.target.position.set(c.x, 0, c.z);
      this.top.position.set(c.x + 0.15, 7.4, c.z + 0.3);
    }
    this.cameraAt(p);
    if (this.engine) {
      this.contact.update(this.engine.renderer, this.scene);
      this.dust.update(dt, this.camera, this.engine.height);
      const head = this.figure.map.head as LathePart | undefined;
      const focus = head ? this.figure.toWorld(new THREE.Vector3(...head.S).addScaledVector(new THREE.Vector3(...head.M.y), head.L * 0.5)) : this.t;
      const dist = this.camera.position.distanceTo(focus);
      this.engine.post.dof.cocMaterial.focusDistance = dist;
      this.engine.post.dof.cocMaterial.focusRange = Math.max(0.35, depthOfField(this.camera.getFocalLength(), 2.4, dist).range);
    }
    return true;
  }
}
