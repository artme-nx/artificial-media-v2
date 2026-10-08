import type * as THREE from "three";
import { NOISE_GLSL } from "./glsl";

/**
 * Proširi fizički materijal kodom koji se umeće iza zadanih #include linija (tehnika iz head-tracking-3d).
 * Uvijek dostupno u fragmentu: vObjPos (lokalni položaj, prije instanciranja), vObjNormal, vWorldPos,
 * vAxisV (smjer lokalne osi y u prostoru pogleda — za žilu drva i smjer brušenja), vSeed (po dijelu/instanci).
 */
export type MaterialExt = {
  key: string;
  uniforms?: Record<string, THREE.IUniform>;
  vertexPars?: string;
  vertexMain?: string;
  fragmentPars?: string;
  hooks?: Record<string, string>;
};

export function extendMaterial<T extends THREE.Material>(material: T, ext: MaterialExt): T {
  const uniforms = ext.uniforms ?? {};
  material.userData.uniforms = uniforms;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute float aSeed;
        varying vec3 vObjPos;
        varying vec3 vObjNormal;
        varying vec3 vWorldPos;
        varying vec3 vAxisV;
        varying float vSeed;
        ${ext.vertexPars ?? ""}`,
      )
      .replace(
        "#include <worldpos_vertex>",
        `#include <worldpos_vertex>
        vObjPos = position;
        vObjNormal = normal;
        vSeed = aSeed;
        #ifdef USE_INSTANCING
          vSeed = aSeed + float( gl_InstanceID ) * 0.1379; // isti uzorak drva po instanci kroz cijelu animaciju
        #endif
        {
          vec4 wp = vec4( transformed, 1.0 );
          #ifdef USE_INSTANCING
            wp = instanceMatrix * wp;
          #endif
          vWorldPos = ( modelMatrix * wp ).xyz;
          vec3 ax = vec3( 0.0, 1.0, 0.0 );
          #ifdef USE_INSTANCING
            ax = mat3( instanceMatrix ) * ax;
          #endif
          vAxisV = normalize( mat3( modelViewMatrix ) * ax );
        }
        ${ext.vertexMain ?? ""}`,
      );
    let fs = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
      varying vec3 vObjPos;
      varying vec3 vObjNormal;
      varying vec3 vWorldPos;
      varying vec3 vAxisV;
      varying float vSeed;
      ${NOISE_GLSL}
      ${ext.fragmentPars ?? ""}`,
    );
    for (const [chunk, code] of Object.entries(ext.hooks ?? {})) {
      const tag = `#include <${chunk}>`;
      if (!fs.includes(tag)) console.warn(`extendMaterial(${ext.key}): nema ${tag}`);
      fs = fs.replace(tag, `${tag}\n${code}`);
    }
    shader.fragmentShader = fs;
  };
  const prevKey = material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey = () => `${prevKey ? prevKey() : ""}|${ext.key}`;
  material.needsUpdate = true;
  return material;
}
