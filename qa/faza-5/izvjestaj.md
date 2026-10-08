# F5 — Manifest s baletom, reelovi, svjetovi · izvještaj

Datum: 8. 10. 2026. · Početna (`#manifest`, `#work`, `#worlds`); ispitna ruta `/lab/balet?p=0..1` (noindex)

## Što je napravljeno
- **Baletna scena preko manifesta** (07, 6. 10.; `src/three/scenes/ballet-scene.ts`): svijetla topla siva pozornica (cyclorama), topli ključ odozgo sa stošcem kroz dim i sjenom lutke, hladni rub straga, gornji reflektor koji se pali na kraju (krug svjetla centriran na lutku), prašina u snopu, kontaktne sjene, AO, DOF s fokusom na glavi.
- **Kamera** (cilindrične koordinate oko lutke, objektivi 50 → 35 mm): počinje iznad i blizu (glava, rame, ruka en haut), spušta se i odmiče uz kruženje ~46° (prekidač `?kruzenje=0|1`, [PRETPOSTAVKA] iz 07), na kraju visoko i široko — lutka sama u krugu svjetla.
- **Koreografija**: en haut → à la seconde (zaobljene ruke, meke šake) → bras bas → **révérence** (plié, stražnja noga iza na prstima, trup iz kukova, glava se pokloni zadnja, ruka otvorena prema publici; vrh naklona se zadrži) → završna poza u krugu svjetla. Sekvenca prolazi provjeru sudara i poda u 41 točki.
- **Scroll vodi scenu i radi unatrag**; manifest je visoka sekcija samo kad je 3D spreman (inače obična sekcija — smanjeni pokret, bez WebGL2). Tekst manifesta je sticky sloj: prvi redak dok je kamera iznad lutke, drugi dok se spušta; kraj se mekano stapa u papir (bez tvrdog ruba prema reelovima).
- **Redatelj** (`src/three/director.ts`) bira zonu (uvod / balet / kursor) po visini vidljivog dijela, kompajlira shadere unaprijed (prva scena odmah, ostale kad je preglednik slobodan).
- **Reelovi**: mala drvena lutka u zaglavlju okreće tijelo i glavu prema aktivnom slotu (pod mišem/fokusom, inače najbliži sredini ekrana) — jedan mali prozirni canvas koji dijele sve male lutke (`components/stage/doll-stage.tsx`); slotovi s container queries (oznake se prilagođavaju veličini slota), mobitel u dva stupca, 16:9 preko pune širine.
- **Svjetovi**: "We don’t build campaigns. We build worlds." (tipografski apostrof, ručni kerning "We" za Bodoni).
- Sekcije bez 3D-a imaju neprozirnu pozadinu (sljedeća sekcija pri scrollu pokrije scenu).

## Testovi
- `tests/manifest.spec.ts`: kadrovi baleta redom i unatrag (vidljivost redaka manifesta), reelovi (lutka postoji, aktivni slot, hover), svjetovi, smanjeni pokret (obična sekcija), FPS — desktop 1440 i mobitel 390; 0 grešaka konzole.
- `tests/figure.spec.ts`: nove poze i niz "manifest" (sudari, pod).

## Performanse (M5, 1440 × 900, `high`)
- Kroz manifest: **60 fps**, 2 duga framea (učitavanje). Optimizacija ptičjeg oka (Worley 2×2×2 + preskakanje kad su oči manje od piksela): krupni kadar 23 → 54 fps bez vidljive razlike.

## Kontrola kvalitete (zasebni subagent, 3 kruga)
| Krug | Materijali | Svjetlo | Pokret | Tipografija | Kompozicija | Vjernost | Prosjek | Nadmašuje donju granicu |
|---|---|---|---|---|---|---|---|---|
| 1 | 4 | 4 | 3 | 7 | 5 | 6 | 4,8 | ne |
| 2 | 4 | 3 | 3 | 6 | 5 | 6 | 4,5 | ne |
| 3 | 5 | 4 | 4 | 7 | 6 | 6 | 5,3 | ne |

Detalji: `qc-krug-1.md`, `qc-krug-2.md`, `qc-krug-3.md`. Prag nije dostignut → preostale mane u `PROGRESS.md`. Najjače: tipografski momenti manifesta i svjetova, tijek kamere, iskreni prazni reel okviri; najslabije: drvo u srednjem kadru, vidljivost dima na svijetloj pozornici, uvjerljivost révérencea.

Popravljeno između krugova: révérence (tri iteracije: ispravljen "korak natrag", pa "posrtanje"), port de bras zaobljen, završna poza, svjetla (topli ključ sa stošcem, hladni rub, krug centriran na lutku, bez suvišnih krugova), svjetlija pozornica, kontaktne sjene, prijelaz u reelove, reelovi na mobitelu, apostrof i kerning, mala lutka (okret tijela, svjetlija).

Ključni screenshotovi (JPG): `desktop-1440--01-manifest-iznad-lutke.jpg`, `--03-manifest-bras-bas.jpg`, `--04-manifest-reverence.jpg`, `--07-reelovi-lutka-gleda-prvi.jpg`, `--08-svjetovi.jpg`, `mobile-390--pregled.jpg`.
