import * as THREE from "three";
import { installPCSS } from "./pcss";
import { Post, TIERS, type Tier } from "./post";
import { isCalm } from "@/lib/calm";

/**
 * Jedan trajni renderer (11 §3): crta se samo kad treba (scena traži sljedeći frame ili je netko pozvao invalidate),
 * pauza kad je kartica skrivena ili kad redatelj kaže da 3D nije vidljiv.
 * Rezolucija: proračun piksela po razini (PIXEL_BUDGET), ne puni DPR zaslona; dinamička rezolucija ispod toga.
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
  /** množitelj proračuna piksela (PIXEL_BUDGET) za ovu scenu: lakše scene s krupnim kadrovima drva dobiju više */
  readonly pixelScale?: number;
  /** vlastito crtanje (npr. dva prolaza za drvo/robot); inače post.render */
  render?(engine: Engine, dt: number): void;
  deactivate?(): void;
}

/**
 * Najviše piksela platna po razini (× pixelScale scene). 3D je pozadina iza teksta (dubina polja, dim, zrno) pa se
 * na Retini ne crta u punom DPR-u 2: to je četiri puta više piksela, i na MacBook Airu M5 (1470×830 @2, Chrome)
 * uvod je padao na ~7 fps. S ~1,15 MP uvod drži 58–60 fps i pri brzom scrollu (scripts/perf-scroll.mjs).
 * Preglednik platno samo poveća na zaslon.
 */
const PIXEL_BUDGET: Record<Tier, number> = { high: 1.15e6, medium: 0.8e6, low: 0.55e6 };
/** najniži DPR dinamičke rezolucije (ispod se ne ide; dalje pada razina kvalitete) */
const DPR_FLOOR = 0.7;

/** trzaj (sonda): frame čije je ažuriranje ili crtanje trajalo > 40 ms; programs = novi shaderi u tom frameu */
export type Hitch = { scene: string; update: number; render: number; programs: number; at: number };

/** budget: false = bez proračuna piksela (ispitne rute /lab: pregled materijala izbliza u punoj rezoluciji zaslona) */
export type EngineOptions = { tier?: Tier | "auto"; mobile?: boolean; probe?: boolean; transparent?: boolean; fixedDpr?: number; budget?: boolean };

declare global {
  interface Window {
    __fps?: { fps: number; frames: number; long: number; tier: Tier; samples: number[]; hitches?: Hitch[] };
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
  /** dinamička rezolucija: množitelj osnovnog DPR-a (≤ 1); za svaku scenu pamti razinu na kojoj je bila prespora */
  private scale = 1;
  private ceil = new Map<StageScene, number>();
  private baseDpr = 1;
  private sinceChange = 0;
  private lastChange = 0;
  /** mirovanje: svaki drugi frame se preskače (lib/calm.ts); samo na stranici, ne u /lab i renderu nizova */
  private calmHalf: boolean;
  private skip = false;
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
    this.calmHalf = !opts.fixedDpr && opts.budget !== false;
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
    // promjena scene ne mijenja veličinu platna (realokacija svih spremnika = trzaj usred scrolla);
    // samo ako je ova scena već bila prespora na višoj rezoluciji, odmah se vraća na njezinu razinu
    const c = this.ceil.get(s);
    if (c !== undefined && this.scale > c + 0.005) this.scale = c;
    // drugi proračun piksela ili razina na kojoj je scena bila prespora: jedna promjena veličine na prijelazu
    const base = this.baseFor(this.width, this.height);
    const dpr = Math.round(base * Math.max(Math.min(1, DPR_FLOOR / base), this.scale) * 100) / 100;
    if (dpr !== this.dpr) this.resize(this.width, this.height, true);
    else {
      this.fitActive();
      this.sinceChange = 0;
    }
    this.invalidate();
  }

  setTier(t: Tier) {
    if (t === this.tier) return;
    this.tier = t;
    this.scale = 1;
    this.ceil.clear();
    this.post.setTier(t);
    this.active?.setTier?.(t);
    this.resize(this.width, this.height, true);
    if (window.__fps) window.__fps.tier = t;
    this.invalidate();
  }

  /** osnovni DPR za veličinu w × h: najviše DPR uređaja i razine, i ne više piksela od proračuna razine */
  private baseFor(w: number, h: number) {
    if (this.opts.fixedDpr) return this.opts.fixedDpr;
    const cap = Math.min(window.devicePixelRatio || 1, TIERS[this.tier].dprMax, this.opts.mobile ? 1.5 : 2);
    if (this.opts.budget === false) return cap;
    const budget = Math.sqrt((PIXEL_BUDGET[this.tier] * (this.active?.pixelScale ?? 1)) / Math.max(1, w * h));
    return Math.min(cap, Math.max(DPR_FLOOR, budget));
  }

  resize(w: number, h: number, force = false) {
    w = Math.max(1, w);
    h = Math.max(1, h);
    const base = this.baseFor(w, h);
    const min = Math.min(1, DPR_FLOOR / base);
    const dpr = this.opts.fixedDpr ? base : Math.round(base * Math.max(min, this.scale) * 100) / 100;
    if (!force && w === this.width && h === this.height && dpr === this.dpr) return;
    this.width = w;
    this.height = h;
    this.dpr = dpr;
    this.baseDpr = base;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.post.setSize(w, h, dpr, base);
    this.fitActive();
    this.sinceChange = 0;
    this.invalidate();
  }

  private fitActive() {
    if (!this.active) return;
    this.active.camera.aspect = this.width / this.height;
    this.active.camera.updateProjectionMatrix();
    this.active.resize?.(this.width, this.height);
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
    // bez scrolla i pokazivača ~0,5 s: isti pokret (disanje, orkestar) u 30 fps, upola manje rada GPU-a
    const calm = this.calmHalf && isCalm(now);
    this.skip = calm && !this.skip;
    if (this.skip) {
      this.raf = requestAnimationFrame(this.frame);
      return;
    }
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 1 / 60;
    this.last = now;
    this.t += dt;
    const probe = window.__fps;
    const t0 = probe ? performance.now() : 0;
    const p0 = probe ? this.renderer.info.programs?.length ?? 0 : 0;
    const more = this.active.update(dt, this.t);
    const t1 = probe ? performance.now() : 0;
    if (this.active.render) this.active.render(this, dt);
    else this.post.render(dt);
    if (probe) {
      const t2 = performance.now();
      if (t2 - t0 > 40) {
        (probe.hitches ??= []).push({
          scene: this.active.constructor.name,
          update: Math.round(t1 - t0),
          render: Math.round(t2 - t1),
          programs: (this.renderer.info.programs?.length ?? 0) - p0,
          at: Math.round(now),
        });
      }
    }
    this.frames++;
    if (window.__fps) window.__fps.frames = this.frames;
    // u mirovanju je razmak dva frame-a (33 ms) namjeran: ne mjeri se za dinamičku rezoluciju
    if (!calm) this.sample(dt);
    if (more || this.wanted) {
      this.wanted = false;
      this.raf = requestAnimationFrame(this.frame);
    } else this.last = 0;
    if (more) this.wanted = true;
  };

  private sample(dt: number) {
    this.sinceChange++;
    this.frameTimes.push(dt);
    if (this.frameTimes.length > 240) this.frameTimes.shift();
    if (dt > 0.05) this.longFrames++;
    const win = this.frameTimes.slice(-90);
    const avg = win.reduce((a, b) => a + b, 0) / Math.max(1, win.length);
    const fps = avg > 0 ? 1 / avg : 0;
    if (window.__fps) {
      window.__fps.fps = fps;
      window.__fps.long = this.longFrames;
      if (this.frames % 10 === 0 && fps > 0) window.__fps.samples.push(Math.round(fps));
      (window.__fps as unknown as { dpr: number }).dpr = this.dpr;
    }
    // dinamička rezolucija; prvih 24 framea nakon promjene se ne broji (realokacija spremnika je trzaj)
    if (this.opts.fixedDpr || this.sinceChange < 24) return;
    const now = performance.now();
    // brzo dolje: 8 od zadnjih 20 frameova sporije od 45 fps → 16 % manji DPR (najviše jednom u 0,6 s)
    const slow = this.frameTimes.slice(-20).filter((x) => x > 1 / 45).length;
    if (slow >= 8 && now - this.lastChange > 600) {
      const min = Math.min(1, DPR_FLOOR / this.baseDpr);
      if (this.scale > min + 0.005) {
        this.scale = Math.max(min, this.scale * 0.84);
        if (this.active) this.ceil.set(this.active, this.scale);
        this.lastChange = now;
        this.resize(this.width, this.height, true);
        return;
      }
      // DPR je već na dnu: niža razina kvalitete (manje AO-a i dima, bez blooma)
      if (this.autoTier && this.tier !== "low" && now - this.lastChange > 1500) {
        this.lastChange = now;
        this.setTier(this.tier === "high" ? "medium" : "low");
      }
      return;
    }
    // polako gore: ~4 s bez ijednog sporog framea, najviše do razine na kojoj je ova scena bila prespora
    const ceiling = (this.active && this.ceil.get(this.active)) ?? 1;
    if (this.scale < ceiling - 0.005 && this.sinceChange > 240 && this.frameTimes.length >= 240 && Math.max(...this.frameTimes) < 1 / 50) {
      this.scale = Math.min(ceiling, this.scale * 1.12);
      this.lastChange = now;
      this.resize(this.width, this.height, true);
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
