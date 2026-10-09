(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,27941,o=>{"use strict";var e=o.i(8560);let a=`
#ifdef USE_SHADOWMAP
#if NUM_SPOT_LIGHT_SHADOWS > 0
#if defined( SHADOWMAP_TYPE_BASIC )
  #define PCSS_NEAR 0.50
  #define PCSS_FAR 40.0
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
`,t=!1;o.s(["configurePCSSSpot",0,function(o,e,a=2048){var t;o.castShadow=!0;let r=o.shadow;r.mapSize.set(a,a),r.camera.near=.5,r.camera.far=40,r.focus=1,r.bias=-6e-5,r.normalBias=.004,r.radius=e/(2*(.5*Math.tan((t=o).angle*t.shadow.focus))),r.camera.updateProjectionMatrix()},"installPCSS",0,function(){if(t)return;t=!0;let o=e.ShaderChunk;for(let e of(o.shadowmap_pars_fragment+=a,["lights_fragment_begin","shadowmask_pars_fragment"])){let a=o[e];o[e]=a.replaceAll("getShadow( spotShadowMap[ i ]","getSpotShadow( spotShadowMap[ i ]"),o[e]===a&&console.warn(`PCSS: chunk ${e} nije zakrpan`)}}])},86370,o=>{"use strict";let e=0,a=0,t=!1;o.s(["isCalm",0,function(o=performance.now(),r=500){return!function(){if(t)return;t=!0;let o=()=>e=performance.now();for(let e of["scroll","wheel","pointermove","pointerdown","keydown","touchmove","input"])window.addEventListener(e,o,{passive:!0,capture:!0})}(),o-e>r&&o>a},"keepBusy",0,function(o=300){a=Math.max(a,performance.now()+o)}])}]);