import * as THREE from "three";
import { HorizontalBlurShader } from "three/examples/jsm/shaders/HorizontalBlurShader.js";
import { VerticalBlurShader } from "three/examples/jsm/shaders/VerticalBlurShader.js";

/**
 * Kontaktne sjene (11 §2): ortografska kamera ispod poda gleda gore, crta objekte iz CONTACT_LAYER kao tamnu masku
 * po visini, maska se zamuti i prikaže na prozirnoj plohi tik iznad poda (tehnika iz head-tracking-3d).
 */
export const CONTACT_LAYER = 3;

export class ContactShadows {
  group = new THREE.Group();
  private rt: THREE.WebGLRenderTarget;
  private rtBlur: THREE.WebGLRenderTarget;
  private plane: THREE.Mesh;
  private camera: THREE.OrthographicCamera;
  private depthMaterial: THREE.MeshDepthMaterial;
  private hBlur = new THREE.ShaderMaterial(HorizontalBlurShader);
  private vBlur = new THREE.ShaderMaterial(VerticalBlurShader);
  private blurPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  private blurScene = new THREE.Scene();
  private blurCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  constructor({ width = 3, depth = 3, far = 1.2, resolution = 512, blur = 2.4, opacity = 0.9, darkness = 1.7 } = {}) {
    this.rt = new THREE.WebGLRenderTarget(resolution, resolution, { type: THREE.HalfFloatType });
    this.rtBlur = new THREE.WebGLRenderTarget(resolution, resolution, { type: THREE.HalfFloatType });
    this.rt.texture.generateMipmaps = this.rtBlur.texture.generateMipmaps = false;
    this.plane = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: this.rt.texture, transparent: true, opacity, depthWrite: false, toneMapped: false, color: 0x000000 }),
    );
    (this.plane.material as THREE.MeshBasicMaterial).color.set(0x000000);
    this.plane.renderOrder = 1;
    this.plane.scale.z = -1;
    this.plane.position.y = 0.0015;
    this.group.add(this.plane);
    this.camera = new THREE.OrthographicCamera(-width / 2, width / 2, depth / 2, -depth / 2, 0, far);
    this.camera.rotation.x = Math.PI / 2;
    this.camera.layers.set(CONTACT_LAYER);
    this.group.add(this.camera);
    this.depthMaterial = new THREE.MeshDepthMaterial();
    const dk = { value: darkness };
    this.depthMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.darkness = dk;
      shader.fragmentShader = `uniform float darkness;\n${shader.fragmentShader.replace(
        "gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );",
        "gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );",
      )}`;
    };
    this.depthMaterial.depthTest = this.depthMaterial.depthWrite = false;
    this.hBlur.depthTest = this.vBlur.depthTest = false;
    this.blurScene.add(this.blurPlane);
    this.blurPlane.position.z = -0.5;
    this.blurAmount = blur;
  }
  blurAmount: number;

  private blur(renderer: THREE.WebGLRenderer, amount: number) {
    const res = this.rt.width;
    this.blurPlane.material = this.hBlur;
    this.hBlur.uniforms.tDiffuse.value = this.rt.texture;
    this.hBlur.uniforms.h.value = amount / res;
    renderer.setRenderTarget(this.rtBlur);
    renderer.render(this.blurScene, this.blurCam);
    this.blurPlane.material = this.vBlur;
    this.vBlur.uniforms.tDiffuse.value = this.rtBlur.texture;
    this.vBlur.uniforms.v.value = amount / res;
    renderer.setRenderTarget(this.rt);
    renderer.render(this.blurScene, this.blurCam);
  }

  /** Objekti koji bacaju kontaktnu sjenu moraju imati layer CONTACT_LAYER uključen. */
  update(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    const prevTarget = renderer.getRenderTarget();
    const prevBg = scene.background;
    const prevOverride = scene.overrideMaterial;
    const prevAlpha = renderer.getClearAlpha();
    const prevColor = renderer.getClearColor(new THREE.Color());
    scene.background = null;
    scene.overrideMaterial = this.depthMaterial;
    renderer.setClearColor(0x000000, 0);
    this.plane.visible = false;
    renderer.setRenderTarget(this.rt);
    renderer.clear();
    renderer.render(scene, this.camera);
    scene.overrideMaterial = prevOverride;
    this.blur(renderer, this.blurAmount);
    this.blur(renderer, this.blurAmount * 0.4);
    this.plane.visible = true;
    scene.background = prevBg;
    renderer.setClearColor(prevColor, prevAlpha);
    renderer.setRenderTarget(prevTarget);
  }

  dispose() {
    this.rt.dispose();
    this.rtBlur.dispose();
    this.plane.geometry.dispose();
    (this.plane.material as THREE.Material).dispose();
    this.depthMaterial.dispose();
    this.hBlur.dispose();
    this.vBlur.dispose();
  }
}

/** Uključi CONTACT_LAYER na svim potomcima (lutka, roboti). */
export function enableContact(obj: THREE.Object3D) {
  obj.traverse((o) => o.layers.enable(CONTACT_LAYER));
}
