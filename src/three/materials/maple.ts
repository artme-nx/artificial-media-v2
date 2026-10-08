import * as THREE from "three";
import { extendMaterial } from "./extend";

/**
 * Ptičje oko javor (bird's-eye maple), 10-lik §1 i §3: sitni sjajni uzorak "očiju", saten ručno trljan,
 * svijetlo zlatni (krem-med) ton, žila uzduž uda, chatoyance koja se mijenja s kutom gledanja.
 *
 * Model (lokalni prostor dijela, jedinica = visina glave = 22 cm, os y = os uda):
 *  - oči: gusto (razmak ~6 mm), nasumične veličine, ne u svakoj ćeliji; tamna jezgra, svjetliji prsten,
 *    blagi tamni rub; žila se vrtloži oko svakog oka (domain warp)
 *  - žila: fini potezi uzduž osi, valovito zakrivljeni
 *  - chatoyance: pruge kovrče mijenjaju SJAJ (hrapavost i odsjaj), ne boju — vide se samo u odsjaju i pomiču se s kutom
 *  - anti-aliasing: svaki fini uzorak se gasi prema veličini piksela (fwidth), pa nema moiréa u širokim kadrovima
 */
export type MapleOptions = { tone?: number };

export function mapleMaterial({ tone = 1 }: MapleOptions = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    roughness: 0.42,
    metalness: 0,
    clearcoat: 0.22,
    clearcoatRoughness: 0.34,
    specularIntensity: 0.45,
    sheen: 0.08,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color("#f1d6a8"),
    envMapIntensity: 0.9,
  });
  return extendMaterial(m, {
    key: "maple-v4",
    uniforms: { uTone: { value: tone } },
    fragmentPars: /* glsl */ `
      uniform float uTone;
      float gChat;
      float gH;
      float gGlint;
      // Worley s podacima ćelije: x = udaljenost do središta oka (u jedinicama polumjera oka), yzw = vektor
      vec4 eyeCells( vec3 q, out float has ) {
        vec3 i = floor( q ), f = fract( q );
        float best = 9.0; vec3 bv = vec3( 0.0 ); has = 0.0;
        for ( int z = -1; z <= 1; z ++ )
        for ( int y = -1; y <= 1; y ++ )
        for ( int x = -1; x <= 1; x ++ ) {
          vec3 g = vec3( float( x ), float( y ), float( z ) );
          vec3 h = hash33( i + g + 13.7 );
          if ( h.z > 0.72 ) continue;                 // ne ima svaka ćelija oko
          vec3 o = hash33( i + g );
          float rad = mix( 0.3, 0.48, h.x * h.x );     // polumjer oka ~1,4–2,3 mm (jezgra ~0,7–1,1 mm)
          vec3 r = g + o - f;
          float d = length( r ) / rad;
          if ( d < best ) { best = d; bv = r; has = 1.0; }
        }
        return vec4( best, bv );
      }
      float aaFade( float freqTimesPx ) { return 1.0 - smoothstep( 0.25, 0.75, freqTimesPx ); }
    `,
    hooks: {
      color_fragment: /* glsl */ `
        {
          vec3 p = vObjPos;
          vec3 sp = p + vec3( vSeed * 7.13, vSeed * 13.71, vSeed * 5.17 );
          float px = length( fwidth( p ) );           // veličina piksela u jedinicama glave

          // ---- oči: sitna tamna točka (ne prsten); vlakna je obilaze
          const float EYE_F = 46.0;                   // ćelije po jedinici glave (~4,8 mm): gusto, kao pravo ptičje oko
          float has;
          vec4 e = eyeCells( vec3( sp.x * EYE_F, sp.y * EYE_F * 0.8, sp.z * EYE_F ), has );
          float d = e.x;
          float aE = aaFade( px * EYE_F * 1.6 );
          float core = ( 1.0 - smoothstep( 0.25, 0.6, d ) ) * has;            // tamna točka s mekim rubom
          float glint = smoothstep( 0.55, 0.7, d ) * ( 1.0 - smoothstep( 0.7, 1.0, d ) ) * has;  // tanki svijetli sjaj oko točke (samo u odsjaju)
          float swirl = ( 1.0 - smoothstep( 0.6, 2.6, d ) ) * has;

          // ---- žila: uzdužna, vlakna se savijaju oko očiju (domain warp tangencijalno)
          vec3 rr3 = vec3( e.y, 0.0, e.w );
          vec3 tang = normalize( vec3( -rr3.z, 0.0, rr3.x ) + 1e-4 );
          vec3 warp = ( rr3 * 0.9 + tang * 0.6 ) / EYE_F * swirl;
          vec3 gp = sp + warp;
          // srednja skala (preživi i u srednjem kadru): duge pruge uzduž osi s blagim valom
          float wave = fbm2o( vec3( sp.x * 1.8, sp.y * 0.35, sp.z * 1.8 ) );
          float s1 = vnoise( vec3( sp.x * 30.0 + wave * 2.0, sp.y * 0.5, sp.z * 30.0 + wave * 2.0 ) );
          float streak = smoothstep( 0.5, 0.88, s1 ) * aaFade( px * 30.0 * 1.2 );
          // fina vlakna
          const float G1 = 80.0, G2 = 240.0;
          float g1 = vnoise( vec3( gp.x * G1, gp.y * 1.2, gp.z * G1 ) );
          float g2 = vnoise( vec3( gp.x * G2, gp.y * 2.6, gp.z * G2 ) + 7.0 );
          float fibers = smoothstep( 0.6, 0.88, g1 ) * 0.4 * aaFade( px * G1 * 1.4 ) + smoothstep( 0.62, 0.9, g2 ) * 0.28 * aaFade( px * G2 * 1.4 );

          // ---- ton: polagane varijacije (tokareno iz grede) — vidljive i u širokom kadru
          float tone = fbm2o( vec3( sp.x * 1.2, sp.y * 0.25, sp.z * 1.2 ) );
          float tone2 = vnoise( vec3( sp.x * 4.0, sp.y * 0.9, sp.z * 4.0 ) );

          vec3 cBase  = vec3( 0.70, 0.49, 0.235 ) * uTone;
          vec3 cWarm  = vec3( 0.56, 0.36, 0.15 ) * uTone;
          vec3 cStreak = vec3( 0.40, 0.235, 0.085 ) * uTone;
          vec3 cFiber = vec3( 0.36, 0.205, 0.072 ) * uTone;
          vec3 cCore  = vec3( 0.17, 0.085, 0.028 ) * uTone;
          vec3 cLight = vec3( 0.80, 0.60, 0.33 ) * uTone;

          vec3 col = mix( cBase, cLight, smoothstep( 0.55, 0.85, tone ) * 0.5 );
          col = mix( col, cWarm, smoothstep( 0.2, 0.5, 1.0 - tone ) * 0.45 + tone2 * 0.12 );
          col = mix( col, cStreak, streak * 0.3 );
          col = mix( col, cFiber, min( 1.0, fibers * 1.5 ) );
          col = mix( col, cCore, core * 0.92 * aE );

          // ---- chatoyance: pruge kovrče poprijeko osi mijenjaju sjaj s kutom pogleda
          float aC = aaFade( px * 60.0 * 1.2 );
          float rip = sin( sp.y * 60.0 + fbm2o( vec3( sp.x * 2.5, sp.y * 0.9, sp.z * 2.5 ) ) * 7.0 + swirl * 1.5 );
          vec3 V = normalize( vViewPosition );
          float ax = dot( V, vAxisV );
          gChat = 0.5 + 0.5 * rip * clamp( ax * 3.0 + 0.3 * sin( sp.y * 7.0 ), -1.0, 1.0 ) * aC;
          col *= 0.97 + 0.06 * gChat;

          gH = ( glint * 0.4 - core * 0.7 ) * aE - fibers * 0.35 - streak * 0.15;
          gGlint = glint * aE;
          diffuseColor.rgb = col;
        }
      `,
      roughnessmap_fragment: /* glsl */ `
        roughnessFactor = clamp( roughnessFactor * mix( 1.22, 0.72, gChat ) - gGlint * 0.12, 0.16, 1.0 );
      `,
      normal_fragment_maps: /* glsl */ `
        normal = bumpFromHeight( - vViewPosition, normal, gH, 0.00008 );
      `,
    },
  });
}
