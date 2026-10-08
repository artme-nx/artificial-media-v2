import * as THREE from "three";
import { RobotCrowd } from "../figure/crowd";
import { UNIT } from "../figure/figure";
import { getPose } from "@/src/motion/library";
import { armIK, dirToAngles, layout, partMap, normalizePose, HAND_GRIP, HAND_HOLD, type Pose, type BallPart, type LathePart, type Vec3 } from "@/src/figure/kanon";
import { brushedSteel, polishedSteel } from "../materials/steel";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Robotski orkestar (07 Odluka 7. 10., 10-lik [ROBOT]): roboti sjede u redovima s instrumentima.
 * Pojednostavljeni, ali elegantni instrumenti (crni lak i čelik — bez drva i bez mesinga), instancirano.
 * Orkestar je uvijek pozadina i izvan fokusa. Sviranje prati takt dirigenta (beat, 0..1 po taktu).
 */
type Kind = "violina" | "violoncelo" | "timpani";
type Seat = { kind: Kind; pos: THREE.Vector3; yaw: number; row: number; phase: number };

const LACQUER = new THREE.MeshPhysicalMaterial({ color: "#070708", roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.1 });
const STRING = new THREE.MeshPhysicalMaterial({ color: "#e8e4dc", roughness: 0.5, sheen: 0.6, sheenColor: new THREE.Color("#ffffff"), envMapIntensity: 0.6 });
const SILVER = new THREE.MeshPhysicalMaterial({ color: "#b9bcc0", metalness: 1, roughness: 0.4, envMapIntensity: 0.9 });
const HEAD_SKIN = new THREE.MeshPhysicalMaterial({ color: "#d9d4ca", roughness: 0.65, sheen: 0.3, envMapIntensity: 0.5 });

/** Sjedenje: bedra vodoravno naprijed, potkoljenice okomito (kanon postavi stopala na pod). */
function seatedBase(): Pose {
  const p = getPose("stoji");
  p.pelvis = { tilt: 0, pitch: 0, yaw: 0 };
  p.chest = { tilt: 0, pitch: 6, yaw: 0 };
  p.neck = { tilt: 0, pitch: 4, yaw: 0 };
  p.head = { tilt: 0, pitch: 6, yaw: 0 };
  p.legL = { th: [-7, -3], ph: [86, 4], foot: -12, fp: 0 };
  p.legR = { th: [7, 3], ph: [86, 4], foot: 12, fp: 0 };
  return normalizePose(p);
}

function violinGeometry() {
  // tijelo violine: dvije oble polovice sa strukom (2D obris, ekstrudirano, zaobljeno)
  const s = new THREE.Shape();
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 64; i++) {
    const t = i / 64; // 0 dno → 1 vrh
    const a = t * Math.PI;
    const w = 0.105 * (Math.sin(a) ** 0.6) * (1 - 0.32 * Math.exp(-(((t - 0.52) / 0.09) ** 2))) * (t < 0.5 ? 1.08 : 0.92);
    pts.push(new THREE.Vector2(w, t * 0.36));
  }
  s.moveTo(0, 0);
  for (const p of pts) s.lineTo(p.x, p.y);
  for (let i = pts.length - 1; i >= 0; i--) s.lineTo(-pts[i].x, pts[i].y);
  const body = new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.008, bevelSegments: 3, curveSegments: 4 });
  body.translate(0, 0, -0.0175);
  const neck = new THREE.BoxGeometry(0.026, 0.26, 0.02);
  neck.translate(0, 0.49, 0.02);
  const scroll = new THREE.TorusGeometry(0.018, 0.008, 8, 16);
  scroll.rotateY(Math.PI / 2);
  scroll.translate(0, 0.63, 0.02);
  // srebrne žice, kobilica i repić (svjetle linije koje hvataju rim svjetlo)
  const strings: THREE.BufferGeometry[] = [];
  for (const dx of [-0.009, -0.003, 0.003, 0.009]) {
    const st = new THREE.CylinderGeometry(0.0012, 0.0012, 0.52, 4);
    st.translate(dx, 0.33, 0.034);
    strings.push(st);
  }
  const bridge = new THREE.BoxGeometry(0.05, 0.006, 0.03);
  bridge.translate(0, 0.15, 0.03);
  strings.push(bridge);
  const tail = new THREE.BoxGeometry(0.03, 0.08, 0.006);
  tail.translate(0, 0.07, 0.032);
  strings.push(tail);
  const fittings = mergeGeometries(strings.map((g) => g.toNonIndexed()), false)!;
  return { body, neck, scroll, fittings, length: 0.64 };
}

export class Orchestra {
  group = new THREE.Group();
  crowd: RobotCrowd;
  seats: Seat[] = [];
  private instruments: Array<{ mesh: THREE.InstancedMesh; seatIdx: number[] }> = [];
  private bows: THREE.InstancedMesh;
  private bowSeats: number[] = [];
  private malletMesh: THREE.InstancedMesh;
  private malletSeats: number[] = [];
  private base = seatedBase();
  /** osvjetljenje redova 0..1 (kadar 8: hladno svjetlo red po red) */
  rowLight = [0, 0, 0];
  /** koliko orkestar svira 0..1 (kadar 9) i drži instrumente (kadar 10 spušta) */
  playing = 0;
  raised = 1;

  constructor() {
    // tri reda: violine, violončela, timpani (sjede okrenuti prema dirigentu, +z)
    const rows: Array<{ kind: Kind; n: number; z: number; y: number; spread: number }> = [
      { kind: "violina", n: 6, z: -2.6, y: 0, spread: 1.15 },
      { kind: "violoncelo", n: 5, z: -4.1, y: 0.22, spread: 1.35 },
      { kind: "timpani", n: 3, z: -5.6, y: 0.44, spread: 1.8 },
    ];
    rows.forEach((r, ri) => {
      for (let i = 0; i < r.n; i++) {
        const x = (i - (r.n - 1) / 2) * r.spread;
        // redovi su lagano zakrivljeni prema dirigentu
        const z = r.z + Math.abs(x) * 0.18;
        const yaw = -Math.atan2(x, 6) * 0.8;
        this.seats.push({ kind: r.kind, pos: new THREE.Vector3(x, r.y, z), yaw, row: ri, phase: (i * 0.37 + ri * 0.21) % 1 });
      }
    });
    this.crowd = new RobotCrowd(this.seats.length);
    this.group.add(this.crowd.group);

    // podiji (risers) i stolice
    const riserMat = new THREE.MeshPhysicalMaterial({ color: "#0c0b0b", roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.4 });
    for (const r of rows.slice(1)) {
      const riser = new THREE.Mesh(new THREE.BoxGeometry(10, r.y, 1.5), riserMat);
      riser.position.set(0, r.y / 2, r.z - 0.2);
      riser.receiveShadow = true;
      this.group.add(riser);
    }
    const chairGeo = new THREE.BoxGeometry(0.44, 0.04, 0.42);
    const chairBack = new THREE.BoxGeometry(0.42, 0.42, 0.03);
    const legGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.45, 8);
    const chairMat = new THREE.MeshPhysicalMaterial({ color: "#0b0b0c", roughness: 0.4, clearcoat: 0.5 });
    const seatIM = new THREE.InstancedMesh(chairGeo, chairMat, this.seats.length);
    const backIM = new THREE.InstancedMesh(chairBack, chairMat, this.seats.length);
    const legIM = new THREE.InstancedMesh(legGeo, polishedSteel({ roughness: 0.45 }), this.seats.length * 4);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    this.seats.forEach((s, i) => {
      q.setFromEuler(e.set(0, s.yaw, 0));
      const root = new THREE.Matrix4().compose(s.pos, q, new THREE.Vector3(1, 1, 1));
      seatIM.setMatrixAt(i, m.copy(root).multiply(new THREE.Matrix4().makeTranslation(0, 0.455, -0.22)));
      backIM.setMatrixAt(i, m.copy(root).multiply(new THREE.Matrix4().makeTranslation(0, 0.7, -0.44)));
      let k = 0;
      for (const dx of [-0.19, 0.19]) for (const dz of [-0.4, -0.04]) legIM.setMatrixAt(i * 4 + k++, m.copy(root).multiply(new THREE.Matrix4().makeTranslation(dx, 0.225, dz)));
    });
    for (const im of [seatIM, backIM, legIM]) {
      im.receiveShadow = true;
      this.group.add(im);
    }

    // instrumenti (instancirano po vrsti)
    const vio = violinGeometry();
    const nVio = this.seats.filter((s) => s.kind === "violina").length;
    const nCel = this.seats.filter((s) => s.kind === "violoncelo").length;
    const nTim = this.seats.filter((s) => s.kind === "timpani").length;
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, kind: Kind, count: number) => {
      const im = new THREE.InstancedMesh(geo, mat, count);
      im.frustumCulled = false;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.group.add(im);
      this.instruments.push({ mesh: im, seatIdx: this.seats.map((s, i) => (s.kind === kind ? i : -1)).filter((i) => i >= 0) });
    };
    add(vio.body, LACQUER, "violina", nVio);
    add(vio.neck, LACQUER, "violina", nVio);
    add(vio.fittings, SILVER, "violina", nVio);
    const celBody = vio.body.clone().scale(2.15, 2.1, 2.3);
    const celNeck = vio.neck.clone().scale(1.8, 2.1, 1.8);
    add(celBody, LACQUER, "violoncelo", nCel);
    add(celNeck, LACQUER, "violoncelo", nCel);
    add(vio.fittings.clone().scale(2.15, 2.1, 2.3), SILVER, "violoncelo", nCel);
    const endpin = new THREE.CylinderGeometry(0.006, 0.006, 0.32, 6);
    endpin.translate(0, -0.16, 0);
    add(endpin, polishedSteel({ roughness: 0.4 }), "violoncelo", nCel);
    // timpani: čelični kotao s bijelom opnom
    const kettle = new THREE.LatheGeometry(
      [new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.22, 0.04), new THREE.Vector2(0.33, 0.2), new THREE.Vector2(0.35, 0.36), new THREE.Vector2(0.36, 0.4)].map((v) => v),
      40,
    );
    kettle.translate(0, 0.38, 0);
    add(kettle, brushedSteel({ brush: 2, roughness: 0.3 }), "timpani", nTim);
    const head = new THREE.CircleGeometry(0.355, 40).rotateX(-Math.PI / 2).translate(0, 0.79, 0);
    add(head, HEAD_SKIN, "timpani", nTim);
    const legsT = new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6).translate(0, 0.2, 0);
    add(legsT, polishedSteel({ roughness: 0.4 }), "timpani", nTim);

    // gudala i palice za timpane
    const bowGeo = new THREE.CylinderGeometry(0.004, 0.005, 0.72, 6).translate(0, 0.36, 0);
    this.bows = new THREE.InstancedMesh(bowGeo, STRING, nVio + nCel);
    this.bowSeats = this.seats.map((s, i) => (s.kind !== "timpani" ? i : -1)).filter((i) => i >= 0);
    const mallet = new THREE.CylinderGeometry(0.006, 0.006, 0.36, 6).translate(0, 0.18, 0);
    this.malletMesh = new THREE.InstancedMesh(mallet, LACQUER, nTim * 2);
    this.malletSeats = this.seats.map((s, i) => (s.kind === "timpani" ? i : -1)).filter((i) => i >= 0);
    for (const im of [this.bows, this.malletMesh]) {
      im.frustumCulled = false;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.group.add(im);
    }
    this.update(0, 0);
  }

  private lastState = "";
  /** beat: položaj u taktu (0..4 za 4/4), t: vrijeme (s). Bez sviranja se ažurira samo kad se stanje promijeni. */
  update(t: number, beat: number) {
    const state = `${this.playing.toFixed(3)}|${this.raised.toFixed(3)}`;
    if (this.playing < 0.001 && state === this.lastState) return false;
    this.lastState = state;
    const tmp = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const inst: Record<Kind, THREE.Matrix4[]> = { violina: [], violoncelo: [], timpani: [] };
    const bowMs: THREE.Matrix4[] = [], malletMs: THREE.Matrix4[] = [];
    this.seats.forEach((s, i) => {
      const root = new THREE.Matrix4().compose(s.pos, q.setFromEuler(new THREE.Euler(0, s.yaw, 0)), new THREE.Vector3(1, 1, 1));
      const pose = JSON.parse(JSON.stringify(this.base)) as Pose;
      const pl = this.playing;
      const sway = Math.sin(t * 1.3 + s.phase * 6.28) * 2 * pl;
      pose.chest.tilt += sway;
      pose.head.tilt -= sway * 0.6;
      // kimanje glavom na prvi udarac takta
      const b1 = Math.max(0, 1 - ((beat % 4) / 0.35)) * pl;
      pose.head.pitch += b1 * 5;
      const parts = layout(pose);
      const P = partMap(parts);
      const chest = P.chest as LathePart;
      const C = new THREE.Vector3(...chest.S);
      const cx = new THREE.Vector3(...chest.M.x), cy = new THREE.Vector3(...chest.M.y), cz = new THREE.Vector3(...chest.M.z);
      const loc = (x: number, y: number, z: number) => C.clone().addScaledVector(cx, x).addScaledVector(cy, y).addScaledVector(cz, z);
      const raise = this.raised;
      let instMat: THREE.Matrix4 | null = null;
      let leftT: THREE.Vector3, rightT: THREE.Vector3;
      if (s.kind === "violina") {
        // violina na lijevom ramenu robota (R na ekranu), gudalo u desnoj šaci (L)
        // violina pod bradom na lijevom ramenu: donji dio na ključnoj kosti, vrat prema naprijed-lijevo
        const base = loc(0.3, 1.62 - (1 - raise) * 0.9, 0.3);
        const dir = new THREE.Vector3(0.62, 0.02 - (1 - raise) * 0.7, 0.78).normalize();
        instMat = new THREE.Matrix4().lookAt(new THREE.Vector3(), dir, new THREE.Vector3(0, 1, 0));
        instMat.multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2)).setPosition(base);
        leftT = base.clone().addScaledVector(dir, 2.3);
        const bowPhase = Math.sin(t * 3.1 + s.phase * 6.28) * pl;
        rightT = loc(-0.35 + bowPhase * 0.5, 1.3 - (1 - raise) * 0.7, 1.1);
      } else if (s.kind === "violoncelo") {
        const base = new THREE.Vector3(0, 0.35, 1.05);
        instMat = new THREE.Matrix4().makeRotationX(-0.25).setPosition(base);
        leftT = loc(0.35, 0.55, 0.95);
        const bowPhase = Math.sin(t * 2.4 + s.phase * 6.28) * pl;
        rightT = loc(-0.55 + bowPhase * 0.7, -0.6, 1.25);
      } else {
        instMat = new THREE.Matrix4().makeTranslation(0, 0, 1.6);
        const hit = Math.max(0, Math.sin((beat % 1) * Math.PI)) * pl;
        leftT = loc(0.55, -0.3 + hit * 0.35, 1.45);
        rightT = loc(-0.55, -0.3 + (1 - hit) * 0.35 * pl, 1.45);
      }
      for (const [side, T, pole] of [["L", rightT, [-0.7, -1, -0.3]], ["R", leftT, [0.7, -1, -0.3]]] as const) {
        const sh = (P["shoulder" + side] as BallPart).c;
        const ik = armIK(sh, [T.x, T.y, T.z] as Vec3, pole as unknown as Vec3);
        const arm = side === "L" ? pose.armL : pose.armR;
        arm.th[0] = ik.th[0]; arm.ph[0] = ik.ph[0]; arm.th[1] = ik.th[1]; arm.ph[1] = ik.ph[1];
        const fd = new THREE.Vector3(...ik.wrist).sub(new THREE.Vector3(...ik.elbow)).normalize();
        const [th, ph] = dirToAngles([fd.x, fd.y, fd.z]);
        arm.th[2] = th; arm.ph[2] = ph;
      }
      pose.handL = { ...HAND_GRIP };
      pose.handR = s.kind === "violina" ? { ...HAND_HOLD } : { ...HAND_GRIP };
      const MP = this.crowd.setRobot(i, pose, root, layout(pose));
      // instrument u prostoru robota (jedinice glave → m preko UNIT)
      const toWorld = new THREE.Matrix4().multiplyMatrices(root, new THREE.Matrix4().makeScale(UNIT, UNIT, UNIT));
      if (instMat) {
        // geometrija instrumenta je u metrima: položaj u jedinicama glave → (×UNIT) metri; mjerilo geometrije 1/UNIT poništava UNIT
        const m = new THREE.Matrix4().multiplyMatrices(toWorld, instMat).multiply(new THREE.Matrix4().makeScale(1 / UNIT, 1 / UNIT, 1 / UNIT));
        if (s.kind === "timpani") m.copy(root).multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.62));
        inst[s.kind].push(m);
      }
      // gudalo / palice prate šaku
      const handL = MP.handL as LathePart;
      const hp = new THREE.Vector3(...handL.S).addScaledVector(new THREE.Vector3(...handL.M.y), 0.35);
      if (s.kind !== "timpani") {
        const bdir = s.kind === "violina" ? new THREE.Vector3(0.85, 0.15, -0.5).normalize() : new THREE.Vector3(1, 0.05, 0.1).normalize();
        const bm = new THREE.Matrix4().lookAt(new THREE.Vector3(), bdir, new THREE.Vector3(0, 1, 0)).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
        bm.setPosition(hp.clone().addScaledVector(bdir, -1.2));
        bowMs.push(new THREE.Matrix4().multiplyMatrices(toWorld, bm).multiply(new THREE.Matrix4().makeScale(1 / UNIT, 1 / UNIT, 1 / UNIT)));
      } else {
        for (const side of ["L", "R"] as const) {
          const h = MP["hand" + side] as LathePart;
          const p0 = new THREE.Vector3(...h.S).addScaledVector(new THREE.Vector3(...h.M.y), 0.3);
          const md = new THREE.Vector3(...h.M.y);
          const mm = new THREE.Matrix4().lookAt(new THREE.Vector3(), md, new THREE.Vector3(0, 1, 0)).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2)).setPosition(p0);
          malletMs.push(new THREE.Matrix4().multiplyMatrices(toWorld, mm).multiply(new THREE.Matrix4().makeScale(1 / UNIT, 1 / UNIT, 1 / UNIT)));
        }
      }
      void tmp;
    });
    for (const it of this.instruments) {
      const kind = this.seats[it.seatIdx[0]].kind;
      it.seatIdx.forEach((_, k) => it.mesh.setMatrixAt(k, inst[kind][k]));
      it.mesh.instanceMatrix.needsUpdate = true;
    }
    bowMs.forEach((m, k) => this.bows.setMatrixAt(k, m));
    malletMs.forEach((m, k) => this.malletMesh.setMatrixAt(k, m));
    this.bows.instanceMatrix.needsUpdate = this.malletMesh.instanceMatrix.needsUpdate = true;
    this.crowd.commit();
    return true;
  }
}
