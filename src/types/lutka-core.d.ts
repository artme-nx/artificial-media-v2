/* Tipovi za src/brand/lutka-core.js (kopija iz brand/, bez tipova). */
declare module "@/src/brand/lutka-core.js" {
  export type Vec3 = [number, number, number];
  export type Frame = { x: Vec3; y: Vec3; z: Vec3 };
  export type LathePart = { n: string; k: "lathe"; prof: string; S: Vec3; M: Frame; L: number; dz: number; hp: string | null; sole: number | null };
  export type BallPart = { n: string; k: "ball"; c: Vec3; r: number };
  export type Part = LathePart | BallPart;
  export type Rot = { tilt: number; pitch: number; yaw: number };
  export type Arm = { th: [number, number, number]; ph: [number, number, number]; roll: [number, number, number] };
  export type Leg = { th: [number, number]; ph: [number, number]; foot: number; fp?: number };
  export type KanonPose = {
    support?: "L" | "R";
    touch?: number;
    pelvis: Rot; chest: Rot; neck: Rot; head: Rot;
    armL: Arm; armR: Arm; legL: Leg; legR: Leg;
  };
  export type Lutka = {
    layout: (pose: KanonPose) => Part[];
    pose: (name: string) => KanonPose;
    sp: Record<string, Array<[number, number]>>;
    sph: Record<string, Array<[number, number]>>;
    K: Record<string, unknown>;
  };
  const api: {
    create: (K: unknown) => Lutka;
    blend: <T>(a: T, b: T, u: number) => T;
    sampleProfile: (pts: Array<[number, number]>, steps?: number) => Array<[number, number]>;
    rAt: (sp: Array<[number, number]>, t: number) => number;
  };
  export default api;
}
