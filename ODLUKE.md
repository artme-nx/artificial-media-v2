# ODLUKE — što sam odlučio sam, zašto i kako se mijenja

Pravilo (11 §0.2): kad odluka nedostaje, biram najrazumniju opciju, zapisujem je ovdje i nastavljam. Sve označeno `[ODLUKA KRISTIANA]`, `[TREBA POTVRDU]` ili `[PRETPOSTAVKA]` je prekidač u `config/switches.ts` (ili token / `?parametar`).

## Tehnika

| # | Odluka | Zašto | Kako se mijenja |
|---|---|---|---|
| T1 | **Čisti three.js u React omotaču** (ne R3F) | Jedan trajni canvas s ručnom petljom: crtanje samo kad treba, više prolaza po frameu (drvo + robot za F6), vlastiti lanac postprocessinga, maske i razine kvalitete. R3F bi dodao reconciler i otežao ručni multi-pass i render-on-demand. Tehnike iz head-tracking-3d (volumetrija, PCSS, N8AO) su vanilla three.js pa se izravno prenose. | `src/three/` je izoliran; React samo montira canvas i šalje stanje sekcija. |
| T2 | Next.js 16.2.10, React 19.2.4, three 0.186.1, postprocessing 6.39.5, n8ao 2.0.1, GSAP 3.15, Lenis 1.3 | Iste verzije kao provjereni projekti na ovom računalu (test-premium, head-tracking-3d). | `package.json` |
| T3 | `trailingSlash: true` u `next.config.ts` | GitHub Pages pouzdano poslužuje `/start/index.html`. | `next.config.ts` |
| T4 | Generator tokena je vlastiti `scripts/build-tokens.mjs` (isti JSON oblik kao skill `design-system`) | Skillov generator razrješava reference u konačne vrijednosti i stavlja tamni način pod `.dark`; ovdje semantički sloj mora ostati `var()` referenca na primitive kako bi se pozornica mijenjala jednim atributom `data-stage="dark|light"` (uvod je taman, ostatak svijetao). | `design/tokens.json` |
| T5 | Repo `artificial-media-v2` | Ime iz 07-web-ideje; na GitHubu nije postojao (provjereno `gh repo view`, 8. 10.). | — |

## Dizajn

| # | Odluka | Zašto | Kako se mijenja |
|---|---|---|---|
| D1 | Fontovi: **Bodoni Moda** (izjave, H1, manifest) + **Jost** (tekst, sučelje, oznake). Oba OFL, Google Fonts, poslužuju se lokalno kroz `next/font` sa `size-adjust` fallbackom (bez skoka). | Preporuka `ui-ux-pro-max` (par "Luxury Minimalist"): Bodoni nosi kazalište i modnu kuću (premium art smjer, 01 §7), Jost je geometrijski kao slova loga runde 3 (jednolik potez, poprečni potezi u visini kukova). Nije Inter. | `app/layout.tsx` + `primitive.font` u tokenima |
| D2 | Boje: polazne iz 05-logo runda 3 (`#0B0B0C`/`#EFEBE3` mrak, `#F3EFE7`/`#151316` svijetlo), ljubičasta `#5B2A86` samo za leptir-mašnu, maramicu, fokus i rijetke naglaske; na tamnom svjetlija `#A27BD8` (05-logo runda 3). Nijansa `[TREBA POTVRDU]`. | 11 §3 Stack. | `primitive.color.violet` |

## Copy

| # | Odluka | Zašto |
|---|---|---|
| C1 | Meta opis = H1 | Zaseban meta opis nije odlučen; H1 je odlučen (03 §16). |
| C2 | Uvod u reelove: oznaka "Reels" + R3 "Client work and spec work, always labeled." (`proposal`) | 11 §4 red 4 traži oznaku client/spec (03 §7 R3); R1 "The work carries the argument." je kandidat, nije odluka, pa ga ne koristim. |
| C3 | CTA blok: "Tell us what you're selling." (03 §10 B1 bez broja, `proposal`) | 11 §4 red 12 dopušta B1 bez broja za formu; isti redak stoji iznad gumba u CTA bloku. |
| C4 | Opisi usluga Ads & Product Films i AI Tools for Business su vidljivo označeni prazni slotovi (`placeholder`) | 11 §4 red 7: opis iz §8 nosi stvarno snimanje (odbačeno u §16); alati čekaju pitanje 6. |
