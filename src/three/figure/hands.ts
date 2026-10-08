import * as THREE from "three";
import type { HandState } from "@/src/figure/kanon";
import { tangentsAroundY } from "./geometry";

/**
 * Šake s 5 prstiju (10-lik §1): po 3 metalna zgloba na prstu, 2 na palcu. Odstupa od kanona (šaka u jednom komadu);
 * logo se ne mijenja. Šaka živi u okviru dijela "hand" iz kanona: y uzduž šake od zapešća, x poprijeko,
 * z = normala dlana (prednja strana). Mjere su u jedinicama glave.
 */
const PL = 0.3; // duljina dlana do zglobova prstiju

type Finger = { x: number; y: number; len: number; rad: number; spread: number };
// kažiprst, srednji, prstenjak, mali (x za stranu +1; palac je na +x)
// temeljni zglobovi (MCP) su na rubu dlana, malo izvan njega, u blagom luku (srednji prst najdalje)
const FINGERS: Finger[] = [
  { x: 0.073, y: PL + 0.012, len: 0.232, rad: 0.0235, spread: 8 },
  { x: 0.025, y: PL + 0.024, len: 0.258, rad: 0.0245, spread: 2 },
  { x: -0.024, y: PL + 0.016, len: 0.24, rad: 0.0228, spread: -5 },
  { x: -0.07, y: PL - 0.006, len: 0.188, rad: 0.0205, spread: -11 },
];
const SPLIT = [0.45, 0.31, 0.24];
const TAPER = [1, 0.87, 0.75];
const CURL_MAX = [72, 98, 70]; // MCP, PIP, DIP (°)
const PH_LEN = 0.1, PH_RAD = 0.025; // osnovna geometrija članka (instance se skaliraju blizu 1)

function lerpTable(tab: Array<[number, number]>, y: number) {
  if (y <= tab[0][0]) return tab[0][1];
  for (let i = 0; i < tab.length - 1; i++) {
    const [a, va] = tab[i], [b, vb] = tab[i + 1];
    if (y <= b) {
      const u = (y - a) / (b - a);
      const s = u * u * (3 - 2 * u);
      return va + (vb - va) * s;
    }
  }
  return tab[tab.length - 1][1];
}

/** Šaka je 1,35× veća od kanonske (10-lik: šaka ~¾ podlaktice); zglob zapešća ostaje iz kanona. */
export const HAND_SCALE = 1.35;

/**
 * Dlan: presjek superelipsa, poluširina i poludebljina po duljini; završava u zglobovima prstiju.
 * Palčani (thenar) i mali (hypothenar) jastučić na strani dlana; side = +1 (palac na +x) ili −1.
 */
export function palmGeometry(seed = 0, side: 1 | -1 = 1) {
  const W: Array<[number, number]> = [[0, 0.03], [0.035, 0.07], [0.09, 0.1], [0.2, 0.112], [0.27, 0.108], [0.295, 0.092], [0.312, 0.0]];
  const H: Array<[number, number]> = [[0, 0.026], [0.05, 0.042], [0.15, 0.047], [0.26, 0.04], [0.295, 0.031], [0.312, 0.0]];
  const rings = 64, radial = 64, e = 2.3;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const y = (i / rings) * 0.312;
    const w = lerpTable(W, y), h = lerpTable(H, y);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const c = Math.cos(a), s = Math.sin(a);
      const x = Math.sign(c) * Math.pow(Math.abs(c), 2 / e) * w;
      const z = Math.sign(s) * Math.pow(Math.abs(s), 2 / e) * h;
      // blagi luk dlana (udubljen s prednje strane) + jastučići
      const cup = s > 0 ? -0.012 * (1 - (x / Math.max(w, 1e-6)) ** 2) * Math.sin((Math.PI * y) / 0.312) : 0;
      const g = (v: number, m: number, sd: number) => Math.exp(-(((v - m) / sd) ** 2));
      const pads = s > 0 ? 0.03 * g(x, side * 0.075, 0.045) * g(y, 0.1, 0.075) + 0.016 * g(x, -side * 0.085, 0.04) * g(y, 0.12, 0.09) : 0;
      // palčana strana dlana malo šira (korijen palca)
      const flare = side * x > 0 ? 0.018 * g(y, 0.09, 0.06) * Math.abs(c) : 0;
      pos.push(x + Math.sign(x) * flare, y, z + cup + pads * Math.max(0, s));
      uv.push(j / radial, i / rings);
    }
  }
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  tangentsAroundY(g);
  g.setAttribute("aSeed", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(seed), 1));
  return g;
}

/** Članak prsta (os y, duljina PH_LEN); `tip` = zaobljeni vrh prsta. */
export function phalanxGeometry(tip: boolean) {
  const prof: Array<[number, number]> = tip
    ? [[0, 0.55], [0.07, 0.9], [0.22, 1.0], [0.62, 0.95], [0.82, 0.86], [0.93, 0.66], [0.985, 0.32], [1, 0]]
    : [[0, 0.55], [0.07, 0.92], [0.2, 1.0], [0.8, 0.94], [0.93, 0.8], [1, 0.55]];
  const pts = prof.map(([t, r]) => new THREE.Vector2(r * PH_RAD, t * PH_LEN));
  const g = new THREE.LatheGeometry(pts, 40);
  // spljošten s dlanske strane (prsti nisu valjci)
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getZ(i) > 0) p.setZ(i, p.getZ(i) * 0.86);
  g.computeVertexNormals();
  tangentsAroundY(g);
  g.setAttribute("aSeed", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count), 1));
  return g;
}

export type HandPoseOut = { phal: THREE.Matrix4[]; tips: THREE.Matrix4[]; knuckles: Array<{ m: THREE.Matrix4 }>; seeds: number[] };

const tmpQ = new THREE.Quaternion();
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);

/** Okvir lanca: položaj + orijentacija (y = smjer prsta, x = os savijanja, z = prema dlanu). */
class Chain {
  pos = new THREE.Vector3();
  q = new THREE.Quaternion();
  constructor(p: THREE.Vector3, q: THREE.Quaternion) {
    this.pos.copy(p);
    this.q.copy(q);
  }
  rotate(axis: THREE.Vector3, deg: number) {
    tmpQ.setFromAxisAngle(axis, THREE.MathUtils.degToRad(deg));
    this.q.multiply(tmpQ);
  }
  advance(len: number) {
    this.pos.add(Y.clone().applyQuaternion(this.q).multiplyScalar(len));
  }
  matrix(scale: THREE.Vector3) {
    return new THREE.Matrix4().compose(this.pos, this.q, scale);
  }
}

/**
 * Položaji članaka i zglobova u okviru šake (prije transformacije okvira šake).
 * side = +1 za šaku L (palac na +x lokalno), −1 za R.
 */
export function handLocal(state: HandState, side: 1 | -1): HandPoseOut {
  const out: HandPoseOut = { phal: [], tips: [], knuckles: [], seeds: [] };
  FINGERS.forEach((f, fi) => {
    const c = Math.max(0, Math.min(1, state.curl[fi + 1]));
    const spread = (f.spread * (0.35 + state.spread)) * -side;
    const ch = new Chain(new THREE.Vector3(f.x * side, f.y, -0.006), new THREE.Quaternion());
    ch.rotate(Z, spread);
    const curls = CURL_MAX.map((m, k) => m * c * (k === 0 ? 0.9 : 1));
    for (let k = 0; k < 3; k++) {
      const rad = f.rad * TAPER[k];
      // zglob (knuckle) na početku članka
      ch.rotate(X, curls[k]);
      out.knuckles.push({ m: ch.matrix(new THREE.Vector3(rad * 1.12, rad * 1.12, rad * 1.12)) });
      const len = f.len * SPLIT[k];
      const m = ch.matrix(new THREE.Vector3(rad / PH_RAD, len / PH_LEN, rad / PH_RAD));
      if (k < 2) out.phal.push(m);
      else out.tips.push(m);
      out.seeds.push(0.13 * fi + 0.05 * k);
      ch.advance(len);
    }
  });
  // palac: korijen u dlanu (drvo), pa MCP i IP zglob (2 metalna zgloba)
  const t = Math.max(0, Math.min(1, state.curl[0]));
  const opp = Math.max(0, Math.min(1, state.thumb));
  // korijen palca je u dlanu (palčani jastučić); vidljivi dio izlazi iz dlana oko sredine
  const th = new Chain(new THREE.Vector3(0.088 * side, 0.045, 0.006), new THREE.Quaternion());
  th.rotate(Z, -side * (26 - 8 * opp)); // od osi šake prema strani palca
  th.rotate(X, 20 + 24 * opp); // ispred dlana
  th.rotate(Y, side * (35 + 45 * opp)); // jagodica prema dlanu (opozicija)
  const meta = 0.12, prox = 0.082, dist = 0.066, r0 = 0.03;
  // palčani jastučić: debeo drveni korijen koji se stapa s dlanom (metakarpalna kost je u dlanu)
  out.phal.push(th.matrix(new THREE.Vector3((r0 * 1.75) / PH_RAD, meta / PH_LEN, (r0 * 1.45) / PH_RAD)));
  out.seeds.push(0.71);
  th.advance(meta);
  th.rotate(X, 40 * t);
  out.knuckles.push({ m: th.matrix(new THREE.Vector3(0.03, 0.03, 0.03)) });
  out.phal.push(th.matrix(new THREE.Vector3((r0 * 0.93) / PH_RAD, prox / PH_LEN, (r0 * 0.93) / PH_RAD)));
  out.seeds.push(0.77);
  th.advance(prox);
  th.rotate(X, 62 * t);
  out.knuckles.push({ m: th.matrix(new THREE.Vector3(0.027, 0.027, 0.027)) });
  out.tips.push(th.matrix(new THREE.Vector3((r0 * 0.86) / PH_RAD, dist / PH_LEN, (r0 * 0.86) / PH_RAD)));
  out.seeds.push(0.83);
  return out;
}

export const HAND_COUNTS = { phal: 4 * 2 + 2, tips: 4 + 1, knuckles: 4 * 3 + 2 };
