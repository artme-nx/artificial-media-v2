import * as THREE from "three";
import { layout, partMap, type Pose, type LathePart, type BallPart } from "@/src/figure/kanon";
import { latheGeometry, specOf, watchJointGeometry, neckGeometry } from "./geometry";
import { palmGeometry, phalanxGeometry, handLocal, HAND_COUNTS, HAND_SCALE } from "./hands";
import { materialsFor, UNIT } from "./figure";
import { brushedSteel, polishedSteel } from "../materials/steel";

/**
 * Robotski orkestar (10-lik [ROBOT]): isti kanon i oblici, sav brušeni čelik, ista mehanika zglobova; bez lica,
 * bez svjetla, ekrana i kabela. Instancirano: svaki tip dijela je jedan draw call za sve robote (orkestar je
 * pozadina i izvan fokusa, pa je geometrija niže razine detalja — LOD).
 */
const PARTS = ["head", "chest", "pelvis", "upperL", "upperR", "foreL", "foreR", "thighL", "thighR", "shinL", "shinR", "footL", "footR"] as const;
const JOINTS = ["waist", "shoulderL", "shoulderR", "elbowL", "elbowR", "wristL", "wristR", "hipL", "hipR", "kneeL", "kneeR", "ankleL", "ankleR"] as const;
const HINGE: Record<string, string> = {
  waist: "chest", shoulderL: "chest", shoulderR: "chest", elbowL: "upperL", elbowR: "upperR", wristL: "handL", wristR: "handR",
  hipL: "pelvis", hipR: "pelvis", kneeL: "thighL", kneeR: "thighR", ankleL: "footL", ankleR: "footR",
};

export class RobotCrowd {
  readonly group = new THREE.Group();
  readonly count: number;
  roots: THREE.Matrix4[];
  private partMeshes = new Map<string, THREE.InstancedMesh>();
  private neck: THREE.InstancedMesh[] = [];
  private joints: THREE.InstancedMesh[] = [];
  private palms: THREE.InstancedMesh;
  private phal: THREE.InstancedMesh;
  private tips: THREE.InstancedMesh;
  private knuckles: THREE.InstancedMesh;
  private m = new THREE.Matrix4();
  private f = new THREE.Matrix4();
  private s = new THREE.Matrix4().makeScale(UNIT, UNIT, UNIT);

  constructor(count: number) {
    this.count = count;
    this.roots = Array.from({ length: count }, () => new THREE.Matrix4());
    // orkestar: vlastiti čelik bez anizotropije (pozadina izvan fokusa; anizotropni odsjaj na malim zakrivljenim
    // dijelovima daje vruće točke koje izgledaju kao LED) i malo hrapaviji, da odsjaji ne nadjačaju dirigenta
    const base = materialsFor("robot");
    const crowdBody = brushedSteel({ brush: 1, roughness: 0.48, anisotropy: 0, tint: 0.98 });
    // tamna pozornica: čelik bez jačih odraza izgleda kao crni krom; jači odraz okruženja = svijetli brušeni inox
    crowdBody.envMapIntensity = 2.0;
    const mats = { ...base, body: crowdBody, head: crowdBody, fingers: crowdBody, brushed: brushedSteel({ brush: 0, roughness: 0.38, anisotropy: 0 }), neckBrushed: brushedSteel({ brush: 2, roughness: 0.32, anisotropy: 0 }) };
    // orkestar je izvan fokusa: polirani dijelovi malo hrapaviji, da točkasti odsjaj reflektora ne izgleda kao LED (10-lik: bez svjetla)
    const polishedSoft = polishedSteel({ roughness: 0.32 });
    polishedSoft.envMapIntensity = 1.0;
    const add = (im: THREE.InstancedMesh) => {
      im.frustumCulled = false;
      im.castShadow = false;
      im.receiveShadow = true;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.group.add(im);
      return im;
    };
    for (const n of PARTS) {
      const g = latheGeometry(specOf(n), { rings: 48, radial: 32, seed: PARTS.indexOf(n) * 0.07 });
      this.partMeshes.set(n, add(new THREE.InstancedMesh(g, mats.body, count)));
    }
    const ng = neckGeometry(specOf("neck").L);
    this.neck = [add(new THREE.InstancedMesh(ng.brushed, mats.neckBrushed, count)), add(new THREE.InstancedMesh(ng.polished, polishedSoft, count))];
    const jg = watchJointGeometry("knuckle"); // orkestar je izvan fokusa: zglob bez sitnih zubaca
    this.joints = [add(new THREE.InstancedMesh(jg.brushed, mats.brushed, count * JOINTS.length)), add(new THREE.InstancedMesh(jg.polished, polishedSoft, count * JOINTS.length))];
    this.palms = add(new THREE.InstancedMesh(palmGeometry(0.4), mats.fingers, count * 2));
    this.phal = add(new THREE.InstancedMesh(phalanxGeometry(false), mats.fingers, count * HAND_COUNTS.phal * 2));
    this.tips = add(new THREE.InstancedMesh(phalanxGeometry(true), mats.fingers, count * HAND_COUNTS.tips * 2));
    this.knuckles = add(new THREE.InstancedMesh(jg.polished, polishedSoft, count * HAND_COUNTS.knuckles * 2));
  }

  /** Postavi pozu robota i (glavni) korijen; root je u metrima (položaj na pozornici i okret). */
  setRobot(i: number, pose: Pose, root?: THREE.Matrix4, precomputed?: ReturnType<typeof layout>) {
    if (root) this.roots[i].copy(root);
    const parts = precomputed ?? layout(pose);
    const M = partMap(parts);
    const base = new THREE.Matrix4().multiplyMatrices(this.roots[i], this.s);
    for (const n of PARTS) {
      const p = M[n] as LathePart;
      this.frame(p, this.f);
      this.partMeshes.get(n)!.setMatrixAt(i, this.m.multiplyMatrices(base, this.f));
    }
    this.frame(M.neck as LathePart, this.f);
    for (const im of this.neck) im.setMatrixAt(i, this.m.multiplyMatrices(base, this.f));
    JOINTS.forEach((j, k) => {
      const b = M[j] as BallPart, h = M[HINGE[j]] as LathePart;
      const X = new THREE.Vector3(...h.M.x).normalize();
      const Y = new THREE.Vector3(...h.M.y);
      Y.sub(X.clone().multiplyScalar(Y.dot(X))).normalize();
      const Z = new THREE.Vector3().crossVectors(X, Y);
      this.f.makeBasis(X.multiplyScalar(b.r), Y.multiplyScalar(b.r), Z.multiplyScalar(b.r)).setPosition(b.c[0], b.c[1], b.c[2]);
      this.m.multiplyMatrices(base, this.f);
      for (const im of this.joints) im.setMatrixAt(i * JOINTS.length + k, this.m);
    });
    let pi = i * HAND_COUNTS.phal * 2, ti = i * HAND_COUNTS.tips * 2, ki = i * HAND_COUNTS.knuckles * 2;
    (["L", "R"] as const).forEach((s, si) => {
      const hand = M["hand" + s] as LathePart;
      this.frame(hand, this.f).multiply(new THREE.Matrix4().makeScale(HAND_SCALE, HAND_SCALE, HAND_SCALE));
      const hm = new THREE.Matrix4().multiplyMatrices(base, this.f);
      this.palms.setMatrixAt(i * 2 + si, hm);
      const loc = handLocal(s === "L" ? pose.handL : pose.handR, s === "L" ? 1 : -1);
      for (const m of loc.phal) this.phal.setMatrixAt(pi++, this.m.multiplyMatrices(hm, m));
      for (const m of loc.tips) this.tips.setMatrixAt(ti++, this.m.multiplyMatrices(hm, m));
      for (const k of loc.knuckles) this.knuckles.setMatrixAt(ki++, this.m.multiplyMatrices(hm, k.m));
    });
    return M;
  }

  commit() {
    for (const im of this.group.children as THREE.InstancedMesh[]) im.instanceMatrix.needsUpdate = true;
  }

  private frame(p: LathePart, out: THREE.Matrix4) {
    return out.set(
      p.M.x[0], p.M.y[0], p.M.z[0], p.S[0],
      p.M.x[1], p.M.y[1], p.M.z[1], p.S[1],
      p.M.x[2], p.M.y[2], p.M.z[2], p.S[2],
      0, 0, 0, 1,
    );
  }
}
