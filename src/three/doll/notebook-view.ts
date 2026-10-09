import * as THREE from "three";
import { Figure } from "../figure/figure";
import { buildEnvironment } from "../core/env";
import { lensCamera } from "../core/camera";
import { HeadLook, Spring, reachTo } from "@/src/motion/look";
import { PoseAnimator, applySecondary } from "@/src/motion/animator";
import { getPose, type PoseName } from "@/src/motion/library";
import { type LathePart, type Vec3 } from "@/src/figure/kanon";
import type { NotebookEvent, NotebookState } from "@/lib/notebook";
import { isCalm } from "@/lib/calm";

/**
 * "Lutka bilježi" (/start, 07 tablica stanja; 11 F8). Lutka iz profila pod reflektorom, s bilježnicom i olovkom
 * pričvršćenima za šake. Sadržaj bilježnice se nikad ne vidi (kamera gleda korice i rub) i ne crta se rukopis.
 * Bilježnica stoji u okviru prsa, šaka koja je drži prati je kroz IK; olovka je u drugoj šaci i svaki znak je pomakne
 * duž retka (IK prema točki na stranici).
 */
type Book = { group: THREE.Group; right: THREE.Group; page: THREE.Group };

function makeBook(): Book {
  // jedinice glave (0,22 m): 0,7 × 0,95 (≈ 15 × 21 cm), korice tamne, rubovi stranica krem
  // topla tamnosmeđa koža (uvez), blok stranica krem — s ruba se čita kao bilježnica, ne kao uređaj
  // mat koža (bez laka): pod kliznim kutom ne smije se pretvoriti u sivo zrcalo
  const cover = new THREE.MeshPhysicalMaterial({ color: "#2b1810", roughness: 0.78, specularIntensity: 0.35, envMapIntensity: 0.45 });
  const pages = new THREE.MeshStandardMaterial({ color: "#ece5d8", roughness: 0.9 });
  const group = new THREE.Group();
  const half = (side: 1 | -1) => {
    const g = new THREE.Group();
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.95, 0.022), cover);
    c.position.set(side * 0.35, 0, -0.03);
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.91, 0.07), pages);
    p.position.set(side * 0.34, 0, 0.02);
    g.add(c, p);
    return g;
  };
  const left = half(-1);
  const right = half(1);
  // list koji se okreće (novo polje): tanka stranica uz hrbat
  const page = new THREE.Group();
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.9, 0.006), pages);
  leaf.position.set(0.33, 0, 0.03);
  page.add(leaf);
  page.visible = false;
  group.add(left, right, page);
  return { group, right, page };
}

function makePencil() {
  const g = new THREE.Group();
  const lacquer = new THREE.MeshPhysicalMaterial({ color: "#121212", roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const wood = new THREE.MeshStandardMaterial({ color: "#d9c2a0", roughness: 0.7 });
  const lead = new THREE.MeshStandardMaterial({ color: "#2a2a2c", roughness: 0.5, metalness: 0.2 });
  // ~19 cm (0,86 jedinica glave): kraj olovke viri iznad bilježnice dok piše
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.76, 6), lacquer);
  body.position.y = 0.38 + 0.1;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.09, 6), wood);
  cone.rotation.x = Math.PI;
  cone.position.y = 0.055;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.03, 6), lead);
  tip.rotation.x = Math.PI;
  tip.position.y = 0.0;
  g.add(body, cone, tip);
  return g;
}

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

export class NotebookView {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = lensCamera(50, 0.75);
  figure: Figure;
  animator: PoseAnimator;
  look = new HeadLook();
  state: NotebookState = "idle";
  reduced: boolean;
  private book: Book;
  private pencil: THREE.Group;
  private open = new Spring(1, 6); // 1 = otvorena, 0 = zatvorena
  private bodyYaw = new Spring(-Math.PI / 2, 3.5);
  private pageTurn = 0; // 0..1 dok se list okreće
  private line = 0; // redak na stranici
  private col = 0; // položaj u retku 0..1
  private penLift = new Spring(0, 14);
  private shake = 0; // greška: odmahivanje glavom
  private headMode: "book" | "form" | "away" = "book";
  private seq: Array<{ at: number; fn: () => void }> = [];
  private seqT = 0;
  private raf = 0;
  private last = 0;
  private t = 0;
  private running = false;
  private tmpM = new THREE.Matrix4();
  private bookFrame = new THREE.Matrix4();
  /** shaderi prevedeni paralelno prije prvog crtanja (vidi DollView.ready) */
  ready!: Promise<void>;
  private isReady = false;
  private skip = false;

  constructor(public canvas: HTMLCanvasElement) {
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setClearColor(0x000000, 0);
    this.scene.environment = buildEnvironment(this.renderer, {
      top: "#f2ede4",
      horizon: "#d6cfc3",
      bottom: "#8f877b",
      boxes: [
        { dir: [-0.3, 0.9, 0.4], size: [8, 8], intensity: 3.4, color: "#fff4e6", softness: 0.6 },
        { dir: [0.8, 0.3, -0.6], size: [6, 10], intensity: 1.6, color: "#f4f6ff", softness: 0.8 },
      ],
    });
    this.scene.environmentIntensity = 0.7;
    // reflektor odozgo (topli), mekana ispuna, hladni rub straga
    const spot = new THREE.SpotLight("#ffe9d2", 70, 0, THREE.MathUtils.degToRad(28), 0.75, 2);
    spot.position.set(1.2, 5.2, 1.4);
    spot.target.position.set(0, 1.0, 0);
    // prava bačena sjena (lutka, ruke, bilježnica) na pod: meki PCF, prozirni materijal sjene
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap; // r18x: PCFSoftShadowMap uklonjen, meki rub daje shadow.radius
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.radius = 6;
    spot.shadow.bias = -0.0004;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: 0.28, color: "#3a2a1c" }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    const rim = new THREE.DirectionalLight("#eef2ff", 1.2);
    rim.position.set(1.6, 2.2, -2.2);
    this.scene.add(spot, spot.target, rim, new THREE.HemisphereLight("#fffaf2", "#b9b0a2", 0.55));
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.36), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, toneMapped: false }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.002;
    this.scene.add(sh);

    this.figure = new Figure({ look: "wood" });
    this.figure.setShadows(true);
    // profil: lutka gleda prema formi (lijevo na ekranu)
    this.figure.group.rotation.y = -Math.PI / 2;
    this.scene.add(this.figure.group);
    this.figure.viewCamera = this.camera;
    const start = getPose("biljeznica_drzi");
    this.animator = new PoseAnimator(start);
    this.figure.setPose(start);
    this.book = makeBook();
    this.pencil = makePencil();
    this.figure.body.add(this.book.group, this.pencil);
    for (const o of [this.book.group, this.pencil]) o.traverse((m) => ((m as THREE.Mesh).isMesh ? ((m as THREE.Mesh).castShadow = true) : null));
    this.book.group.matrixAutoUpdate = false;
    this.pencil.matrixAutoUpdate = false;
    this.camera.position.set(0.3, 1.22, 3.85);
    this.camera.lookAt(0, 0.98, 0);
    this.look.limit = 35;
    this.ready = this.renderer
      .compileAsync(this.scene, this.camera)
      .catch(() => undefined)
      .then(() => {
        this.isReady = true;
        this.kick();
      });
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

  // ---------------------------------------------------------------- stanja (07 tablica)
  event(e: NotebookEvent) {
    if (e.type === "stroke") {
      // svaki znak pomakne olovku: korak duž retka, kratko podizanje
      this.col += 0.045 + Math.random() * 0.02;
      if (this.col > 1) this.nextLine();
      this.penLift.x = 0.6;
      this.kick();
      return;
    }
    const prev = this.state;
    this.state = e.state;
    this.seq = [];
    this.seqT = 0;
    switch (e.state) {
      case "idle":
        this.headMode = "book";
        this.open.x = Math.max(this.open.x, 0.2);
        this.animator.go(getPose("biljeznica_drzi"), 0.7);
        break;
      case "attention":
        this.headMode = "form";
        this.animator.go(getPose("biljeznica_drzi"), 0.5);
        break;
      case "typing":
        this.headMode = "book";
        this.animator.go(getPose("biljeznica_pise"), 0.45);
        break;
      case "thinking":
        this.headMode = "away";
        this.animator.go(getPose("biljeznica_misli"), 0.7);
        break;
      case "newfield":
        // novo polje: okretanje lista (uvijek vidljivo), pa olovka na prvi redak
        this.headMode = "book";
        this.line = 0;
        this.col = 0.05;
        this.pageTurn = 0.001;
        this.book.page.visible = true;
        this.animator.go(getPose("biljeznica_drzi"), 0.4);
        break;
      case "error":
        this.headMode = "form";
        this.shake = 1;
        this.animator.go(getPose("biljeznica_greska"), 0.4);
        break;
      case "sent":
        // zatvori bilježnicu, révérence kao zahvala
        this.headMode = "book";
        this.seq = [
          { at: 0.0, fn: () => this.animator.go(getPose("biljeznica_drzi"), 0.5) },
          { at: 0.35, fn: () => (this.open.x = this.open.x) },
          { at: 1.1, fn: () => this.animator.go(getPose("b_reverence_duboka"), 0.95) },
          { at: 2.7, fn: () => this.animator.go(getPose("biljeznica_drzi"), 0.8) },
        ];
        break;
      case "leave":
        this.headMode = "away";
        break;
    }
    void prev;
    this.kick();
  }

  /** obećanje koje forma čeka prije potvrde (révérence završi) */
  waitSent() {
    return new Promise<void>((res) => setTimeout(res, this.reduced ? 200 : 3100));
  }

  private nextLine(turn = false) {
    this.col = 0.05;
    this.line += 1;
    if (this.line > 9 || turn) {
      if (this.line > 9 || Math.random() < 0.5) {
        this.line = 0;
        this.pageTurn = 0.001; // okreni list
        this.book.page.visible = true;
      }
    }
  }

  // ---------------------------------------------------------------- okviri
  /** okvir bilježnice u prostoru lutke: ispred prsa, stranice nagnute prema licu */
  private updateBookFrame() {
    const chest = this.figure.map.chest as LathePart | undefined;
    if (!chest) return;
    const C = new THREE.Vector3(...chest.S), X = new THREE.Vector3(...chest.M.x), Y = new THREE.Vector3(...chest.M.y), Z = new THREE.Vector3(...chest.M.z);
    const pos = C.clone().addScaledVector(Y, 0.42).addScaledVector(Z, 1.18).addScaledVector(X, 0.05);
    // ravnina stranica: normala prema licu (gore i natrag)
    const n = Y.clone().multiplyScalar(0.62).addScaledVector(Z, -0.78).normalize(); // stranice gledaju lutku (gore i natrag)
    const up = Z.clone().addScaledVector(Y, 0.55).normalize();
    const xAxis = new THREE.Vector3().crossVectors(up, n).normalize();
    const yAxis = new THREE.Vector3().crossVectors(n, xAxis).normalize();
    // skicirka ~A4 (1,35 × osnovna veličina): čita se kao bilježnica, ne kao mobitel
    const S = 1.35;
    // ~25° prema kameri oko okomite osi stranice: vidi se kožni uvez i krem rub bloka, sadržaj ostaje okrenut lutki
    const turn = new THREE.Quaternion().setFromAxisAngle(yAxis, -0.06);
    xAxis.applyQuaternion(turn);
    n.applyQuaternion(turn);
    this.bookFrame.makeBasis(xAxis.multiplyScalar(S), yAxis.multiplyScalar(S), n.multiplyScalar(S)).setPosition(pos);
  }

  private bookPoint(u: number, v: number): Vec3 {
    // u 0..1 preko desne stranice, v 0..1 odozgo prema dolje (u jedinicama glave)
    const p = new THREE.Vector3(0.06 + u * 0.56, 0.38 - v * 0.72, 0.04).applyMatrix4(this.bookFrame);
    return [p.x, p.y, p.z];
  }

  private frame = (now: number) => {
    this.raf = 0;
    if (!this.running || !this.isReady) return;
    // mirovanje (bez tipkanja i pokazivača, bez koreografije): svaki drugi frame (lib/calm.ts)
    const calm = !this.seq.length && isCalm(now);
    this.skip = calm && !this.skip;
    if (this.skip) {
      this.raf = requestAnimationFrame(this.frame);
      return;
    }
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 1 / 60;
    this.last = now;
    this.t += dt;
    if (this.seq.length) {
      this.seqT += dt;
      while (this.seq.length && this.seqT >= this.seq[0].at) this.seq.shift()!.fn();
    }
    // bilježnica: zatvara se u stanju "poslano" i pri odlasku (prazne stranice se ne pokazuju gledatelju)
    this.open.step((this.state === "sent" && this.seqT > 0.4) || this.state === "leave" ? 0 : 1, dt);
    const pose = this.animator.update(dt);
    if (!this.reduced) applySecondary(pose, this.t, { breath: 1, sway: 0.25 });
    // okviri i IK: šaka drži bilježnicu (donji rub uz hrbat), olovka prati redak
    this.figure.setPose(pose); // za okvir prsa
    this.updateBookFrame();
    const parts = this.figure.parts;
    if (parts.length) {
      const holdBlend = this.state === "sent" && this.seqT > 1.0 && this.seqT < 2.9 ? 0 : 1;
      // dalja ruka (L, iza bilježnice gledano s kamere) drži bilježnicu uz hrbat
      reachTo(pose, parts, "L", this.bookPoint(-0.05, 0.82), holdBlend);
      const writing = this.state === "typing";
      this.penLift.step(0, dt);
      // razmišlja: olovka uz bradu
      if (this.state === "thinking") {
        const head = this.figure.map.head as LathePart | undefined;
        if (head) {
          // zapešće ispod brade (šaka i olovka se dižu prema bradi)
          const chin = new THREE.Vector3(...head.S).addScaledVector(new THREE.Vector3(...head.M.z), 0.36).addScaledVector(new THREE.Vector3(...head.M.y), -0.42);
          reachTo(pose, parts, "R", [chin.x, chin.y, chin.z], 0.9);
        }
      }
      // bliža ruka (R) s olovkom: piše duž retka; inače olovka miruje uz stranicu (ne visi u zraku)
      else if (this.state !== "error" && this.state !== "leave" && !(this.state === "sent" && this.seqT > 0.3)) {
        const v = 0.12 + this.line * 0.075;
        const tgt = writing ? this.bookPoint(Math.min(0.95, this.col), Math.min(0.92, v)) : this.bookPoint(0.78, 0.86);
        const lift = (writing ? this.penLift.x * 0.06 : 0.1);
        reachTo(pose, parts, "R", [tgt[0], tgt[1] + lift, tgt[2] + lift], 0.9);
      }
      // glava: bilježnica / forma / u stranu; greška: lagano odmahivanje
      const head = this.figure.map.head as LathePart | undefined;
      if (head) {
        const hc = new THREE.Vector3(...head.S);
        const target =
          this.headMode === "book" ? this.bookPoint(0.4, 0.4)
          : this.headMode === "form" ? ([hc.x - 0.2, hc.y - (this.state === "error" ? 1.6 : 0.35), hc.z + 3] as Vec3)
          : this.state === "thinking" ? ([hc.x + 1.4, hc.y + 1.3, hc.z + 1.6] as Vec3)
          : ([hc.x + 2.2, hc.y + 0.2, hc.z + 0.6] as Vec3);
        this.look.target = this.reduced ? null : target;
        this.look.update(parts, dt);
      }
      this.look.apply(pose);
      if (this.shake > 0) {
        pose.head.yaw += Math.sin((1 - this.shake) * Math.PI * 4) * 9 * this.shake;
        this.shake = Math.max(0, this.shake - dt * 0.9);
      }
    }
    const wantYaw = -Math.PI / 2 + (this.state === "leave" ? 0.75 : 0);
    this.bodyYaw.step(wantYaw, dt);
    this.figure.group.rotation.y = this.bodyYaw.x;
    this.figure.setPose(pose);
    // rekviziti: bilježnica u okviru prsa (otvorena/zatvorena), olovka u šaci L
    this.book.group.matrix.copy(this.bookFrame);
    this.book.group.matrixWorldNeedsUpdate = true;
    this.book.right.rotation.y = -(1 - this.open.x) * Math.PI * 0.97;
    if (this.pageTurn > 0) {
      this.pageTurn = Math.min(1, this.pageTurn + dt / 0.9);
      this.book.page.rotation.y = -this.pageTurn * Math.PI;
      if (this.pageTurn >= 1) {
        this.pageTurn = 0;
        this.book.page.visible = false;
        this.book.page.rotation.y = 0;
      }
    }
    const hand = this.figure.map.handR as LathePart | undefined;
    if (hand) {
      this.figure.frameMatrix(hand, this.tmpM);
      // olovka u šaci: između palca i kažiprsta, vrh prema stranici
      // vrh između palca i kažiprsta, tijelo olovke preko hrpta šake prema gore i natrag (kraj viri iznad bilježnice)
      const grip = new THREE.Matrix4().compose(new THREE.Vector3(0.03, 0.32, 0.06), new THREE.Quaternion().setFromEuler(new THREE.Euler(-2.2, 0, 0.35)), new THREE.Vector3(1, 1, 1));
      this.pencil.matrix.multiplyMatrices(this.tmpM, grip);
      this.pencil.matrixWorldNeedsUpdate = true;
    }
    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.frame);
  };

  kick() {
    if (!this.isReady) return;
    if (this.running && !this.raf) this.raf = requestAnimationFrame(this.frame);
    if (this.reduced && !this.running) {
      this.running = true;
      this.frame(performance.now()); // jedan mirni kadar
      this.running = false;
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  setRunning(on: boolean) {
    if (this.reduced) {
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

  /** poster (scripts/make-posters.mjs): trenutni kadar s prozirnom pozadinom */
  snapshot() {
    this.renderer.render(this.scene, this.camera);
    return this.canvas.toDataURL("image/png");
  }

  dispose() {
    this.setRunning(false);
    this.renderer.dispose();
  }
}

export type { PoseName };
