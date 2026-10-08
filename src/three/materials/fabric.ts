import * as THREE from "three";
import { extendMaterial } from "./extend";

/**
 * Tkanine smokinga (10-lik §3 [SMOKING]): crna vuna, crni saten (reveri, pruga, gumbi), bijela košulja,
 * ljubičasta svila (leptir-mašna i maramica — jedina ljubičasta na liku), lakirana koža (cipele).
 * Fine strukture tkanja su proceduralne i gase se po veličini piksela.
 */
export const VIOLET = "#5B2A86"; // [TREBA POTVRDU] nijansa (10-lik §1); token primitive.color.violet.700

export function woolMaterial() {
  const m = new THREE.MeshPhysicalMaterial({
    color: "#111114",
    roughness: 0.86,
    metalness: 0,
    sheen: 0.4,
    sheenRoughness: 0.7,
    sheenColor: new THREE.Color("#3c3c46"),
    side: THREE.DoubleSide,
    envMapIntensity: 0.6,
  });
  return extendMaterial(m, {
    key: "wool-v1",
    fragmentPars: /* glsl */ `float gWeave;`,
    hooks: {
      color_fragment: /* glsl */ `
        {
          vec3 p = vObjPos;
          float px = length( fwidth( p ) );
          float lod = 1.0 - smoothstep( 0.0015, 0.006, px );
          // keper (twill): dijagonalna rebra
          float tw = sin( ( p.x + p.y * 1.0 + p.z ) * 900.0 ) * 0.5 + 0.5;
          float n = vnoise( p * 120.0 );
          gWeave = ( tw * 0.6 + n * 0.4 - 0.5 ) * lod;
          diffuseColor.rgb *= 1.0 + gWeave * 0.18 + ( vnoise( p * 9.0 ) - 0.5 ) * 0.06;
        }
      `,
      roughnessmap_fragment: /* glsl */ `roughnessFactor = clamp( roughnessFactor + gWeave * 0.08, 0.5, 1.0 );`,
      normal_fragment_maps: /* glsl */ `normal = bumpFromHeight( - vViewPosition, normal, gWeave, 0.00006 );`,
    },
  });
}

/** Saten: oštar, izdužen odsjaj (anizotropija uzduž tkanja). */
export function satinMaterial(color = "#08080a") {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.22,
    metalness: 0,
    anisotropy: 0.0,
    sheen: 0.5,
    sheenRoughness: 0.25,
    sheenColor: new THREE.Color("#6a6a78"),
    clearcoat: 0.45,
    clearcoatRoughness: 0.12,
    side: THREE.DoubleSide,
    envMapIntensity: 1.1,
  });
}

/** Bijela košulja s finim okomitim naborima (prsni dio smoking košulje). */
export function shirtMaterial() {
  const m = new THREE.MeshPhysicalMaterial({
    color: "#ebe8e1",
    roughness: 0.72,
    sheen: 0.4,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color("#ffffff"),
    side: THREE.DoubleSide,
    envMapIntensity: 0.7,
  });
  return extendMaterial(m, {
    key: "shirt-v1",
    fragmentPars: /* glsl */ `float gPleat;`,
    hooks: {
      color_fragment: /* glsl */ `
        {
          float px = length( fwidth( vObjPos ) );
          float lod = 1.0 - smoothstep( 0.002, 0.008, px );
          gPleat = ( abs( fract( vObjPos.x * 26.0 ) - 0.5 ) * 2.0 - 0.5 ) * lod;
          diffuseColor.rgb *= 1.0 - max( -gPleat, 0.0 ) * 0.08;
        }
      `,
      normal_fragment_maps: /* glsl */ `normal = bumpFromHeight( - vViewPosition, normal, gPleat, 0.00015 );`,
    },
  });
}

/** Ljubičasta svila (leptir-mašna, maramica). */
export function silkMaterial(color = VIOLET) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.34,
    metalness: 0,
    anisotropy: 0.55,
    sheen: 1.0,
    sheenRoughness: 0.35,
    sheenColor: new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.35),
    side: THREE.DoubleSide,
    envMapIntensity: 1,
  });
}

/** Lakirana koža (cipele). */
export function patentMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: "#050506",
    roughness: 0.22,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.3,
  });
}

/** Palica: tanka bijela (10-lik §1 [PRIJEDLOG]), lakirana. */
export function batonMaterial(color = "#f4f1ea") {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.15, envMapIntensity: 0.9 });
}
