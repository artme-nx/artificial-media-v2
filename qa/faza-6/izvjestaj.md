# F6 — Drvo / robot ispod kursora · izvještaj

Datum: 8. 10. 2026. · Početna (`#atelier`, puni ekran); ispitna ruta `/lab/kursor` (noindex)

## Što je napravljeno
- **Dva prolaza, ista poza, isti kostur** (`src/three/scenes/cursor-scene.ts`): drvena lutka i hi-tech robot crtaju se u svakom frameu u dva render targeta (MSAA, HalfFloat) s istim svjetlom; sjena se računa jednom. Spoj kroz **kružnu masku oko kursora** (opruga s malim kašnjenjem) s uskim rubom točno ispod prstena — svaka točka je ili drvo ili čelik, bez "mjedenog" pretapanja.
- **Prsten** (prekidač `?prsten=0|1`): tanka precizna linija s 60 oznaka kao na okretnom prstenu sata; ne crta se ispod zaglavlja.
- **Hi-tech robot** (10-lik [ROBOT]): brušeni čelik s tankim oštrim razdjelnim linijama (prstenasti spojevi segmenata, obrađeni rub, uzdužni šav — na glavi straga, ne u visini "očiju"), analitički AA (bez šahovskog šuma); bez lica, svjetla, LED-ica, ekrana i kabela.
- **Lutka se polagano miče**: port de bras u petlji (bras bas ↔ à la seconde, zaobljene ruke), disanje, noge mirno na podu.
- **Interakcije**: povlačenje šake namješta pozu (IK za dvije kosti, glava prati), povlačenje glave okreće pogled; povlačenje praznog prostora okreće lutku s inercijom; pušteno se mekano vraća. `touch-action: pan-y` (okomiti scroll ostaje stranici).
- **Mobitel** (prekidač `?krug=oboje|prst|samo`, zadano oboje): krug prati prst; bez dodira se sam polako kreće oko lutke; kamera dalje (cijela lutka u kadru).
- Hint (UI mikrocopy): "Move to look inside · drag a hand to pose · drag the stage to turn" / "Touch to look inside".

## Testovi
- `tests/cursor.spec.ts`: **kursor na glavi, ramenu i koljenu → ispod je čelik (nezasićeno), daleko je drvo (zasićeno)**, dvaput za redom dok se lutka miče; povlačenje šake (šaka se digne za kursorom i mekano vrati), okret (rame se pomakne); mobitel (maska se sama pomiče); FPS. 0 grešaka konzole.

## Performanse
- 60 fps na M5 (1440 × 900), 2 duga framea pri učitavanju.

## Kontrola kvalitete (zasebni subagent, 3 kruga)
| Krug | Materijali | Svjetlo | Pokret | Tipografija | Kompozicija | Vjernost | Prosjek | Zadani kriterij | Donja granica |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 4 | 5 | 4 | 5 | 5 | 6 | 4,8 | **da** (~2 px) | da, tijesno |
| 2 | 4 | 5 | 4 | 6 | 5 | 6 | 5,0 | **da** (1–3 px) | da, tijesno |
| 3 | 4 | 5 | 6 | 7 | 6 | 6 | 5,7 | **da** (≤ 1 px na ramenu i koljenu) | da, tijesno |

Zadani kriterij faze ("robot točno na mjestu kursora, bez pomaka između slojeva, i dok se lutka miče") potvrđen je u sva tri kruga mjerenjem i automatskim testom. Prag ocjene (≥ 8) nije dostignut → preostale mane u `PROGRESS.md` (drvo bez ptičjeg oka, čelik bez jačeg anizotropnog odsjaja, mehanika vidljiva samo u profilu, slaba kontaktna sjena).

Popravljeno između krugova: uži rub maske točno pod prstenom, prsten ispod zaglavlja, hi-tech linije (tanke, bez šuma, šav glave straga), baletne ruke u petlji, kamera na mobitelu, hint, svijetla mrlja ispod podignutog stopala (stopala sada mirno na podu).

Ključni screenshotovi (JPG): `desktop-1440--kursor-head.jpg`, `--kursor-shoulderR.jpg`, `--kursor-kneeL.jpg`, `--kursor-sake-povucena.jpg`, `--kursor-okret.jpg`, `mobile-390--kursor-pregled.jpg`.
