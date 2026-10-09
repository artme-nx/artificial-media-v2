import { HalfFloatType, WebGLRenderTarget } from "three";
import { Engine, type StageScene } from "./core/engine";
import { IntroScene } from "./scenes/intro-scene";
import { BalletScene } from "./scenes/ballet-scene";
import { CursorScene } from "./scenes/cursor-scene";
import { onStage, getStage, setStage, type StageState } from "@/lib/stage-store";
import { readSwitches } from "@/config/switches";
import { keepBusy } from "@/lib/calm";

type Zone = "intro" | "ballet" | "cursor";
type CompileJob = { scene: import("three").Scene; camera: import("three").Camera; target: import("three").WebGLRenderTarget | null };
type Compilable = StageScene & {
  showAllForCompile?: () => () => void;
  prepareEnvironment?: (r: import("three").WebGLRenderer) => void;
  /** scene koje crtaju u vlastite spremnike (drvo / robot) kažu u koje */
  compileJobs?: () => CompileJob[];
  contact?: { update(r: import("three").WebGLRenderer, scene: import("three").Scene): void };
  contactShadows?: { update(r: import("three").WebGLRenderer, scene: import("three").Scene): void };
};

/**
 * Redatelj jednog trajnog canvasa (11 §3): bira scenu po sekciji koja zauzima najviše ekrana (data-scene),
 * prosljeđuje napredak scrolla, pauzira crtanje kad 3D nije vidljiv. Učitava se lijeno, nakon prvog prikaza
 * (HTML ide prvi); shaderi svake scene kompajliraju se unaprijed (prva odmah, ostale kad je preglednik slobodan).
 */
export class Director {
  engine: Engine;
  ballet: BalletScene | null = null;
  intro: IntroScene | null = null;
  cursor: CursorScene;
  private zones: Zone[];
  private scenes: Partial<Record<Zone, Compilable>> = {};
  private offs: Array<() => void> = [];
  private zone: Zone | null = null;
  private unsub: () => void;
  private io: IntersectionObserver;
  private visible = new Map<string, number>();
  private compiled = new Set<Zone>();
  private onResize = () => this.engine.resize(window.innerWidth, window.innerHeight);

  constructor(private canvas: HTMLCanvasElement, opts: { zones?: Zone[] } = {}) {
    this.zones = opts.zones ?? ["intro", "ballet", "cursor"];
    const sw = readSwitches();
    const mobile = window.matchMedia("(pointer: coarse)").matches && Math.min(window.innerWidth, window.innerHeight) < 820;
    const qs = new URLSearchParams(location.search);
    const probe = qs.has("probe") || process.env.NODE_ENV !== "production";
    // ?dpr= (mjerenje, scripts/perf-*.mjs): stalni omjer piksela bez dinamičke rezolucije
    const fixedDpr = Number(qs.get("dpr")) || undefined;
    this.engine = new Engine(canvas, { tier: sw.quality, mobile, probe, fixedDpr });
    if (this.zones.includes("intro")) this.intro = new IntroScene();
    if (this.zones.includes("ballet")) {
      const b = new BalletScene();
      b.orbit = sw.balletOrbit;
      this.ballet = b;
    }
    this.cursor = new CursorScene();
    this.cursor.ringOn = sw.maskRing;
    this.cursor.mobileMode = sw.cursorMobile;
    this.cursor.coarse = window.matchMedia("(pointer: coarse)").matches;
    if (this.intro) this.scenes.intro = this.intro;
    if (this.ballet) this.scenes.ballet = this.ballet;
    this.scenes.cursor = this.cursor;
    this.bindCursor();
    // testovi i QA (dev ili ?probe=1): pristup scenama
    if (probe) (window as unknown as { __stage?: Director }).__stage = this;
    this.engine.resize(window.innerWidth, window.innerHeight);
    window.addEventListener("resize", this.onResize);
    this.unsub = onStage((s) => this.sync(s));
    // zone: sekcije s data-scene; mjeri se visina vidljivog dijela (visoke sekcije imaju mali omjer)
    this.io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) this.visible.set((e.target as HTMLElement).dataset.scene!, e.isIntersecting ? e.intersectionRect.height : 0);
        this.pickZone();
      },
      { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
    );
    for (const el of document.querySelectorAll<HTMLElement>("[data-scene]")) this.io.observe(el);
  }

  private async compile(zone: Zone) {
    if (this.compiled.has(zone)) return;
    this.compiled.add(zone);
    const s = this.scenes[zone];
    if (!s) return;
    try {
      // okruženje (i post) se postave u activate; za kompajliranje treba isto okruženje kao pri crtanju
      const r = this.engine.renderer;
      if (zone === "intro" && this.intro) this.intro.scene.environment ??= this.intro.theatre.environment(r);
      else s.prepareEnvironment?.(r);
      // shaderi se prevode za cilj u koji scena stvarno crta: RenderPass crta u ulazni spremnik composera (linearni
      // izlaz, bez tonskog mapiranja), drvo / robot u vlastite spremnike. Prevedeni za ekran (sRGB) bili bi drugi
      // programi i sve bi se prevodilo iznova pri prvom crtanju — trzaji od 60–130 ms usred scrolla (perf-scroll).
      const jobs = s.compileJobs?.() ?? [{ scene: s.scene, camera: s.camera, target: this.engine.post.composer.inputBuffer }];
      const prev = r.getRenderTarget();
      // skriveni objekti (likovi koji se pojave kasnije, prašina) moraju biti vidljivi samo dok traje sinkroni dio
      let restore = revealAll(s);
      const waits = jobs.map((j) => {
        r.setRenderTarget(j.target);
        return r.compileAsync(j.scene, j.camera); // compile() je sinkron, čeka se samo da programi budu spremni
      });
      r.setRenderTarget(prev);
      restore();
      await Promise.all(waits);
      restore = revealAll(s);
      this.warm(s, jobs[0].target);
      restore();
    } catch {
      /* stariji preglednici: kompajlira se pri prvom crtanju */
    }
  }

  /**
   * Jedan frame scene (svi likovi vidljivi) u mali spremnik dok je preglednik slobodan: prevedu se shaderi sjena,
   * kontaktnih sjena i dubine, koji se inače prevode sinkrono pri prvom crtanju — trzaj 40–80 ms kad se scena ili
   * novi lik (orkestar, plesačica) prvi put pojavi usred scrolla.
   */
  private warm(s: Compilable, like: import("three").WebGLRenderTarget | null) {
    const r = this.engine.renderer;
    const prev = r.getRenderTarget();
    const tiny = new WebGLRenderTarget(4, 4, { type: like?.texture.type ?? HalfFloatType, depthBuffer: true });
    // bez odsijecanja izvan kadra (kamera scene još nije postavljena): crtaju se svi objekti, pa se i sve teksture
    // pošalju na GPU sada, a ne u prvom pravom frameu (izmjereno: 57 ms trzaja na ulasku u baletnu scenu)
    const culled: import("three").Object3D[] = [];
    s.scene.traverse((o) => {
      if (o.frustumCulled) {
        o.frustumCulled = false;
        culled.push(o);
      }
    });
    try {
      (s.contactShadows ?? s.contact)?.update(r, s.scene);
      r.setRenderTarget(tiny);
      r.render(s.scene, s.camera);
    } catch {
      /* zagrijavanje nije nužno */
    } finally {
      r.setRenderTarget(prev);
      tiny.dispose();
      for (const o of culled) o.frustumCulled = true;
    }
  }

  /** Kompajliraj uvod prije prvog prikaza, baletnu scenu kad je preglednik slobodan. */
  async start() {
    const first: Zone = this.intro ? "intro" : "cursor";
    await this.compile(first);
    this.engine.setScene(this.scenes[first]!);
    this.zone = first;
    this.sync(getStage());
    this.pickZone();
    // u načinu "frames" ScrollSequence javlja stage3d (uvod i balet su nizovi slika)
    if (this.intro) {
      document.documentElement.dataset.stage3d = "ready";
      window.dispatchEvent(new Event("stage3d-ready"));
    }
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const later = async () => {
      for (const z of this.zones) await this.compile(z);
    };
    if (ric) ric(() => void later(), { timeout: 2500 });
    else setTimeout(() => void later(), 1200);
  }

  private pickZone() {
    let best: Zone | null = null;
    let bestH = 0.5;
    for (const z of this.zones) {
      const h = this.visible.get(z) ?? 0;
      if (h > bestH) {
        best = z;
        bestH = h;
      }
    }
    const on = best !== null;
    this.canvas.dataset.on = on ? "1" : "0";
    this.engine.setPaused(!on);
    if (best && best !== this.zone) {
      this.zone = best;
      this.engine.setScene(this.scenes[best]!);
      setStage({ zone: best });
    }
  }

  private sync(s: StageState) {
    if (this.intro) {
      this.intro.progress = s.introProgress;
      this.intro.dancerLevel = s.dancerLevel;
      this.intro.dancerPhase = s.dancerPhase;
      // kadar 2 (plesačica) ide sam od sebe: puni ritam i bez scrolla
      if (s.dancerLevel > 0.001 && s.introProgress < 0.2) keepBusy(250);
    }
    if (this.ballet) this.ballet.progress = s.balletProgress;
    this.engine.invalidate();
  }

  /** Sekcija "drvo / robot ispod kursora" (F6): pokazivač i dodir idu u scenu (canvas je ispod sadržaja). */
  private bindCursor() {
    const el = document.querySelector<HTMLElement>('[data-scene="cursor"]');
    if (!el) return;
    const s = this.cursor;
    const mv = (e: PointerEvent) => s.pointerMove(e.clientX, e.clientY, true, e.pointerType === "touch");
    const dn = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      s.pointerDown(e.clientX, e.clientY, e.pointerType === "touch");
      if (e.pointerType !== "touch") el.setPointerCapture?.(e.pointerId);
    };
    const up = () => s.pointerUp();
    const lv = (e: PointerEvent) => s.pointerMove(e.clientX, e.clientY, false, e.pointerType === "touch");
    el.addEventListener("pointermove", mv);
    el.addEventListener("pointerdown", dn);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", lv);
    this.offs.push(() => {
      el.removeEventListener("pointermove", mv);
      el.removeEventListener("pointerdown", dn);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("pointerleave", lv);
    });
  }

  dispose() {
    this.offs.forEach((f) => f());
    this.unsub();
    this.io.disconnect();
    window.removeEventListener("resize", this.onResize);
    this.engine.dispose();
  }
}

/** sve skriveno u sceni privremeno vidljivo (osim svjetala: njihov broj je dio ključa shadera); vraća poništenje */
function revealAll(s: Compilable) {
  const undoScene = s.showAllForCompile?.();
  const hidden: import("three").Object3D[] = [];
  s.scene.traverse((o) => {
    if (!o.visible && !(o as import("three").Light).isLight) {
      o.visible = true;
      hidden.push(o);
    }
  });
  return () => {
    for (const o of hidden) o.visible = false;
    undoScene?.();
  };
}
