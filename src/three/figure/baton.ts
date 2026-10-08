import * as THREE from "three";
import { batonMaterial } from "../materials/fabric";
import { BATON_COLOR } from "@/config/switches";

/**
 * Dirigentska palica (10-lik §1: tanka bijela [PRIJEDLOG]; 11 F3: "vidi se u svakom kadru").
 * Oko 37 cm: kruška-drška ~5 cm, štap od 4 mm do 1,8 mm. Jedinice glave (0,22 m).
 * Drži je šaka L (desna šaka lutke): drška u dlanu, štap izlazi između palca i kažiprsta prema naprijed.
 */
export const BATON_LEN = 1.7;

export function batonGeometry() {
  const prof: Array<[number, number]> = [
    [0.0, 0.0], [0.01, 0.03], [0.05, 0.047], [0.12, 0.05], [0.2, 0.042], [0.26, 0.026], [0.3, 0.019],
    [0.9, 0.014], [1.4, 0.0105], [BATON_LEN - 0.02, 0.0085], [BATON_LEN, 0.0],
  ];
  const g = new THREE.LatheGeometry(prof.map(([y, r]) => new THREE.Vector2(r, y)), 20);
  g.setAttribute("aSeed", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count), 1));
  return g;
}

export class Baton {
  mesh: THREE.Mesh;
  /** okvir palice u okviru šake (jedinice glave) */
  grip = new THREE.Matrix4();
  private minPx = 1.6;
  constructor() {
    this.mesh = new THREE.Mesh(batonGeometry(), batonMaterial(BATON_COLOR));
    this.mesh.castShadow = true;
    this.mesh.matrixAutoUpdate = false;
    // drška u dlanu (strana dlana +z), štap prema vrhovima prstiju i naprijed
    const dir = new THREE.Vector3(0.12, 0.62, 0.78).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    this.grip.compose(new THREE.Vector3(0.015, 0.12, 0.05), q, new THREE.Vector3(1, 1, 1));
  }
  /** Postavi palicu prema okviru šake (prostor lutke); camera + px po m za minimalnu vidljivu debljinu. */
  update(handFrame: THREE.Matrix4, bodyWorld: THREE.Matrix4, camera?: THREE.Camera, viewportH = 900) {
    const m = new THREE.Matrix4().multiplyMatrices(handFrame, this.grip);
    if (camera) {
      // širina štapa u pikselima: ako je manja od ~1,6 px, podebljaj (samo debljinu, ne duljinu)
      const world = new THREE.Matrix4().multiplyMatrices(bodyWorld, m);
      const p = new THREE.Vector3().setFromMatrixPosition(world);
      const dist = p.distanceTo(new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld));
      const persp = camera as THREE.PerspectiveCamera;
      const pxPerM = viewportH / (2 * dist * Math.tan(THREE.MathUtils.degToRad(persp.fov ?? 30) / 2));
      const shaftM = 0.012 * 2 * 0.22; // promjer štapa u metrima
      const k = Math.max(1, this.minPx / Math.max(shaftM * pxPerM, 1e-4));
      m.multiply(new THREE.Matrix4().makeScale(Math.min(k, 4), 1, Math.min(k, 4)));
    }
    this.mesh.matrix.copy(m);
    this.mesh.matrixWorldNeedsUpdate = true;
  }
}
