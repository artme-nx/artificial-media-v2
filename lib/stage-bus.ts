/**
 * Most između HTML-a i 3D-a: sekcije javljaju namjeru (poza po usluzi, aktivni reel…), a redatelj 3D scene je čita.
 * Bez Reacta i bez re-rendera: obični objekt + pretplatnici.
 */
export type StageIntent = {
  servicePose: string | null;
  reelActive: string | null;
  reelRect: DOMRect | null;
  formState: string | null;
};

const state: StageIntent = { servicePose: null, reelActive: null, reelRect: null, formState: null };
const subs = new Set<(s: StageIntent) => void>();

export function setStageIntent(patch: Partial<StageIntent>) {
  Object.assign(state, patch);
  for (const f of subs) f(state);
}
export function getStageIntent() {
  return state;
}
export function onStageIntent(f: (s: StageIntent) => void) {
  subs.add(f);
  return () => subs.delete(f);
}
