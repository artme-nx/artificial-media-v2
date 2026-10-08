import * as THREE from "three";
import { layout, partMap, type LathePart, type BallPart, type Part } from "@/src/figure/kanon";
import { getPose } from "@/src/motion/library";
import { latheGeometry, specOf } from "./geometry";
import { woolMaterial, satinMaterial, shirtMaterial, silkMaterial, patentMaterial } from "../materials/fabric";

/**
 * Smoking kao sloj na istom tijelu (10-lik §3 [SMOKING], 07: "kostim na istom tijelu").
 * Krojeni sako sa satenskim špicastim reverima, skut, gumb, bijela košulja s ovratnikom i manšetama,
 * ljubičasta svilena leptir-mašna i maramica, hlače sa satenskom prugom, lakirane cipele.
 * Vide se samo drvena glava, čelični vrat i drvene šake s čeličnim zglobovima.
 *
 * Tehnika: SkinnedMesh; kosti su okviri dijelova kanona (isti raspored kao drvo), vezanje u pozi "stoji".
 * Sve je u jedinicama glave, u prostoru lutke (Figure.body).
 */
export const COSTUME_BONES = ["pelvis", "chest", "upperL", "foreL", "handL", "upperR", "foreR", "handR", "thighL", "shinL", "footL", "thighR", "shinR", "footR"] as const;
type BoneName = (typeof COSTUME_BONES)[number];
const BI = Object.fromEntries(COSTUME_BONES.map((b, i) => [b, i])) as Record<BoneName, number>;
type W = Array<[BoneName, number]>;

/** Dijelovi drvenog tijela koje kostim pokriva (skrivaju se kad je kostim uključen). */
export const COVERED_PARTS = ["chest", "pelvis", "upperL", "upperR", "foreL", "foreR", "thighL", "thighR", "shinL", "shinR", "footL", "footR"];
export const COVERED_JOINTS = ["waist", "shoulderL", "shoulderR", "elbowL", "elbowR", "hipL", "hipR", "kneeL", "kneeR", "ankleL", "ankleR"];

const V3 = (a: number[]) => new THREE.Vector3(a[0], a[1], a[2]);
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function table(tab: Array<[number, number]>, x: number) {
  if (x <= tab[0][0]) return tab[0][1];
  for (let i = 0; i < tab.length - 1; i++) {
    const [a, va] = tab[i], [b, vb] = tab[i + 1];
    if (x <= b) {
      const u = (x - a) / (b - a);
      const s = u * u * (3 - 2 * u);
      return va + (vb - va) * s;
    }
  }
  return tab[tab.length - 1][1];
}

class Builder {
  nrm = new Map<number, THREE.Vector3>(); // analitičke normale (glatka ploha trupa)
  pos: number[] = [];
  skinI: number[] = [];
  skinW: number[] = [];
  idx: number[] = [];
  satin: number[] = [];
  v(p: THREE.Vector3, w: W, satin = 0) {
    this.pos.push(p.x, p.y, p.z);
    const ws = w.filter(([, x]) => x > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const sum = ws.reduce((a, [, x]) => a + x, 0) || 1;
    for (let k = 0; k < 4; k++) {
      this.skinI.push(ws[k] ? BI[ws[k][0]] : 0);
      this.skinW.push(ws[k] ? ws[k][1] / sum : 0);
    }
    this.satin.push(satin);
    return this.pos.length / 3 - 1;
  }
  quad(a: number, b: number, c: number, d: number) {
    this.idx.push(a, b, c, a, c, d);
  }
  /** Mreža redaka (svaki redak jednak broj vrhova). flip mijenja smjer normala. */
  grid(rows: number[][], closed = false, flip = false) {
    for (let i = 0; i < rows.length - 1; i++) {
      const r0 = rows[i], r1 = rows[i + 1];
      const n = r0.length;
      const m = closed ? n : n - 1;
      for (let j = 0; j < m; j++) {
        const j1 = (j + 1) % n;
        if (flip) this.quad(r0[j], r0[j1], r1[j1], r1[j]);
        else this.quad(r0[j], r1[j], r1[j1], r0[j1]);
      }
    }
  }
  geometry() {
    // winding trokuta uskladi s analitičkim normalama (DoubleSide okreće normale stražnjih ploha)
    if (this.nrm.size) {
      const P = (i: number) => new THREE.Vector3(this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]);
      for (let t = 0; t < this.idx.length; t += 3) {
        const [a, b, c] = [this.idx[t], this.idx[t + 1], this.idx[t + 2]];
        const na = this.nrm.get(a) ?? this.nrm.get(b) ?? this.nrm.get(c);
        if (!na) continue;
        const fn = new THREE.Vector3().crossVectors(P(b).sub(P(a)), P(c).sub(P(a)));
        if (fn.dot(na) < 0) {
          this.idx[t + 1] = c;
          this.idx[t + 2] = b;
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(this.skinI, 4));
    g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(this.skinW, 4));
    g.setAttribute("aSatin", new THREE.Float32BufferAttribute(this.satin, 1));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    for (const [i, n] of this.nrm) g.attributes.normal.setXYZ(i, n.x, n.y, n.z);
    // tangente (za anizotropiju satena i svile): vodoravno, okomito na normalu
    const n = g.attributes.normal, t = new Float32Array(n.count * 4);
    const N = new THREE.Vector3(), Tv = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), X = new THREE.Vector3(1, 0, 0);
    for (let i = 0; i < n.count; i++) {
      N.fromBufferAttribute(n, i);
      Tv.crossVectors(Y, N);
      if (Tv.lengthSq() < 1e-6) Tv.crossVectors(X, N);
      Tv.normalize();
      t.set([Tv.x, Tv.y, Tv.z, 1], i * 4);
    }
    g.setAttribute("tangent", new THREE.BufferAttribute(t, 4));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((this.pos.length / 3) * 2), 2));
    g.computeBoundingSphere();
    return g;
  }
}

/** Ortonormalni okviri uzduž krivulje (paralelni prijenos). */
function transportFrames(pts: THREE.Vector3[], up0: THREE.Vector3) {
  const T: THREE.Vector3[] = [], N: THREE.Vector3[] = [], B: THREE.Vector3[] = [];
  for (let i = 0; i < pts.length; i++) {
    const t = (i < pts.length - 1 ? pts[i + 1].clone().sub(pts[i]) : pts[i].clone().sub(pts[i - 1])).normalize();
    T.push(t);
  }
  let n = up0.clone().sub(T[0].clone().multiplyScalar(up0.dot(T[0]))).normalize();
  for (let i = 0; i < pts.length; i++) {
    if (i > 0) {
      const axis = new THREE.Vector3().crossVectors(T[i - 1], T[i]);
      const s = axis.length();
      if (s > 1e-6) n.applyAxisAngle(axis.normalize(), Math.asin(Math.min(1, s)));
    }
    n = n.sub(T[i].clone().multiplyScalar(n.dot(T[i]))).normalize();
    N.push(n.clone());
    B.push(new THREE.Vector3().crossVectors(T[i], n).normalize());
  }
  return { T, N, B };
}

/** Cijev uzduž polilinije (rukav, nogavica, manšeta). r(s), dubina presjeka, težine po s. */
function tube(b: Builder, pts: THREE.Vector3[], radius: (s: number) => number, weights: (s: number) => W, opts: { radial?: number; depth?: number; front?: THREE.Vector3; satin?: (dir: THREE.Vector3) => number; flip?: boolean } = {}) {
  const radial = opts.radial ?? 40;
  const { N, B } = transportFrames(pts, opts.front ?? new THREE.Vector3(0, 0, 1));
  const rows: number[][] = [];
  pts.forEach((c, i) => {
    const s = i / (pts.length - 1);
    const r = radius(s);
    const w = weights(s);
    const row: number[] = [];
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const dir = N[i].clone().multiplyScalar(Math.cos(a) * (opts.depth ?? 1)).add(B[i].clone().multiplyScalar(Math.sin(a)));
      row.push(b.v(c.clone().add(dir.clone().multiplyScalar(r)), w, opts.satin ? opts.satin(dir.normalize()) : 0));
    }
    rows.push(row);
  });
  b.grid(rows, true, !!opts.flip);
  return rows;
}

function polyline(points: THREE.Vector3[], n: number) {
  // ravnomjerno po duljini
  const L: number[] = [0];
  for (let i = 1; i < points.length; i++) L.push(L[i - 1] + points[i].distanceTo(points[i - 1]));
  const out: THREE.Vector3[] = [];
  for (let k = 0; k <= n; k++) {
    const d = (k / n) * L[L.length - 1];
    let i = 0;
    while (i < L.length - 2 && L[i + 1] < d) i++;
    const u = (d - L[i]) / Math.max(L[i + 1] - L[i], 1e-9);
    out.push(points[i].clone().lerp(points[i + 1], u));
  }
  return out;
}

// --------------------------------------------------------------------------------- sako: trup
// Visina (y, jedinice glave od poda) → poluširina / poludubina presjeka. Struk je stegnut (krojeno).
type Torso = { waistY: number; hemY: number; collarY: number; buttonY: number; shoulderY: number };

function torsoDims(T: Torso) {
  const y0 = T.hemY, ys = T.shoulderY;
  const W: Array<[number, number]> = [
    [y0, 0.7], [y0 + 0.5, 0.67], [T.waistY - 0.35, 0.63], [T.waistY + 0.05, 0.6], [T.waistY + 0.75, 0.73], [ys - 0.38, 0.82],
    [ys - 0.1, 0.86], [ys + 0.06, 0.8], [ys + 0.17, 0.6], [T.collarY - 0.06, 0.3], [T.collarY, 0.225],
  ];
  const D: Array<[number, number]> = [
    [y0, 0.54], [y0 + 0.5, 0.52], [T.waistY - 0.35, 0.47], [T.waistY + 0.05, 0.44], [T.waistY + 0.75, 0.5], [ys - 0.38, 0.5],
    [ys - 0.1, 0.47], [ys + 0.06, 0.42], [ys + 0.17, 0.34], [T.collarY - 0.06, 0.25], [T.collarY, 0.21],
  ];
  return { w: (y: number) => table(W, y), d: (y: number) => table(D, y) };
}
const EXP = 2.35;
const se = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), 2 / EXP);
/** Točka presjeka trupa: φ = 0 sprijeda (+z), raste prema +x. */
function torsoPoint(y: number, phi: number, w: number, d: number, inset = 0) {
  return new THREE.Vector3(se(Math.sin(phi)) * (w - inset), y, se(Math.cos(phi)) * (d - inset));
}
/** Analitička normala plohe trupa u (y, φ) (prema van). */
function torsoNormal(y: number, phi: number, dims: { w: (y: number) => number; d: (y: number) => number }, lift = 0) {
  const e = 1e-3;
  const P = (yy: number, pp: number) => torsoPoint(yy, pp, dims.w(yy) + lift, dims.d(yy) + lift);
  const dy = P(y + e, phi).sub(P(y - e, phi));
  const dp = P(y, phi + e).sub(P(y, phi - e));
  const n = new THREE.Vector3().crossVectors(dy, dp).normalize();
  const c = P(y, phi);
  if (n.x * c.x + n.z * c.z < 0) n.negate();
  return n;
}
/** Pola otvora sprijeda (x) na visini y: V od ovratnika do gumba, ispod gumba blago razmaknut skut. */
function openingX(y: number, T: Torso) {
  if (y >= T.buttonY) return 0.205 * smooth(T.buttonY, T.collarY, y) ** 0.85;
  return 0.36 * smooth(T.buttonY, T.hemY, y) ** 1.3;
}
function phiOpen(y: number, T: Torso, w: number) {
  const x = Math.min(openingX(y, T), w * 0.98);
  return Math.asin(Math.min(1, Math.pow(x / w, EXP / 2)));
}

export type CostumeMeshes = { meshes: THREE.SkinnedMesh[]; skeleton: THREE.Skeleton; bones: Record<BoneName, THREE.Bone>; baton: THREE.Object3D | null };

/** Gradi kostim u pozi vezanja ("stoji") i vraća SkinnedMesh-eve s kosturom. */
export function buildCostume(parent: THREE.Object3D): CostumeMeshes {
  const bindParts = layout(getPose("stoji"));
  const P = partMap(bindParts);
  const L = (n: string) => P[n] as LathePart;
  const Bc = (n: string) => V3((P[n] as BallPart).c);

  const wool = new Builder(), satin = new Builder(), shirt = new Builder(), silk = new Builder(), patent = new Builder();

  // ---------------- trup sakoa
  const waistY = Bc("waist").y;
  const shoulderY = (Bc("shoulderL").y + Bc("shoulderR").y) / 2 + 0.05;
  const neck = L("neck");
  const T: Torso = { waistY, hemY: Bc("hipL").y - 0.62, collarY: neck.S[1] + 0.11, buttonY: waistY + 0.08, shoulderY };
  const dims = torsoDims(T);
  const torsoW = (y: number): W => {
    const c = smooth(waistY - 0.25, waistY + 0.35, y);
    return [["chest", c], ["pelvis", 1 - c]];
  };
  {
    const ny = 90, nphi = 96;
    const rows: number[][] = [];
    for (let i = 0; i <= ny; i++) {
      const y = T.hemY + ((T.collarY - T.hemY) * i) / ny;
      const w = dims.w(y), d = dims.d(y);
      const p0 = phiOpen(y, T, w);
      const row: number[] = [];
      for (let j = 0; j <= nphi; j++) {
        const phi = p0 + ((Math.PI * 2 - 2 * p0) * j) / nphi;
        const p = torsoPoint(y, phi, w, d);
        // rame: dio težine na nadlakticu, da se linija ramena malo pomakne s podignutom rukom
        const sideX = Math.abs(p.x);
        const armW = y > shoulderY - 0.45 ? smooth(0.62, 1.0, sideX) * 0.3 : 0;
        const tw = torsoW(y).map(([b, x]) => [b, x * (1 - armW)] as [BoneName, number]);
        if (armW > 0) tw.push([p.x < 0 ? "upperL" : "upperR", armW]);
        const vi = wool.v(p, tw);
        wool.nrm.set(vi, torsoNormal(y, phi, dims));
        row.push(vi);
      }
      rows.push(row);
    }
    wool.grid(rows, false, false);
  }

  // ---------------- reveri (saten, špicasti): unutarnji rub = rub V-otvora (gumb → G), vanjski rub = krivulja
  // od gumba do vrha reverа (peak) koji se diže prema ramenu; gornji rub G → vrh je šav reverа i ovratnika.
  {
    const gY = shoulderY - 0.02; // točka G (spoj revera i ovratnika); vrh revera je viši (špicasti rever)
    const outer: Array<[number, number]> = [
      [0.0, T.buttonY], [0.11, T.buttonY + 0.32], [0.24, T.buttonY + 0.75], [0.35, shoulderY - 0.4], [0.43, shoulderY - 0.12], [0.47, shoulderY + 0.2],
    ];
    const outerLen: number[] = [0];
    for (let i = 1; i < outer.length; i++) outerLen.push(outerLen[i - 1] + Math.hypot(outer[i][0] - outer[i - 1][0], outer[i][1] - outer[i - 1][1]));
    const outerAt = (u: number) => {
      const d = u * outerLen[outerLen.length - 1];
      let i = 0;
      while (i < outer.length - 2 && outerLen[i + 1] < d) i++;
      const t = (d - outerLen[i]) / (outerLen[i + 1] - outerLen[i]);
      return [outer[i][0] + (outer[i + 1][0] - outer[i][0]) * t, outer[i][1] + (outer[i + 1][1] - outer[i][1]) * t];
    };
    for (const side of [1, -1]) {
      const nv = 60, nu = 12;
      const rows: number[][] = [];
      for (let i = 0; i <= nv; i++) {
        const v = i / nv;
        const yIn = T.buttonY + (gY - T.buttonY) * v;
        const xIn = openingX(yIn, T);
        const [xOut, yOut] = outerAt(v);
        const row: number[] = [];
        for (let k = 0; k <= nu; k++) {
          const u = k / nu;
          const x = xIn + (Math.max(xOut, xIn) - xIn) * u;
          const y = yIn + (yOut - yIn) * u;
          const w = dims.w(y), d = dims.d(y);
          const phi = Math.asin(Math.min(1, Math.pow(Math.min(x / w, 0.995), EXP / 2)));
          // rever leži na sakou; vanjski rub se blago odiže (zarolani rever)
          const lift = 0.016 + 0.018 * Math.sin(u * Math.PI * 0.5) * smooth(0, 0.25, v);
          const ph2 = side > 0 ? phi : Math.PI * 2 - phi;
          const p = torsoPoint(y, ph2, w + lift, d + lift);
          const vi = satin.v(p, torsoW(y));
          satin.nrm.set(vi, torsoNormal(y, ph2, dims, lift));
          row.push(vi);
        }
        rows.push(row);
      }
      satin.grid(rows, false, side < 0);
    }
  }
  // gumb (saten) na dnu V-a
  {
    const y = T.buttonY, w = dims.w(y), d = dims.d(y);
    const c = torsoPoint(y, 0, w + 0.012, d + 0.012);
    const disc = new THREE.CylinderGeometry(0.048, 0.044, 0.024, 28);
    disc.rotateX(Math.PI / 2);
    disc.translate(c.x, c.y, c.z + 0.006);
    addStatic(satin, disc, [["chest", 1]]);
  }

  // ---------------- košulja: prsni dio u V-otvoru, ovratnik
  {
    const ny = 50, nphi = 24;
    const rows: number[][] = [];
    for (let i = 0; i <= ny; i++) {
      const y = T.buttonY - 0.08 + ((T.collarY - 0.02 - (T.buttonY - 0.08)) * i) / ny;
      const w = dims.w(y), d = dims.d(y);
      const p0 = phiOpen(Math.max(y, T.buttonY), T, w) + 0.22;
      const row: number[] = [];
      for (let j = 0; j <= nphi; j++) {
        const phi = -p0 + (2 * p0 * j) / nphi;
        const vi = shirt.v(torsoPoint(y, phi, w, d, 0.035), torsoW(y));
        shirt.nrm.set(vi, torsoNormal(y, phi, dims, -0.035));
        row.push(vi);
      }
      rows.push(row);
    }
    shirt.grid(rows, false, false);
    // ovratnik oko baze vrata (vrat je čelični stup kanona)
    const nc = V3(neck.S), ny2 = V3(neck.M.y);
    const collarPts = [0, 1].map((k) => nc.clone().add(ny2.clone().multiplyScalar(0.02 + 0.2 * k)));
    tube(shirt, polyline(collarPts, 6), (s) => 0.176 + 0.016 * (1 - s), () => [["chest", 1]], { radial: 56 });
  }

  // ---------------- leptir-mašna (ljubičasta svila) i maramica
  {
    const y = neck.S[1] + 0.12;
    const front = 0.2;
    const knot = new THREE.SphereGeometry(0.038, 18, 12);
    knot.scale(1, 1.25, 0.8);
    knot.translate(0, y, front);
    addStatic(silk, knot, [["chest", 1]]);
    for (const s of [1, -1]) {
      // krilo: jastučić stisnut prema čvoru
      const g = new THREE.SphereGeometry(1, 28, 18);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = (p.getX(i) + 1) * 0.5; // 0 = čvor, 1 = vanjski kraj
        const pinch = 0.32 + 0.68 * Math.sin(Math.min(1, x * 1.15) * Math.PI * 0.5);
        p.setXYZ(i, s * (0.025 + x * 0.15), p.getY(i) * 0.062 * pinch, p.getZ(i) * 0.028 * (0.7 + 0.3 * pinch));
      }
      g.computeVertexNormals();
      g.translate(0, y, front - 0.004);
      addStatic(silk, g, [["chest", 1]]);
    }
    // maramica u prsnom džepu (lijeva strana lutke = desno na ekranu, +x)
    const py = shoulderY - 0.5;
    const pw = dims.w(py), pd = dims.d(py);
    for (const [dx, h] of [[0.0, 0.085], [0.06, 0.11], [0.12, 0.075]] as Array<[number, number]>) {
      const tri = new THREE.ConeGeometry(0.045, h, 4, 1);
      tri.rotateY(Math.PI / 4);
      tri.scale(1, 1, 0.35);
      const phi = Math.asin(Math.min(1, Math.pow((0.4 + dx) / pw, EXP / 2)));
      const at = torsoPoint(py, phi, pw + 0.02, pd + 0.02);
      tri.translate(at.x, py + h * 0.5, at.z);
      addStatic(silk, tri, [["chest", 1]]);
    }
    // obrub džepa (vuna)
    {
      const phiA = Math.asin(Math.min(1, Math.pow(0.36 / pw, EXP / 2))), phiB = Math.asin(Math.min(1, Math.pow(0.6 / pw, EXP / 2)));
      const rows: number[][] = [];
      for (const dy of [-0.02, 0.0]) {
        const row: number[] = [];
        for (let k = 0; k <= 8; k++) row.push(wool.v(torsoPoint(py + dy, phiA + ((phiB - phiA) * k) / 8, pw + 0.016, pd + 0.016), [["chest", 1]]));
        rows.push(row);
      }
      wool.grid(rows);
    }
  }

  // ---------------- rukavi (vuna), manšete (košulja), gumbi na rukavu (saten)
  for (const s of ["L", "R"] as const) {
    const S = Bc("shoulder" + s), E = Bc("elbow" + s), Wr = Bc("wrist" + s);
    const dirU = E.clone().sub(S).normalize(), dirF = Wr.clone().sub(E).normalize();
    const inward = new THREE.Vector3(s === "L" ? 1 : -1, 0, 0);
    const start = S.clone().add(inward.multiplyScalar(0.12)).add(new THREE.Vector3(0, -0.02, 0));
    const end = Wr.clone().add(dirF.clone().multiplyScalar(-0.06));
    const pts = polyline([start, E, end], 60);
    const total = start.distanceTo(E) + E.distanceTo(end);
    const sE = start.distanceTo(E) / total;
    const sleeveW = (u: number): W => {
      const b = smooth(sE - 0.07, sE + 0.07, u);
      const top = 1 - smooth(0.04, 0.2, u);
      return [["chest", top * 0.6], ["upper" + s as BoneName, (1 - b) * (1 - top * 0.6)], ["fore" + s as BoneName, b * (1 - top * 0.6)]];
    };
    tube(wool, pts, (u) => table([[0, 0.21], [0.07, 0.25], [0.16, 0.245], [sE - 0.05, 0.218], [sE, 0.212], [sE + 0.2, 0.198], [0.96, 0.178], [1, 0.176]], u), sleeveW, { radial: 44, depth: 0.95, front: new THREE.Vector3(0, 0, 1) });
    // manšeta košulje malo izviruje iz rukava
    const cuff = polyline([Wr.clone().add(dirF.clone().multiplyScalar(-0.16)), Wr.clone().add(dirF.clone().multiplyScalar(0.012))], 6);
    tube(shirt, cuff, () => 0.142, () => [["fore" + s as BoneName, 1]], { radial: 36 });
    // tri gumba s vanjske strane rukava
    const out = new THREE.Vector3(s === "L" ? -1 : 1, 0, 0);
    for (let k = 0; k < 3; k++) {
      const c = end.clone().add(dirF.clone().multiplyScalar(-0.08 - k * 0.055)).add(out.clone().multiplyScalar(0.176));
      const disc = new THREE.CylinderGeometry(0.019, 0.017, 0.012, 16);
      disc.rotateZ(Math.PI / 2);
      disc.translate(c.x, c.y, c.z);
      addStatic(satin, disc, [["fore" + s as BoneName, 1]]);
    }
  }

  // ---------------- hlače (vuna) sa satenskom prugom; sjedalo
  {
    // sjedalo: od struka do međunožja
    const ny = 26, nphi = 64;
    const yTop = waistY + 0.05, yBot = Bc("hipL").y - 0.3;
    const rows: number[][] = [];
    for (let i = 0; i <= ny; i++) {
      const y = yTop + ((yBot - yTop) * i) / ny;
      const w = table([[yTop, 0.6], [Bc("hipL").y + 0.2, 0.64], [yBot, 0.5]], y);
      const d = table([[yTop, 0.45], [Bc("hipL").y, 0.47], [yBot, 0.38]], y);
      const row: number[] = [];
      for (let j = 0; j < nphi; j++) row.push(wool.v(torsoPoint(y, (j / nphi) * Math.PI * 2, w, d), [["pelvis", 1]]));
      rows.push(row);
    }
    wool.grid(rows, true, false);
  }
  for (const s of ["L", "R"] as const) {
    const H = Bc("hip" + s), K = Bc("knee" + s), A = Bc("ankle" + s);
    const start = H.clone().add(new THREE.Vector3(0, 0.12, 0));
    const end = A.clone().add(new THREE.Vector3(0, -0.03, 0));
    const pts = polyline([start, K, end], 70);
    const total = start.distanceTo(K) + K.distanceTo(end);
    const sK = start.distanceTo(K) / total;
    const legW = (u: number): W => {
      const b = smooth(sK - 0.06, sK + 0.06, u);
      const top = 1 - smooth(0.02, 0.16, u);
      return [["pelvis", top * 0.5], ["thigh" + s as BoneName, (1 - b) * (1 - top * 0.5)], ["shin" + s as BoneName, b * (1 - top * 0.5)]];
    };
    const outward = new THREE.Vector3(s === "L" ? -1 : 1, 0, 0);
    tube(wool, pts, (u) => table([[0, 0.3], [0.15, 0.285], [sK - 0.05, 0.24], [sK, 0.232], [sK + 0.2, 0.218], [1, 0.212]], u), legW, {
      radial: 48,
      depth: 0.96,
      front: new THREE.Vector3(0, 0, 1),
      satin: (dir) => smooth(0.975, 0.99, dir.dot(outward)),
    });
  }

  // ---------------- lakirane cipele
  for (const s of ["L", "R"] as const) {
    const foot = L("foot" + s);
    const g = latheGeometry(specOf("foot" + s), { rings: 60, radial: 48 });
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      // malo veća od stopala; potplat ravan i malo niži
      p.setXYZ(i, x * 1.13 + Math.sign(x) * 0.006, y * 1.05 - 0.025, z >= 0 ? z * 1.16 + 0.012 : z * 1.05 - 0.008);
    }
    g.computeVertexNormals();
    const M = new THREE.Matrix4().set(
      foot.M.x[0], foot.M.y[0], foot.M.z[0], foot.S[0],
      foot.M.x[1], foot.M.y[1], foot.M.z[1], foot.S[1],
      foot.M.x[2], foot.M.y[2], foot.M.z[2], foot.S[2],
      0, 0, 0, 1,
    );
    g.applyMatrix4(M);
    addStatic(patent, g, [["foot" + s as BoneName, 1]]);
  }

  // ---------------- kostur i meshevi
  const bones = {} as Record<BoneName, THREE.Bone>;
  const boneList: THREE.Bone[] = [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pp = new THREE.Vector3(), ss = new THREE.Vector3();
  for (const b of COSTUME_BONES) {
    const bone = new THREE.Bone();
    bone.name = b;
    frameOf(P[b] as LathePart, m).decompose(pp, q, ss);
    bone.position.copy(pp);
    bone.quaternion.copy(q);
    parent.add(bone);
    bones[b] = bone;
    boneList.push(bone);
  }
  parent.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(boneList);
  const make = (b: Builder, mat: THREE.Material, name: string) => {
    const mesh = new THREE.SkinnedMesh(b.geometry(), mat);
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    parent.add(mesh);
    mesh.bind(skeleton);
    return mesh;
  };
  const meshes = [
    make(wool, woolMaterial(), "kostim-vuna"),
    make(satin, satinMaterial(), "kostim-saten"),
    make(shirt, shirtMaterial(), "kostim-kosulja"),
    make(silk, silkMaterial(), "kostim-svila"),
    make(patent, patentMaterial(), "kostim-cipele"),
  ];
  return { meshes, skeleton, bones, baton: null };
}

/** Kruti dodatak (gumb, mašna, cipela) u Builder, s jednom težinom. */
function addStatic(b: Builder, g: THREE.BufferGeometry, w: W) {
  const gi = g.index ? g : g;
  const p = gi.attributes.position;
  const base = b.pos.length / 3;
  for (let i = 0; i < p.count; i++) b.v(new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)), w);
  if (gi.index) for (let i = 0; i < gi.index.count; i++) b.idx.push(base + gi.index.getX(i));
  else for (let i = 0; i < p.count; i++) b.idx.push(base + i);
}

export function frameOf(p: LathePart, out: THREE.Matrix4) {
  return out.set(
    p.M.x[0], p.M.y[0], p.M.z[0], p.S[0],
    p.M.x[1], p.M.y[1], p.M.z[1], p.S[1],
    p.M.x[2], p.M.y[2], p.M.z[2], p.S[2],
    0, 0, 0, 1,
  );
}

/** Svaki frame: kosti = okviri dijelova trenutnog rasporeda. */
export function poseCostume(c: CostumeMeshes, parts: Part[]) {
  const P = partMap(parts);
  const m = new THREE.Matrix4();
  for (const b of COSTUME_BONES) {
    frameOf(P[b] as LathePart, m).decompose(c.bones[b].position, c.bones[b].quaternion, c.bones[b].scale);
  }
}
