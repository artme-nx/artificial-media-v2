import * as THREE from "three";

/**
 * PCSS (percentage-closer soft shadows) za spot svjetla — tehnika iz head-tracking-3d (render/pcss.js),
 * prilagođena metrima. Meke sjene, oštre uz dodir, sve mekše što je bloker dalje (contact hardening).
 * Radi u BasicShadowMap grani (obična depth tekstura). shadow.radius = veličina izvora u UV jedinicama na near ravnini.
 */
export const PCSS_NEAR = 0.5;
export const PCSS_FAR = 40;

const PCSS_GLSL = /* glsl */ `
#ifdef USE_SHADOWMAP
#if NUM_SPOT_LIGHT_SHADOWS > 0
#if defined( SHADOWMAP_TYPE_BASIC )
  #define PCSS_NEAR ${PCSS_NEAR.toFixed(2)}
  #define PCSS_FAR ${PCSS_FAR.toFixed(1)}
  #define PCSS_BLOCKER_SAMPLES 12
  #define PCSS_FILTER_SAMPLES 20
  float pcssLinearDepth( float d ) { return ( PCSS_NEAR * PCSS_FAR ) / ( PCSS_FAR - d * ( PCSS_FAR - PCSS_NEAR ) ); }
  float pcssNoise( vec2 p ) { return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) ); }
  vec2 pcssVogel( int i, int n, float phi ) {
    float r = sqrt( ( float( i ) + 0.5 ) / float( n ) );
    float theta = float( i ) * 2.399963229728653 + phi;
    return vec2( cos( theta ), sin( theta ) ) * r;
  }
  float getSpotShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
    shadowCoord.xyz /= shadowCoord.w;
    shadowCoord.z += shadowBias;
    bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
    if ( ! inFrustum || shadowCoord.z > 1.0 ) return 1.0;
    float zR = shadowCoord.z;
    if ( shadowRadius <= 0.0 ) return mix( 1.0, step( zR, texture2D( shadowMap, shadowCoord.xy ).r ), shadowIntensity );
    float zRLin = pcssLinearDepth( zR );
    float lightUV = shadowRadius;
    float phi = pcssNoise( gl_FragCoord.xy ) * 6.28318530718;
    float texel = 1.0 / shadowMapSize.x;
    float searchR = clamp( lightUV * ( zRLin - PCSS_NEAR ) / zRLin, 2.0 * texel, 0.06 );
    float blockerSum = 0.0, blockers = 0.0;
    for ( int i = 0; i < PCSS_BLOCKER_SAMPLES; i ++ ) {
      float d = texture2D( shadowMap, shadowCoord.xy + pcssVogel( i, PCSS_BLOCKER_SAMPLES, phi ) * searchR ).r;
      if ( d < zR ) { blockerSum += pcssLinearDepth( d ); blockers += 1.0; }
    }
    if ( blockers < 0.5 ) return 1.0;
    float zB = blockerSum / blockers;
    float penumbra = lightUV * PCSS_NEAR * ( zRLin - zB ) / ( zB * zRLin );
    float filterR = clamp( penumbra, 1.25 * texel, 0.05 );
    float lit = 0.0;
    for ( int i = 0; i < PCSS_FILTER_SAMPLES; i ++ ) {
      vec2 o = pcssVogel( i, PCSS_FILTER_SAMPLES, phi + 1.618 ) * filterR;
      lit += step( zR, texture2D( shadowMap, shadowCoord.xy + o ).r );
    }
    lit /= float( PCSS_FILTER_SAMPLES );
    return mix( 1.0, lit, shadowIntensity );
  }
#else
  #define getSpotShadow getShadow
#endif
#endif
#endif
`;

let installed = false;
export function installPCSS() {
  if (installed) return;
  installed = true;
  const chunks = THREE.ShaderChunk as unknown as Record<string, string>;
  chunks.shadowmap_pars_fragment += PCSS_GLSL;
  for (const name of ["lights_fragment_begin", "shadowmask_pars_fragment"]) {
    const before = chunks[name];
    chunks[name] = before.replaceAll("getShadow( spotShadowMap[ i ]", "getSpotShadow( spotShadowMap[ i ]");
    if (chunks[name] === before) console.warn(`PCSS: chunk ${name} nije zakrpan`);
  }
}

/** Spot za PCSS; sourceSize = fizička veličina izvora u metrima (veće = mekše sjene). */
export function configurePCSSSpot(light: THREE.SpotLight, sourceSize: number, mapSize = 2048) {
  light.castShadow = true;
  const s = light.shadow;
  s.mapSize.set(mapSize, mapSize);
  s.camera.near = PCSS_NEAR;
  s.camera.far = PCSS_FAR;
  s.focus = 1;
  s.bias = -0.00006;
  s.normalBias = 0.004;
  s.radius = pcssLightSize(light, sourceSize);
  s.camera.updateProjectionMatrix();
}
export function pcssLightSize(light: THREE.SpotLight, sourceSize: number) {
  const halfWidth = PCSS_NEAR * Math.tan(light.angle * light.shadow.focus);
  return sourceSize / (2 * halfWidth);
}
