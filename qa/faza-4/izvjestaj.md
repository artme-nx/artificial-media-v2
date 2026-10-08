# F4 — Kazališni uvod (kadrovi 1–10) · izvještaj

Datum: 8. 10. 2026. · Početna stranica (`/`), sekcija `#intro`; ispitna ruta `/lab/uvod?p=0..1` (noindex)

## Što je napravljeno
- **Jedan trajni canvas** iza sadržaja (`components/stage/stage-canvas.tsx` + `src/three/director.ts`): 3D se učitava lijeno nakon prvog prikaza (H1 i CTA nikad ne čekaju), shaderi se kompajliraju unaprijed (`compileAsync`, sa svim skrivenim objektima vidljivima), crtanje se pauzira kad uvod nije na ekranu; bez WebGL2 ili uz smanjeni pokret 3D se ne učitava.
- **Kadrovi 1–3 sami (~6,2 s)**: (1) "Where art meets intelligence," — filmska animacija slovo po slovo (zamućenje → oštro) čistim CSS-om od prvog prikaza; slova su inline pa kerning ostaje, ručni kerning za "Wh"; (2) "boundaries disappear." uz drvenu plesačicu u protusvjetlu kroz dim: port de bras (bras bas → à la seconde → en haut) koji završava **točno u pozi slova I iz loga**; na desktopu urednička kompozicija (lutka desno, tekst lijevo), na mobitelu okomita (tekst gore, lutka u stošcu); (3) logo ARTIFICIAL MEDIA s animacijom lutke-I (mali logo u navigaciji se tada povuče, logo nije dvaput).
- **Kadrovi 4–10 vodi scroll i rade unatrag**: (4) IFICIAL i DIA zatrepere i ugase se, ART i ME se primaknu; (5) ART ME se ugasi, mrak (bez odraza okruženja i dima — mrak je stvarno mrak); (6) reflektor udari odozgo (s treptajem), dirigent u fraku nastupa, kadar 3/4 odozgo sa stošcem i lokvom svjetla; (7) okret prema orkestru, ruke i palica se podižu u pripremu; (8) tišina, hladno svjetlo red po red pali orkestar; (9) palica padne na prvi takt: tri takta 4/4 (palica po obrascu dolje–unutra–van–gore kroz IK, slobodna ruka zrcalno, kimanje na 1), orkestar svira u ritmu scrolla; (10) instrumenti dolje, ruke dolje, okret prema publici i dubok naklon (kamera 3/4, fokus prati glavu).
- **Navigacija i "Brief us"** vidljivi cijelo vrijeme; **"Skip intro"** (tamna podloga, čitljiv i preko svjetla) vodi na manifest; scroll preskače automatski dio; **statična verzija** za smanjeni pokret (cijeli H1, logo, CTA, bez 3D-a); H1 je u DOM-u jedna rečenica (`aria-label` + isti `textContent`).
- **Prijelaz u svijetli dio** na kraju uvoda (prekidač `?svjetlo=0|1`, zadano da).
- Tipografija: izjave na Bodoniju s `opsz` 36 (najtanje crte više ne nestaju); navigacija i sadržaj na istoj mreži; logo više ne reže prvo i zadnje A.

## Testovi
- `tests/intro.spec.ts`: svih 10 kadrova redom (kadrovi 1–3 preko `window.__intro.seek(t)`, 4–10 scrollom, provjera `data-intro-frame`), unatrag (7 → 4), prijelaz u svijetlo, Skip intro, preskakanje scrollom, smanjeni pokret, FPS; desktop 1440 i mobitel 390. 0 grešaka konzole.
- Cijeli paket (dev): 92 prolazi (ostalo preskočeni viewporti). Produkcija pod basePathom (smoke, content, uvod, vruće točke): prolazi.
- Popravljeno usput: putanja loga `d="undefined"` na mobitelu (rAF vremenska oznaka prije početka animacije), nestabilna vruća točka na robotu iz laba (anizotropija tijela 0,6 → 0,35).

## Performanse (M5, headless, 1440 × 900, DPR 1, `high`)
- Kroz cijeli uvod (60 koraka scrolla): 54–60 fps, 2 duga framea (samo pri učitavanju). Shaderi skrivenih objekata kompajliraju se unaprijed; svjetla se ne gase preko `visible`; pri DPR ≤ 1,05 MSAA 4 (rubovi), iznad 1,05 → 2, iznad 1,3 → 0 (dinamička rezolucija).

## Kontrola kvalitete (zasebni subagent, 3 kruga)
| Krug | Materijali | Svjetlo | Pokret | Tipografija | Kompozicija | Vjernost | Prosjek | Nadmašuje donju granicu |
|---|---|---|---|---|---|---|---|---|
| 1 | 3 | 5 | 3 | 7 | 6 | 5 | 4,8 | ne |
| 2 | 3 | 5 | 5 | 7 | 5 | 6 | 5,2 | ne |
| 3 | 3 | 5 | 5 | 8 | 6 | 5 | 5,3 | ne |

Detalji: `qc-krug-1.md`, `qc-krug-2.md`, `qc-krug-3.md`. Prag (≥ 8, nijedan < 7) nije dostignut → preostale mane su u `PROGRESS.md`. Najveći preostali uteg je materijal (drvo i metal u srednjem kadru), isti kao u F2/F3; tipografija je ocijenjena 8.

Popravljeno između krugova: koreografija kadra 2 (poza slova I iz loga, elegantne šake), kompozicija kadra 2 (desktop/mobitel), mrak u 1 i 3–5, kadar 6 (stožac i lokva), razlika 7/8/9 (priprema, tišina, takt s obje ruke), dubok naklon s fokusom na glavi, nadnaslov i mali logo se povlače, Skip intro s podlogom, mreža navigacije, `opsz` 36, logo bez rezanja, palica tanja i bez sjaja, mekša sjena preko glave, viši podiji orkestra, skuti dalje unatrag, jača žila drva, MSAA 4 pri DPR 1.

Ključni screenshotovi (JPG): `desktop-1440--02-boundaries.jpg`, `--03-logo.jpg`, `--07-dirigent-podize.jpg`, `--09-dirigira.jpg`, `--10-naklon.jpg`, `mobile-390--pregled-kadrova.jpg`.
