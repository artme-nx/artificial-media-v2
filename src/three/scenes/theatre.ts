import * as THREE from "three";
import { configurePCSSSpot } from "../core/pcss";
import { ContactShadows, enableContact } from "../core/contact-shadows";
import { DustMotes } from "../core/dust";
import { buildEnvironment } from "../core/env";
import { Figure } from "../figure/figure";
import { Orchestra } from "./orchestra";
import { extendMaterial } from "../materials/extend";

/**
 * Pozornica (11 F3, 10-lik §3 [SCENA]): tamni polirani pod, teška baršunasta zavjesa, scenski dim,
 * topli tungsten reflektor (~3200 K) odozgo na dirigentu, hladno neutralno svjetlo na orkestru, prašina u snopovima.
 * Dijeli je kazališni uvod (F4); svjetla se pale/gase kroz razine (0..1) koje vodi redatelj.
 */
export const TUNGSTEN = new THREE.Color("#ffe6cc"); // ~3200 K uz balans bijele blizu tungstena (filmski): toplo, ali javor ostaje blijedo medeni, palica bijela
export const COOL = new THREE.Color("#cfdcff"); // hladno neutralno (uz tungsten balans bijele djeluje hladno, ne plavo sci-fi)

function velvetMaterial() {
  const m = new THREE.MeshPhysicalMaterial({
    color: "#0b0909",
    roughness: 0.95,
    sheen: 1,
    sheenRoughness: 0.42,
    sheenColor: new THREE.Color("#5a4640"),
    envMapIntensity: 0.4,
  });
  return extendMaterial(m, {
    key: "velvet",
    hooks: {
      color_fragment: /* glsl */ `diffuseColor.rgb *= 0.85 + 0.3 * vnoise( vWorldPos * vec3( 6.0, 0.4, 6.0 ) );`,
    },
  });
}

function stageFloorMaterial() {
  const m = new THREE.MeshPhysicalMaterial({
    color: "#0a0909",
    roughness: 0.42,
    metalness: 0,
    clearcoat: 0.4,
    clearcoatRoughness: 0.26,
    envMapIntensity: 0.9,
  });
  return extendMaterial(m, {
    key: "stage-floor",
    fragmentPars: /* glsl */ `float gScuff;`,
    hooks: {
      color_fragment: /* glsl */ `
        {
          // daske uzduž x, fine ogrebotine i istrošenost (proceduralno)
          vec3 p = vWorldPos;
          float plank = abs( fract( p.z * 4.0 ) - 0.5 );
          float seam = 1.0 - smoothstep( 0.47, 0.5, plank );
          float wear = fbm3( vec3( p.x * 0.6, 0.0, p.z * 0.6 ) );
          float scr = vnoise( vec3( p.x * 22.0, p.z * 7.0, 1.0 ) );
          gScuff = wear * 0.8 + scr * 0.2;
          diffuseColor.rgb *= ( 0.85 + 0.25 * wear ) * ( 1.0 - ( 1.0 - seam ) * 0.5 );
        }
      `,
      roughnessmap_fragment: /* glsl */ `roughnessFactor = clamp( roughnessFactor + ( gScuff - 0.5 ) * 0.22, 0.12, 1.0 );`,
    },
  });
}

/** Zavjesa s okomitim naborima (teški baršun). */
function curtainGeometry(width: number, height: number, folds: number) {
  const nx = folds * 12, ny = 24;
  const g = new THREE.PlaneGeometry(width, height, nx, ny);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const u = x / width + 0.5;
    const amp = 0.18 + 0.07 * Math.sin(u * 17.0) + 0.04 * Math.sin(u * 41.0);
    const z = Math.sin(u * folds * Math.PI * 2) * amp * (0.85 + 0.15 * Math.sin(y * 0.4 + u * 9));
    p.setZ(i, z);
  }
  g.computeVertexNormals();
  return g;
}

export class Theatre {
  group = new THREE.Group();
  conductor: Figure;
  orchestra: Orchestra;
  key: THREE.SpotLight;
  rim: THREE.SpotLight;
  rows: THREE.SpotLight[] = [];
  curtainLight: THREE.SpotLight;
  contact = new ContactShadows({ width: 4, depth: 4, far: 1.6, blur: 2.8, opacity: 0.9 });
  dust: DustMotes;
  floor: THREE.Mesh;
  /** razine svjetla 0..1 (vodi redatelj) */
  levels = { key: 1, rim: 1, rows: [1, 1, 1], curtain: 1, haze: 1 };
  private base = { key: 300, rim: 380, row: 46, curtain: 9, bounce: 3.2 };
  /** topli odbljesak poda ispod reflektora (bez sjene): podiže prednju stranu, vrat i šake kao na pravoj pozornici */
  bounce: THREE.PointLight;

  constructor() {
    // pod
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), stageFloorMaterial());
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.z = -4;
    this.floor.receiveShadow = true;
    this.group.add(this.floor);
    this.contact.group.position.set(0, 0, 0.4);
    this.group.add(this.contact.group);

    // zavjesa i bočna krila
    const velvet = velvetMaterial();
    const back = new THREE.Mesh(curtainGeometry(26, 11, 22), velvet);
    back.position.set(0, 5.5, -8.4);
    back.receiveShadow = true;
    this.group.add(back);
    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(curtainGeometry(5, 11, 5), velvet);
      wing.position.set(sx * 8.5, 5.5, -3.5);
      wing.rotation.y = -sx * Math.PI * 0.42;
      this.group.add(wing);
    }

    // portal (proscenij): crni baršunasti okvir sprijeda — u širokom kadru pozornica nije prazna kutija
    const portalMat = velvetMaterial();
    const valance = new THREE.Mesh(curtainGeometry(16, 2.2, 14), portalMat);
    valance.position.set(0, 5.2, 3.4);
    this.group.add(valance);
    for (const sx of [-1, 1]) {
      const leg = new THREE.Mesh(curtainGeometry(2.6, 8, 3), portalMat);
      leg.position.set(sx * 4.9, 4, 3.2);
      this.group.add(leg);
    }

    // dirigent: lutka u smokingu s palicom
    this.conductor = new Figure({ look: "wood", costume: true });
    this.conductor.setBaton(true);
    this.conductor.group.position.set(0, 0, 0.4);
    this.group.add(this.conductor.group);
    enableContact(this.conductor.group);

    // orkestar (iza dirigenta, okrenut prema njemu)
    this.orchestra = new Orchestra();
    this.group.add(this.orchestra.group);

    // svjetla
    this.key = new THREE.SpotLight(TUNGSTEN, this.base.key, 0, THREE.MathUtils.degToRad(9.5), 0.5, 2);
    // odozgo, malo sprijeda i s desne strane: kiparsko svjetlo, sjena lutke pada na pod iza-lijevo (vidi se u kadru)
    this.key.position.set(1.0, 8.2, 2.6);
    this.key.target.position.set(0, 0.9, 0.4);
    configurePCSSSpot(this.key, 1.1, 2048); // veći izvor: mekši rub sjene preko glave
    // hladno kontra svjetlo iza dirigenta (sa strane orkestra, visoko): ocrtava siluetu smokinga i palicu
    this.rim = new THREE.SpotLight(COOL, this.base.rim, 0, THREE.MathUtils.degToRad(8), 0.55, 2);
    // strmo odozgo-straga: obrubljuje glavu i ramena, a krug svjetla na podu pada pod noge (ne u prvi plan kadra)
    this.rim.position.set(0.8, 8.5, -2.2);
    this.rim.target.position.set(0, 1.5, 0.4);
    // hladna svjetla po redovima orkestra (odozgo i straga)
    const rowZ = [-2.7, -4.2, -5.7];
    rowZ.forEach((z, i) => {
      const L = new THREE.SpotLight(COOL, this.base.row, 0, THREE.MathUtils.degToRad(30 - i * 3), 0.8, 2);
      L.position.set(i % 2 ? 3 : -3, 8.5, z - 2.2);
      L.target.position.set(0, 0.6 + i * 0.22, z + 0.2);
      if (i === 0) {
        configurePCSSSpot(L, 0.6, 1024);
      }
      this.rows.push(L);
    });
    // mek sjaj na naborima zavjese iza orkestra (dubina): odozdo straga, ne dira orkestar
    this.curtainLight = new THREE.SpotLight("#c9d2e4", this.base.curtain, 0, THREE.MathUtils.degToRad(34), 1, 2);
    this.curtainLight.position.set(0, 1.4, -7.2);
    this.curtainLight.target.position.set(0, 6.0, -8.4); // dno zavjese ostaje u mraku (bez svijetlog valovitog ruba uz pod)
    for (const L of [this.key, this.rim, ...this.rows, this.curtainLight]) this.group.add(L, L.target);
    this.bounce = new THREE.PointLight("#ffd8b4", this.base.bounce, 3.2, 2);
    this.bounce.position.set(0.1, -0.04, 1.3); // malo ispod poda: pod ga ne zrcali (bez vruće točke), lutka dobiva svjetlo odozdo
    this.group.add(this.bounce);
    this.group.add(new THREE.HemisphereLight("#20232a", "#050505", 0.06));

    // prašina u snopovima
    this.dust = new DustMotes({ count: 1600, box: new THREE.Box3(new THREE.Vector3(-2.5, 0.2, -1.2), new THREE.Vector3(2.5, 5.5, 2.2)), size: 0.007 });
    // prašina svijetli samo u toplom snopu (u kontroli kvalitete je s više svjetala izgledala kao zvjezdano nebo)
    this.dust.setLights([this.key]);
    this.group.add(this.dust.points);
  }

  environment(renderer: THREE.WebGLRenderer) {
    // okruženje pozornice za odsjaje: tamno, s toplim reflektorom gore, hladnim trakama straga i mekim "karticama"
    return buildEnvironment(renderer, {
      top: "#0d0d10",
      horizon: "#121114",
      bottom: "#030303",
      boxes: [
        { dir: [0.1, 1, 0.3], size: [10, 10], intensity: 5, color: "#ffeedd", softness: 0.6 },
        { dir: [-0.4, 0.5, -1], size: [10, 6], intensity: 2.2, color: "#dbe6ff", softness: 0.6 },
        { dir: [0.5, 0.4, -1], size: [8, 6], intensity: 1.6, color: "#dbe6ff", softness: 0.6 },
        { dir: [0, 0.15, 1], size: [24, 8], intensity: 0.9, color: "#ffffff", softness: 0.9 },
        { dir: [-1, 0.2, 0.3], size: [6, 12], intensity: 1.1, color: "#fff3e6", softness: 0.8 },
      ],
    });
  }

  /** primijeni razine svjetla (0..1) */
  applyLevels() {
    const L = this.levels;
    this.key.intensity = this.base.key * L.key;
    this.rim.intensity = this.base.rim * L.rim;
    this.rows.forEach((r, i) => (r.intensity = this.base.row * (L.rows[i] ?? 0)));
    this.curtainLight.intensity = this.base.curtain * L.curtain;
    this.bounce.intensity = this.base.bounce * L.key;
    // svjetla se NE gase preko `visible`: promjena broja svjetala u three.js rekompajlira sve materijale (zastoj
    // od stotina ms usred scrolla). Ugašeno svjetlo = jačina 0; sjena se tada ne crta (shadow.autoUpdate).
    for (const [light, on] of [[this.key, L.key], [this.rows[0], L.rows[0] ?? 0]] as const) {
      const live = on > 0.001;
      if (live && !light.shadow.autoUpdate) light.shadow.needsUpdate = true;
      light.shadow.autoUpdate = live;
    }
    this.orchestra.rowLight = L.rows.slice();
  }

  volumetricLights() {
    return [
      { light: this.key, density: 1.9, shadow: true, tint: "#ffe1c0", scale: 1.5 }, // snop u dimu čita se kao tungsten
      { light: this.rim, density: 0.4 },
      { light: this.rows[0], density: 0.18, shadow: true },
      { light: this.rows[1], density: 0.12 },
    ];
  }
}
