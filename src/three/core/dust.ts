import * as THREE from "three";

/**
 * Čestice prašine u snopovima reflektora (11 §2): svijetle samo unutar konusa svjetla (do 3 reflektora),
 * polagano lebde. Tehnika iz head-tracking-3d (render/dust.js), u metrima.
 */
export class DustMotes {
  points: THREE.Points;
  uniforms: Record<string, THREE.IUniform>;
  private lights: THREE.SpotLight[] = [];
  private tmp = new THREE.Vector3();

  constructor({ count = 1400, box, size = 0.006, seed = 5 }: { count?: number; box: THREE.Box3; size?: number; seed?: number }) {
    let s = seed >>> 0;
    const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    const pos = new Float32Array(count * 3), rnds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = box.min.x + rnd() * (box.max.x - box.min.x);
      pos[i * 3 + 1] = box.min.y + rnd() * (box.max.y - box.min.y);
      pos[i * 3 + 2] = box.min.z + rnd() * (box.max.z - box.min.z);
      rnds.set([rnd(), rnd(), rnd(), rnd()], i * 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("rnd", new THREE.BufferAttribute(rnds, 4));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    const arr3 = () => [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    this.uniforms = {
      time: { value: 0 },
      lightPos: { value: arr3() },
      lightDir: { value: arr3() },
      lightColor: { value: [new THREE.Color(0, 0, 0), new THREE.Color(0, 0, 0), new THREE.Color(0, 0, 0)] },
      cosOuter: { value: [0.9, 0.9, 0.9] },
      cosInner: { value: [0.95, 0.95, 0.95] },
      pixelScale: { value: 500 },
      size: { value: size },
      gain: { value: 1 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: /* glsl */ `
        attribute vec4 rnd;
        uniform float time;
        uniform vec3 lightPos[3];
        uniform vec3 lightDir[3];
        uniform vec3 lightColor[3];
        uniform float cosOuter[3];
        uniform float cosInner[3];
        uniform float pixelScale;
        uniform float size;
        uniform float gain;
        varying vec3 vColor;
        varying float vSoft;
        void main() {
          vec3 p = position;
          float ph = rnd.x * 6.2831;
          float sp = 0.25 + rnd.y * 0.5;
          p += vec3(
            sin( time * 0.11 * sp + ph ) * 0.16 + sin( time * 0.29 * sp + ph * 2.0 ) * 0.05,
            sin( time * 0.07 * sp + ph * 1.3 ) * 0.12 + sin( time * 0.023 + ph ) * 0.3,
            cos( time * 0.09 * sp + ph * 0.7 ) * 0.14
          );
          vec4 world = modelMatrix * vec4( p, 1.0 );
          float twinkle = 0.6 + 0.4 * sin( time * ( 1.5 + rnd.z * 2.5 ) + ph * 3.0 );
          vec3 lit = vec3( 0.0 );
          for ( int i = 0; i < 3; i ++ ) {
            vec3 L = world.xyz - lightPos[ i ];
            float dist = length( L );
            float cone = smoothstep( cosOuter[ i ], cosInner[ i ], dot( L / dist, lightDir[ i ] ) );
            lit += lightColor[ i ] * cone / max( dist * dist, 1.0 );
          }
          vColor = lit * twinkle * gain;
          vec4 mv = viewMatrix * world;
          gl_Position = projectionMatrix * mv;
          float s = size * ( 0.5 + rnd.y );
          gl_PointSize = clamp( s * pixelScale / -mv.z, 1.0, 18.0 );
          vSoft = clamp( gl_PointSize / 5.0, 0.0, 1.0 );
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vSoft;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float r = length( c ) * 2.0;
          float a = smoothstep( 1.0, mix( 0.2, 0.0, vSoft ), r );
          gl_FragColor = vec4( vColor * a, 1.0 );
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, material);
    this.points.frustumCulled = false;
  }

  setLights(lights: THREE.SpotLight[]) {
    this.lights = lights.slice(0, 3);
  }

  update(dt: number, camera: THREE.PerspectiveCamera, viewportH: number) {
    const u = this.uniforms;
    u.time.value += dt;
    u.pixelScale.value = viewportH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    for (let i = 0; i < 3; i++) {
      const L = this.lights[i];
      if (!L) {
        u.lightColor.value[i].setRGB(0, 0, 0);
        continue;
      }
      L.updateMatrixWorld();
      u.lightPos.value[i].setFromMatrixPosition(L.matrixWorld);
      this.tmp.setFromMatrixPosition(L.target.matrixWorld);
      u.lightDir.value[i].subVectors(this.tmp, u.lightPos.value[i]).normalize();
      u.lightColor.value[i].copy(L.color).multiplyScalar(L.visible ? L.intensity * 0.02 : 0);
      u.cosOuter.value[i] = Math.cos(L.angle);
      u.cosInner.value[i] = Math.cos(L.angle * (1 - L.penumbra));
    }
  }
}
