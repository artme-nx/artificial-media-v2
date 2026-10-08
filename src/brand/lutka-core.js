/* IZVOR: brand/05-logo/figura/lutka-core.js · datum izvora: 2026-10-06
   ne uređuj ovdje — kopija iz brand/ (scripts/sync-brand.mjs); promjena ide u izvor */
/* Zglobna lutka Artificial Media — raspored iz kanon.json (v2).
   Isti algoritam kao lutka.py (logo); usporedba: node test-paritet.js.
   Bez ovisnosti; radi u pregledniku (window.Lutka) i u Nodeu (module.exports). */
(function (root) {
  'use strict';
  const RAD = Math.PI / 180;

  function sampleProfile(pts, steps) {
    steps = steps || 14;
    const out = [], n = pts.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, n - 1)];
      for (let k = 0; k < steps; k++) {
        const u = k / steps, u2 = u * u, u3 = u2 * u;
        const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
        out.push([cr(p0[0], p1[0], p2[0], p3[0]), Math.max(0, cr(p0[1], p1[1], p2[1], p3[1]))]);
      }
    }
    out.push([pts[n - 1][0], pts[n - 1][1]]);
    return out;
  }
  function rAt(sp, t) {
    for (let i = 0; i < sp.length - 1; i++) {
      const a = sp[i], b = sp[i + 1];
      if (a[0] <= t && t <= b[0]) return b[0] === a[0] ? a[1] : a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]);
    }
    return 0;
  }

  // 3x3 matrice, redom po recima
  const mul = (A, B) => { const C = new Array(9); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) C[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]; return C; };
  const mulv = (A, v) => [A[0] * v[0] + A[1] * v[1] + A[2] * v[2], A[3] * v[0] + A[4] * v[1] + A[5] * v[2], A[6] * v[0] + A[7] * v[1] + A[8] * v[2]];
  const col = (A, i) => [A[i], A[3 + i], A[6 + i]];
  function Rx(d) { const c = Math.cos(d * RAD), s = Math.sin(d * RAD); return [1, 0, 0, 0, c, -s, 0, s, c]; }
  function Ry(d) { const c = Math.cos(d * RAD), s = Math.sin(d * RAD); return [c, 0, s, 0, 1, 0, -s, 0, c]; }
  function Rz(d) { const c = Math.cos(d * RAD), s = Math.sin(d * RAD); return [c, -s, 0, s, c, 0, 0, 0, 1]; }
  const body = o => mul(mul(Ry(o.yaw), Rx(o.pitch)), Rz(-o.tilt));

  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const sc = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const len = a => Math.sqrt(dot(a, a));
  const unit = a => sc(a, 1 / len(a));
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

  function limbDir(th, ph) {
    const a = th * RAD, b = ph * RAD;
    return [Math.sin(a) * Math.cos(b), -Math.cos(a) * Math.cos(b), Math.sin(b)];
  }
  function frame(axis, hint, roll) {
    const y = unit(axis);
    let z = sub(hint, sc(y, dot(hint, y)));
    if (len(z) < 1e-6) { const alt = Math.abs(y[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]; z = sub(alt, sc(y, dot(alt, y))); }
    z = unit(z);
    let x = cross(y, z);
    if (roll) {
      const c = Math.cos(roll * RAD), s = Math.sin(roll * RAD);
      const nx = sub(sc(x, c), sc(z, s)), nz = add(sc(x, s), sc(z, c));
      x = nx; z = nz;
    }
    return { x, y, z };
  }
  function blend(a, b, u) {
    if (Array.isArray(a)) return a.map((v, i) => blend(v, b[i], u));
    if (a && typeof a === 'object') { const o = {}; for (const k in a) if (k[0] !== '_') o[k] = blend(a[k], b[k], u); return o; }
    if (typeof a === 'string') return u < 0.5 ? a : b;
    return a + (b - a) * u;
  }

  function create(K) {
    const G = K.gap, SK = K.socket, J = K.joints, Ln = K.lengths, A = K.attach, D = K.depth;
    const sp = {}, sph = {};
    for (const k in K.profiles) sp[k] = sampleProfile(K.profiles[k]);
    for (const k in (K.profiles_h || {})) sph[k] = sampleProfile(K.profiles_h[k]);

    function seg(n, prof, p0, p1, hint, r0, r1, roll, dz) {
      const a = unit(sub(p1, p0));
      const S = add(p0, sc(a, r0 * (1 - SK)));
      const E = sub(p1, sc(a, r1 * (1 - SK)));
      return { n, k: 'lathe', prof, S, M: frame(a, hint, roll || 0), L: len(sub(E, S)), dz: dz || 1, hp: null, sole: null };
    }
    function legPoints(hip, th, ph) {
      const knee = add(hip, sc(limbDir(th[0], ph[0]), Ln.thigh_bone));
      const ankle = add(knee, sc(limbDir(th[1], ph[1]), Ln.shin_bone));
      return [knee, ankle];
    }

    // stopalo ispod gležnja: okret yaw, nagib fp (+ = prsti dolje); vraća dio i najnižu točku
    function foot(ankle, yaw, fp) {
      const heel = A.heel, sole = K.sole.foot, tA = heel / Ln.foot;
      const af = [Math.sin(yaw * RAD) * Math.cos(fp * RAD), -Math.sin(fp * RAD), Math.cos(yaw * RAD) * Math.cos(fp * RAD)];
      const M = frame(af, [0, 1, 0], 0);
      const S = sub(sub(ankle, sc(af, heel)), sc(M.z, rAt(sph.foot, tA) + J.ankle * (1 - SK)));
      const part = { n: 'foot', k: 'lathe', prof: 'foot', S, M, L: Ln.foot, dz: 1, hp: 'foot', sole };
      if (!fp) return { part, low: S[1] - sole };
      const f = sp.foot, rows = [];                 // isti uzorak kao lutka.py: svaki 3. presjek, 12 kutova
      for (let i = 0; i < f.length; i += 3) rows.push(f[i]);
      if ((f.length - 1) % 3) rows.push(f[f.length - 1]);
      let low = null;
      for (const [t, r] of rows) {
        const hz = rAt(sph.foot, t), hb = Math.min(hz, sole);
        const cy = S[1] + M.y[1] * t * Ln.foot;
        for (let k = 0; k < 12; k++) {
          const a = 2 * Math.PI * k / 12, ca = Math.cos(a), sa = Math.sin(a);
          const y = cy + M.x[1] * r * ca + M.z[1] * (sa < 0 ? hb : hz) * sa;
          low = low === null ? y : Math.min(low, y);
        }
      }
      return { part, low };
    }

    function layout(pose) {
      const parts = [];
      const W = [0, 0, 0];
      const Mp = body(pose.pelvis), upP = col(Mp, 1), fwP = col(Mp, 2), rtP = col(Mp, 0);
      const pEnd = sub(W, sc(upP, J.waist + G + Ln.pelvis));
      const pel = seg('pelvis', 'pelvis', W, pEnd, fwP, J.waist, 0, 0, D.pelvis);
      const hipC = sub(W, sc(upP, J.waist + G + Ln.pelvis * A.hip_t));
      const hips = { L: sub(hipC, sc(rtP, A.hip_x)), R: add(hipC, sc(rtP, A.hip_x)) };

      const Mc = body(pose.chest), upC = col(Mc, 1), fwC = col(Mc, 2), rtC = col(Mc, 0);
      const cTop = add(W, sc(upC, J.waist + G + Ln.chest));
      const chest = seg('chest', 'chest', W, cTop, fwC, J.waist, 0, 0, D.chest);
      const hSh = J.waist + G + Ln.chest * A.shoulder_t;
      const tSh = (hSh - J.waist * (1 - SK)) / chest.L;
      const shOff = rAt(sp.chest, tSh) + J.shoulder * (1 - A.shoulder_sink);
      const shC = add(W, sc(upC, hSh));
      const shoulders = { L: sub(shC, sc(rtC, shOff)), R: add(shC, sc(rtC, shOff)) };

      const Mn = mul(Mc, body(pose.neck)), upN = col(Mn, 1);
      const N0 = add(cTop, sc(upC, G / 2));
      const N1 = add(N0, sc(upN, G + Ln.neck));
      const ov = A.neck_overlap;
      const neck = { n: 'neck', k: 'lathe', prof: 'neck', S: sub(N0, sc(upN, ov)), M: frame(upN, col(Mn, 2), 0), L: G + Ln.neck + 2 * ov, dz: 1, hp: null, sole: null };
      const hpose = { tilt: pose.head.tilt, pitch: pose.head.pitch + A.head_pitch, yaw: pose.head.yaw };
      const Mh = mul(Mn, body(hpose));
      const fwd = mulv(mul(Mn, Ry(pose.head.yaw)), [0, 0, 1]);
      const hStart = add(add(N1, sc(upN, G / 2 - A.head_sink)), sc(fwd, A.head_forward));
      const head = { n: 'head', k: 'lathe', prof: 'head', S: hStart, M: frame(col(Mh, 1), col(Mh, 2), 0), L: Ln.head, dz: D.head, hp: null, sole: null };

      // noge
      const legs = { L: { th: pose.legL.th.slice(), ph: pose.legL.ph.slice() }, R: { th: pose.legR.th.slice(), ph: pose.legR.ph.slice() } };
      const legP = s => (s === 'L' ? pose.legL : pose.legR);
      const yawOf = s => legP(s).foot + pose.pelvis.yaw, fpOf = s => legP(s).fp || 0;
      const support = pose.support;
      if (!support) {               // oba stopala ravno na podu: dulja noga savije koljeno
        const ank = { L: legPoints(hips.L, legs.L.th, legs.L.ph)[1], R: legPoints(hips.R, legs.R.th, legs.R.ph)[1] };
        const hi = ank.L[1] >= ank.R[1] ? 'L' : 'R', lo = hi === 'L' ? 'R' : 'L';
        const target = ank[hi][1];
        let b0 = 0, b1 = 45;
        for (let i = 0; i < 48; i++) {
          const b = (b0 + b1) / 2;
          const an = legPoints(hips[lo], legs[lo].th, [legs[lo].ph[0] + b, legs[lo].ph[1] - b])[1];
          if (an[1] < target) b0 = b; else b1 = b;
        }
        legs[lo].ph = [legs[lo].ph[0] + b1, legs[lo].ph[1] - b1];
      } else {                      // baletni oslonac: slobodna noga se zakrene dok prsti ne dotaknu pod (tendu)
        const free = support === 'L' ? 'R' : 'L', d = pose.touch === undefined ? -1 : pose.touch;
        const floorS = foot(legPoints(hips[support], legs[support].th, legs[support].ph)[1], yawOf(support), fpOf(support)).low;
        const low = b => foot(legPoints(hips[free], legs[free].th, [legs[free].ph[0] + d * b, legs[free].ph[1] + d * b])[1], yawOf(free), fpOf(free)).low;
        let b = 0;
        if (low(0) < floorS) {
          let b0 = 0, b1 = 75;
          for (let i = 0; i < 48; i++) { b = (b0 + b1) / 2; if (low(b) < floorS) b0 = b; else b1 = b; }
          b = b1;
        }
        legs[free].ph = [legs[free].ph[0] + d * b, legs[free].ph[1] + d * b];
      }

      let floorY = null;
      const legParts = [];
      for (const s of ['L', 'R']) {
        const [knee, ankle] = legPoints(hips[s], legs[s].th, legs[s].ph);
        legParts.push(seg('thigh' + s, 'thigh', hips[s], knee, fwP, J.hip, J.knee));
        legParts.push(seg('shin' + s, 'shin', knee, ankle, fwP, J.knee, J.ankle));
        const f = foot(ankle, yawOf(s), fpOf(s));
        f.part.n = 'foot' + s;
        legParts.push(f.part);
        legParts.push({ n: 'knee' + s, k: 'ball', c: knee, r: J.knee });
        legParts.push({ n: 'ankle' + s, k: 'ball', c: ankle, r: J.ankle });
        if (!support || s === support) floorY = floorY === null ? f.low : Math.min(floorY, f.low);
      }

      function arm(s) {
        const o = s === 'L' ? pose.armL : pose.armR, th = o.th, ph = o.ph, ro = o.roll;
        const sh = shoulders[s];
        const elbow = add(sh, sc(limbDir(th[0], ph[0]), Ln.upper_arm_bone));
        const wrist = add(elbow, sc(limbDir(th[1], ph[1]), Ln.forearm_bone));
        const hd = limbDir(th[2], ph[2]);
        const hS = add(wrist, sc(hd, J.wrist * (1 - SK)));
        return [
          seg('upper' + s, 'upper_arm', sh, elbow, fwC, J.shoulder, J.elbow, ro[0]),
          seg('fore' + s, 'forearm', elbow, wrist, fwC, J.elbow, J.wrist, ro[1]),
          { n: 'hand' + s, k: 'lathe', prof: 'hand', S: hS, M: frame(hd, fwC, ro[2]), L: Ln.hand + J.wrist * SK, dz: D.hand, hp: null, sole: null },
          { n: 'elbow' + s, k: 'ball', c: elbow, r: J.elbow },
          { n: 'wrist' + s, k: 'ball', c: wrist, r: J.wrist },
        ];
      }

      parts.push(...legParts);
      parts.push(pel, { n: 'hipL', k: 'ball', c: hips.L, r: J.hip }, { n: 'hipR', k: 'ball', c: hips.R, r: J.hip });
      parts.push({ n: 'waist', k: 'ball', c: W.slice(), r: J.waist }, chest, neck, head);
      parts.push({ n: 'shoulderL', k: 'ball', c: shoulders.L, r: J.shoulder }, { n: 'shoulderR', k: 'ball', c: shoulders.R, r: J.shoulder });
      parts.push(...arm('L'), ...arm('R'));
      for (const p of parts) { if (p.k === 'ball') p.c[1] -= floorY; else p.S = [p.S[0], p.S[1] - floorY, p.S[2]]; }
      return parts;
    }

    function pose(name) { const o = {}; const p = K.poses[name]; for (const k in p) if (k[0] !== '_') o[k] = p[k]; return o; }
    return { layout, pose, sp, sph, K };
  }

  const api = { create, blend, sampleProfile, rAt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Lutka = api;
})(typeof window !== 'undefined' ? window : globalThis);
