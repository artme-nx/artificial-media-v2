/**
 * Mirovanje: koliko je prošlo od zadnjeg unosa (scroll, kotačić, pokazivač, dodir, tipkovnica). 3D u mirovanju crta
 * svaki drugi frame — isti pokret (disanje, orkestar, pogled) u 30 fps, upola manje rada GPU-a dok se čita: manje
 * grijanja (MacBook Air nema ventilator) i više GPU-a za druge kartice i aplikacije.
 */
let last = 0;
let busyUntil = 0;
let bound = false;

function bind() {
  if (bound || typeof window === "undefined") return;
  bound = true;
  const mark = () => (last = performance.now());
  for (const ev of ["scroll", "wheel", "pointermove", "pointerdown", "keydown", "touchmove", "input"]) {
    window.addEventListener(ev, mark, { passive: true, capture: true });
  }
}

/** pokret koji nije od korisnika, a treba punih 60 fps (npr. plesačica u uvodu) */
export function keepBusy(ms = 300) {
  busyUntil = Math.max(busyUntil, performance.now() + ms);
}

/** true kad korisnik već ms milisekundi ništa ne radi (i ništa nije zatražilo pun ritam) */
export function isCalm(now = performance.now(), ms = 500) {
  bind();
  return now - last > ms && now > busyUntil;
}
