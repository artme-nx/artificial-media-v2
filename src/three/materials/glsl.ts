/** Zajednički GLSL: šum, Worley ćelije, bump iz visine (bez tekstura — sve proceduralno, CREDITS.md). */
export const NOISE_GLSL = /* glsl */ `
  float hash13( vec3 p3 ) {
    p3 = fract( p3 * 0.1031 );
    p3 += dot( p3, p3.zyx + 31.32 );
    return fract( ( p3.x + p3.y ) * p3.z );
  }
  vec3 hash33( vec3 p3 ) {
    p3 = fract( p3 * vec3( 0.1031, 0.1030, 0.0973 ) );
    p3 += dot( p3, p3.yxz + 33.33 );
    return fract( ( p3.xxy + p3.yxx ) * p3.zyx );
  }
  float vnoise( vec3 p ) {
    vec3 i = floor( p );
    vec3 f = fract( p );
    f = f * f * ( 3.0 - 2.0 * f );
    float n000 = hash13( i );
    float n100 = hash13( i + vec3( 1, 0, 0 ) );
    float n010 = hash13( i + vec3( 0, 1, 0 ) );
    float n110 = hash13( i + vec3( 1, 1, 0 ) );
    float n001 = hash13( i + vec3( 0, 0, 1 ) );
    float n101 = hash13( i + vec3( 1, 0, 1 ) );
    float n011 = hash13( i + vec3( 0, 1, 1 ) );
    float n111 = hash13( i + vec3( 1, 1, 1 ) );
    return mix( mix( mix( n000, n100, f.x ), mix( n010, n110, f.x ), f.y ),
                mix( mix( n001, n101, f.x ), mix( n011, n111, f.x ), f.y ), f.z );
  }
  float fbm3( vec3 p ) {
    float a = 0.5, s = 0.0;
    for ( int i = 0; i < 4; i ++ ) { s += a * vnoise( p ); p = p * 2.03 + 17.1; a *= 0.5; }
    return s;
  }
  float fbm2o( vec3 p ) {
    return 0.62 * vnoise( p ) + 0.38 * vnoise( p * 2.07 + 11.3 );
  }
  // Worley F1: udaljenost i vektor do najbliže točke (3D)
  vec4 worley3( vec3 p ) {
    vec3 i = floor( p ), f = fract( p );
    float best = 8.0; vec3 bv = vec3( 0.0 );
    for ( int z = -1; z <= 1; z ++ )
    for ( int y = -1; y <= 1; y ++ )
    for ( int x = -1; x <= 1; x ++ ) {
      vec3 g = vec3( float( x ), float( y ), float( z ) );
      vec3 o = hash33( i + g );
      vec3 r = g + o - f;
      float d = dot( r, r );
      if ( d < best ) { best = d; bv = r; }
    }
    return vec4( sqrt( best ), bv );
  }
  // Bump iz skalarne visine preko derivacija ekrana (Mikkelsen)
  vec3 bumpFromHeight( vec3 surfPos, vec3 surfNorm, float height, float scale ) {
    vec3 sx = dFdx( surfPos );
    vec3 sy = dFdy( surfPos );
    vec3 r1 = cross( sy, surfNorm );
    vec3 r2 = cross( surfNorm, sx );
    float det = dot( sx, r1 );
    float dhx = dFdx( height ) * scale;
    float dhy = dFdy( height ) * scale;
    vec3 grad = sign( det ) * ( dhx * r1 + dhy * r2 );
    return normalize( abs( det ) * surfNorm - grad );
  }
`;
