import * as THREE from "three";
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  ToneMappingEffect,
  ToneMappingMode,
  SMAAEffect,
  SMAAPreset,
  EdgeDetectionMode,
  VignetteEffect,
  DepthOfFieldEffect,
} from "postprocessing";
import { N8AOPostPass } from "n8ao";
import { VolumetricPass, type VolLight, type VolSettings } from "./volumetric";
import { FilmGrainEffect } from "./grain";

/**
 * Lanac efekata (11 §2): RenderPass → N8AO (AO) → volumetrijski snopovi → dubina polja → bloom + AgX
 * → SMAA + vinjeta + filmsko zrno. Bloom samo na desktopu (high), AO i volumetrija po razini kvalitete.
 */
export type Tier = "high" | "medium" | "low";
export const TIERS: Record<Tier, { msaa: number; dprMax: number; ao: boolean; aoHalf: boolean; aoSamples: number; volScale: number; volSteps: number; dof: boolean; dofScale: number; bloom: boolean; shadowMap: number; smaa: SMAAPreset }> = {
  // high: izmjereno na M5 (1440×900, DPR 1, puni orkestar): MSAA 4 → 2, volumetrija 0,5/44 → 0,4/36, AO 16 → 12 uzoraka
  // podiže kadar s 53 na ~70 fps bez vidljive razlike (SMAA ostaje HIGH, volumetrija se bilateralno skalira)
  high: { msaa: 2, dprMax: 2, ao: true, aoHalf: false, aoSamples: 12, volScale: 0.4, volSteps: 36, dof: true, dofScale: 0.5, bloom: true, shadowMap: 2048, smaa: SMAAPreset.HIGH },
  medium: { msaa: 0, dprMax: 1.5, ao: true, aoHalf: true, aoSamples: 8, volScale: 0.35, volSteps: 28, dof: true, dofScale: 0.35, bloom: false, shadowMap: 1024, smaa: SMAAPreset.MEDIUM },
  low: { msaa: 0, dprMax: 1, ao: false, aoHalf: true, aoSamples: 6, volScale: 0.25, volSteps: 16, dof: false, dofScale: 0.25, bloom: false, shadowMap: 1024, smaa: SMAAPreset.LOW },
};

export type PostConfig = {
  exposure?: number;
  tone?: "AGX" | "ACES_FILMIC" | "NEUTRAL";
  ao?: { radius?: number; falloff?: number; intensity?: number } | false;
  volumetric?: { lights: VolLight[]; settings?: VolSettings } | false;
  dof?: { focus: number; range: number; bokeh?: number; target?: THREE.Vector3 | null } | false;
  bloom?: { intensity?: number; threshold?: number; smoothing?: number; radius?: number } | false;
  vignette?: { darkness?: number; offset?: number };
  grain?: number;
};

export class Post {
  composer: EffectComposer;
  renderPass: RenderPass;
  n8ao: N8AOPostPass;
  volumetric: VolumetricPass;
  dof: DepthOfFieldEffect;
  dofPass: EffectPass;
  bloom: BloomEffect;
  tone: ToneMappingEffect;
  gradePass: EffectPass;
  smaa: SMAAEffect;
  vignette: VignetteEffect;
  grain: FilmGrainEffect;
  finishPass: EffectPass;
  tier: Tier = "high";
  private cfg: PostConfig = {};

  constructor(public renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
    this.renderPass = new RenderPass(scene, camera);
    this.n8ao = new N8AOPostPass(scene, camera, 1, 1);
    Object.assign(this.n8ao.configuration, {
      gammaCorrection: false,
      aoRadius: 0.35,
      distanceFalloff: 0.6,
      intensity: 2.2,
      aoSamples: 16,
      denoiseSamples: 8,
      denoiseRadius: 8,
      halfRes: false,
      depthAwareUpsampling: true,
      color: new THREE.Color(0, 0, 0),
      transparencyAware: false,
    });
    this.volumetric = new VolumetricPass();
    this.dof = new DepthOfFieldEffect(camera, { focusDistance: 3, focusRange: 1, bokehScale: 3, resolutionScale: 0.5 });
    this.dofPass = new EffectPass(camera, this.dof);
    this.bloom = new BloomEffect({ mipmapBlur: true, intensity: 0.8, radius: 0.6, levels: 7, luminanceThreshold: 1.1, luminanceSmoothing: 0.25 });
    this.tone = new ToneMappingEffect({ mode: ToneMappingMode.AGX });
    this.gradePass = new EffectPass(camera, this.bloom, this.tone);
    this.smaa = new SMAAEffect({ preset: SMAAPreset.HIGH, edgeDetectionMode: EdgeDetectionMode.COLOR });
    this.vignette = new VignetteEffect({ offset: 0.3, darkness: 0.5 });
    this.grain = new FilmGrainEffect(0.02);
    this.finishPass = new EffectPass(camera, this.smaa, this.vignette, this.grain);
    for (const p of [this.renderPass, this.n8ao, this.volumetric, this.dofPass, this.gradePass, this.finishPass]) this.composer.addPass(p as never);
  }

  setScene(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.renderPass.mainScene = scene;
    this.renderPass.mainCamera = camera;
    this.composer.setMainScene(scene);
    this.composer.setMainCamera(camera);
    this.n8ao.scene = scene;
    this.n8ao.camera = camera;
    this.volumetric.viewCamera = camera;
  }

  setTier(tier: Tier) {
    this.tier = tier;
    const q = TIERS[tier];
    Object.assign(this.n8ao.configuration, { halfRes: q.aoHalf, aoSamples: q.aoSamples, denoiseSamples: q.aoHalf ? 4 : 6 });
    this.volumetric.setResolutionScale(q.volScale);
    this.volumetric.setSteps(q.volSteps);
    this.dof.resolution.scale = q.dofScale;
    this.smaa.applyPreset(q.smaa);
    this.apply();
  }

  /** offline render nizova slika (F9): više koraka dima i uzoraka AO, MSAA 4, bez obzira na razinu */
  renderQuality() {
    this.volumetric.setResolutionScale(0.6);
    this.volumetric.setSteps(80);
    Object.assign(this.n8ao.configuration, { halfRes: false, aoSamples: 24, denoiseSamples: 8 });
    this.composer.multisampling = Math.min(4, this.renderer.capabilities.maxSamples);
    this.dof.resolution.scale = 0.75;
  }

  configure(cfg: PostConfig) {
    this.cfg = cfg;
    this.apply();
  }

  private apply() {
    const q = TIERS[this.tier];
    const c = this.cfg;
    this.renderer.toneMappingExposure = c.exposure ?? 1;
    this.tone.mode = ToneMappingMode[c.tone ?? "ACES_FILMIC"];
    this.n8ao.enabled = q.ao && c.ao !== false;
    if (c.ao) {
      if (c.ao.radius !== undefined) this.n8ao.configuration.aoRadius = c.ao.radius;
      if (c.ao.falloff !== undefined) this.n8ao.configuration.distanceFalloff = c.ao.falloff;
      if (c.ao.intensity !== undefined) this.n8ao.configuration.intensity = c.ao.intensity;
    }
    if (c.volumetric) {
      this.volumetric.enabled = this.tier !== "low";
      this.volumetric.configure(c.volumetric.lights, c.volumetric.settings);
    } else {
      this.volumetric.enabled = false;
      this.volumetric.configure([]);
    }
    if (c.dof && q.dof) {
      this.dofPass.enabled = true;
      this.dof.cocMaterial.focusDistance = c.dof.focus;
      this.dof.cocMaterial.focusRange = c.dof.range;
      this.dof.bokehScale = c.dof.bokeh ?? 3;
      this.dof.target = c.dof.target ?? null;
    } else this.dofPass.enabled = false;
    const bloomOn = !!c.bloom && q.bloom;
    this.bloom.blendMode.opacity.value = bloomOn ? 1 : 0;
    if (c.bloom) {
      if (c.bloom.intensity !== undefined) this.bloom.intensity = c.bloom.intensity;
      if (c.bloom.threshold !== undefined) this.bloom.luminanceMaterial.threshold = c.bloom.threshold;
      if (c.bloom.smoothing !== undefined) this.bloom.luminanceMaterial.smoothing = c.bloom.smoothing;
      if (c.bloom.radius !== undefined) this.bloom.mipmapBlurPass.radius = c.bloom.radius;
    }
    if (c.vignette) {
      if (c.vignette.darkness !== undefined) this.vignette.darkness = c.vignette.darkness;
      if (c.vignette.offset !== undefined) this.vignette.offset = c.vignette.offset;
    }
    // c.grain je jačina u istom rasponu kao prije (0,06–0,14); jednobojno zrno je jače po jedinici
    this.grain.amount = (c.grain ?? 0.06) * 0.22;
  }

  /** w, h u CSS pikselima; dpr = trenutni omjer piksela (dinamička rezolucija). */
  setSize(w: number, h: number, dpr = 1) {
    const q = TIERS[this.tier];
    // volumetrija i AO u rezoluciji vezanoj za CSS piksele (ne rastu s DPR-om)
    this.volumetric.setResolutionScale(Math.min(1, q.volScale / Math.max(1, dpr)));
    Object.assign(this.n8ao.configuration, { halfRes: q.aoHalf || dpr > 1.4 });
    // MSAA samo kad je DPR nizak (pri DPR ≥ 1,5 slika je ionako nadsamplirana)
    // pri DPR ~1 rubovi su najvidljiviji: MSAA 4 (izmjereno: kadar uvoda i dalje 60 fps na M5); do 1,3 razina; iznad 0
    const samples = q.msaa > 0 && dpr <= 1.05 ? 4 : dpr <= 1.3 ? q.msaa : 0;
    this.composer.multisampling = Math.min(samples, this.renderer.capabilities.maxSamples);
    this.composer.setSize(w, h, false);
    const db = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.n8ao.setSize(db.x, db.y);
  }

  render(dt: number) {
    this.composer.render(dt);
  }

  dispose() {
    this.composer.dispose();
    this.volumetric.dispose();
  }
}
