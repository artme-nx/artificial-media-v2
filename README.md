# Artificial Media v2 — probna stranica

**Live:** https://artme-nx.github.io/artificial-media-v2/ · **Repo:** https://github.com/artme-nx/artificial-media-v2
Zadatak: `brand/11-stranica-v2-zadatak.md` · Pregled za Kristiana: `REVIEW.md` · Odluke: `ODLUKE.md` · Napredak: `PROGRESS.md`

## Pokretanje

```bash
npm install
npm run dev          # http://localhost:3107 (prije pokreće sync-brand i tokens)
npm run build        # static export u out/ (basePath /artificial-media-v2)
npm run serve-out    # posluži out/ na http://localhost:3108/artificial-media-v2/
npm test             # Playwright na dev serveru (desktop 1440, 1920, mobitel 390)
npm run build && PW_PROD=1 npx playwright test   # isto na produkcijskom buildu pod basePathom
npm run deploy       # build → gh-pages (GitHub Pages)
```

- `npm run sync-brand` kopira kanon lutke, `lutka-core.js`, `lutka-v2.json` i logo iz `brand/` u `src/brand/` (ne uređuj tamo).
- `npm run tokens` gradi `app/tokens.css` iz `design/tokens.json` (primitivni → semantički → komponentni sloj).
- Screenshotovi testova idu u `qa/faza-N/` (`PHASE=N npm test`); PNG-ovi su izvan gita, u git idu najviše 6 JPG-ova po fazi.

## Prekidači (sve što je u dokumentima `[ODLUKA KRISTIANA]`, `[TREBA POTVRDU]`, `[PRETPOSTAVKA]`)

Zadane vrijednosti su u `config/switches.ts` (jedan redak po prekidaču); za probu bez promjene koda dodaje se `?parametar` u URL.

| Parametar | Vrijednosti (zadano **podebljano**) | Što mijenja |
|---|---|---|
| `?logo=` | **podebljano** · tonski · sjena · podebljano-tonski | naglasak ART/ME u logu (05-logo runda 3b) |
| `?struk=` | **A** · B | struk lutke: čelični kuglasti zglob ili stup s tri prstena (10-lik §1) |
| `?kroj=` | **frak** · smoking | kostim dirigenta (skuti straga ili sako do bokova) |
| `?svjetlo=` | **1** · 0 | kraj uvoda: prijelaz iz mraka u svijetli dio stranice |
| `?kruzenje=` | **1** · 0 | kamera baletne scene se uz spuštanje okreće oko lutke (07, pretpostavka) |
| `?autouvod=` | **1** · 0 | kadrovi 1–3 uvoda idu sami |
| `?krug=` | **oboje** · prst · samo | mobitel, "drvo / robot": krug prati prst i/ili se sam kreće |
| `?prsten=` | **1** · 0 | tanki satni prsten na rubu maske |
| `?q=` | **auto** · high · medium · low | razina kvalitete 3D-a |
| `?izvor=` | **auto** · realtime · frames | uvod i balet: 3D uživo ili nizovi slika (auto: uživo na jakim desktopima, slike na mobitelu i slabim) |
| `?status=1` | — | obrubi i oznake statusa (approved / proposal / needs-confirmation / placeholder) na svim tekstovima |
| `?probe=1` | — | FPS sonda (`window.__fps`) i u produkcijskom buildu |

Ostalo: boja palice `BATON_COLOR` i endpoint forme `FORM_ENDPOINT` (ispod) u istoj datoteci; ljubičasta nijansa je token `primitive.color.violet` u `design/tokens.json`.

## Seedance videi → stranica (nizovi slika)

Uvod (kadar 2 i kadrovi 6–10) i baletna scena na mobitelu i slabim uređajima crtaju se iz nizova slika (`components/stage/scroll-sequence.tsx`): scroll pomiče frameove naprijed-natrag. Isti oblik mape daju obje skripte:

```
public/seq/<niz>-<desk|mob>/000.webp … NNN.webp + manifest.json   (niz: ples · uvod · balet)
```

- **Iz Seedance (ili bilo kojeg) videa** (treba `ffmpeg`): `node scripts/video-to-frames.mjs ~/Downloads/balet-4k.mp4 balet desk --frames=120` i isto s `mob` za uspravnu verziju (`--width=720`). Skripta ravnomjerno uzorkuje video, smanjuje Lanczosom i piše WebP + `manifest.json`. **4K video nikad ne ide u repo** — samo smanjeni frameovi.
- **Iz 3D-a** (sadašnji nizovi): `node scripts/render-sequences.mjs [ples|uvod|balet] [--only=desk|mob]` (dev server mora raditi). Render u najvišoj kvaliteti (2× supersampling, više koraka dima i uzoraka AO), u serijama sa stankama.
- Posteri (smanjeni pokret, bez WebGL2): `node scripts/make-posters.mjs` → `public/posters/`.
- Ukupno nizovi + posteri u repou: vidi `PROGRESS.md` (granica 80 MB).

## Reelovi

`content/reels.ts`: svaki slot ima kategoriju (video / web / ai-tools), pravi omjer (16:9, 9:16, 4:5) i status. Dok radova nema, slotovi su vidljivi `placeholder` okviri — nikad izmišljeni rad. Kad rad postoji:

```ts
{ id: "slot-1", category: "video", aspect: "16:9", kind: "client", title: "Naziv", status: "approved",
  stream: { provider: "bunny", id: "<video-guid>", libraryId: "<library-id>" }, poster: null }
// ili Cloudflare Stream: stream: { provider: "cloudflare", id: "<video-uid>" }
```

Slot tada ugrađuje stream (lijeno učitan iframe). `kind` je oznaka client / spec (03 §7 R3). Mala lutka u zaglavlju gleda aktivni reel.

## Endpoint forme (`/start`)

Forma radi bez lutke (lutka je `aria-hidden` i sluša samo vrstu događaja, ne tekst). Slanje ide na `NEXT_PUBLIC_FORM_ENDPOINT` (Formspree, Web3Forms ili vlastiti; `[ODLUKA KRISTIANA]`), postavljen pri buildu:

```bash
NEXT_PUBLIC_FORM_ENDPOINT="https://formspree.io/f/xxxxxxx" npm run deploy
```

Tijelo zahtjeva je JSON `{ type, product, project, name, email }` (`POST`, `Accept: application/json`). **Bez endpointa forma ne glumi slanje:** nakon révérencea piše iskrena poruka da je ovo pregled i da ništa nije poslano.

## Uvoz snimljenog pokreta (balerina → lutka)

Lanac: video balerine → Higgsfield Genjutsu (prijenos pokreta) → Blender: retarget na `RIG_lutka` (brand/09-blender, 20 kostiju) → izvoz glTF/GLB (Y gore) →

```bash
node scripts/import-motion.mjs ulaz.glb src/motion/clips/balerina.json [--fps 30]
node scripts/import-motion.mjs --selftest
```

Izlaz je klip `kanon-parts-frames` (`src/motion/clip.ts`, `ClipPlayer.sample(u)`): svaki dio lutke prati svoju kost, a pri učitavanju se frameovi pretvaraju u kutove kanona, pa vrijede iste provjere kao za ručne poze (sudari, stopala na podu — `tests/figure.spec.ts`).

## Ispitne rute (noindex, izvan navigacije)

`/lab/lutka` (lutka, materijali, poze), `/lab/scena` (dirigent i orkestar), `/lab/uvod?p=` (uvod), `/lab/balet?p=` (manifest), `/lab/kursor` (drvo / robot). `?render=1` = kvaliteta za render nizova slika.

## Struktura

- `app/` — rute (`(home)` tamna pozornica, `(pages)` svijetla: `/start`, lab), `tokens.css`, `components.css`
- `components/` — sekcije, navigacija, logo, `stage/` (trajni canvas, nizovi slika, male lutke), `start/` (forma, lutka bilježi)
- `content/` — sav tekst sa statusom i izvorom (`site.ts`), mikrocopy (`ui.ts`), reelovi
- `src/three/` — engine, post (AO, volumetrija, DOF, bloom, zrno), materijali (javor, čelik, tkanine), lutka, kostim, orkestar, scene, redatelj
- `src/motion/` — poze, animator, pogled/IK, klipovi · `src/figure/` — kanon u TypeScriptu, provjere sudara
- `scripts/` — sync-brand, tokens, logo, deploy, nizovi slika, posteri, video → frameovi, uvoz pokreta
- `tests/` — Playwright (smoke, sadržaj i axe, sekcije, uvod, manifest, kursor, /start, lutka, vruće točke, pristupačnost)
