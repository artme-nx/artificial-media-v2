import { Engine } from "./core/engine";
import { IntroScene } from "./scenes/intro-scene";
import { onStage, getStage, type StageState } from "@/lib/stage-store";
import { readSwitches } from "@/config/switches";

/**
 * Redatelj jednog trajnog canvasa (11 §3): bira scenu po sekciji na ekranu, prosljeđuje napredak scrolla,
 * pauzira crtanje kad 3D nije vidljiv. Učitava se lijeno, nakon prvog prikaza (HTML ide prvi).
 */
export class Director {
  engine: Engine;
  intro: IntroScene;
  private unsub: () => void;
  private io: IntersectionObserver;
  private visible = new Map<string, number>();
  private onResize = () => this.engine.resize(window.innerWidth, window.innerHeight);

  constructor(private canvas: HTMLCanvasElement) {
    const sw = readSwitches();
    const mobile = window.matchMedia("(pointer: coarse)").matches && Math.min(window.innerWidth, window.innerHeight) < 820;
    const probe = new URLSearchParams(location.search).has("probe") || process.env.NODE_ENV !== "production";
    this.engine = new Engine(canvas, { tier: sw.quality, mobile, probe });
    this.intro = new IntroScene();
    this.engine.resize(window.innerWidth, window.innerHeight);
    window.addEventListener("resize", this.onResize);
    this.unsub = onStage((s) => this.sync(s));
    // zone: sekcije s data-scene
    this.io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) this.visible.set((e.target as HTMLElement).dataset.scene!, e.isIntersecting ? e.intersectionRatio : 0);
        this.pickZone();
      },
      { threshold: [0, 0.01, 0.25, 0.5, 0.75, 1] },
    );
    for (const el of document.querySelectorAll<HTMLElement>("[data-scene]")) this.io.observe(el);
  }

  /** Kompajliraj shadere asinkrono (KHR_parallel_shader_compile) prije prvog prikaza — bez zastoja uvoda. */
  async start() {
    const restore = this.intro.showAllForCompile();
    try {
      // okruženje i post moraju postojati prije kompajliranja (isti programi kao pri crtanju)
      this.intro.scene.environment ??= this.intro.theatre.environment(this.engine.renderer);
      await this.engine.renderer.compileAsync(this.intro.scene, this.intro.camera);
    } catch {
      /* stariji preglednici: kompajlira se pri prvom crtanju */
    }
    restore();
    this.engine.setScene(this.intro);
    this.sync(getStage());
    this.pickZone();
    document.documentElement.dataset.stage3d = "ready";
  }

  private pickZone() {
    const intro = this.visible.get("intro") ?? 0;
    const on = intro > 0.001;
    this.canvas.dataset.on = on ? "1" : "0";
    this.engine.setPaused(!on);
  }

  private sync(s: StageState) {
    this.intro.progress = s.introProgress;
    this.intro.dancerLevel = s.dancerLevel;
    this.intro.dancerPhase = s.dancerPhase;
    this.engine.invalidate();
  }

  dispose() {
    this.unsub();
    this.io.disconnect();
    window.removeEventListener("resize", this.onResize);
    this.engine.dispose();
  }
}
