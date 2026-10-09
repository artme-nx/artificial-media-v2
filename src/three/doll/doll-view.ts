import * as THREE from "three";
import { Figure, UNIT } from "../figure/figure";
import { buildEnvironment } from "../core/env";
import { lensCamera } from "../core/camera";
import { HeadLook, Spring } from "@/src/motion/look";
import { PoseAnimator, applySecondary } from "@/src/motion/animator";
import { getPose, type PoseName } from "@/src/motion/library";
import { type LathePart, type Vec3 } from "@/src/figure/kanon";
import { isCalm } from "@/lib/calm";

/**
 * Mala lutka u sekcijama (11 §4: reelovi — gleda video koji se pušta; F7: usluge, CTA, podnožje).
 * Jedan mali prozirni canvas koji se seli u sidro sekcije na ekranu ([data-doll-anchor]); glavni canvas
 * ostaje za scene preko cijelog ekrana. Bez postprocessinga (MSAA platna, ACES), meka sjena je oval na podu.
 */
export type DollMode = "reels" | "service" | "cta" | "footer";

function shadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grd.addColorStop(0, "rgba(20,16,12,0.55)");
  grd.addColorStop(0.5, "rgba(20,16,12,0.22)");
  grd.addColorStop(1, "rgba(20,16,12,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class DollView {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = lensCamera(50, 0.6);
  figure: Figure;
  look = new HeadLook();
  bodyYaw = new Spring(0, 4);
  animator: PoseAnimator;
  mode: DollMode = "reels";
  /** cilj pogleda u pikselima zaslona (null = gleda naprijed); izvor se pita svaki frame (npr. aktivni reel) */
  targetPx: { x: number; y: number } | null = null;
  lookSource: (() => { x: number; y: number } | null) | null = null;
  reduced: boolean;
  private raf = 0;
  private last = 0;
  private t = 0;
  private running = false;
  private v = new THREE.Vector3();
  private w = new THREE.Vector3();
  /** shaderi prevedeni (paralelno, KHR_parallel_shader_compile); do tada se ne crta — prvo crtanje bi ih prevodilo
   *  sinkrono (~70 ms trzaja usred scrolla, izmjereno scripts/perf-scroll.mjs) */
  ready: Promise<void>;
  private isReady = false;
  private skip = false;

  constructor(public canvas: HTMLCanvasElement) {
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.setClearColor(0x000000, 0);
    this.scene.environment = buildEnvironment(this.renderer, {
      top: "#f2ede4",
      horizon: "#d8d1c5",
      bottom: "#8f877b",
      boxes: [
        { dir: [-0.6, 0.6, 0.7], size: [10, 8], intensity: 3, color: "#fffaf2", softness: 0.7 },
        { dir: [0.7, 0.3, -0.7], size: [6, 10], intensity: 2, color: "#ffffff", softness: 0.8 },
      ],
    });
    this.scene.environmentIntensity = 0.75;
    const key = new THREE.DirectionalLight("#fff4e8", 2.2);
    key.position.set(-2, 3.2, 2.6);
    const rim = new THREE.DirectionalLight("#f4f6ff", 1.6);
    rim.position.set(2.2, 2.4, -2.4);
    this.scene.add(key, rim, new THREE.HemisphereLight("#fffaf2", "#bdb4a6", 0.6));
    // meka sjena: oval ispod stopala
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.75), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, toneMapped: false }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.002;
    this.scene.add(sh);

    // mala lutka (~300–400 px): srednja gustoća mreže — puna (≈300 tisuća vrhova) se pri prvom crtanju u novi
    // kontekst šalje na GPU ~30 ms, usred scrolla
    this.figure = new Figure({ look: "wood", detail: "mid" });
    this.scene.add(this.figure.group);
    const start = getPose("stoji");
    this.animator = new PoseAnimator(start);
    this.figure.setPose(start);
    this.figure.viewCamera = this.camera;
    // kadar: cijela lutka, malo odozdo (lik dominira, "statueta")
    this.camera.position.set(0.42, 1.0, 3.55);
    this.camera.lookAt(0, 0.9, 0);
    // prevođenje u zasebnom zadatku (konstruktor je već ~40 ms: novi WebGL kontekst + okruženje)
    this.ready = new Promise<void>((r) => setTimeout(r, 0))
      .then(() => {
        return this.renderer.compileAsync(this.scene, this.camera);
      })
      .catch(() => undefined)
      .then(() => {
        this.isReady = true;
        this.kick();
      });
  }

  private seq: Array<{ at: number; pose: PoseName; dur: number }> = [];
  private seqT = 0;
  /** glava prati cilj (kursor) osim u koreografiranim trenucima (révérence, prijelaz poze) */
  lookEnabled = true;

  setMode(mode: DollMode, pose: PoseName = "stoji") {
    this.mode = mode;
    this.seq = [];
    this.lookEnabled = true;
    this.animator.go(getPose(pose), 0.6);
    this.kick();
  }

  /** poza (npr. usluga): mekani prijelaz; kratko bez praćenja kursora da se poza pročita */
  pose(pose: PoseName, dur = 0.55) {
    this.canvas.dataset.pose = pose; // za testove
    this.seq = [];
    this.animator.go(getPose(pose), dur);
    this.lookEnabled = false;
    this.seqT = 0;
    this.seq = [{ at: dur + 0.35, pose, dur: 0 }];
    this.kick();
  }

  /** révérence na dnu stranice (07, interakcija 5): naklon, zadrži, uspravi se */
  reverence() {
    this.canvas.dataset.seq = "reverence"; // za testove
    this.lookEnabled = false;
    this.seqT = 0;
    this.seq = [
      { at: 0, pose: "b_reverence_duboka", dur: 0.95 },
      { at: 2.1, pose: "b_zavrsna", dur: 0.9 },
      { at: 3.2, pose: "stoji", dur: 0.7 },
    ];
    this.kick();
  }

  resize(w: number, h: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.figure.viewportH = h;
    this.kick();
  }

  /** točka zaslona → cilj pogleda u prostoru lutke (ispred lutke, prema gledatelju) */
  private lookTarget(): Vec3 | null {
    if (!this.targetPx) return null;
    const r = this.canvas.getBoundingClientRect();
    if (!r.width) return null;
    const nx = ((this.targetPx.x - r.left) / r.width) * 2 - 1;
    const ny = -(((this.targetPx.y - r.top) / r.height) * 2 - 1);
    // zraka kroz točku, presjek s ravninom na dubini lutke, pa malo prema kameri (lutka gleda "van" prema stranici)
    this.v.set(nx, ny, 0.5).unproject(this.camera);
    this.w.copy(this.v).sub(this.camera.position).normalize();
    const d = (0 - this.camera.position.z) / this.w.z;
    const p = this.camera.position.clone().addScaledVector(this.w, d);
    p.z += 1.4;
    // svijet → prostor lutke (jedinice glave)
    this.figure.body.updateWorldMatrix(true, false);
    const local = this.figure.body.worldToLocal(p);
    return [local.x, local.y, local.z];
  }

  private frame = (now: number) => {
    this.raf = 0;
    if (!this.running || !this.isReady) return;
    // mirovanje (bez unosa, bez koreografije): svaki drugi frame (lib/calm.ts)
    const calm = !this.seq.length && isCalm(now);
    this.skip = calm && !this.skip;
    if (this.skip) {
      this.raf = requestAnimationFrame(this.frame);
      return;
    }
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 1 / 60;
    this.last = now;
    this.t += dt;
    // koreografija (révérence / poza): koraci po vremenu; na kraju se pogled ponovno uključi
    if (this.seq.length) {
      this.seqT += dt;
      while (this.seq.length && this.seqT >= this.seq[0].at) {
        const st = this.seq.shift()!;
        if (st.dur > 0) this.animator.go(getPose(st.pose), st.dur);
      }
      if (!this.seq.length) {
        this.lookEnabled = true;
        delete this.canvas.dataset.seq;
      }
    }
    const pose = this.animator.update(dt);
    if (!this.reduced) applySecondary(pose, this.t, { breath: 1, sway: 0.5 });
    if (this.lookSource) this.targetPx = this.lookSource();
    const target = this.reduced || !this.lookEnabled ? null : this.lookTarget();
    this.look.target = target;
    if (this.figure.parts.length) this.look.update(this.figure.parts, dt);
    this.look.apply(pose);
    // veći okret (izvan ±35° glave) preuzme tijelo
    const head = this.figure.map.head as LathePart | undefined;
    let want = 0;
    if (target && head) want = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(Math.atan2(target[0] - head.S[0], Math.max(0.3, target[2] - head.S[2]))) * 0.8, -40, 40);
    this.bodyYaw.step(want, dt);
    this.figure.group.rotation.y = THREE.MathUtils.degToRad(this.bodyYaw.x);
    this.figure.setPose(pose);
    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.frame);
  };

  kick() {
    if (!this.isReady) return;
    if (this.running && !this.raf) this.raf = requestAnimationFrame(this.frame);
    if (this.reduced && !this.running) {
      // smanjeni pokret: jedan mirni kadar
      this.figure.setPose(this.animator.update(1));
      this.renderer.render(this.scene, this.camera);
    }
  }

  setRunning(on: boolean) {
    if (this.reduced) {
      this.running = false;
      this.kick();
      return;
    }
    if (on === this.running) return;
    this.running = on;
    this.last = 0;
    if (on) this.kick();
    else if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  dispose() {
    this.setRunning(false);
    this.renderer.dispose();
  }
}

export { UNIT };
