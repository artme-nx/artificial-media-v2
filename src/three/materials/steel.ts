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
