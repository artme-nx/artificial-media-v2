import * as THREE from "three";
import type { Engine, StageScene } from "../core/engine";
import type { Tier } from "../core/post";
import { lensCamera } from "../core/camera";
import { buildEnvironment } from "../core/env";
import { configurePCSSSpot } from "../core/pcss";
import { ContactShadows, enableContact } from "../core/contact-shadows";
import { Figure } from "../figure/figure";
import { Spring, reachTo, HeadLook } from "@/src/motion/look";
import { smootherstep, applySecondary } from "@/src/motion/animator";
import { getPose } from "@/src/motion/library";
import { blendPose, type Pose, type LathePart, type BallPart, type Vec3 } from "@/src/figure/kanon";

/**
 * Drvo / robot ispod kursora (11 F6; 07 Ideje 7. 10.). Ista poza i isti kostur crtaju se u dva prolaza (drvo, hi-tech
 * robot) u svakom frameu — u piksel poravnati i dok se lutka miče — i spajaju mekom kružnom maskom oko kursora koja ga
 * prati s malim kašnjenjem (opruga). Isto svjetlo u oba prolaza, mijenja se samo materijal. Rub maske: mek, s tankim
 * preciznim prstenom (oznake kao na satu; prekidač ?prsten=0|1).
 * Interakcije: povlačenje šake ili glave namješta pozu (IK, tijelo prati), povlačenje praznog prostora okreće lutku
 * s inercijom; pušteno se mekano vraća. Mobitel: krug prati prst; bez dodira se sam polako kreće (?krug=oboje|prst|samo).
 */
type DragMode = "none" | "handL" | "handR" | "head" | "rotate";

const COMPOSITE_FRAG = /* glsl */ `
  uniform sampler2D tA;
  uniform sampler2D tB;
  uniform vec2 res;
  uniform vec2 center;
  uniform float radius;
  uniform float soft;
  uniform float ring;
  uniform float exposure;
  uniform float seed;
  uniform float navPx;
  varying vec2 vUv;
  // ACES (Narkowicz) + sRGB — isti filmski ton kao ostale scene
  vec3 aces( vec3 x ) { return clamp( ( x * ( 2.51 * x + 0.03 ) ) / ( x * ( 2.43 * x + 0.59 ) + 0.14 ), 0.0, 1.0 ); }
  vec3 toSRGB( vec3 c ) { return mix( c * 12.92, 1.055 * pow( c, vec3( 1.0 / 2.4 ) ) - 0.055, step( 0.0031308, c ) ); }
  float h12( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * 0.1031 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }
  void main() {
    vec2 px = vUv * res;
    vec2 dv = px - center;
    float d = length( dv );
    // uzak rub točno ispod prstena: svaka točka je drvo ili čelik (bez "mjedenog" pretapanja)
    float m = 1.0 - smoothstep( radius - soft, radius + soft * 0.2, d );
    vec3 a = texture2D( tA, vUv ).rgb;
    vec3 b = texture2D( tB, vUv ).rgb;
    vec3 c = mix( a, b, m );
    c = aces( c * exposure );
    // tanki precizni prsten na rubu maske + 60 oznaka kao na okretnom prstenu sata (kratke crte prema van)
    if ( ring > 0.0 && radius > 2.0 ) {
      float line = 1.0 - smoothstep( 0.35, 1.25, abs( d - radius ) );
      float ang = atan( dv.y, dv.x );
      float t = fract( ang / 6.2831853 * 60.0 );
      float tick = ( 1.0 - smoothstep( 0.04, 0.09, min( t, 1.0 - t ) ) ) * step( radius + 3.0, d ) * ( 1.0 - step( radius + 9.0, d ) );
      float major = step( 0.5, fract( ang / 6.2831853 * 12.0 + 0.5 / 12.0 * 0.0 ) ) * 0.0;
      float underNav = smoothstep( navPx * 0.85, navPx * 1.25, res.y - px.y );
      c = mix( c, vec3( 0.97, 0.96, 0.93 ), ring * underNav * ( line * 0.75 + tick * 0.45 + major ) );
    }
    c = toSRGB( c );
    // blaga vinjeta i jednobojno zrno
    vec2 q = vUv - 0.5;
    c *= 1.0 - dot( q, q ) * 0.42;
    float n = h12( floor( px ) + seed * 91.0 ) - 0.5;
    c += n * 0.018;
    gl_FragColor = vec4( c, 1.0 );
  }
`;

export class CursorScene implements StageScene {
  scene = new THREE.Scene();
  camera = lensCamera(40);
  wood: Figure;
  robot: Figure;
  contact = new ContactShadows({ width: 3, depth: 3, far: 1.2, blur: 1.8, opacity: 0.9, darkness: 1.9 });
  key: THREE.SpotLight;
  /** prekidači */
  ringOn = true;
  mobileMode: "oboje" | "prst" | "samo" = "oboje";
  coarse = false;
  // maska
  private mx = new Spring(0, 12);
  private my = new Spring(0, 12);
  private mr = new Spring(0, 7);
  pointer = { x: 0, y: 0, inside: false, down: false, touch: false, lastTouch: -10 };
  // interakcija
  private drag: DragMode = "none";
  private dragW = new Spring(0, 9);
  private dragTarget: Vec3 = [0, 0, 0];
  private dragSide: "L" | "R" = "L";
  private lastDragMode: DragMode = "none";
  private planeZ = 0;
  private yaw = 0;
  private yawVel = 0;
  private headLook = new HeadLook();
  private time = 0;
  private engine: Engine | null = null;
  private rtA: THREE.WebGLRenderTarget;
  private rtB: THREE.WebGLRenderTarget;
  private compScene = new THREE.Scene();
  private compCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private comp: THREE.ShaderMaterial;
  private v = new THREE.Vector3();
  private w = new THREE.Vector3();
  private size = new THREE.Vector2();

  constructor() {
    this.scene.background = new THREE.Color("#d8d1c5");
    // svijetli studio: pod i zakrivljena pozadina
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshPhysicalMaterial({ color: "#cfc8bb", roughness: 0.8, clearcoat: 0.1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 12, 64, 1, true, Math.PI * 0.6, Math.PI * 0.8), new THREE.MeshStandardMaterial({ color: "#d3ccbf", roughness: 0.95, side: THREE.BackSide }));
    wall.position.set(0, 6, 1.5);
    this.scene.add(wall, this.contact.group);
    this.scene.fog = new THREE.Fog("#d8d1c5", 9, 22);

    this.wood = new Figure({ look: "wood" });
    this.robot = new Figure({ look: "robot-hitech" });
    for (const f of [this.wood, this.robot]) {
      this.scene.add(f.group);
      f.viewCamera = this.camera;
    }
    enableContact(this.wood.group);
    const start = this.basePose(0);
    this.wood.setPose(start);
    this.robot.setPose(start);

    this.key = new THREE.SpotLight("#fff5ea", 190, 0, THREE.MathUtils.degToRad(24), 0.7, 2);
    this.key.position.set(-2.4, 5.2, 3.6);
    this.key.target.position.set(0, 1.0, 0);
    configurePCSSSpot(this.key, 1.0, 2048);
    const rim = new THREE.SpotLight("#eef2ff", 90, 0, THREE.MathUtils.degToRad(22), 0.8, 2);
    rim.position.set(2.6, 3.6, -3.4);
    rim.target.position.set(0, 1.2, 0);
    const fill = new THREE.HemisphereLight("#fffaf2", "#b9b0a2", 0.32);
    this.scene.add(this.key, this.key.target, rim, rim.target, fill);

    this.camera.position.set(0.35, 1.0, 4.9);
    this.camera.lookAt(0, 0.98, 0);

    const opts = { samples: 4, type: THREE.HalfFloatType, colorSpace: THREE.LinearSRGBColorSpace, depthBuffer: true } as const;
    this.rtA = new THREE.WebGLRenderTarget(4, 4, opts);
    this.rtB = new THREE.WebGLRenderTarget(4, 4, opts);
    this.comp = new THREE.ShaderMaterial({
      uniforms: {
        tA: { value: this.rtA.texture },
        tB: { value: this.rtB.texture },
        res: { value: new THREE.Vector2(1, 1) },
        center: { value: new THREE.Vector2(0, 0) },
        radius: { value: 0 },
        soft: { value: 24 },
        ring: { value: 1 },
        exposure: { value: 1.0 },
        seed: { value: 0 },
        navPx: { value: 0 },
      },
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }`,
      fragmentShader: COMPOSITE_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    const tri = new THREE.BufferGeometry();
    tri.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    tri.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    const q = new THREE.Mesh(tri, this.comp);
    q.frustumCulled = false;
    this.compScene.add(q);
  }

  /** lagani port de bras u petlji (9 s) + disanje — lutka se polagano miče i kad je nitko ne dira */
  private basePose(t: number): Pose {
    // port de bras (zaobljene ruke, meke šake) u petlji: bras bas → à la seconde → natrag, s prijenosom težine
    const k = 0.5 - 0.5 * Math.cos((t / 10) * Math.PI * 2);
    const p = blendPose(getPose("b_bas_s"), getPose("b_seconde_s"), smootherstep(k) * 0.9);
    // noge mirno na podu (stopala ravna): podignuto stopalo pokazivalo je donju plohu kao svijetlu mrlju
    const stand = getPose("mir");
    p.legL = stand.legL;
    p.legR = stand.legR;
    p.pelvis = stand.pelvis;
    p.support = stand.support;
    p.touch = stand.touch;
    applySecondary(p, t, { breath: 1, sway: 0.45 }); // manji njih: slobodno stopalo ne dira pod
    return p;
  }

  showAllForCompile() {
    const prev = [this.wood.group.visible, this.robot.group.visible];
    this.wood.group.visible = this.robot.group.visible = true;
    return () => {
      this.wood.group.visible = prev[0];
      this.robot.group.visible = prev[1];
    };
  }

  prepareEnvironment(renderer: THREE.WebGLRenderer) {
    this.scene.environment ??= buildEnvironment(renderer, {
      top: "#f2ede4",
      horizon: "#dcd5c9",
      bottom: "#8f877b",
      boxes: [
        { dir: [-0.6, 0.7, 0.6], size: [10, 8], intensity: 3.4, color: "#fffaf2", softness: 0.7 },
        { dir: [0.7, 0.4, -0.6], size: [6, 10], intensity: 2.4, color: "#f4f6ff", softness: 0.8 },
        { dir: [0.2, 0.1, 1], size: [14, 6], intensity: 1.2, color: "#ffffff", softness: 0.9 },
      ],
    });
  }

  activate(engine: Engine) {
    this.engine = engine;
    this.prepareEnvironment(engine.renderer);
    this.scene.environmentIntensity = 0.8;
  }

  setTier(t: Tier) {
    const map = t === "high" ? 2048 : 1024;
    this.key.shadow.mapSize.set(map, map);
    const s = t === "high" ? 4 : t === "medium" ? 2 : 0;
    this.rtA.samples = this.rtB.samples = s;
  }

  resize(w: number, h: number) {
    // portret (mobitel): kamera dalje i malo više — cijela lutka i ispružene šake unutar margina
    const port = w / Math.max(1, h) < 0.8;
    this.camera.position.set(port ? 0.25 : 0.35, port ? 1.1 : 1.0, port ? 8.3 : 4.9);
    this.camera.lookAt(0, port ? 0.95 : 0.98, 0);
    if (!this.engine) return;
    this.engine.renderer.getDrawingBufferSize(this.size);
    this.rtA.setSize(this.size.x, this.size.y);
    this.rtB.setSize(this.size.x, this.size.y);
    (this.comp.uniforms.res.value as THREE.Vector2).copy(this.size);
    void w;
    void h;
  }

  // ---------------------------------------------------------------- unos (redatelj prosljeđuje događaje sekcije)
  private screenOf(fig: Figure, name: string) {
    const part = fig.map[name] as LathePart | BallPart | undefined;
    if (!part) return null;
    const c = "c" in part ? new THREE.Vector3(...part.c) : new THREE.Vector3(...part.S).addScaledVector(new THREE.Vector3(...part.M.y), part.L * 0.5);
    const wp = fig.toWorld(c);
    const p = wp.clone().project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * window.innerWidth, y: (-p.y * 0.5 + 0.5) * window.innerHeight, world: wp };
  }

  /** središte maske u pikselima zaslona (za testove) */
  maskCenter() {
    const dpr = this.size.x / Math.max(1, window.innerWidth);
    return [this.mx.x / dpr, window.innerHeight - this.my.x / dpr, this.mr.x / dpr];
  }

  /** zaslonska točka dijela lutke (za testove: kursor na glavi, ramenu, koljenu) */
  partScreen(name: string) {
    const s = this.screenOf(this.wood, name);
    return s ? { x: s.x, y: s.y } : null;
  }

  pointerMove(x: number, y: number, inside: boolean, touch: boolean) {
    const P = this.pointer;
    const dx = x - P.x;
    P.x = x;
    P.y = y;
    P.inside = inside;
    P.touch = touch;
    if (touch) P.lastTouch = this.time;
    if (this.drag === "rotate") this.yawVel += dx * 0.012;
    if (this.drag === "handL" || this.drag === "handR" || this.drag === "head") this.dragTarget = this.planePoint(x, y);
    this.engine?.invalidate();
  }

  pointerDown(x: number, y: number, touch: boolean) {
    this.pointerMove(x, y, true, touch);
    this.pointer.down = true;
    // šaka ili glava blizu pokazivača → namještanje poze; inače okretanje
    const cands: Array<[DragMode, string]> = [["handL", "handL"], ["handR", "handR"], ["head", "head"]];
    let best: DragMode = "rotate";
    let bd = touch ? 70 : 52;
    for (const [mode, part] of cands) {
      const s = this.screenOf(this.wood, part);
      if (!s) continue;
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < bd) {
        bd = d;
        best = mode;
        this.planeZ = s.world.z;
      }
    }
    this.drag = best;
    this.lastDragMode = best;
    if (best === "handL" || best === "handR") this.dragSide = best === "handL" ? "L" : "R";
    if (best !== "rotate") this.dragTarget = this.planePoint(x, y);
  }

  pointerUp() {
    this.pointer.down = false;
    this.drag = "none";
  }

  /** zaslon → točka u prostoru lutke na ravnini kroz dio koji se vuče (okomito na kameru) */
  private planePoint(x: number, y: number): Vec3 {
    const nx = (x / window.innerWidth) * 2 - 1, ny = -(y / window.innerHeight) * 2 + 1;
    this.v.set(nx, ny, 0.5).unproject(this.camera);
    this.w.copy(this.v).sub(this.camera.position).normalize();
    const t = (this.planeZ - this.camera.position.z) / this.w.z;
    const p = this.camera.position.clone().addScaledVector(this.w, t);
    this.wood.body.updateWorldMatrix(true, false);
    const l = this.wood.body.worldToLocal(p);
    return [l.x, l.y, l.z];
  }

  update(dt: number) {
    this.time += dt;
    const P = this.pointer;
    // okretanje s inercijom; bez povlačenja se polako vraća prema publici
    if (this.drag !== "rotate") {
      this.yawVel *= Math.exp(-2.6 * dt);
      this.yawVel += -this.yaw * 0.9 * dt;
    }
    this.yaw += this.yawVel * dt;
    this.yaw = THREE.MathUtils.clamp(this.yaw, -2.6, 2.6);
    for (const f of [this.wood, this.robot]) f.group.rotation.y = this.yaw;

    // poza: petlja + namještanje (IK šake / pogled glave), pušteno se mekano vraća
    const pose = this.basePose(this.time);
    const dragging = this.drag !== "none" && this.drag !== "rotate";
    this.dragW.step(dragging ? 1 : 0, dt);
    if (this.dragW.x > 0.001 && this.wood.parts.length) {
      if (this.lastDragMode === "handL" || this.lastDragMode === "handR") reachTo(pose, this.wood.parts, this.dragSide, this.dragTarget, this.dragW.x);
    }
    this.headLook.target = this.lastDragMode === "head" && this.dragW.x > 0.01 ? [this.dragTarget[0], this.dragTarget[1], this.dragTarget[2] + 2] : null;
    if (this.wood.parts.length) this.headLook.update(this.wood.parts, dt);
    this.headLook.apply(pose);
    this.wood.setPose(pose);
    this.robot.setPose(pose);

    // maska: prati kursor (opruga); mobitel bez dodira: sama se kreće (Lissajous oko lutke)
    let tx = P.x, ty = P.y, show = P.inside;
    const idleTouch = this.coarse && this.time - P.lastTouch > 1.2;
    if (this.coarse && (this.mobileMode === "samo" || (this.mobileMode === "oboje" && idleTouch))) {
      const c = this.screenOf(this.wood, "chest");
      const cx = c?.x ?? window.innerWidth / 2, cy = c?.y ?? window.innerHeight / 2;
      tx = cx + Math.sin(this.time * 0.37) * window.innerWidth * 0.22;
      ty = cy + Math.sin(this.time * 0.53 + 1.1) * window.innerHeight * 0.2;
      show = true;
    }
    if (this.coarse && this.mobileMode === "prst" && idleTouch) show = false;
    const dpr = this.size.x / Math.max(1, window.innerWidth);
    this.mx.step(tx * dpr, dt);
    this.my.step((window.innerHeight - ty) * dpr, dt);
    const R = Math.min(window.innerHeight, window.innerWidth) * (this.coarse ? 0.26 : 0.2) * dpr;
    this.mr.step(show ? R : 0, dt);
    const u = this.comp.uniforms;
    (u.center.value as THREE.Vector2).set(this.mx.x, this.my.x);
    u.radius.value = Math.max(0, this.mr.x);
    u.soft.value = 4.5 * dpr;
    u.ring.value = this.ringOn ? Math.min(1, this.mr.x / (R * 0.6 + 1e-3)) : 0;
    u.navPx.value = 72 * dpr; // visina zaglavlja: prsten se ispod nje ne crta (ne prelazi preko navigacije)
    u.seed.value = (u.seed.value + 1.618) % 1000;

    if (this.engine) this.contact.update(this.engine.renderer, this.scene);
    return true;
  }

  render(engine: Engine) {
    const r = engine.renderer;
    if (this.rtA.width < 8) this.resize(engine.width, engine.height);
    // 1. drvo (sjena se računa jednom: obje lutke imaju isti oblik)
    this.robot.group.visible = false;
    this.wood.group.visible = true;
    r.shadowMap.autoUpdate = false;
    r.shadowMap.needsUpdate = true;
    r.setRenderTarget(this.rtA);
    r.render(this.scene, this.camera);
    // 2. robot (ista poza, isti kostur, isto svjetlo)
    this.robot.group.visible = true;
    this.wood.group.visible = false;
    r.setRenderTarget(this.rtB);
    r.render(this.scene, this.camera);
    this.wood.group.visible = true;
    r.shadowMap.autoUpdate = true;
    // 3. spoj kroz masku + ton, zrno, vinjeta
    r.setRenderTarget(null);
    r.render(this.compScene, this.compCam);
  }

  deactivate() {
    this.pointer.inside = false;
  }
}
