import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { K, lt, sampleProfile, rAt } from "@/src/figure/kanon";

/**
 * Geometrija lutke iz kanona u visokoj rezoluciji.
 * Tokareni dio: lokalno os y od 0 do L, presjek x = r·cos a, z = h·sin a (h = r·dz ili visinski profil stopala,
 * ravan taban) — isto kao lutka.py/lutka-core (sections), pa je 3D isto tijelo kao logo.
 * Normale su analitičke (iz derivacija profila), pa su plohe savršeno glatke.
 */
export type LatheSpec = { prof: string; L: number; dz: number; hp: string | null; sole: number | null };

const profileCache = new Map<string, Array<[number, number]>>();
function dense(prof: string, profiles: Record<string, Array<[number, number]>>, steps: number) {
  const key = `${prof}|${steps}|${profiles === K.profiles ? "p" : "h"}`;
  let sp = profileCache.get(key);
  if (!sp) {
    sp = sampleProfile(profiles[prof], steps);
    profileCache.set(key, sp);
  }
  return sp;
}

/** Ravnomjerno po duljini luka profila (bolja raspodjela prstenova nego Catmull-Rom koraci). */
function resampleByArc(sp: Array<[number, number]>, L: number, n: number) {
  const pts = sp.map(([t, r]) => [t * L, r] as [number, number]);
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = acc[acc.length - 1];
  const out: number[] = [];
  let j = 0;
  for (let k = 0; k <= n; k++) {
    const s = (k / n) * total;
    while (j < acc.length - 2 && acc[j + 1] < s) j++;
    const u = (s - acc[j]) / Math.max(acc[j + 1] - acc[j], 1e-9);
    out.push((sp[j][0] + (sp[j + 1][0] - sp[j][0]) * u));
  }
  return out; // t vrijednosti
}

export function latheGeometry(spec: LatheSpec, { rings = 160, radial = 96, seed = 0 } = {}) {
  const sp = dense(spec.prof, K.profiles, 24);
  const sph = spec.hp ? dense(spec.hp, K.profiles_h, 24) : null;
  const ts = resampleByArc(sp, spec.L, rings);
  const R = (t: number) => rAt(sp, Math.min(1, Math.max(0, t)));
  const Hz = (t: number) => (sph ? rAt(sph, Math.min(1, Math.max(0, t))) : R(t) * spec.dz);
  const Hb = (t: number) => (spec.sole != null ? Math.min(Hz(t), spec.sole) : Hz(t));

  const nV = (rings + 1) * (radial + 1);
  const pos = new Float32Array(nV * 3), nor = new Float32Array(nV * 3), uv = new Float32Array(nV * 2), tan = new Float32Array(nV * 4), sd = new Float32Array(nV);
  const eps = 1e-3;
  let v = 0;
  for (let i = 0; i <= rings; i++) {
    const t = ts[i];
    const r = R(t), hz = Hz(t), hb = Hb(t);
    const dr = (R(t + eps) - R(t - eps)) / (2 * eps * spec.L);
    const dhz = (Hz(t + eps) - Hz(t - eps)) / (2 * eps * spec.L);
    const dhb = (Hb(t + eps) - Hb(t - eps)) / (2 * eps * spec.L);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const h = sa < 0 ? hb : hz, dh = sa < 0 ? dhb : dhz;
      const x = r * ca, y = t * spec.L, z = h * sa;
      // dP/dy = (dr·ca, 1, dh·sa), dP/da = (−r·sa, 0, h·ca); normala = dP/dy × dP/da (prema van)
      const ty = [dr * ca, 1, dh * sa];
      const ta = [-r * sa, 0, h * ca];
      let nx = ty[1] * ta[2] - ty[2] * ta[1];
      let ny = ty[2] * ta[0] - ty[0] * ta[2];
      let nz = ty[0] * ta[1] - ty[1] * ta[0];
      let nl = Math.hypot(nx, ny, nz);
      if (nl < 1e-7) {
        // pol (r = 0): normala uzduž osi
        nx = 0; ny = i === 0 ? -1 : 1; nz = 0; nl = 1;
      }
      pos.set([x, y, z], v * 3);
      nor.set([nx / nl, ny / nl, nz / nl], v * 3);
      uv.set([j / radial, t], v * 2);
      const tl = Math.hypot(ta[0], ta[2]) || 1;
      tan.set([ta[0] / tl || -sa, 0, ta[2] / tl || ca, 1], v * 4);
      sd[v] = seed;
      v++;
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setAttribute("tangent", new THREE.BufferAttribute(tan, 4));
  g.setAttribute("aSeed", new THREE.BufferAttribute(sd, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/** Tokareni dio iz rasporeda (L, profil, dubina) za zadani dio kanona. */
export function specOf(name: string): LatheSpec {
  const p = lt.layout(lt.pose("kontrapost")).find((q) => q.n === name);
  if (!p || p.k !== "lathe") throw new Error(`nije tokareni dio: ${name}`);
  return { prof: p.prof, L: p.L, dz: p.dz, hp: p.hp, sole: p.sole };
}

// ------------------------------------------------------------------ pomoćno: tokarenje oko osi x

/** Tokareno oko lokalne osi x: profil [[x, r], ...]. */
export function latheX(profile: Array<[number, number]>, segments = 96, a0 = 0, a1 = Math.PI * 2) {
  const pts = profile.map(([x, r]) => new THREE.Vector2(r, x));
  const g = new THREE.LatheGeometry(pts, segments, a0, a1 - a0);
  // LatheGeometry tokari oko y; okreni y → x
  g.rotateZ(-Math.PI / 2);
  return g;
}

function addSeed(g: THREE.BufferGeometry, seed: number) {
  const n = g.attributes.position.count;
  g.setAttribute("aSeed", new THREE.BufferAttribute(new Float32Array(n).fill(seed), 1));
  return g;
}

/** Tangente za kružno brušenje oko osi x: smjer anizotropije okomit na linije brušenja. */
export function tangentsAroundX(g: THREE.BufferGeometry) {
  const p = g.attributes.position, n = g.attributes.normal;
  const t = new Float32Array(p.count * 4);
  const P = new THREE.Vector3(), N = new THREE.Vector3(), Bv = new THREE.Vector3(), T = new THREE.Vector3(), X = new THREE.Vector3(1, 0, 0);
  for (let i = 0; i < p.count; i++) {
    P.fromBufferAttribute(p, i);
    N.fromBufferAttribute(n, i);
    const radial = new THREE.Vector3(0, P.y, P.z);
    if (radial.lengthSq() < 1e-10) radial.set(0, 1, 0);
    Bv.crossVectors(X, radial).normalize(); // smjer linija brušenja (krug oko x)
    T.crossVectors(N, Bv);
    if (T.lengthSq() < 1e-8) T.copy(Bv);
    T.normalize();
    t.set([T.x, T.y, T.z, 1], i * 4);
  }
  g.setAttribute("tangent", new THREE.BufferAttribute(t, 4));
  return g;
}

function prep(g: THREE.BufferGeometry, seed = 0) {
  let h = g.index ? g.toNonIndexed() : g;
  h = h.index ? h : h;
  if (!h.attributes.uv) h.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(h.attributes.position.count * 2), 2));
  h.deleteAttribute("uv");
  h.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(h.attributes.position.count * 2), 2));
  tangentsAroundX(h);
  addSeed(h, seed);
  return h;
}

// ------------------------------------------------------------------ zupčanik, most, vijak (2D oblici → ekstruzija uzduž x)

function gearShape(R: number, teeth: number, depth: number, hub: number, spokes: number, rimW: number) {
  const s = new THREE.Shape();
  const N = teeth * 8;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    // trapezni zub: ravni vrh i dno, kosi bokovi
    const ph = ((a / (Math.PI * 2)) * teeth) % 1;
    const tooth = ph < 0.18 ? ph / 0.18 : ph < 0.5 ? 1 : ph < 0.68 ? 1 - (ph - 0.5) / 0.18 : 0;
    const r = R - depth + depth * tooth;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  // skeletonizirani kotač: izrezi između zakrivljenih krakova
  if (spokes > 0) {
    const inner = R - depth - rimW;
    for (let k = 0; k < spokes; k++) {
      const a0 = (k / spokes) * Math.PI * 2 + 0.22;
      const a1 = ((k + 1) / spokes) * Math.PI * 2 - 0.22;
      const hole = new THREE.Path();
      const M = 28;
      for (let i = 0; i <= M; i++) {
        const a = a0 + ((a1 - a0) * i) / M;
        hole[i === 0 ? "moveTo" : "lineTo"](Math.cos(a) * inner, Math.sin(a) * inner);
      }
      for (let i = M; i >= 0; i--) {
        const a = a0 + 0.12 + ((a1 - a0 - 0.12) * i) / M; // krak se zakrivi prema glavčini
        hole.lineTo(Math.cos(a) * hub, Math.sin(a) * hub);
      }
      hole.closePath();
      s.holes.push(hole);
    }
  }
  // rupa osovine
  const axle = new THREE.Path();
  axle.absarc(0, 0, hub * 0.38, 0, Math.PI * 2, true);
  s.holes.push(axle);
  return s;
}

function extrudeX(shape: THREE.Shape, thick: number, bevel: number, x: number, curveSegments = 6) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: thick,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments,
  });
  g.rotateY(Math.PI / 2); // z (ekstruzija) → x
  g.translate(x, 0, 0);
  return g;
}

/** Prsten sa zupcima prema van (za vrat). */
function gearRingShape(R: number, depth: number, teeth: number) {
  const s = new THREE.Shape();
  const N = teeth * 6;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const ph = ((a / (Math.PI * 2)) * teeth) % 1;
    const tooth = ph < 0.2 ? ph / 0.2 : ph < 0.5 ? 1 : ph < 0.7 ? 1 - (ph - 0.5) / 0.2 : 0;
    const r = R + depth * tooth;
    s[i === 0 ? "moveTo" : "lineTo"](Math.cos(a) * r, Math.sin(a) * r);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, R - 0.012, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return s;
}

function bridgeShape(r: number, w: number) {
  // most: zakrivljeni krak od ruba preko središta, s ušicom oko ležaja
  const s = new THREE.Shape();
  const a0 = 3.6, a1 = 5.95;
  const M = 30;
  for (let i = 0; i <= M; i++) {
    const a = a0 + ((a1 - a0) * i) / M;
    const rr = r * (0.55 + 0.45 * Math.abs(Math.cos((i / M) * Math.PI)));
    s[i === 0 ? "moveTo" : "lineTo"](Math.cos(a) * rr, Math.sin(a) * rr);
  }
  for (let i = M; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / M;
    const rr = r * (0.55 + 0.45 * Math.abs(Math.cos((i / M) * Math.PI))) - w;
    s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  s.closePath();
  return s;
}

function screw(x: number, y: number, z: number, rad: number, dir: 1 | -1) {
  // glava vijka s utorom (dvije polovice), okrenuta prema van uzduž osi x
  const head = latheX([[0, rad], [rad * 0.35, rad * 0.98], [rad * 0.55, rad * 0.8], [rad * 0.62, 0]].map(([a, b]) => [a * dir, b]) as Array<[number, number]>, 18);
  const slot = rad * 0.16;
  const half1 = new THREE.CylinderGeometry(rad * 0.98, rad * 0.98, rad * 0.5, 18, 1, false, 0, Math.PI);
  void half1;
  head.translate(x, y, z);
  // utor: tanka tamna kutija utisnuta u glavu (polirano, ali zasjenjeno)
  const cut = new THREE.BoxGeometry(rad * 0.5, slot * 1.4, rad * 1.85);
  cut.translate(x + dir * rad * 0.52, y, z);
  return { head, cut };
}

/**
 * Satni zglob (10-lik §1: tanki polirani prsten s kosim rubom, ležaj, sitni zupci, minijaturni vijci; sve čelik).
 * Jedinični polumjer, os šarke = lokalna os x. Tri materijala: brušeno, polirano, perlage.
 */
export function watchJointGeometry(detail: "full" | "knuckle" = "full") {
  if (detail === "knuckle") return knuckleGeometry();
  const brushed: THREE.BufferGeometry[] = [];
  const polished: THREE.BufferGeometry[] = [];
  const perl: THREE.BufferGeometry[] = [];
  const RS = 0.97, XC = 0.74;
  const rc = Math.sqrt(RS * RS - XC * XC);
  // jezgra: kugla odrezana na |x| ≤ XC
  const sphereProf: Array<[number, number]> = [];
  for (let i = 0; i <= 48; i++) {
    const x = -XC + (2 * XC * i) / 48;
    sphereProf.push([x, Math.sqrt(RS * RS - x * x)]);
  }
  brushed.push(latheX(sphereProf, detail === "full" ? 96 : 40));
  // polirani prsten s kosim rubom po ekvatoru + dva tanka utora
  polished.push(latheX([[-0.06, RS - 0.004], [-0.045, 0.995], [-0.025, 1.006], [0.025, 1.006], [0.045, 0.995], [0.06, RS - 0.004]], detail === "full" ? 120 : 40));
  // dva fina urezana utora uz prsten (brušeno)
  for (const gx of [-0.2, 0.2]) brushed.push(latheX([[gx - 0.012, RS + 0.001], [gx - 0.006, RS - 0.012], [gx + 0.006, RS - 0.012], [gx + 0.012, RS + 0.001]], detail === "full" ? 96 : 32));
  for (const dir of [1, -1] as const) {
    // obod lica: polirani prsten s kosim rubom
    const bez: Array<[number, number]> = [
      [XC - 0.03, rc + 0.022],
      [XC + 0.012, rc - 0.004],
      [XC + 0.034, rc - 0.036],
      [XC + 0.034, rc - 0.075],
      [XC + 0.014, rc - 0.095],
      [XC - 0.2, rc - 0.095],
    ];
    polished.push(latheX(bez.map(([x, r]) => [x * dir, r]) as Array<[number, number]>, detail === "full" ? 120 : 40));
    // dno udubine: perlage disk
    const floorX = XC - 0.19; // dublja udubina: dno (perlage) → kotači → most → ležaj
    const floor = new THREE.CircleGeometry(rc - 0.09, detail === "full" ? 72 : 24);
    floor.rotateY((dir * Math.PI) / 2);
    floor.translate(floorX * dir, 0, 0);
    perl.push(floor);
    if (detail === "full") {
      // glavni kotač: 30 zubaca, 5 zakrivljenih krakova
      const wheel = extrudeX(gearShape(rc - 0.13, 30, 0.032, 0.1, 5, 0.055), 0.026, 0.005, 0, 2);
      if (dir < 0) wheel.rotateY(Math.PI);
      wheel.translate((floorX + 0.035) * dir, 0, 0);
      brushed.push(wheel);
      // pinion (mali zupčanik) u zahvatu
      const pin = extrudeX(gearShape(0.16, 12, 0.03, 0.05, 0, 0), 0.03, 0.005, 0, 2);
      if (dir < 0) pin.rotateY(Math.PI);
      pin.translate((floorX + 0.075) * dir, 0.26, -0.22);
      brushed.push(pin);
      // most preko kotača
      const br = extrudeX(bridgeShape(rc - 0.12, 0.1), 0.022, 0.007, 0, 3);
      if (dir < 0) br.rotateY(Math.PI);
      br.translate((floorX + 0.12) * dir, 0, 0);
      brushed.push(br);
      // ležaj: polirana kupola + prsten
      polished.push(latheX([[0, 0.1], [0.025, 0.096], [0.05, 0.066], [0.062, 0]].map(([x, r]) => [(floorX + 0.135 + x) * dir, r]) as Array<[number, number]>, 32));
      const ring = new THREE.TorusGeometry(0.12, 0.015, 10, 40);
      ring.rotateY(Math.PI / 2);
      ring.translate((floorX + 0.15) * dir, 0, 0);
      polished.push(ring);
      // vijci: tri na obodu, dva na mostu
      const scr: Array<[number, number, number]> = [];
      for (const a of [0.35, 2.45, 4.55]) scr.push([XC + 0.034, Math.cos(a) * (rc - 0.055), Math.sin(a) * (rc - 0.055)]);
      for (const a of [3.75, 5.8]) scr.push([floorX + 0.142, Math.cos(a) * (rc - 0.2), Math.sin(a) * (rc - 0.2)]);
      for (const [x, y, z] of scr) {
        const s = screw(x * dir, y, z, 0.034, dir);
        polished.push(s.head);
        perl.push(s.cut);
      }
    } else {
      // zglob prsta: samo polirani ležaj u sredini
      polished.push(latheX([[0, 0.3], [0.05, 0.27], [0.09, 0]].map(([x, r]) => [(floorX + 0.02 + x) * dir, r]) as Array<[number, number]>, 16));
    }
  }
  const merge = (arr: THREE.BufferGeometry[], seed: number) => {
    const prepared = arr.map((g) => prep(g, seed));
    const m = mergeGeometries(prepared, false);
    if (!m) throw new Error("merge zgloba nije uspio");
    m.computeBoundingSphere();
    return m;
  };
  return { brushed: merge(brushed, 0.31), polished: merge(polished, 0.62), perlage: merge(perl, 0.17) };
}

/** Zglob prsta: brušena kugla, polirani prsten s kosim rubom po ekvatoru, polirane kapice ležaja sa strana. */
function knuckleGeometry() {
  const sphereProf: Array<[number, number]> = [];
  for (let i = 0; i <= 24; i++) {
    const x = -0.96 + (1.92 * i) / 24;
    sphereProf.push([x, Math.sqrt(Math.max(0, 0.96 * 0.96 - x * x))]);
  }
  const brushed = [latheX(sphereProf, 32)];
  const polished = [
    latheX([[-0.16, 0.95], [-0.1, 1.04], [0.1, 1.04], [0.16, 0.95]], 40),
    latheX([[0.86, 0.42], [0.95, 0.3], [1.0, 0]], 20),
    latheX([[-1.0, 0], [-0.95, 0.3], [-0.86, 0.42]], 20),
  ];
  const merge = (arr: THREE.BufferGeometry[], seed: number) => {
    const m = mergeGeometries(arr.map((g) => prep(g, seed)), false);
    if (!m) throw new Error("merge zgloba prsta nije uspio");
    m.computeBoundingSphere();
    return m;
  };
  const b = merge(brushed, 0.3);
  return { brushed: b, polished: merge(polished, 0.6), perlage: b };
}

/**
 * Čelični vrat (10-lik §1: vrat je precizni čelični zglob): stup iz profila vrata kanona,
 * s poliranim prstenovima na krajevima i nazubljenim pojasom u sredini.
 */
export function neckGeometry(L: number) {
  const brushed: THREE.BufferGeometry[] = [];
  const polished: THREE.BufferGeometry[] = [];
  const col = latheGeometry({ prof: "neck", L, dz: 1, hp: null, sole: null }, { rings: 80, radial: 72, seed: 0.5 });
  // tangente za kružno brušenje oko osi y (stup)
  brushed.push(col);
  const ringY = (y: number, r: number, h: number) => {
    const g = new THREE.LatheGeometry(
      [new THREE.Vector2(r - 0.012, -h), new THREE.Vector2(r + 0.006, -h * 0.55), new THREE.Vector2(r + 0.012, 0), new THREE.Vector2(r + 0.006, h * 0.55), new THREE.Vector2(r - 0.012, h)],
      96,
    );
    g.translate(0, y, 0);
    return g;
  };
  polished.push(ringY(L * 0.2, 0.152, 0.022));
  polished.push(ringY(L * 0.82, 0.155, 0.022));
  // izloženi zupčasti pojas (fini zupci, kao kotač sata) između dva polirana prstena
  const gear = new THREE.ExtrudeGeometry(gearRingShape(0.162, 0.006, 48), { depth: 0.03, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1, curveSegments: 2 });
  gear.rotateX(-Math.PI / 2);
  gear.translate(0, L * 0.5 - 0.015, 0);
  polished.push(gear);
  const mergeY = (arr: THREE.BufferGeometry[], seed: number) => {
    const prepared = arr.map((g) => {
      let h = g.index ? g.toNonIndexed() : g;
      h = h.clone();
      h.deleteAttribute("uv");
      h.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(h.attributes.position.count * 2), 2));
      if (h.attributes.tangent) h.deleteAttribute("tangent");
      // anizotropija: tangenta uzduž osi y (linije brušenja su kružnice oko y)
      const t = new Float32Array(h.attributes.position.count * 4);
      const n = h.attributes.normal;
      for (let i = 0; i < n.count; i++) {
        const N = new THREE.Vector3().fromBufferAttribute(n, i);
        const Bv = new THREE.Vector3(0, 1, 0).cross(N).normalize();
        const T = new THREE.Vector3().crossVectors(N, Bv).normalize();
        t.set([T.x || 0, T.y || 1, T.z || 0, 1], i * 4);
      }
      h.setAttribute("tangent", new THREE.BufferAttribute(t, 4));
      if (h.attributes.aSeed) h.deleteAttribute("aSeed");
      addSeed(h, seed);
      return h;
    });
    return mergeGeometries(prepared, false)!;
  };
  return { brushed: mergeY(brushed, 0.4), polished: mergeY(polished, 0.7) };
}

/** Struk B: kratki čelični stup od tri naslagana prstena, kao kralješci (10-lik §1). Os = lokalna y. */
export function waistColumnGeometry(r: number) {
  const brushed: THREE.BufferGeometry[] = [];
  const polished: THREE.BufferGeometry[] = []; // ovdje: samo tanki rubovi (bez velikih poliranih ploha koje izgaraju u odsjaj)
  const hs = [-0.62, 0, 0.62];
  for (const y of hs) {
    const disc = new THREE.LatheGeometry(
      [new THREE.Vector2(0, -0.2), new THREE.Vector2(0.7, -0.2), new THREE.Vector2(0.86, -0.16), new THREE.Vector2(0.9, 0), new THREE.Vector2(0.86, 0.16), new THREE.Vector2(0.7, 0.2), new THREE.Vector2(0, 0.2)],
      72,
    );
    disc.translate(0, y, 0);
    brushed.push(disc);
    const ring = new THREE.TorusGeometry(0.9, 0.014, 8, 96);
    ring.rotateX(Math.PI / 2);
    ring.translate(0, y, 0);
    brushed.push(ring);
  }
  const core = new THREE.CylinderGeometry(0.42, 0.42, 1.6, 48);
  brushed.push(core);
  const fix = (arr: THREE.BufferGeometry[], seed: number) =>
    mergeGeometries(
      arr.map((g) => {
        const h = (g.index ? g.toNonIndexed() : g).clone();
        h.deleteAttribute("uv");
        h.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(h.attributes.position.count * 2), 2));
        const t = new Float32Array(h.attributes.position.count * 4);
        for (let i = 0; i < h.attributes.position.count; i++) t.set([0, 1, 0, 1], i * 4);
        h.setAttribute("tangent", new THREE.BufferAttribute(t, 4));
        addSeed(h, seed);
        h.scale(r, r, r);
        return h;
      }),
      false,
    )!;
  // tanki polirani rub na vrhu i dnu stupa
  for (const y of [-0.82, 0.82]) {
    const lip = new THREE.TorusGeometry(0.44, 0.012, 8, 64);
    lip.rotateX(Math.PI / 2);
    lip.translate(0, y, 0);
    polished.push(lip);
  }
  return { brushed: fix(brushed, 0.2), polished: fix(polished, 0.8) };
}
