# F2 — Lutka: AAA tijelo, materijali, mehanika · izvještaj

Datum: 8. 10. 2026. · Ruta: `/lab/lutka` (noindex, nije u navigaciji; `?pose=…&cam=…&struk=A|B&izgled=wood|robot&ui=0`)

## Što je napravljeno
- **Geometrija iz kanona u visokoj rezoluciji**: tokareni dijelovi (do 180×112 segmenata), presjek kao u lutka.py (dz, visinski profil stopala, ravan taban), **analitičke normale** (popravljen bug: normale su bile okrenute prema unutra).
- **Ptičje oko javor** (`src/three/materials/maple.ts`, proceduralno, bez tekstura): gusta sitna "oči" nasumične veličine (razmak ~5 mm), fina valovita žila uzduž uda koja se savija oko očiju, tonske varijacije, chatoyance u sjaju (pruge kovrče mijenjaju hrapavost s kutom), anti-aliasing svih finih uzoraka (fwidth).
- **Brušeni čelik** s anizotropijom (kružno brušenje oko osi zgloba), polirani rubovi, perlage dno udubine.
- **Satni mehanizam na svim zglobovima s popisa** (`watchJointGeometry`): polirani prsten s kosim rubom po ekvatoru, bočni prozori s poliranim obodom, skeletonizirani kotač (30 zubaca, 5 zakrivljenih krakova), pinion, most, ležaj, vijci s utorom, perlage; čelični vrat sa zupčastim pojasom; zglobovi prstiju.
- **Šake**: 5 prstiju, 3 čelična zgloba po prstu, 2 na palcu; savijanje i raširenost su podaci poze; 1,35× kanonske šake.
- **Struk A/B** (`?struk=`, zadano A) [ODLUKA KRISTIANA].
- **Robot** (`?izgled=robot`): isti kanon, sav čelik, bez lica i svjetla.
- **Sustav poza**: 7 kanonskih + dirigent iz `lutka-v2.json` (raspored → kutovi, `poseFromParts`, odstupanje < 0,02) + scenske varijante (`src/motion/poses-extra.json`); stupnjevani prijelazi (kukovi vode, prsa/ruke/glava kasne, opruge s blagim prebačajem), disanje i prebacivanje težine, IK za dvije kosti, pogled glave ±35° (vrat i prsa prate).
- **Format pokreta za snimljeni pokret**: `src/motion/clip.ts` (`kanon-pose-keys`, `kanon-parts-frames`) + `scripts/import-motion.mjs` (glTF RIG_lutka → frameovi; samoprovjera 1,5·10⁻⁵).
- **Render**: PCSS meke sjene, kontaktne sjene, N8AO, DOF (objektivi u mm), ACES, zrno, vinjeta, MSAA; dinamička rezolucija (DPR prema izmjerenom vremenu framea).

## Testovi
- `tests/figure.spec.ts`: sudari i pod za sve poze (12) i 41 točku baletnog niza — prolazi; parnost poze dirigenta — prolazi.
- `tests/lab.spec.ts`: 13 kadrova lutke + prijelaz + pogled; 0 grešaka konzole.
- Cijeli paket: 65/65 (dev), produkcija pod basePathom: smoke + content + lab 21/21.
- Performanse (headless, Apple M5): lab "blizu" s dinamičkom rezolucijom ~60–110 fps (DPR se spušta do ~1,4 kad treba).

## Kontrola kvalitete (zasebni subagent, 3 kruga)
| Krug | Materijali | Svjetlo | Pokret | Kompozicija | Vjernost | Prosjek |
|---|---|---|---|---|---|---|
| 1 | 5 | 6 | 4 | 5 | 6 | 5,2 |
| 2 | 6 | 7 | 5 | 6 | 7 | 6,2 |
| 3 | 5 | 6 | 5 | 6 | 6 | 5,6 |

Svi krugovi: **nadmašuje donju granicu: da** (jasno u krupnim kadrovima). Prag (≥ 8, nijedan < 7) nije dostignut ni nakon 3 kruga → preostale mane su u PROGRESS.md (poglavlje "Poznati problemi") i ponovno se ocjenjuju u F3–F8.

Popravljeno između krugova: gustoća i veličina očiju, moiré, chatoyance u sjaju, kontrast albeda, ton (krem-med), anizotropija čelika i okruženje s velikim softboxima, dublji mehanizam i vijci s utorom, veća šaka i palac s boka dlana, MCP zglobovi izvan dlana, scenske poze (kontrapost, en haut ovalno s pretama zajedno, dirigent, "seže" cijelim tijelom), stupnjevani prijelazi, jači pogled glave, kadar 3/4, automatsko kadriranje širokih kadrova, kontaktne sjene s tamnom jezgrom, prag blooma.

Ključni screenshotovi (JPG): `desktop-1440--01-blizu-glava-ramena-vrat.jpg`, `--03-zglob-rame.jpg`, `--02-glava.jpg`, `--07-cijela-balet-en-haut.jpg`, `--09-robot-struk-B.jpg`, `usporedba-donja-granica.jpg`.
