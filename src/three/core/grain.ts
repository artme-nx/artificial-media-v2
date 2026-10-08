import * as THREE from "three";
import { Effect, BlendFunction } from "postprocessing";

/**
 * Filmsko zrno (11 §2: suptilno): jednobojno (bez šarenog šuma), jače u sjenama i srednjim tonovima nego u svjetlima,
 * mijenja se svaki frame. Zamjena za NoiseEffect (RGB šum je u kontroli kvalitete izgledao "grubo i u boji").
 */
const frag = /* glsl */ `
  uniform float amount;
  uniform float seed;
  float h12( vec2 p ) {
    vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
    p3 += dot( p3, p3.yzx + 33.33 );
    return fract( ( p3.x + p3.y ) * p3.z );
  }
  void mainImage( const in vec4 inputColor, const in vec2 uv, out vec4 outputColor ) {
    vec2 px = uv * resolution + seed * 97.0;
    // dvije oktave: zrno nije piksel-šum nego malo mekše
    float n = h12( floor( px ) ) * 0.6 + h12( floor( px * 0.5 ) + 13.1 ) * 0.4 - 0.5;
    float l = dot( inputColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
    // zrno najjače u srednjim tonovima; u dubokoj crnoj i u svjetlima slabije (crna ostaje crna)
    float w = amount * ( 0.3 + 0.7 * smoothstep( 0.015, 0.2, l ) ) * ( 1.0 - smoothstep( 0.35, 1.0, l ) * 0.7 );
    outputColor = vec4( max( inputColor.rgb + n * w, 0.0 ), inputColor.a );
  }
`;

export class FilmGrainEffect extends Effect {
  constructor(amount = 0.035) {
    super("FilmGrainEffect", frag, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ["amount", new THREE.Uniform(amount)],
        ["seed", new THREE.Uniform(0)],
      ]),
    });
  }
  set amount(v: number) {
    this.uniforms.get("amount")!.value = v;
  }
  update() {
    this.uniforms.get("seed")!.value = (this.uniforms.get("seed")!.value + 1.618) % 1000;
  }
}
