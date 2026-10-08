declare module "n8ao" {
  import type * as THREE from "three";
  import type { Pass } from "postprocessing";
  export class N8AOPostPass extends Pass {
    constructor(scene: THREE.Scene, camera: THREE.Camera, width?: number, height?: number);
    configuration: {
      aoRadius: number; distanceFalloff: number; intensity: number; aoSamples: number; denoiseSamples: number; denoiseRadius: number;
      halfRes: boolean; depthAwareUpsampling: boolean; color: THREE.Color; gammaCorrection: boolean; transparencyAware: boolean;
      [k: string]: unknown;
    };
    scene: THREE.Scene;
    camera: THREE.Camera;
    setSize(width: number, height: number): void;
  }
}
