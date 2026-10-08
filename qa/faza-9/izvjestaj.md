# F9 — Nizovi slika, posteri, performanse, pristupačnost · izvještaj

Datum: 8. 10. 2026.

## Nizovi slika (11 §3, F9)
- **Render iz 3D-a u najvišoj kvaliteti** (`scripts/render-sequences.mjs`): Chromium s GPU-om (Apple M5, ANGLE Metal; softverski renderer prekida skriptu), 2× supersampling (render u dvostrukoj rezoluciji, Lanczos smanjenje), kvaliteta rendera (volumetrija 0,6 / 80 koraka, AO 24 uzorka, MSAA 4, DOF 0,75), deterministički kadrovi (`__render(p)` bez izglađivanja), u serijama od 20 frameova sa stankama.
- Nizovi: **ples** (kadar 2 uvoda, 24 frame-a), **uvod** (kadrovi 6–10, 96), **balet** (manifest, 96); desktop 1600 × 900 i mobitel 720 × 1280 (uspravni kadrovi kamere za portret). Ukupno **5,6 MB** nizova + 0,1 MB postera (granica 80 MB).
- **`ScrollSequence`** (`components/stage/scroll-sequence.tsx`): 2D canvas iza sadržaja; scroll pomiče frameove naprijed-natrag (uvod po napretku kadrova 6–10, kadar 2 po fazi plesa, balet po napretku manifesta); postupno učitavanje (svaki osmi, pa svaki drugi, pa ostali; kadar 2 odmah, ostalo kad je preglednik slobodan).
- **Izvor po uređaju** (`?izvor=auto|realtime|frames`): uživo na desktopima razine high/medium; nizovi na mobitelu (dodir, < 820 px), softverskom GPU-u i `?q=low`; bez WebGL2 nizovi (2D) + poster za "drvo / robot"; smanjeni pokret → posteri. U načinu "frames" three.js se učitava tek kad se sekcija "drvo / robot" približi.
- **Video → frameovi** (`scripts/video-to-frames.mjs`, ffmpeg): isti oblik mape i `manifest.json` — Seedance video se ubacuje bez promjene koda (README). 4K video nikad u repou.

## Posteri
- `scripts/make-posters.mjs` → `public/posters/` (uvod: dirigent pred orkestrom; balet: en haut izbliza; "drvo / robot": lutka s krugom robota na prsima), desktop i mobitel. Prikazuju se uz smanjeni pokret (uvod iza teksta, poster baleta u manifestu, "drvo / robot") i bez WebGL2.

## Performanse
- Desktop (M5, 1440 × 900, `high`, dinamička rezolucija): uvod 54–60 fps, manifest 60 fps, "drvo / robot" 60 fps; dugi frameovi samo pri učitavanju (2).
- **Lighthouse 13.4** (mobilni profil, simulirani spori 4G i 4× sporiji CPU; produkcijski build pod basePathom, gzip kao GitHub Pages):

  | Stranica | Performance | Accessibility | Best Practices | LCP | CLS | TBT | FCP |
  |---|---|---|---|---|---|---|---|
  | `/` | **91** | **100** | **100** | 3,5 s | 0,002 | 0 ms | 1,1 s |
  | `/start` | **94** | **100** | **100** | 3,1 s | 0 | 0 ms | 0,9 s |

  Ciljevi (11 §6): Performance ≥ 85 ✅, Accessibility ≥ 95 ✅, Best Practices ≥ 95 ✅, CLS ≤ 0,05 ✅, bez dugih zadataka (TBT 0 ms) ✅, **LCP ≤ 2,5 s ✗** (3,1–3,5 s u simulaciji; LCP je H1 tekst, ostatak vremena su fontovi i početni JS — vidi PROGRESS).
- Što je popravljeno za Lighthouse: three.js se više ne učitava pri pokretanju (male lutke kad se sidro približi, lutka na /start na prvu interakciju ili nakon 4 s uz poster iste poze, u načinu "frames" 3D tek blizu sekcije "drvo / robot") → TBT 2,6–6,2 s → 0 ms; H1 je jedan tekstni blok koji se otkriva maskom (ne po slovima i ne iz neprozirnosti 0) → LCP je H1 u prvom prikazu; drugi dio naslova je od prvog prikaza naslikan i skriven maskom; tri dodatne varijante loga učitavaju se samo na `?logo=` (−100 KB JS-a); SplitText bez aria-labela na `<p>` (axe).

## Pristupačnost
- `tests/a11y.spec.ts`: tipkovnica kroz početnu (skip link prvi, svi fokusi vidljivi; Brief us, Skip intro), forma tipkovnicom, dekoracija `aria-hidden` (3D canvas, "drvo / robot", veliki logo), ciljevi dodira ≥ 44 px na mobitelu (popravljeni filtri reelova i linkovi podnožja).
- axe WCAG 2.1 AA (`tests/content.spec.ts`): tamni i svijetli dio početne i `/start` bez prekršaja.
- Smanjeni pokret: statični uvod (cijeli H1, logo, CTA, poster), bez scroll-animacija.

## Testovi
- Dev (desktop 1440, 1920, mobitel 390): **130 prolazi**, 0 pada (ostalo su namjerno preskočeni viewporti). Produkcija pod basePathom: **72 prolazi**, 0 pada. Uključuje nove `tests/a11y.spec.ts` i mobilni način "frames" (nizovi slika) u testovima uvoda i manifesta.

Ključni screenshotovi (JPG, mobitel 390 u načinu "frames" — nizovi slika i poster): `mobile-390--06-reflektor.jpg`, `--09-dirigira.jpg`, `--10-naklon.jpg` (uvod), `--02-manifest-port-de-bras.jpg`, `--05-manifest-krug-svjetla.jpg` (balet), `--13-smanjeni-pokret.jpg` (poster). F9 nije vizualna faza u smislu §2 (kontrola kvalitete je za F2–F8); nizovi su render istih scena.
