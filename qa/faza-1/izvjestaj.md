# F1 — Tokeni, tipografija, logo, kostur stranice · izvještaj

Datum: 8. 10. 2026.

## Što je napravljeno
- **Tokeni** u tri sloja (`design/tokens.json` → `app/tokens.css`, `scripts/build-tokens.mjs`): primitivni (boje runde 3, Bodoni Moda, Jost, tipografska skala, razmaci, trajanja pokreta, easing), semantički (bg/fg/muted/line/accent…, `--ff-*`, `--fs-*`, `--sp-*`, `--mo-*`) i komponentni (nav, gumb, polje, reel, faq, fokus). Način pozornice `data-stage="dark|light"`; početna se renderira tamna, /start svijetla (zasebni root layouti, bez treptaja).
- **Fontovi**: Bodoni Moda + Jost (OFL) kroz `next/font` sa `size-adjust` fallbackom (bez skoka; CLS se mjeri u F9). Odabir uz `ui-ux-pro-max` (ODLUKE D1).
- **Logo** runde 3 · geometrija, jednobojno, lutka je I (`components/logo.tsx`, podaci iz `src/brand/logo-data.json` koje složi `sync-brand.mjs`). Prekidač `?logo=podebljano|tonski|sjena|podebljano-tonski`, zadano `podebljano` [ODLUKA KRISTIANA]. Riječi su zasebne grupe (ART / IFICIAL+lutka / ME / DIA) za titranje u F4.
- **Animacija loga** (1,6 s): slova dolaze na mjesto od lutke prema van, a lutka-I se iz uspravnog "I" namjesti u baletnu pozu (ruka en haut). Frameovi siluete iz istog kanona (`scripts/gen-logo-assets.py`, isti algoritam kao logo; zadnji frame = lutka iz loga). Učitava se lijeno (64 KB gzip). Smanjeni pokret: statična verzija.
- **Favicon** iz lutke (izrez glave, ruke en haut i gornjeg trupa; optička veličina S bez razmaka): SVG (svijetla/tamna tema) + PNG 32, 180, 512. Provjera 16/24/32 px: `favicon-provjera.png`.
- **Sve sekcije s pravim copyjem** (bez 3D-a): uvod (nadnaslov, H1 kao jedna rečenica, CTA), manifest, reelovi (filtri, oznaka client/spec, pravi omjeri 16:9 / 9:16 / 4:5 kao "justified" redovi; mobitel 2 stupca), svjetovi, prostor za drvo/robot (aria-hidden + hint), usluge (W1 + 4 usluge, placeholder opisi vidljivo označeni), Why AI?, CTA blok, FAQ (pristupačan accordion), podnožje (logo, osnivač, ©, placeholder adresa/impressum).
- **/start**: forma u 4 koraka (vrsta projekta → proizvod/brend → projekt → ime i e-mail), validacija uz polje, fokus na prvo neispravno polje, `aria-live`; bez endpointa iskrena poruka da forma nije spojena. Događaji za "lutku koja bilježi" (`lib/notebook.ts`) spremni za F8.
- `?status=1` obrubi sve stringove po statusu (approved / proposal / needs-confirmation / placeholder) — za pregled.

## Testovi (dev 39/39, produkcija 30/30)
| Test | Rezultat |
|---|---|
| H1, navigacija, CTA vidljivi u prvoj sekundi (3 viewporta) | ✓ |
| 0 grešaka konzole, iznimki, neuspjelih zahtjeva | ✓ |
| Bez vodoravnog scrolla | ✓ |
| Nijedna riječ slijepljena: svaki string iz content/site.ts točno u `textContent`; H1 = jedna rečenica | ✓ |
| Zabranjene riječi (03 §13, §14) u renderiranom tekstu i u content/site.ts | ✓ |
| axe WCAG 2.1 AA (uključuje kontrast) — tamna i svijetla pozornica, /start | ✓ 0 prekršaja |
| Prekidač `?logo=` | ✓ |

## Popravljeno tijekom faze
- Prijelaz mrak → svjetlo nije se okidao pri skoku preko cijelog raspona (ScrollTrigger `onToggle`); sada `onUpdate` + `onRefresh` po `progress`.
- /start je pri učitavanju animirao boju iz tamne u svijetlu → zasebni root layout po ruti + prijelaz boja tek nakon prvog prikaza.
- Reelovi: zadnji red se puni do ruba kad je skoro pun; rijedak red zadržava mjerilo.

## Kontrola kvalitete
F1 nije na popisu vizualnih faza za subagenta (F2–F8). Ključni screenshotovi: `desktop-1440--01-intro.jpg`, `--02-manifest.jpg`, `--03-work.jpg`, `--06-services.jpg`, `mobile-390--01-intro.jpg`, `logo-anim-strip.jpg`.
