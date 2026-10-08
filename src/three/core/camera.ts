import * as THREE from "three";

/** Kamera kao film (11 §2): objektiv zadan u milimetrima na full-frame senzoru (36 mm). */
export function lensCamera(focalMm: number, aspect = 16 / 9, near = 0.05, far = 80) {
  const cam = new THREE.PerspectiveCamera(30, aspect, near, far);
  cam.filmGauge = 36;
  cam.setFocalLength(focalMm);
  return cam;
}

/** Dubina polja (m) za objektiv f (mm), otvor N, udaljenost fokusa s (m); krug konfuzije 0,03 mm. */
export function depthOfField(focalMm: number, fStop: number, s: number, coc = 0.03) {
  const f = focalMm / 1000, c = coc / 1000;
  const H = (f * f) / (fStop * c) + f; // hiperfokalna
  const near = (s * (H - f)) / (H + s - 2 * f);
  const far = s < H ? (s * (H - f)) / (H - s) : Infinity;
  return { near, far, range: Math.min(far, 1e3) - near };
}
