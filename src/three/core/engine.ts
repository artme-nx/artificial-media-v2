import * as THREE from "three";
import { installPCSS } from "./pcss";
import { Post, TIERS, type Tier } from "./post";

/**
 * Jedan trajni renderer (11 §3): crta se samo kad treba (scena traži sljedeći frame ili je netko pozvao invalidate),
 * pauza kad je kartica skrivena ili kad redatelj kaže da 3D nije vidljiv. DPR do 2 na desktopu, do 1,5 na mobitelu.
 * Razine kvalitete high / medium / low: automatski po uređaju i izmjerenom FPS-u, ručno ?q=high|medium|low.
 */
export interface StageScene {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  activate(engine: Engine): void;
  /** vraća true dok scena želi sljedeći frame */
  update(dt: number, t: number): boolean;
  resize?(w: number, h: number): void;
  setTier?(tier: Tier): void;
  /** vlastito crtanje (npr. dva prolaza za drvo/robot); inače post.render */
  render?(engine: Engine, dt: number): void;
  deactivate?(): void;
}

export type EngineOptions = { tier?: Tier | "auto"; mobile?: boolean; probe?: boolean; transparent?: boolean; fixedDpr?: number };

declare global {
  interface Window {
    __fps?: { fps: number; frames: number; long: number; tier: Tier; samples: number[] };
  }
}

export function detectTier(mobile: boolean): Tier {
  if (typeof window === "undefined") return "medium";
  const c = document.createElement("canvas");
  const gl = c.getContext("webgl2");
  if (!gl) return "low";
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  const gpu = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  if (mobile) return /Apple/i.test(gpu) && cores >= 6 ? "medium" : "low";
  if (/SwiftShader|llvmpipe|Software/i.test(gpu)) return "low";
  if (/Apple M|Apple GPU|NVIDIA|GeForce|RTX|Radeon RX|Radeon Pro/i.test(gpu) && cores >= 8 && mem >= 8) return "high";
  return "medium";
}

export class Engine {
  renderer: THREE.WebGLRenderer;
  post: Post;
  tier: Tier;
  active: StageScene | null = null;
  width = 1;
  height = 1;
  dpr = 1;
  private raf = 0;
  private last = 0;
  private t = 0;
  private wanted = true;
  private paused = false;
  private autoTier: boolean;
  private frameTimes: number[] = [];
  private longFrames = 0;
  private frames = 0;
  /** dinamička rezolucija: trenutni DPR između dprMin i maksimuma razine */
  private dynDpr = 0;
  private lastDprChange = 0;
  private dprMin = 1;
  private dummyScene = new THREE.Scene();
  private dummyCam = new THREE.PerspectiveCamera();
  private onVis = () => {
    if (!document.hidden) this.invalidate();
  };

  constructor(public canvas: HTMLCanvasElement, private opts: EngineOptions = {}) {
    installPCSS();
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: !!opts.transparent,
      powerPreference: "high-performance",
      stencil: false,
      depth: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap; // PCSS (vidi pcss.ts)
    this.autoTier = !opts.tier || opts.tier === "auto";
    this.tier = this.autoTier ? detectTier(!!opts.mobile) : (opts.tier as Tier);
    this.post = new Post(this.renderer, this.dummyScene, this.dummyCam);
    this.post.setTier(this.tier);
    document.addEventListener("visibilitychange", this.onVis);
    if (opts.probe) window.__fps = { fps: 0, frames: 0, long: 0, tier: this.tier, samples: [] };
  }

  setScene(s: StageScene) {
    if (this.active === s) return;
    this.active?.deactivate?.();
    this.active = s;
    this.post.setScene(s.scene, s.camera);
    s.activate(this);
    s.setTier?.(this.tier);
    this.resize(this.width, this.height, true);
    this.invalidate();
  }

  setTier(t: Tier) {
    if (t === this.tier) return;
    this.tier = t;
    this.post.setTier(t);
    this.active?.setTier?.(t);
    this.resize(this.width, this.height, true);
    if (window.__fps) window.__fps.tier = t;
    this.invalidate();
  }

  private maxDpr() {
    if (this.opts.fixedDpr) return this.opts.fixedDpr;
    return Math.min(window.devicePixelRatio || 1, TIERS[this.tier].dprMax, this.opts.mobile ? 1.5 : 2);
  }

  resize(w: number, h: number, force = false) {
    const max = this.maxDpr();
    if (!this.dynDpr || this.dynDpr > max) this.dynDpr = max;
    const dpr = Math.max(Math.min(this.dprMin, max), Math.min(this.dynDpr, max));
    if (!force && w === this.width && h === this.height && dpr === this.dpr) return;
    this.width = Math.max(1, w);
    this.height = Math.max(1, h);
    this.dpr = dpr;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.width, this.height, false);
    this.post.setSize(this.width, this.height, dpr);
    if (this.active) {
      this.active.camera.aspect = this.width / this.height;
      this.active.camera.updateProjectionMatrix();
      this.active.resize?.(this.width, this.height);
    }
    this.invalidate();
  }

  /** Redatelj: 3D nije vidljiv (sekcija bez canvasa) → ne crtaj. */
  setPaused(p: boolean) {
    this.paused = p;
    if (!p) this.invalidate();
  }

  invalidate() {
    this.wanted = true;
    if (!this.raf && !this.paused && !document.hidden) this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    this.raf = 0;
    if (this.paused || document.hidden || !this.active) return;
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 1 / 60;
    this.last = now;
    this.t += dt;
    const more = this.active.update(dt, this.t);
    const t0 = performance.now();
    if (this.active.render) this.active.render(this, dt);
    else this.post.render(dt);
    this.sample(dt, performance.now() - t0);
    if (more || this.wanted) {
      this.wanted = false;
      this.raf = requestAnimationFrame(this.frame);
    } else this.last = 0;
    if (more) this.wanted = true;
  };

  private sample(dt: number, cpu: number) {
    this.frames++;
    this.frameTimes.push(dt);
    if (this.frameTimes.length > 90) this.frameTimes.shift();
    if (dt > 0.05) this.longFrames++;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / Math.max(1, this.frameTimes.length);
    const fps = avg > 0 ? 1 / avg : 0;
    if (window.__fps) {
      window.__fps.fps = fps;
      window.__fps.frames = this.frames;
      window.__fps.long = this.longFrames;
      if (this.frames % 10 === 0 && fps > 0) window.__fps.samples.push(Math.round(fps));
    }
    void cpu;
    // dinamička rezolucija (nakon zagrijavanja): ispod ~57 fps smanji DPR, iznad ~70 fps povećaj (histereza, najviše jednom u 1,5 s)
    const now = performance.now();
    if (!this.opts.fixedDpr && this.frames > 90 && this.frameTimes.length >= 45 && now - this.lastDprChange > 1500) {
      const recent = this.frameTimes.slice(-45).reduce((a, b) => a + b, 0) / 45;
      const max = this.maxDpr();
      if (recent > 1 / 57 && this.dynDpr > this.dprMin + 0.01) {
        this.dynDpr = Math.max(this.dprMin, this.dynDpr - 0.2);
        this.lastDprChange = now;
        this.frameTimes = [];
        this.resize(this.width, this.height, true);
        return;
      }
      if (recent < 1 / 70 && this.dynDpr < max - 0.01) {
        this.dynDpr = Math.min(max, this.dynDpr + 0.1);
        this.lastDprChange = now;
        this.frameTimes = [];
        this.resize(this.width, this.height, true);
        return;
      }
    }
    if (window.__fps) (window.__fps as unknown as { dpr: number }).dpr = this.dpr;
    // automatski pad kvalitete: tek kad je DPR već na minimumu, a i dalje ispod 45 fps
    if (!this.opts.fixedDpr && this.autoTier && this.frames > 240 && this.frameTimes.length >= 90 && fps < 45 && this.dynDpr <= this.dprMin + 0.01) {
      const next: Tier | null = this.tier === "high" ? "medium" : this.tier === "medium" ? "low" : null;
      if (next) {
        this.frameTimes = [];
        this.setTier(next);
      }
    }
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    document.removeEventListener("visibilitychange", this.onVis);
    this.active?.deactivate?.();
    this.post.dispose();
    this.renderer.dispose();
  }
}
