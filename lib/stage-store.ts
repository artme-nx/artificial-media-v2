/**
 * Zajedničko stanje između HTML-a (sekcije, GSAP) i 3D redatelja. Bez Reacta: obični objekt + pretplatnici.
 */
export type StageState = {
  /** uvod: napredak scroll dijela (kadrovi 4–10), 0..1 */
  introProgress: number;
  /** uvod: vidljivost drvene plesačice u protusvjetlu (kadar 2), 0..1 */
  dancerLevel: number;
  /** uvod: faza baletnog pokreta plesačice (kadar 2), 0..1 — završava u pozi slova I iz loga */
  dancerPhase: number;
  /** uvod: je li automatski dio (kadrovi 1–3) gotov */
  introAutoDone: boolean;
  /** koja 3D zona je trenutno na ekranu */
  zone: "intro" | "ballet" | "doll" | "cursor" | null;
  /** napredak baletne scene (manifest), 0..1 */
  balletProgress: number;
};

const state: StageState = { introProgress: 0, dancerLevel: 0, dancerPhase: 0, introAutoDone: false, zone: "intro", balletProgress: 0 };
const subs = new Set<(s: StageState) => void>();

export function setStage(patch: Partial<StageState>) {
  Object.assign(state, patch);
  for (const f of subs) f(state);
}
export function getStage() {
  return state;
}
export function onStage(f: (s: StageState) => void) {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
}
