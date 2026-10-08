import * as THREE from "three";
import { Pass } from "postprocessing";

/**
 * Volumetrijski snopovi reflektora kroz scenski dim (11 §2: raymarch s 3D šumom, prava sjena lutke u snopu).
 * Tehnika iz head-tracking-3d (render/volumetric.js), proširena na do 4 reflektora; sjena iz shadow mape
 * za prva dva. Raymarch u smanjenoj rezoluciji, kompozit s bilateralnim (dubinskim) upsamplingom.
 */
export const MAX_VOL_LIGHTS = 4;

function makeNoise3D(size = 64) {
  const data = new Uint8Array(size * size * size);
  const lattice = (period: number, seed: number) => {
    const g = new Float32Array(period * period * period);
    let s = seed;
    for (let i = 0; i < g.length; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      g[i] = s / 4294967296;
    }
    return g;
  };
  const octaves = [
    { period: 4, amp: 0.45, g: lattice(4, 17) },
    { period: 8, amp: 0.3, g: lattice(8, 91) },
    { period: 16, amp: 0.17, g: lattice(16, 7) },
    { period: 32, amp: 0.08, g: lattice(32, 3) },
  ];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  for (let z = 0; z < size; z++)
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        let v = 0;
        for (const o of octaves) {
          const P = o.period;
          const fx = (x / size) * P, fy = (y / size) * P, fz = (z / size) * P;
          const x0 = Math.floor(fx), y0 = Math.floor(fy), z0 = Math.floor(fz);
          const tx = smooth(fx - x0), ty = smooth(fy - y0), tz = smooth(fz - z0);
          const at = (i: number, j: number, k: number) => o.g[(i % P) + (j % P) * P + (k % P) * P * P];
          const x1 = x0 + 1, y1 = y0 + 1, z1 = z0 + 1;
          const c00 = at(x0, y0, z0) * (1 - tx) + at(x1, y0, z0) * tx;
          const c10 = at(x0, y1, z0) * (1 - tx) + at(x1, y1, z0) * tx;
          const c01 = at(x0, y0, z1) * (1 - tx) + at(x1, y0, z1) * tx;
          const c11 = at(x0, y1, z1) * (1 - tx) + at(x1, y1, z1) * tx;
          v += ((c00 * (1 - ty) + c10 * ty) * (1 - tz) + (c01 * (1 - ty) + c11 * ty) * tz) * o.amp;
        }
        data[x + y * size + z * size * size] = Math.min(255, Math.max(0, Math.round(v * 255)));
      }
  const tex = new THREE.Data3DTexture(data, size, size, size);
  tex.format = THREE.RedFormat;
  tex.type = THREE.UnsignedByteType;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  return tex;
}

const fullscreenVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4( position.xy, 0.0, 1.0 ); }
`;

const marchFragment = /* glsl */ `
  precision highp float;
  precision highp sampler3D;
  #define MAXL ${MAX_VOL_LIGHTS}
  uniform sampler2D tDepth;
  uniform sampler2D tShadow0;
  uniform sampler2D tShadow1;
  uniform sampler3D tNoise;
  uniform mat4 projInv;
  uniform mat4 camWorld;
  uniform vec3 camPos;
  uniform int count;
  uniform vec3 lightPos[ MAXL ];
  uniform vec3 lightDir[ MAXL ];
  uniform vec3 lightColor[ MAXL ];
  uniform float cosOuter[ MAXL ];
  uniform float cosInner[ MAXL ];
  uniform float range[ MAXL ];
  uniform float lightDensity[ MAXL ];
  uniform mat4 shadowMatrix0;
  uniform mat4 shadowMatrix1;
  uniform float useShadow0;
  uniform float useShadow1;
  uniform float density;
  uniform float ambientDensity;
  uniform vec3 ambientColor;
  uniform float heightFalloff;
  uniform float floorY;
  uniform float noiseScale;
  uniform float noiseAmount;
  uniform vec3 wind;
  uniform float time;
  uniform float g;
  uniform int steps;
  varying vec2 vUv;

  float ign( vec2 p ) { return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) ); }
  float hg( float c ) {
    float g2 = g * g;
    return ( 1.0 - g2 ) / ( 12.5663706 * pow( max( 1.0 + g2 - 2.0 * g * c, 1e-4 ), 1.5 ) );
  }
  bool coneHit( vec3 o, vec3 d, vec3 A, vec3 D, float cosO, out float t0, out float t1 ) {
    vec3 co = o - A;
    float cos2 = cosO * cosO;
    float dD = dot( d, D ), coD = dot( co, D );
    float a = dD * dD - cos2;
    float b = 2.0 * ( dD * coD - dot( d, co ) * cos2 );
    float c = coD * coD - dot( co, co ) * cos2;
    float disc = b * b - 4.0 * a * c;
    bool inside = c > 0.0 && coD > 0.0;
    if ( disc < 0.0 ) { if ( inside ) { t0 = 0.0; t1 = 1e6; return true; } return false; }
    float sq = sqrt( disc );
    float r0 = ( -b - sq ) / ( 2.0 * a ), r1 = ( -b + sq ) / ( 2.0 * a );
    if ( r0 > r1 ) { float tmp = r0; r0 = r1; r1 = tmp; }
    bool h0 = dot( o + d * r0 - A, D ) > 0.0, h1 = dot( o + d * r1 - A, D ) > 0.0;
    if ( inside ) { t0 = 0.0; t1 = h1 && r1 > 0.0 ? r1 : ( h0 && r0 > 0.0 ? r0 : 1e6 ); return true; }
    if ( h0 && h1 ) { t0 = r0; t1 = r1; return t1 > 0.0; }
    if ( h0 ) { t0 = r0; t1 = 1e6; return true; }
    if ( h1 ) { t0 = r1; t1 = 1e6; return true; }
    return false;
  }
  float hazeDensity( vec3 p ) {
    vec3 np = p * noiseScale + wind * time;
    float n = texture( tNoise, np ).r * 0.62 + texture( tNoise, np * 2.31 + 3.1 ).r * 0.38;
    float h = exp( -max( p.y - floorY, 0.0 ) * heightFalloff );
    return density * h * mix( 1.0, smoothstep( 0.22, 0.82, n ) * 1.9, noiseAmount );
  }
  float shadowAt( int i, vec3 p ) {
    if ( i == 0 && useShadow0 > 0.5 ) {
      vec4 sc = shadowMatrix0 * vec4( p, 1.0 ); sc.xyz /= sc.w;
      if ( sc.x > 0.0 && sc.x < 1.0 && sc.y > 0.0 && sc.y < 1.0 && sc.z < 1.0 ) return step( sc.z - 0.0003, texture2D( tShadow0, sc.xy ).r );
    }
    if ( i == 1 && useShadow1 > 0.5 ) {
      vec4 sc = shadowMatrix1 * vec4( p, 1.0 ); sc.xyz /= sc.w;
      if ( sc.x > 0.0 && sc.x < 1.0 && sc.y > 0.0 && sc.y < 1.0 && sc.z < 1.0 ) return step( sc.z - 0.0003, texture2D( tShadow1, sc.xy ).r );
    }
    return 1.0;
  }

  void main() {
    vec2 ndc = vUv * 2.0 - 1.0;
    float depth = texture2D( tDepth, vUv ).r;
    vec4 vp = projInv * vec4( ndc, depth * 2.0 - 1.0, 1.0 ); vp.xyz /= vp.w;
    vec4 farP = projInv * vec4( ndc, 1.0, 1.0 ); farP.xyz /= farP.w;
    vec3 rd = normalize( mat3( camWorld ) * normalize( farP.xyz ) );
    vec3 ro = camPos;
    float tScene = depth >= 0.99999 ? 1e6 : length( vp.xyz );
    float jitter = ign( gl_FragCoord.xy );
    vec3 sum = vec3( 0.0 );
    for ( int li = 0; li < MAXL; li ++ ) {
      if ( li >= count ) break;
      float t0, t1;
      if ( ! coneHit( ro, rd, lightPos[ li ], lightDir[ li ], cosOuter[ li ], t0, t1 ) ) continue;
      t0 = max( t0, 0.0 );
      vec3 co = ro - lightPos[ li ];
      float bq = dot( co, rd ), cq = dot( co, co ) - range[ li ] * range[ li ], dq = bq * bq - cq;
      if ( dq > 0.0 ) t1 = min( t1, -bq + sqrt( dq ) );
      t1 = min( t1, tScene );
      if ( t1 <= t0 ) continue;
      float stepLen = ( t1 - t0 ) / float( steps );
      for ( int i = 0; i < 96; i ++ ) {
        if ( i >= steps ) break;
        float t = t0 + ( float( i ) + jitter ) * stepLen;
        vec3 p = ro + rd * t;
        vec3 L = p - lightPos[ li ];
        float dist = length( L );
        vec3 ldir = L / dist;
        float cone = smoothstep( cosOuter[ li ], cosInner[ li ], dot( ldir, lightDir[ li ] ) );
        if ( cone <= 0.0 ) continue;
        float vis = shadowAt( li, p );
        float dens = hazeDensity( p ) * lightDensity[ li ];
        float atten = 1.0 / max( dist * dist, 0.25 );
        sum += dens * lightColor[ li ] * atten * cone * vis * hg( dot( ldir, -rd ) ) * stepLen;
      }
    }
    float tAmb = min( tScene, 60.0 );
    sum += ambientColor * ambientDensity * ( 1.0 - exp( -tAmb * 0.08 ) );
    gl_FragColor = vec4( sum, tScene );
  }
`;

const compositeFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D tInput;
  uniform sampler2D tVolume;
  uniform sampler2D tDepth;
  uniform mat4 projInv;
  uniform vec2 lowSize;
  uniform float intensity;
  varying vec2 vUv;
  float sceneDist( vec2 uv ) {
    float d = texture2D( tDepth, uv ).r;
    if ( d >= 0.99999 ) return 1e6;
    vec4 vp = projInv * vec4( uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0 );
    return length( vp.xyz / vp.w );
  }
  void main() {
    vec4 base = texture2D( tInput, vUv );
    float dFull = min( sceneDist( vUv ), 1e4 );
    vec2 pos = vUv * lowSize - 0.5;
    vec2 f = fract( pos );
    vec2 i0 = ( floor( pos ) + 0.5 ) / lowSize;
    vec2 px = 1.0 / lowSize;
    vec4 s00 = texture2D( tVolume, i0 );
    vec4 s10 = texture2D( tVolume, i0 + vec2( px.x, 0.0 ) );
    vec4 s01 = texture2D( tVolume, i0 + vec2( 0.0, px.y ) );
    vec4 s11 = texture2D( tVolume, i0 + px );
    float k = 0.06 * dFull + 0.05;
    float w00 = ( 1.0 - f.x ) * ( 1.0 - f.y ) * exp( -abs( min( s00.a, 1e4 ) - dFull ) / k );
    float w10 = f.x * ( 1.0 - f.y ) * exp( -abs( min( s10.a, 1e4 ) - dFull ) / k );
    float w01 = ( 1.0 - f.x ) * f.y * exp( -abs( min( s01.a, 1e4 ) - dFull ) / k );
    float w11 = f.x * f.y * exp( -abs( min( s11.a, 1e4 ) - dFull ) / k );
    float ws = w00 + w10 + w01 + w11;
    vec3 vol = ws > 1e-4 ? ( s00.rgb * w00 + s10.rgb * w10 + s01.rgb * w01 + s11.rgb * w11 ) / ws : texture2D( tVolume, vUv ).rgb;
    gl_FragColor = vec4( base.rgb + vol * intensity, base.a );
  }
`;

/** tint: boja snopa u dimu (množi boju svjetla) — npr. topliji tungsten snop dok površine ostaju neutralnije */
export type VolLight = { light: THREE.SpotLight; density?: number; shadow?: boolean; scale?: number; tint?: THREE.ColorRepresentation };
export type VolSettings = {
  density?: number;
  ambientDensity?: number;
  ambientColor?: THREE.ColorRepresentation;
  heightFalloff?: number;
  floorY?: number;
  noiseScale?: number;
  noiseAmount?: number;
  g?: number;
  wind?: [number, number, number];
  intensity?: number;
};

export class VolumetricPass extends Pass {
  lights: VolLight[] = [];
  private tmpColor = new THREE.Color();
  resolutionScale = 0.5;
  intensity = 1;
  viewCamera: THREE.Camera | null = null;
  private noise = makeNoise3D(64);
  private lowRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  private march: THREE.ShaderMaterial;
  private composite: THREE.ShaderMaterial;
  private quad: THREE.Mesh;
  private qScene = new THREE.Scene();
  private qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private fullSize = new THREE.Vector2(1, 1);
  private tmp = new THREE.Vector3();

  constructor() {
    super("VolumetricPass");
    this.needsDepthTexture = true;
    this.needsSwap = true;
    const arr3 = () => Array.from({ length: MAX_VOL_LIGHTS }, () => new THREE.Vector3());
    const arrC = () => Array.from({ length: MAX_VOL_LIGHTS }, () => new THREE.Color());
    const arrF = (v: number) => new Array(MAX_VOL_LIGHTS).fill(v);
    this.march = new THREE.ShaderMaterial({
      uniforms: {
        tDepth: { value: null }, tShadow0: { value: null }, tShadow1: { value: null }, tNoise: { value: this.noise },
        projInv: { value: new THREE.Matrix4() }, camWorld: { value: new THREE.Matrix4() }, camPos: { value: new THREE.Vector3() },
        count: { value: 0 },
        lightPos: { value: arr3() }, lightDir: { value: arr3() }, lightColor: { value: arrC() },
        cosOuter: { value: arrF(0.9) }, cosInner: { value: arrF(0.95) }, range: { value: arrF(30) }, lightDensity: { value: arrF(1) },
        shadowMatrix0: { value: new THREE.Matrix4() }, shadowMatrix1: { value: new THREE.Matrix4() },
        useShadow0: { value: 0 }, useShadow1: { value: 0 },
        density: { value: 0.03 }, ambientDensity: { value: 0 }, ambientColor: { value: new THREE.Color(0.5, 0.52, 0.56) },
        heightFalloff: { value: 0.0 }, floorY: { value: 0 },
        noiseScale: { value: 0.35 }, noiseAmount: { value: 0.75 }, wind: { value: new THREE.Vector3(0.012, 0.004, -0.006) },
        time: { value: 0 }, g: { value: 0.3 }, steps: { value: 40 },
      },
      vertexShader: fullscreenVertex,
      fragmentShader: marchFragment,
      depthTest: false,
      depthWrite: false,
    });
    this.composite = new THREE.ShaderMaterial({
      uniforms: {
        tInput: { value: null }, tVolume: { value: this.lowRT.texture }, tDepth: { value: null },
        projInv: { value: new THREE.Matrix4() }, lowSize: { value: new THREE.Vector2(1, 1) }, intensity: { value: 1 },
      },
      vertexShader: fullscreenVertex,
      fragmentShader: compositeFragment,
      depthTest: false,
      depthWrite: false,
    });
    const tri = new THREE.BufferGeometry();
    tri.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    this.quad = new THREE.Mesh(tri, this.march);
    this.quad.frustumCulled = false;
    this.qScene.add(this.quad);
  }

  setDepthTexture(depthTexture: THREE.Texture) {
    this.march.uniforms.tDepth.value = depthTexture;
    this.composite.uniforms.tDepth.value = depthTexture;
  }
  setSize(width: number, height: number) {
    this.fullSize.set(width, height);
    const w = Math.max(1, Math.round(width * this.resolutionScale));
    const h = Math.max(1, Math.round(height * this.resolutionScale));
    this.lowRT.setSize(w, h);
    this.composite.uniforms.lowSize.value.set(w, h);
  }
  setResolutionScale(s: number) {
    this.resolutionScale = s;
    this.setSize(this.fullSize.x, this.fullSize.y);
  }
  setSteps(n: number) {
    this.march.uniforms.steps.value = n;
  }
  configure(lights: VolLight[], o: VolSettings = {}) {
    this.lights = lights.slice(0, MAX_VOL_LIGHTS);
    const u = this.march.uniforms;
    if (o.density !== undefined) u.density.value = o.density;
    if (o.ambientDensity !== undefined) u.ambientDensity.value = o.ambientDensity;
    if (o.ambientColor !== undefined) u.ambientColor.value.set(o.ambientColor);
    if (o.heightFalloff !== undefined) u.heightFalloff.value = o.heightFalloff;
    if (o.floorY !== undefined) u.floorY.value = o.floorY;
    if (o.noiseScale !== undefined) u.noiseScale.value = o.noiseScale;
    if (o.noiseAmount !== undefined) u.noiseAmount.value = o.noiseAmount;
    if (o.g !== undefined) u.g.value = o.g;
    if (o.wind) u.wind.value.set(...o.wind);
    if (o.intensity !== undefined) this.intensity = o.intensity;
  }
  get uniforms() {
    return this.march.uniforms;
  }

  render(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget, outputBuffer: THREE.WebGLRenderTarget, deltaTime?: number) {
    const cam = this.viewCamera;
    const u = this.march.uniforms;
    const active = cam && this.lights.length > 0;
    if (active) {
      u.time.value += deltaTime ?? 0.016;
      u.projInv.value.copy(cam.projectionMatrixInverse);
      u.camWorld.value.copy(cam.matrixWorld);
      u.camPos.value.setFromMatrixPosition(cam.matrixWorld);
      u.count.value = this.lights.length;
      u.useShadow0.value = 0;
      u.useShadow1.value = 0;
      this.lights.forEach((vl, i) => {
        const L = vl.light;
        L.updateMatrixWorld();
        u.lightPos.value[i].setFromMatrixPosition(L.matrixWorld);
        this.tmp.setFromMatrixPosition(L.target.matrixWorld);
        u.lightDir.value[i].subVectors(this.tmp, u.lightPos.value[i]).normalize();
        u.lightColor.value[i].copy(L.color).multiplyScalar(L.visible ? L.intensity * (vl.scale ?? 1) : 0);
        if (vl.tint !== undefined) u.lightColor.value[i].multiply(this.tmpColor.set(vl.tint));
        u.cosOuter.value[i] = Math.cos(L.angle);
        u.cosInner.value[i] = Math.cos(L.angle * (1 - L.penumbra));
        u.range.value[i] = L.distance > 0 ? L.distance : 40;
        u.lightDensity.value[i] = vl.density ?? 1;
        const depthTex = vl.shadow && L.castShadow ? (L.shadow.map as unknown as { depthTexture?: THREE.DepthTexture })?.depthTexture : null;
        if (depthTex && (depthTex as THREE.DepthTexture).compareFunction == null && i < 2) {
          u[`tShadow${i}`].value = depthTex;
          u[`shadowMatrix${i}`].value.copy(L.shadow.matrix);
          u[`useShadow${i}`].value = 1;
        }
      });
      this.quad.material = this.march;
      renderer.setRenderTarget(this.lowRT);
      renderer.render(this.qScene, this.qCam);
    }
    const c = this.composite.uniforms;
    c.tInput.value = inputBuffer.texture;
    if (cam) c.projInv.value.copy(cam.projectionMatrixInverse);
    c.intensity.value = active ? this.intensity : 0;
    this.quad.material = this.composite;
    renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer);
    renderer.render(this.qScene, this.qCam);
  }

  dispose() {
    this.lowRT.dispose();
    this.noise.dispose();
    this.march.dispose();
    this.composite.dispose();
    this.quad.geometry.dispose();
  }
}
