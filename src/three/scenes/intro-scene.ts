import * as THREE from "three";
import type { Engine, StageScene } from "../core/engine";
import type { Tier } from "../core/post";
import { lensCamera, depthOfField } from "../core/camera";
import { Theatre } from "./theatre";
import { Figure } from "../figure/figure";
import { smootherstep, applySecondary } from "@/src/motion/animator";
import { getPose, type PoseName } from "@/src/motion/library";
import { blendPose, partMap, type Pose, type Part, type LathePart, type Vec3 } from "@/src/figure/kanon";
import { reachTo } from "@/src/motion/look";
import { configurePCSSSpot } from "../core/pcss";

/**
 * Kazališni uvod (07 Otvaranje + Odluka 7. 10.; 11 F4), kadrovi 2 i 6–10 u 3D-u:
 *  2  "boundaries disappear." preko drvene lutke u protusvjetlu koja izvodi baletni pokret (vrijeme)
 *  6  reflektor udari odozgo: lutka u smokingu (scroll)
 *  7  dirigent se okrene orkestru, polako podigne ruke i palicu; tišina
 *  8  hladno svjetlo red po red hvata robote s instrumentima
 *  9  palica padne na prvi takt, orkestar svira; tri takta 4/4, kimanje na prvi udarac
 * 10  orkestar spusti instrumente, dirigent se okrene gledatelju i nakloni
 * Scroll vodi napredak p ∈ [0, 1] (radi i unatrag); kadrovi 1, 3, 4 i 5 su HTML/SVG (components/intro).
 */
export const INTRO_FRAMES = {
  reveal: [0.2, 0.3], // 6
  raise: [0.3, 0.46], // 7
  rows: [0.46, 0.6], // 8
  play: [0.6, 0.86], // 9
  bow: [0.86, 1.0], // 10
} as const;

const seg = (p: number, [a, b]: readonly [number, number]) => Math.min(1, Math.max(0, (p - a) / (b - a)));

type CamKey = { p: number; pos: [number, number, number]; target: [number, number, number]; mm: number };
// kamera kao film: polagani, glatki pokreti; objektivi u mm
const CAM: CamKey[] = [
  { p: 0.0, pos: [-1.05, 1.3, 7.4], target: [-1.0, 0.92, 0.4], mm: 50 }, // 2: plesačica u protusvjetlu u desnoj trećini, tekst lijevo (desktop; portret: sredina)
  { p: 0.2, pos: [-2.6, 1.75, 5.6], target: [0.2, 1.15, 0.2], mm: 32 }, // 6: reflektor udari — 3/4 odozgo i široko: stožac, lokva svjetla, sjena
  { p: 0.3, pos: [-1.3, 1.35, 4.7], target: [0.0, 1.45, 0.3], mm: 45 }, // 6→7: prilaz dok se dirigent okreće orkestru
  { p: 0.46, pos: [1.7, 1.55, 4.3], target: [-0.2, 1.55, -1.0], mm: 50 }, // 7: iza dirigenta — ruke se dižu, palica gore; tišina
  { p: 0.6, pos: [2.7, 2.1, 5.7], target: [-0.4, 1.3, -2.4], mm: 40 }, // 8: široko preko ramena — redovi orkestra se pale
  { p: 0.86, pos: [3.1, 1.55, 2.5], target: [-0.6, 1.5, -0.9], mm: 50 }, // 9: sa strane — takt 4/4, palica i zapešće vidljivi
  { p: 1.0, pos: [2.3, 1.3, 5.0], target: [0.0, 1.15, 0.4], mm: 50 }, // 10: naklon prema gledatelju (3/4, da se pregib vidi)
];

export class IntroScene implements StageScene {
  scene = new THREE.Scene();
  camera = lensCamera(50);
  theatre = new Theatre();
  dancer: Figure;
  private backlight: THREE.SpotLight;
  private engine: Engine | null = null;
  /** napredak scroll dijela uvoda (kadrovi 4–10) */
  progress = 0;
  private smoothP = 0;
  /** kadar 2 (vrijeme): 0..1 vidljivost plesačice u protusvjetlu */
  dancerLevel = 0;
  /** kadar 2 (vrijeme): 0..1 faza port de bras → poza slova I iz loga */
  dancerPhase = 0;
  private time = 0;
  private dir = new THREE.Vector3();
  private tmpPos = new THREE.Vector3();
  private tmpTarget = new THREE.Vector3();
  private conductorYaw = 0;

  constructor() {
    this.scene.background = new THREE.Color("#000000");
    this.scene.add(this.theatre.group);
    // plesačica (drvena lutka) za kadar 2: ista lutka, bez kostima, u protusvjetlu
    this.dancer = new Figure({ look: "wood" });
    this.dancer.group.position.set(0, 0, 0.4);
    this.scene.add(this.dancer.group);
    this.dancer.setPose(getPose("b_bas"));
    this.backlight = new THREE.SpotLight("#ffe2c4", 0, 0, THREE.MathUtils.degToRad(11), 0.55, 2);
    this.backlight.position.set(0, 3.6, -4.6);
    this.backlight.target.position.set(0, 1.4, 0.6);
    configurePCSSSpot(this.backlight, 0.3, 1024);
    this.scene.add(this.backlight, this.backlight.target);
    this.theatre.conductor.setPose(getPose("stoji"));
    this.apply(0);
  }

  /** Za compileAsync: sve skriveno privremeno vidljivo (inače se shaderi kompajliraju tek usred scrolla). */
  showAllForCompile() {
    const objs = [this.dancer.group, this.theatre.conductor.group, this.theatre.orchestra.group];
    const prev = objs.map((o) => o.visible);
    objs.forEach((o) => (o.visible = true));
    return () => objs.forEach((o, i) => (o.visible = prev[i]));
  }

  /** kontaktne sjene (redatelj ih jednom nacrta unaprijed da se njihovi shaderi prevedu prije scrolla) */
  get contactShadows() {
    return this.theatre.contact;
  }

  activate(engine: Engine) {
    this.engine = engine;
    this.scene.environment ??= this.theatre.environment(engine.renderer);
    this.theatre.conductor.viewCamera = this.camera;
    this.configurePost();
  }

  private configurePost() {
    if (!this.engine) return;
    this.engine.post.configure({
      exposure: 1.0,
      ao: { radius: 0.12, falloff: 0.6, intensity: 1.4 },
      volumetric: {
        lights: [
          ...this.theatre.volumetricLights().slice(0, 1),
          { light: this.backlight, density: 0.55, shadow: true },
          { light: this.theatre.rim, density: 0.4 },
          { light: this.theatre.rows[0], density: 0.18 },
        ],
        settings: { density: 0.09, ambientDensity: 0.0006, ambientColor: "#7d8088", heightFalloff: 0.1, floorY: 0, noiseScale: 0.32, noiseAmount: 0.6, g: 0.42, intensity: 1 },
      },
      dof: { focus: 5, range: 1.2, bokeh: 3 },
      bloom: { intensity: 0.3, threshold: 6.0, smoothing: 0.4, radius: 0.6 },
      vignette: { darkness: 0.66, offset: 0.22 },
      grain: 0.08,
    });
  }

  setTier(t: Tier) {
    const map = t === "high" ? 2048 : 1024;
    this.theatre.key.shadow.mapSize.set(map, map);
  }

  /** Stanje svjetala, poza i kamere za napredak p (deterministički: radi i unatrag). */
  private apply(p: number) {
    const T = this.theatre;
    const F = INTRO_FRAMES;
    const reveal = seg(p, F.reveal), raise = seg(p, F.raise), rows = seg(p, F.rows), play = seg(p, F.play), bow = seg(p, F.bow);
    // svjetla: reflektor "udari" (brzo, s malim treptajem), redovi orkestra jedan za drugim
    const hit = reveal < 0.02 ? 0 : Math.min(1, reveal * 4) * (reveal < 0.25 ? 0.82 + 0.18 * Math.abs(Math.sin(reveal * 60)) : 1);
    T.levels.key = hit;
    T.levels.rim = smootherstep(seg(p, [0.33, 0.44]));
    T.levels.rows = [0, 1, 2].map((i) => smootherstep(Math.min(1, Math.max(0, rows * 3 - i))) * (1 - bow * 0.6));
    T.levels.curtain = 0.25 * hit + 0.75 * smootherstep(rows);
    T.applyLevels();
    // plesačica (kadar 2) je vidljiva samo prije otkrivanja dirigenta
    const dancerOn = this.dancerLevel > 0.001 && reveal < 0.01;
    // mrak je mrak (kadrovi 1, 3–5): odrazi okruženja na podu i metalu te ambijentalni dim samo koliko svjetla gore
    const lit = Math.max(T.levels.key, T.levels.rim, ...T.levels.rows);
    this.scene.environmentIntensity = 0.85 * smootherstep(Math.min(1, lit)) + (dancerOn ? 0.05 * this.dancerLevel : 0);
    this.engine?.post.volumetric.setAmbientDensity(0.0006 * lit);
    this.dancer.group.visible = dancerOn;
    this.backlight.intensity = dancerOn ? 70 * this.dancerLevel : 0; // bez `visible` (vidi Theatre.applyLevels)
    if (dancerOn && !this.backlight.shadow.autoUpdate) this.backlight.shadow.needsUpdate = true;
    this.backlight.shadow.autoUpdate = dancerOn;
    this.theatre.conductor.group.visible = p >= F.reveal[0];
    // orkestar: drži instrumente od kadra 8, svira u kadru 9, spušta u kadru 10
    T.orchestra.group.visible = rows > 0.001;
    T.orchestra.playing = play > 0 && play < 1 ? Math.min(1, play * 6, (1 - play) * 8 + (bow > 0 ? 0 : 1)) : play >= 1 && bow < 0.2 ? 1 - bow * 5 : 0;
    T.orchestra.raised = 1 - smootherstep(Math.min(1, bow * 2.2));
    // dirigent: okret prema orkestru (kadar 7) i natrag prema gledatelju (kadar 10)
    const turnAway = smootherstep(seg(p, [0.3, 0.42]));
    const turnBack = smootherstep(seg(p, [0.88, 0.95]));
    this.conductorYaw = Math.PI * (turnAway - turnBack);
    T.conductor.group.rotation.y = this.conductorYaw;
    return { reveal, raise, rows, play, bow };
  }

  /**
   * Koreografija dirigenta (kadrovi 6–10), deterministički po napretku scrolla:
   * nastup (okrenut publici) → okret i priprema (ruke gore, palica visoko) → tišina dok se redovi pale →
   * palica padne na prvi takt, tri takta 4/4 (palica IK, slobodna ruka zrcalno i manje, kimanje na 1) →
   * ruke se spuste, okret prema publici, dubok naklon.
   */
  private conductorPose(s: { raise: number; play: number; bow: number }, t: number): Pose {
    let pose = blendPose(getPose("dirigent_nastup"), getPose("dirigent_priprema"), smootherstep(s.raise));
    if (s.play > 0 && s.play < 1 && s.bow === 0) {
      const beats = s.play * 12;
      const parts = this.theatre.conductor.parts;
      if (parts.length) {
        const w = Math.min(1, s.play * 14, (1 - s.play) * 10);
        reachTo(pose, parts, "L", beatPattern(beats, parts, 1), w);
        reachTo(pose, parts, "R", beatPattern(beats, parts, -1), w * 0.55);
        // kimanje glavom na prvi udarac takta, prsa prate
        const inBar = beats % 4;
        const nod = inBar < 1 ? Math.sin(Math.min(1, inBar / 0.4) * Math.PI) : 0;
        pose.head.pitch += nod * 8;
        pose.neck.pitch += nod * 3;
        pose.chest.pitch += nod * 2;
      }
    }
    if (s.bow > 0) {
      // kraj skladbe: ruke dolje dok se okreće prema publici, zatim naklon
      pose = blendPose(pose, getPose("dirigent_nastup"), smootherstep(Math.min(1, s.bow / 0.4)));
      pose = blendPose(pose, getPose("dirigent_naklon"), smootherstep(Math.min(1, Math.max(0, (s.bow - 0.42) / 0.5))));
    }
    // sekundarni pokret: disanje i blago prebacivanje težine (tišina u kadru 8 nije smrznuta)
    applySecondary(pose, t, { breath: 1, sway: s.play > 0 && s.play < 1 ? 0.15 : 0.35 });
    return pose;
  }

  /** Port de bras plesačice (kadar 2) po fazi 0..1; završava u pozi slova I iz loga. */
  private dancerPose(phase: number, t: number): Pose {
    const keys: Array<[number, PoseName]> = [[0, "b_bas"], [0.3, "b_seconde"], [0.66, "b_enhaut"], [1, "logo_i"]];
    let pose = getPose(keys[0][1]);
    for (let k = 0; k < keys.length - 1; k++) {
      const [a0, na] = keys[k], [b0, nb] = keys[k + 1];
      if (phase >= a0 && phase <= b0) {
        pose = blendPose(getPose(na), getPose(nb), smootherstep((phase - a0) / (b0 - a0)));
        break;
      }
    }
    applySecondary(pose, t, { breath: 1, sway: 0.3 });
    return pose;
  }

  /** render niza slika: napredak bez izglađivanja (deterministički kadar) */
  snap() {
    this.smoothP = this.progress;
  }

  update(dt: number) {
    this.time += dt;
    // napredak mekano sustiže scroll (bez trzaja), ali bez kašnjenja unatrag
    this.smoothP += (this.progress - this.smoothP) * Math.min(1, dt * 10);
    const p = this.smoothP;
    const s = this.apply(p);
    const C = this.theatre.conductor;
    if (C.group.visible) C.setPose(this.conductorPose(s, this.time));
    if (this.dancer.group.visible) this.dancer.setPose(this.dancerPose(this.dancerPhase, this.time));
    // orkestar u ritmu; udarac vezan uz scroll u kadru 9
    const beat = s.play > 0 && s.play < 1 ? (s.play * 12) % 4 : (this.time * 1.6) % 4;
    this.theatre.orchestra.update(this.time, beat);
    this.cameraAt(p);
    if (this.engine) {
      this.theatre.contact.update(this.engine.renderer, this.scene);
      this.theatre.dust.update(dt, this.camera, this.engine.height);
      // fokus na glavi lika u kadru (i u naklonu, kad glava ide naprijed i dolje)
      const fig = this.dancer.group.visible ? this.dancer : C;
      const head = fig.map.head as LathePart | undefined;
      const focus = head
        ? fig.toWorld(new THREE.Vector3(...head.S).addScaledVector(new THREE.Vector3(...head.M.y), head.L * 0.5))
        : this.tmpTarget.set(0, 1.5, 0.4);
      const dist = this.camera.position.distanceTo(focus);
      this.engine.post.dof.cocMaterial.focusDistance = dist;
      this.engine.post.dof.cocMaterial.focusRange = Math.max(0.4, depthOfField(this.camera.getFocalLength(), 2.0, dist).range);
    }
    return true;
  }

  private cameraAt(p: number) {
    let i = 0;
    while (i < CAM.length - 2 && CAM[i + 1].p < p) i++;
    const a = CAM[i], b = CAM[i + 1];
    const u = smootherstep(Math.min(1, Math.max(0, (p - a.p) / (b.p - a.p))));
    // portret: kadar 2 je okomit (plesačica u donjoj polovici, tekst iznad nje), bez bočnog pomaka prvog ključa
    const pa: [number, number, number] = this.camera.aspect < 0.8 && a.p === 0 ? [0, 1.75, 8.4] : a.pos;
    const ta: [number, number, number] = this.camera.aspect < 0.8 && a.p === 0 ? [0, 1.62, 0.4] : a.target;
    this.tmpPos.set(...pa).lerp(this.dir.set(...b.pos), u);
    this.tmpTarget.set(...ta).lerp(this.dir.set(...b.target), u);
    // portret (mobitel): uski kadar — cilj bliže dirigentu (ne izlazi iz ruba), kamera bliže, orkestar ostaje u pozadini
    if (this.camera.aspect < 0.8) {
      this.tmpTarget.x *= 0.3;
      this.tmpTarget.z = this.tmpTarget.z * 0.5 + 0.2;
      this.tmpPos.x *= 0.5;
      this.tmpPos.sub(this.tmpTarget).multiplyScalar(0.8).add(this.tmpTarget);
    }
    // vrlo blago "disanje" kamere (ručna kamera na stalku)
    this.tmpPos.y += Math.sin(this.time * 0.45) * 0.008;
    this.camera.position.copy(this.tmpPos);
    this.camera.lookAt(this.tmpTarget);
    const mm = a.mm + (b.mm - a.mm) * u;
    if (Math.abs(this.camera.getFocalLength() - mm) > 0.01) this.camera.setFocalLength(mm);
  }
}

/**
 * Dirigentski obrazac 4/4 (dolje–lijevo–desno–gore) za šaku s palicom, u prostoru lutke (jedinice glave).
 * Udarac (ictus) je oštar pad s malim odskokom; između udaraca glatki luk.
 */
export function beatPattern(beats: number, parts: Part[], side: 1 | -1 = 1): Vec3 {
  const P = partMap(parts);
  const chest = P.chest as LathePart;
  const C = new THREE.Vector3(...chest.S), X = new THREE.Vector3(...chest.M.x), Y = new THREE.Vector3(...chest.M.y), Z = new THREE.Vector3(...chest.M.z);
  // ishodište obrasca: ispred prsa, malo prema ruci koja ga crta (side 1 = ruka s palicom, −1 = slobodna, zrcalno)
  const origin = C.clone().addScaledVector(Y, 1.3).addScaledVector(Z, 1.95).addScaledVector(X, -0.38 * side);
  const beat = beats % 4;
  const k = Math.floor(beat), f = beat - k;
  // točke udaraca u okviru prsa: 1 dolje, 2 prema unutra, 3 van, 4 gore (širok, čitljiv obrazac)
  const A = 1.4;
  const pts: Array<[number, number]> = [
    [0.0, -0.55],
    [0.55, -0.35],
    [-0.65, -0.35],
    [-0.1, 0.38],
  ];
  const a = pts[k], b = pts[(k + 1) % 4];
  // put: glatki luk s odskokom nakon udarca (ictus)
  const e = f * f * (3 - 2 * f);
  const bounce = Math.sin(Math.min(1, f / 0.35) * Math.PI) * 0.24 * (1 - f);
  const x = (a[0] + (b[0] - a[0]) * e) * A * side;
  const y = (a[1] + (b[1] - a[1]) * e + bounce) * A;
  const p = origin.clone().addScaledVector(X, x).addScaledVector(Y, y);
  return [p.x, p.y, p.z];
}
