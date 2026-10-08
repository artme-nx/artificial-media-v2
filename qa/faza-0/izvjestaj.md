# F0 — Priprema i kostur · izvještaj

Datum: 8. 10. 2026.

## Što je napravljeno
- Next.js 16 (App Router, static export, basePath `/artificial-media-v2` samo u produkciji, `images.unoptimized`, `trailingSlash`).
- Tailwind v4, tokeni u tri sloja (`design/tokens.json` → `app/tokens.css`), način pozornice `data-stage="dark|light"`.
- `scripts/sync-brand.mjs`: kanon, lutka-core, lutka-v2, logo SVG-ovi → `src/brand/` sa zaglavljem izvora; `logo-data.json` za animaciju slova.
- `content/site.ts`: svi stringovi iz 11 §4 s izvorom i statusom; `content/ui.ts` (mikrocopy), `content/reels.ts` (prazni slotovi).
- `config/switches.ts`: svi prekidači ([ODLUKA KRISTIANA] / [TREBA POTVRDU] / [PRETPOSTAVKA]).
- Kostur stranice: navigacija (logo, četiri linka, CTA "Brief us"), nadnaslov, H1 kao jedna rečenica, CTA; `/start`.
- `noindex` meta + `robots.txt` (Disallow: /).
- Playwright: `tests/smoke.spec.ts`, `tests/sections.spec.ts`, viewporti 1440×900, 1920×1080, 390×844 (dodir).

## Testovi
| Test | Dev (3107) | Produkcija (out/ pod basePathom) |
|---|---|---|
| H1, navigacija, CTA vidljivi u prvoj sekundi | ✓ (3 viewporta) | ✓ |
| 0 grešaka konzole / iznimki / neuspjelih zahtjeva | ✓ | ✓ |
| Bez vodoravnog scrolla | ✓ | ✓ |
| noindex | ✓ | ✓ |
| Zabranjene riječi (03 §13, §14) | ✓ | ✓ |

12/12 (dev) i 9/9 (produkcija, smoke).

## Kontrola kvalitete
F0 nije vizualna faza (kontrola kvalitete se radi od F2).
