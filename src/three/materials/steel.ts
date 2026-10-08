import * as THREE from "three";
import { extendMaterial } from "./extend";

/**
 * Brušeni nehrđajući čelik, jednobojan (10-lik §1): anizotropni odsjaj, fine linije brušenja kao varijacija hrapavosti.
 * Smjer brušenja (uBrush): 0 = kružno oko lokalne osi x (zglobovi), 1 = uzduž lokalne osi y (udovi robota),
 * 2 = kružno oko lokalne osi y (prstenovi). Smjer anizotropije daje atribut `tangent` geometrije.
 * Bez boja, bez zlata i mesinga (10-lik §3 [IZBJEGAVAJ]).
 */
const STEEL = new THREE.Color().setRGB(0.56, 0.57, 0.585, THREE.LinearSRGBColorSpace);

export function brushedSteel({ brush = 0, roughness = 0.34, anisotropy = 0.85, tint = 1 }: { brush?: 0 | 1 | 2; roughness?: number; anisotropy?: number; tint?: number } = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color: STEEL.clone().multiplyScalar(tint),
    metalness: 1,
    roughness,
    anisotropy,
    envMapIntensity: 1.55,
  });
  return extendMaterial(m, {
    key: `steel-brushed-${brush}`,
    uniforms: { uBrush: { value: brush } },
    fragmentPars: /* glsl */ `
      uniform int uBrush;
      float gBrush;
    `,
    hooks: {
      color_fragment: /* glsl */ `
        {
          vec3 p = vObjPos;
          float px = length( fwidth( p ) );
          float lod = 1.0 - smoothstep( 0.002, 0.02, px );
          float n;
          if ( uBrush == 0 ) {
            float a = atan( p.z, p.y );
            n = vnoise( vec3( p.x * 420.0, a * 2.0, vSeed * 9.0 ) ) * 0.6 + vnoise( vec3( p.x * 1300.0, a * 5.0, 3.0 ) ) * 0.4;
          } else if ( uBrush == 1 ) {
            float a = atan( p.z, p.x );
            float r = length( p.xz );
            n = vnoise( vec3( a * r * 420.0, p.y * 3.0, vSeed * 9.0 ) ) * 0.6 + vnoise( vec3( a * r * 1300.0, p.y * 6.0, 3.0 ) ) * 0.4;
          } else {
            float r = length( p.xz );
            float a = atan( p.z, p.x );
            n = vnoise( vec3( p.y * 420.0 + r * 30.0, a * 2.0, vSeed * 9.0 ) ) * 0.6 + vnoise( vec3( p.y * 1300.0, a * 5.0, 3.0 ) ) * 0.4;
          }
          gBrush = ( n - 0.5 ) * lod;
          diffuseColor.rgb *= 1.0 + gBrush * 0.06;
        }
      `,
      roughnessmap_fragment: /* glsl */ `
        roughnessFactor = clamp( roughnessFactor + gBrush * 0.16, 0.06, 1.0 );
      `,
    },
  });
}

/** Polirani čelik (kosi rub prstena, ležaj, glave vijaka). */
export function polishedSteel({ roughness = 0.13 }: { roughness?: number } = {}) {
  return new THREE.MeshPhysicalMaterial({ color: STEEL.clone().multiplyScalar(1.04), metalness: 1, roughness, envMapIntensity: 1.45 });
}

/**
 * Dno udubine mehanizma: čelik s "perlage" završnom obradom (preklopljeni kružići, kao na mehanizmu sata),
 * malo tamniji. Uzorak u lokalnoj ravnini yz (lice zgloba gleda u +x / −x).
 */
export function perlageSteel() {
  const m = new THREE.MeshPhysicalMaterial({
    color: STEEL.clone().multiplyScalar(0.72),
    metalness: 1,
    roughness: 0.34,
    envMapIntensity: 1.2,
  });
  return extendMaterial(m, {
    key: "steel-perlage",
    fragmentPars: /* glsl */ `float gPerl;`,
    hooks: {
      color_fragment: /* glsl */ `
        {
          vec2 q = vObjPos.yz * 9.0;
          vec2 cell = floor( q );
          float best = 0.0;
          // preklopljeni krugovi: svaki krug ima koncentrične fine linije; zadnji nacrtani prekriva prethodni
          for ( int j = -1; j <= 1; j ++ )
          for ( int i = -1; i <= 1; i ++ ) {
            vec2 c = cell + vec2( float( i ), float( j ) ) + vec2( 0.5 + 0.5 * mod( cell.y + float( j ), 2.0 ), 0.5 );
            float r = length( q - c );
            if ( r < 0.78 ) best = 0.5 + 0.5 * sin( r * 70.0 );
          }
          float px = length( fwidth( vObjPos ) );
          float lod = 1.0 - smoothstep( 0.002, 0.012, px );
          gPerl = ( best - 0.5 ) * lod;
          diffuseColor.rgb *= 1.0 + gPerl * 0.12;
        }
      `,
      roughnessmap_fragment: /* glsl */ `roughnessFactor = clamp( roughnessFactor + gPerl * 0.2, 0.08, 1.0 );`,
    },
  });
}

/**
 * "Hi-tech" robot (11 F6, 10-lik [ROBOT]): brušeni čelik s preciznim razdjelnim linijama — prstenasti spojevi
 * uzduž dijela i uzdužni šav sprijeda, kao obrađeni metalni segmenti. I dalje bez svjetla, LED-ica i ekrana.
 * Linije su u lokalnom prostoru dijela (os y = os uda); gase se po veličini piksela (bez moiréa).
 */
export function hiTechSteel({ roughness = 0.24, anisotropy = 0.3, tint = 0.84, head = false }: { roughness?: number; anisotropy?: number; tint?: number; head?: boolean } = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color: STEEL.clone().multiplyScalar(tint),
    metalness: 1,
    roughness,
    anisotropy,
    envMapIntensity: 1.75,
  });
  return extendMaterial(m, {
    key: `steel-hitech-v3-${head ? "h" : "b"}`,
    uniforms: { uHead: { value: head ? 1 : 0 } },
    fragmentPars: /* glsl */ `uniform int uHead; float gSeam; float gEdge;`,
    hooks: {
      color_fragment: /* glsl */ `
        {
          vec3 p = vObjPos;
          float px = length( fwidth( p ) );
          // tanke, oštre razdjelnice (obrađeni segmenti), s analitičkim AA (bez šahovskog šuma)
          float fy = fract( p.y * 2.4 + vSeed * 0.37 );
          float dy = min( fy, 1.0 - fy ) / 2.4;               // udaljenost do linije u jedinicama glave
          float w = 0.0045;
          float aa = max( px * 0.8, 1e-4 );
          float ring = ( 1.0 - smoothstep( w - aa, w + aa, dy ) ) * float( uHead == 0 );
          // svijetli obrađeni rub uz liniju (jedna strana)
          float edge = ( 1.0 - smoothstep( 0.0, w * 1.6 + aa, abs( dy - w * 2.2 ) ) ) * ( 1.0 - ring ) * float( uHead == 0 );
          // uzdužni šav: na tijelu sprijeda, na glavi straga (ne u visini "očiju")
          float a = atan( p.z, p.x );
          float sa = abs( sin( 0.5 * ( a - ( uHead == 1 ? -1.5708 : 1.5708 ) ) ) );
          float seam = 1.0 - smoothstep( 0.006 - aa * 2.0, 0.006 + aa * 2.0, sa * length( p.xz ) );
          gSeam = max( ring, seam * 0.9 );
          gEdge = edge;
          float lod = 1.0 - smoothstep( 0.004, 0.012, px );
          float br = vnoise( vec3( a * 40.0, p.y * 380.0, vSeed * 7.0 ) );
          diffuseColor.rgb *= ( 1.0 - gSeam * 0.8 ) * ( 1.0 + gEdge * 0.3 ) * ( 0.97 + 0.06 * br * lod );
        }
      `,
      roughnessmap_fragment: /* glsl */ `roughnessFactor = clamp( roughnessFactor + gSeam * 0.4 - gEdge * 0.14, 0.06, 1.0 );`,
    },
  });
}
