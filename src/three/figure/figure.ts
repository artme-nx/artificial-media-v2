import * as THREE from "three";
import { layout, partMap, type Pose, type Part, type LathePart, type BallPart, K } from "@/src/figure/kanon";
import { latheGeometry, specOf, watchJointGeometry, neckGeometry, waistColumnGeometry } from "./geometry";
import { palmGeometry, phalanxGeometry, handLocal, HAND_COUNTS, HAND_SCALE } from "./hands";
import { mapleMaterial } from "../materials/maple";
import { buildCostume, poseCostume, COVERED_PARTS, COVERED_JOINTS, type CostumeMeshes } from "./costume";
import { Baton } from "./baton";
import { readSwitches } from "@/config/switches";
import { brushedSteel, polishedSteel, perlageSteel, hiTechSteel } from "../materials/steel";

/**
 * Lutka (10-lik): drvo (ptičje oko javor) + brušeni čelik sa satnim mehanizmima na svim zglobovima s popisa
 * (vrat, ramena, laktovi, zapešća, kukovi, koljena, skočni zglobovi, svi zglobovi prstiju) + struk A/B.
 * Robot (10-lik [ROBOT]): isti kanon i oblici, sav čelik, ista mehanika, bez lica, bez svjetla.
 *
 * Tijelo je kruto po dijelovima, kao prava drvena lutka: svaki frame raspored iz kanona (lutka-core) → matrice.
 */
export const UNIT = 0.22; // metara po jedinici glave (lutka-v2.json: unit)
/** wood = javor; robot = brušeni čelik (orkestar, lab); robot-hitech = F6 ispod kursora (razdjelne linije) */
export type Look = "wood" | "robot" | "robot-hitech";
export type Waist = "A" | "B";

const WOOD_PARTS = ["head", "chest", "pelvis", "upperL", "upperR", "foreL", "foreR", "thighL", "thighR", "shinL", "shinR", "footL", "footR"] as const;
const JOINTS = ["waist", "shoulderL", "shoulderR", "elbowL", "elbowR", "wristL", "wristR", "hipL", "hipR", "kneeL", "kneeR", "ankleL", "ankleR"] as const;
// os šarke zgloba = os x ovog dijela
const HINGE_FROM: Record<(typeof JOINTS)[number], string> = {
  waist: "chest", shoulderL: "chest", shoulderR: "chest", elbowL: "upperL", elbowR: "upperR", wristL: "handL", wristR: "handR",
  hipL: "pelvis", hipR: "pelvis", kneeL: "thighL", kneeR: "thighR", ankleL: "footL", ankleR: "footR",
};

/** fingers: šake (dlan, članci) — kod robota bez anizotropije: na sitnim člancima je nevidljiva, a daje vruće točke (izgledaju kao LED) */
type MatSet = { body: THREE.Material; head: THREE.Material; fingers: THREE.Material; brushed: THREE.Material; polished: THREE.Material; perlage: THREE.Material; neckBrushed: THREE.Material };
const matCache = new Map<Look, MatSet>();
export function materialsFor(look: Look): MatSet {
  let m = matCache.get(look);
  if (!m) {
    // robot: zglobovi s blažom anizotropijom (sitni rubovi inače bljesnu kao točkasti izvor svjetla)
    const brushed = brushedSteel({ brush: 0, anisotropy: look === "wood" ? 0.85 : 0.4 });
    const polished = polishedSteel({ roughness: look === "wood" ? 0.2 : 0.27 }); // robot: manje točkastih odsjaja (bez LED dojma)
    const perlage = perlageSteel();
    const neckBrushed = brushedSteel({ brush: 2, roughness: 0.34 });
    if (look === "wood") {
      const maple = mapleMaterial();
      m = { body: maple, head: maple, fingers: maple, brushed, polished, perlage, neckBrushed };
    } else if (look === "robot-hitech") {
      const body = hiTechSteel();
      const fingers = brushedSteel({ brush: 1, roughness: 0.34, anisotropy: 0, tint: 0.92 });
      m = { body, head: hiTechSteel({ head: true }), fingers, brushed, polished, perlage, neckBrushed };
    } else {
      // anizotropija umjerena: veća daje povremene vruće točke na zakrivljenim dijelovima (izgledaju kao LED)
      const body = brushedSteel({ brush: 1, roughness: 0.33, anisotropy: 0.35, tint: 0.92 });
      const fingers = brushedSteel({ brush: 1, roughness: 0.34, anisotropy: 0, tint: 0.92 });
      m = { body, head: body, fingers, brushed, polished, perlage, neckBrushed };
    }
    matCache.set(look, m);
  }
  return m;
}

const geoCache = new Map<string, THREE.BufferGeometry>();
function cachedGeo(key: string, make: () => THREE.BufferGeometry) {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}
let jointGeo: ReturnType<typeof watchJointGeometry> | null = null;
let knuckleGeo: ReturnType<typeof watchJointGeometry> | null = null;
let neckGeo: ReturnType<typeof neckGeometry> | null = null;
let waistBGeo: ReturnType<typeof waistColumnGeometry> | null = null;

function seedOf(name: string) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

export class Figure {
  readonly group = new THREE.Group();
  readonly body = new THREE.Group(); // jedinice glave
  readonly look: Look;
  waist: Waist;
  pose: Pose | null = null;
  parts: Part[] = [];
  map: Record<string, Part> = {};
  private meshes = new Map<string, THREE.Mesh>();
  private palms: Record<"L" | "R", THREE.Mesh>;
  private neckMeshes: THREE.Mesh[] = [];
  private waistB: THREE.Group;
  private joints: THREE.InstancedMesh[];
  private phal: THREE.InstancedMesh;
  private tips: THREE.InstancedMesh;
  private knuckles: THREE.InstancedMesh[];
  readonly mats: MatSet;
  private m4 = new THREE.Matrix4();
  private hm = new THREE.Matrix4();
  private handScale = new THREE.Matrix4().makeScale(HAND_SCALE, HAND_SCALE, HAND_SCALE);
  costume: CostumeMeshes | null = null;
  baton: Baton | null = null;
  /** kamera za minimalnu vidljivu debljinu palice */
  viewCamera: THREE.Camera | null = null;
  viewportH = 900;

  constructor({ look = "wood", waist = "A", detail = "full", costume = false }: { look?: Look; waist?: Waist; detail?: "full" | "lod"; costume?: boolean } = {}) {
    this.look = look;
    this.waist = waist;
    this.mats = materialsFor(look);
    void costume;
    this.group.add(this.body);
    this.body.scale.setScalar(UNIT);
    const lod = detail === "lod";

    for (const name of WOOD_PARTS) {
      const spec = specOf(name);
      const key = `${name}|${lod ? "lod" : "full"}`;
      const g = cachedGeo(key, () =>
        latheGeometry(spec, {
          rings: lod ? 36 : name === "head" || name === "chest" || name === "pelvis" ? 180 : 140,
          radial: lod ? 24 : 112,
          seed: seedOf(name),
        }),
      );
      const mesh = new THREE.Mesh(g, name === "head" ? this.mats.head : this.mats.body);
      mesh.name = name;
      mesh.matrixAutoUpdate = false;
      mesh.castShadow = mesh.receiveShadow = true;
      this.body.add(mesh);
      this.meshes.set(name, mesh);
    }

    // vrat: čelični stup s poliranim prstenovima i nazubljenim pojasom
    neckGeo ??= neckGeometry(specOf("neck").L);
    for (const [g, m] of [[neckGeo.brushed, this.mats.neckBrushed], [neckGeo.polished, this.mats.polished]] as const) {
      const mesh = new THREE.Mesh(g, m);
      mesh.matrixAutoUpdate = false;
      mesh.castShadow = mesh.receiveShadow = true;
      this.body.add(mesh);
      this.neckMeshes.push(mesh);
    }

    // dlanovi
    this.palms = {
      L: new THREE.Mesh(cachedGeo("palmL", () => palmGeometry(0.37, 1)), this.mats.fingers),
      R: new THREE.Mesh(cachedGeo("palmR", () => palmGeometry(0.41, -1)), this.mats.fingers),
    };
    for (const p of Object.values(this.palms)) {
      p.matrixAutoUpdate = false;
      p.castShadow = p.receiveShadow = true;
      this.body.add(p);
    }

    // satni zglobovi (instancirano: brušeno, polirano, perlage)
    jointGeo ??= watchJointGeometry("full");
    knuckleGeo ??= watchJointGeometry("knuckle");
    this.joints = [
      new THREE.InstancedMesh(jointGeo.brushed, this.mats.brushed, JOINTS.length),
      new THREE.InstancedMesh(jointGeo.polished, this.mats.polished, JOINTS.length),
      new THREE.InstancedMesh(jointGeo.perlage, this.mats.perlage, JOINTS.length),
    ];
    // struk B: tri prstena kao kralješci
    waistBGeo ??= waistColumnGeometry(K.joints.waist);
    this.waistB = new THREE.Group();
    this.waistB.matrixAutoUpdate = false;
    // struk B: satenski brušen, bez anizotropije — anizotropni odsjaj na malim prstenovima daje sjaj koji izgleda kao LED
    // (10-lik: bez svjetla); brušenje ostaje kao fina varijacija hrapavosti
    const waistMat = brushedSteel({ brush: 2, roughness: 0.5, anisotropy: 0 });
    waistMat.envMapIntensity = 0.75;
    const waistLip = brushedSteel({ brush: 2, roughness: 0.3, anisotropy: 0 });
    for (const [g, m] of [[waistBGeo.brushed, waistMat], [waistBGeo.polished, waistLip]] as const) {
      const mesh = new THREE.Mesh(g, m);
      mesh.castShadow = mesh.receiveShadow = true;
      this.waistB.add(mesh);
    }
    this.body.add(this.waistB);

    // prsti
    this.phal = new THREE.InstancedMesh(cachedGeo("phal", () => phalanxGeometry(false)), this.mats.fingers, HAND_COUNTS.phal * 2);
    this.tips = new THREE.InstancedMesh(cachedGeo("tip", () => phalanxGeometry(true)), this.mats.fingers, HAND_COUNTS.tips * 2);
    // zglobovi prstiju: brušena jezgra + polirani prsten (bez tamne perlage udubine: na toj veličini čita se kao mrlja)
    this.knuckles = [
      new THREE.InstancedMesh(knuckleGeo.brushed, this.mats.brushed, HAND_COUNTS.knuckles * 2),
      new THREE.InstancedMesh(knuckleGeo.polished, this.mats.polished, HAND_COUNTS.knuckles * 2),
    ];
    for (const im of [...this.joints, this.phal, this.tips, ...this.knuckles]) {
      im.frustumCulled = false;
      im.castShadow = im.receiveShadow = true;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.body.add(im);
    }
    if (costume) this.setCostume(true);
  }

  /** Smoking (10-lik [SMOKING]) kao sloj na istom tijelu; pokrivene drvene dijelove i zglobove skriva. */
  setCostume(on: boolean) {
    if (on && !this.costume) this.costume = buildCostume(this.body, readSwitches().cut);
    if (this.costume) for (const m of this.costume.meshes) m.visible = on;
    for (const n of COVERED_PARTS) {
      const mesh = this.meshes.get(n);
      if (mesh) mesh.visible = !on;
    }
    this.waistB.visible = !on && this.waist === "B";
    this.costumeOn = on;
    if (this.pose) this.setPose(this.pose);
  }
  costumeOn = false;

  setBaton(on: boolean) {
    if (on && !this.baton) {
      this.baton = new Baton();
      this.body.add(this.baton.mesh);
    }
    if (this.baton) this.baton.mesh.visible = on;
    if (this.pose) this.setPose(this.pose);
  }

  setWaist(w: Waist) {
    this.waist = w;
    if (this.pose) this.setPose(this.pose);
  }

  /** Postavi pozu: raspored iz kanona → matrice dijelova, zglobova i prstiju. */
  setPose(pose: Pose) {
    this.pose = pose;
    this.parts = layout(pose);
    this.map = partMap(this.parts);
    const M = this.map;
    for (const [name, mesh] of this.meshes) {
      const p = M[name] as LathePart;
      this.frameMatrix(p, mesh.matrix);
      mesh.matrixWorldNeedsUpdate = true;
    }
    const neck = M.neck as LathePart;
    for (const m of this.neckMeshes) {
      this.frameMatrix(neck, m.matrix);
      m.matrixWorldNeedsUpdate = true;
    }
    // zglobovi
    JOINTS.forEach((j, i) => {
      const b = M[j] as BallPart;
      const hinge = M[HINGE_FROM[j]] as LathePart;
      let s = b.r;
      if (j === "waist" && this.waist === "B") s = 0; // struk B: stup umjesto kugle
      if (this.costumeOn && COVERED_JOINTS.includes(j)) s = 0; // ispod kostima
      this.jointMatrix(b.c, hinge, s, this.m4);
      for (const im of this.joints) im.setMatrixAt(i, this.m4);
    });
    for (const im of this.joints) im.instanceMatrix.needsUpdate = true;
    // struk B: os = os prsa, središte = središte kugle struka
    this.waistB.visible = this.waist === "B" && !this.costumeOn;
    if (this.waist === "B") {
      const chest = M.chest as LathePart, w = M.waist as BallPart;
      this.waistB.matrix.set(
        chest.M.x[0], chest.M.y[0], chest.M.z[0], w.c[0],
        chest.M.x[1], chest.M.y[1], chest.M.z[1], w.c[1],
        chest.M.x[2], chest.M.y[2], chest.M.z[2], w.c[2],
        0, 0, 0, 1,
      );
      this.waistB.matrixWorldNeedsUpdate = true;
    }
    // šake
    let pi = 0, ti = 0, ki = 0;
    for (const s of ["L", "R"] as const) {
      const hand = M["hand" + s] as LathePart;
      this.frameMatrix(hand, this.hm).multiply(this.handScale);
      this.palms[s].matrix.copy(this.hm);
      this.palms[s].matrixWorldNeedsUpdate = true;
      const loc = handLocal(s === "L" ? pose.handL : pose.handR, s === "L" ? 1 : -1);
      for (const m of loc.phal) this.phal.setMatrixAt(pi++, this.m4.multiplyMatrices(this.hm, m));
      for (const m of loc.tips) this.tips.setMatrixAt(ti++, this.m4.multiplyMatrices(this.hm, m));
      for (const k of loc.knuckles) {
        this.m4.multiplyMatrices(this.hm, k.m);
        for (const im of this.knuckles) im.setMatrixAt(ki, this.m4);
        ki++;
      }
    }
    for (const im of [this.phal, this.tips, ...this.knuckles]) im.instanceMatrix.needsUpdate = true;
    if (this.costume && this.costumeOn) poseCostume(this.costume, this.parts);
    if (this.baton?.mesh.visible) {
      this.frameMatrix(M.handL as LathePart, this.hm).multiply(this.handScale);
      this.body.updateWorldMatrix(true, false);
      this.baton.update(this.hm, this.body.matrixWorld, this.viewCamera ?? undefined, this.viewportH);
    }
  }

  /** Matrica okvira dijela (jedinice glave, prostor lutke). */
  frameMatrix(p: LathePart, out: THREE.Matrix4) {
    return out.set(
      p.M.x[0], p.M.y[0], p.M.z[0], p.S[0],
      p.M.x[1], p.M.y[1], p.M.z[1], p.S[1],
      p.M.x[2], p.M.y[2], p.M.z[2], p.S[2],
      0, 0, 0, 1,
    );
  }

  private jointMatrix(c: number[], hinge: LathePart, r: number, out: THREE.Matrix4) {
    // os x = os šarke (x roditelja), y = os roditelja, z = x × y
    const X = new THREE.Vector3(...hinge.M.x).normalize();
    const Y = new THREE.Vector3(...hinge.M.y);
    Y.sub(X.clone().multiplyScalar(Y.dot(X))).normalize();
    const Z = new THREE.Vector3().crossVectors(X, Y);
    out.makeBasis(X.multiplyScalar(r), Y.multiplyScalar(r), Z.multiplyScalar(r));
    out.setPosition(c[0], c[1], c[2]);
    return out;
  }

  /** Okvir dijela u svijetu (za palicu, bilježnicu, olovku, pogled). */
  worldFrame(name: string, out = new THREE.Matrix4()) {
    const p = this.map[name] as LathePart;
    this.frameMatrix(p, out);
    this.body.updateWorldMatrix(true, false);
    return out.premultiply(this.body.matrixWorld);
  }

  /** Točka u prostoru lutke (jedinice glave) → svijet. */
  toWorld(v: THREE.Vector3) {
    this.body.updateWorldMatrix(true, false);
    return v.applyMatrix4(this.body.matrixWorld);
  }

  setVisible(v: boolean) {
    this.group.visible = v;
  }

  setShadows(cast: boolean) {
    this.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = cast;
    });
  }
}
