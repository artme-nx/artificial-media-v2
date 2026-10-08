import * as THREE from "three";

/**
 * Proceduralno okruženje za odsjaje (bez preuzetih HDR-ova; CREDITS.md): gradijent neba/poda + mekani softboxi
 * na zadanim smjerovima, iscrtano u cubemap i pretvoreno PMREM-om. Čelik i lak drva dobiju čiste, duge odsjaje.
 */
export type Softbox = { dir: [number, number, number]; size: [number, number]; intensity: number; color?: THREE.ColorRepresentation; softness?: number; roll?: number };
export type EnvOptions = { top?: THREE.ColorRepresentation; horizon?: THREE.ColorRepresentation; bottom?: THREE.ColorRepresentation; strength?: number; boxes?: Softbox[]; resolution?: number };

export function buildEnvironment(renderer: THREE.WebGLRenderer, o: EnvOptions = {}) {
  const { top = "#1a1a1d", horizon = "#2a2724", bottom = "#060606", strength = 1, boxes = [], resolution = 256 } = o;
  const envScene = new THREE.Scene();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(50, 48, 24),
    new THREE.ShaderMaterial({
      uniforms: {
        cTop: { value: new THREE.Color(top).multiplyScalar(strength) },
        cHor: { value: new THREE.Color(horizon).multiplyScalar(strength) },
        cBot: { value: new THREE.Color(bottom).multiplyScalar(strength) },
      },
      vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 cTop, cHor, cBot; varying vec3 vDir;
        void main(){
          float y = normalize(vDir).y;
          vec3 c = y > 0.0 ? mix(cHor, cTop, smoothstep(0.0, 0.7, y)) : mix(cHor, cBot, smoothstep(0.0, 0.35, -y));
          gl_FragColor = vec4(c, 1.0);
        }`,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  envScene.add(sky);
  for (const b of boxes) {
    const m = new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(b.color ?? "#ffffff").multiplyScalar(b.intensity) }, softness: { value: b.softness ?? 0.35 } },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 color; uniform float softness; varying vec2 vUv;
        void main(){
          vec2 q = abs(vUv - 0.5) * 2.0;
          float m = (1.0 - smoothstep(1.0 - softness, 1.0, q.x)) * (1.0 - smoothstep(1.0 - softness, 1.0, q.y));
          gl_FragColor = vec4(color * m, 1.0);
        }`,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(b.size[0], b.size[1]), m);
    plane.position.copy(new THREE.Vector3(...b.dir).normalize().multiplyScalar(30));
    plane.lookAt(0, 0, 0);
    if (b.roll) plane.rotateZ(b.roll);
    envScene.add(plane);
  }
  const cubeRT = new THREE.WebGLCubeRenderTarget(resolution, { type: THREE.HalfFloatType, generateMipmaps: false });
  const cubeCam = new THREE.CubeCamera(0.1, 100, cubeRT);
  const prevTarget = renderer.getRenderTarget();
  const prevTM = renderer.toneMapping;
  renderer.toneMapping = THREE.NoToneMapping;
  cubeCam.update(renderer, envScene);
  renderer.toneMapping = prevTM;
  renderer.setRenderTarget(prevTarget);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromCubemap(cubeRT.texture).texture;
  pmrem.dispose();
  cubeRT.dispose();
  envScene.traverse((ob) => {
    const mesh = ob as THREE.Mesh;
    mesh.geometry?.dispose();
    (mesh.material as THREE.Material | undefined)?.dispose?.();
  });
  return env;
}
