import { Engine, type StageScene } from "./core/engine";
import { IntroScene } from "./scenes/intro-scene";
import { BalletScene } from "./scenes/ballet-scene";
import { CursorScene } from "./scenes/cursor-scene";
import { onStage, getStage, setStage, type StageState } from "@/lib/stage-store";
import { readSwitches } from "@/config/switches";

type Zone = "intro" | "ballet" | "cursor";
type Compilable = StageScene & { showAllForCompile?: () => () => void; prepareEnvironment?: (r: import("three").WebGLRenderer) => void };

/**
 * Redatelj jednog trajnog canvasa (11 §3): bira scenu po sekciji koja zauzima najviše ekrana (data-scene),
 * prosljeđuje napredak scrolla, pauzira crtanje kad 3D nije vidljiv. Učitava se lijeno, nakon prvog prikaza
 * (HTML ide prvi); shaderi svake scene kompajliraju se unaprijed (prva odmah, ostale kad je preglednik slobodan).
 */
export class Director {
  engine: Engine;
  intro: IntroScene;
  ballet: BalletScene;
  cursor: CursorScene;
  private scenes: Record<Zone, Compilable>;
  private offs: Array<() => void> = [];
  private zone: Zone | null = null;
  private unsub: () => void;
  private io: IntersectionObserver;
  private visible = new Map<string, number>();
  private compiled = new Set<Zone>();
  private onResize = () => this.engine.resize(window.innerWidth, window.innerHeight);

  constructor(private canvas: HTMLCanvasElement) {
    const sw = readSwitches();
    const mobile = window.matchMedia("(pointer: coarse)").matches && Math.min(window.innerWidth, window.innerHeight) < 820;
    const probe = new URLSearchParams(location.search).has("probe") || process.env.NODE_ENV !== "production";
    this.engine = new Engine(canvas, { tier: sw.quality, mobile, probe });
    this.intro = new IntroScene();
    this.ballet = new BalletScene();
    this.ballet.orbit = sw.balletOrbit;
    this.cursor = new CursorScene();
    this.cursor.ringOn = sw.maskRing;
    this.cursor.mobileMode = sw.cursorMobile;
    this.cursor.coarse = window.matchMedia("(pointer: coarse)").matches;
    this.scenes = { intro: this.intro, ballet: this.ballet, cursor: this.cursor };
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
    const restore = s.showAllForCompile?.();
    try {
      // okruženje (i post) se postave u activate; za kompajliranje treba isto okruženje kao pri crtanju
      if (zone === "intro") this.intro.scene.environment ??= this.intro.theatre.environment(this.engine.renderer);
      else s.prepareEnvironment?.(this.engine.renderer);
      await this.engine.renderer.compileAsync(s.scene, s.camera);
    } catch {
      /* stariji preglednici: kompajlira se pri prvom crtanju */
    }
    restore?.();
  }

  /** Kompajliraj uvod prije prvog prikaza, baletnu scenu kad je preglednik slobodan. */
  async start() {
    await this.compile("intro");
    this.engine.setScene(this.intro);
    this.zone = "intro";
    this.sync(getStage());
    this.pickZone();
    document.documentElement.dataset.stage3d = "ready";
    window.dispatchEvent(new Event("stage3d-ready"));
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const later = async () => {
      await this.compile("ballet");
      await this.compile("cursor");
    };
    if (ric) ric(() => void later(), { timeout: 2500 });
    else setTimeout(() => void later(), 1200);
  }

  private pickZone() {
    let best: Zone | null = null;
    let bestH = 0.5;
    for (const z of ["intro", "ballet", "cursor"] as const) {
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
      this.engine.setScene(this.scenes[best]);
      setStage({ zone: best });
    }
  }

  private sync(s: StageState) {
    this.intro.progress = s.introProgress;
    this.intro.dancerLevel = s.dancerLevel;
    this.intro.dancerPhase = s.dancerPhase;
    this.ballet.progress = s.balletProgress;
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
