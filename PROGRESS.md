# PROGRESS — Artificial Media v2 (probna stranica)

Zadatak: `brand/11-stranica-v2-zadatak.md` (8. 10. 2026.). Ovaj dokument se ažurira nakon svakog koraka; ako se sesija prekine, nastavlja se odavde.

- Live: https://artme-nx.github.io/artificial-media-v2/
- Repo: https://github.com/artme-nx/artificial-media-v2
- Dev: http://localhost:3107 (`npm run dev`)

## Trenutno stanje

| Faza | Stanje | Napomena |
|---|---|---|
| F0 Priprema i kostur | ✅ gotovo | live 200 |
| F1 Tokeni, tipografija, logo, kostur stranice | ✅ gotovo | testovi 39/39 dev, 30/30 prod |
| F2 Lutka: tijelo, materijali, mehanika | ✅ objavljeno (QC ispod praga) | QC 5,2 → 6,2 → 5,6; nadmašuje donju granicu; preostale mane ispod |
| F3 Kostim, palica, roboti, pozornica | ✅ objavljeno (QC ispod praga) | QC 5,0 → 5,0 → 5,0; nadmašuje donju granicu (krug 2 i 3); /lab/scena |
| F4 Kazališni uvod (kadrovi 1–10) | — | |
| F5 Manifest s baletom, reelovi, svjetovi | — | |
| F6 Drvo / robot ispod kursora | — | |
| F7 Usluge, Why AI?, CTA, FAQ, podnožje | — | |
| F8 /start: lutka bilježi | — | |
| F9 Nizovi slika, posteri, performanse, pristupačnost | — | |
| Završetak (README, REVIEW.md) | — | |

**Sljedeći korak:** F4 — vratiti radnu verziju uvoda (stash), uskladiti s pozornicom iz F3, mobitel, kadrovi 1–10 na screenshotovima, QC, commit/deploy.

**Poznati problemi:**
- F2 QC (3 kruga, prosjek 5,6–6,2, prag 8 nije dostignut). Preostalo prema subagentu: (1) drvo u širokim kadrovima čita se kao mat bež, u makrou "pluto/pjegava ljuska" — kandidat: pečena 4K tekstura ptičjeg oka s mipmapama umjesto čistog proceduralnog shadera; (2) točkasti odsjaji malog reflektora na poliranim dijelovima (struk B, tjeme) — hrapaviji polirani dijelovi ili veći izvori svjetla; (3) amplituda pogleda glave se ne čita dovoljno; (4) poze en haut/dirigent/"seže" još krute; (5) mehanika prstiju i dlan; (6) mehanizam ramena "grub". Ponovna ocjena u F3–F8.
- F3 QC (3 kruga, prosjek 5,0; prag 8 nije dostignut; od kruga 2 "nadmašuje donju granicu: da"). Preostalo prema subagentu: (1) drvo — glava "glatka plastika", oči kao mjehurići, šake tamnije/porozne → kandidat i dalje pečena tekstura ptičjeg oka s mipmapama; (2) šaka i palica — dlan blok, prsti ne obuhvaćaju dršku u krupnom kadru, palica na 3/4 kadrovima zrnata; (3) zapešće i vrat čitaju se tamno umjesto svijetlog brušenog čelika; (4) snop bez jasne sjene lutke i ovala na podu u glavnom kadru, slaba kontaktna sjena; (5) aura/rub oko glave i šake (DOF/bloom); (6) pruge sjena na rukavima i leđima (PCSS na tkanini), šljokice; (7) kroj: revers bez debljine, rukavi kao cijevi, ovratnik; (8) poza stilla "ta-da", noge paralelne; (9) logika stilla (dirigent okrenut kameri — namjerno, kao kadar 10/Blender, ali QC traži 3/4 prema orkestru s podijem i pultom); (10) široki kadar slabo čita kazalište; (11) orkestar u istoj pozi, bijeli odsjaji na zglobovima; (12) šake pod toplim svjetlom djeluju zlatno.
- Performanse: s punim efektima na DPR 2 scena je preteška (21 fps); dinamička rezolucija drži ~60 fps spuštanjem DPR-a do ~1,4. Razina high smanjena (MSAA 2, volumetrija 0,4/36, AO 12) → ~70–86 fps na DPR 1. Dorada u F9.

## Plan

Arhitektura (detalji i obrazloženja u `ODLUKE.md`):

- Next.js 16 (App Router, static export) + TypeScript + Tailwind v4; tokeni u tri sloja (`design/tokens.json` → `app/tokens.css`, `scripts/build-tokens.mjs`).
- Čisti three.js u React omotaču: **jedan trajni canvas** (`src/three/engine.ts`) iza sadržaja; "redatelj" (`src/three/director.ts`) bira scenu po sekciji u vidnom polju; crta se samo kad treba (pauza kad je kartica skrivena ili canvas nije vidljiv).
- Lutka iz kanona: `scripts/sync-brand.mjs` → `src/brand/`; `lutka-core.js` računa raspored dijelova za svaku pozu, a `src/three/figure/` iz njega gradi geometriju visoke rezolucije (tokareni profili), šake s 5 prstiju, satne mehanizme zglobova, kostim (skinned), palicu, bilježnicu i olovku. Poze i klipovi su JSON podaci (`src/motion/`).
- Materijali: ptičje oko javor (proceduralni shader: žila uzduž osi, "oči", chatoyance), brušeni čelik (anizotropija), satenski reveri, svila, lakirana koža; HDR okruženje proceduralno (bez preuzimanja).
- Rasvjeta i post: tungsten spot ~3200 K na dirigentu, hladni rub na orkestru; volumetrijski snopovi (raymarch, 3D šum, prava sjena), prašina, PCSS, kontaktne sjene, N8AO, DOF, bloom (samo desktop high), AgX, zrno, vinjeta.
- Razine kvalitete high / medium / low (automatski + `?q=`), bez WebGL2 ili uz smanjeni pokret: posteri i tekst.
- `ScrollSequence` s izvorima `realtime` i `frames`; `scripts/video-to-frames.mjs` (ffmpeg) za Seedance videe.
- Testovi: Playwright (`tests/`), desktop 1440×900 i 1920×1080, mobitel 390×844; dev i produkcijski build (`PW_PROD=1`).

Redoslijed: F0 → F1 → F2 → … → F9 → završetak. Svaka faza: testovi → (vizualne faze) kontrola kvalitete sa zasebnim subagentom (prosjek ≥ 8, nijedan kriterij < 7, najviše 3 kruga) → `qa/faza-N/izvjestaj.md` → commit → push → `npm run deploy` → curl live URL → ovaj dokument.

## Kontrolna lista (11 §7)

**07-web-ideje**
- [ ] Baletna scena: kamera iznad → spušta se i odmiče → port de bras → révérence → lutka manja u krugu reflektora, svijetla pozadina s dimom (F5)
- [ ] Ispravljen révérence (dubok naklon, ne korak natrag) (F5)
- [ ] Lutka bilježi: svih 8 stanja, mobitel, smanjeni pokret, pristupačnost, crtanje samo dok je forma vidljiva (F8)
- [ ] Interakcija 1: namjesti pozu povlačenjem (F6)
- [ ] Interakcija 2: poza po usluzi (F7)
- [ ] Interakcija 3: okretanje s inercijom (F6)
- [ ] Interakcija 4: lutka gleda reel (F5)
- [ ] Interakcija 5: révérence na dnu stranice (F7)
- [ ] Kazališni uvod, kadrovi 1–6, titranje vezano za scroll i unatrag, skip, statična verzija, pravi tekst (F4)
- [~] Dirigent u smokingu, tri takta 4/4, kimanje na prvi udarac (F3, F4) — kostim i poze u F3; takt u uvodu F4
- [~] Robotski orkestar, kadrovi 7–10 (F3, F4) — orkestar gotov (F3), kadrovi u F4
- [ ] Mrak → svijetli ostatak stranice (F4)
- [x] Smoking dorađen: reveri, skut, gumbi; palica vidljiva (F3) — frak sa skutovima, 2×3 gumba, studovi, pojas; `?kroj=frak|smoking`
- [ ] Drvo / robot ispod kursora, poravnato i u pokretu; mobitel prst i samostalno kretanje (F6)
- [ ] Niz slika umjesto videa, `ScrollSequence`, skripta video → frameovi, rezolucija po uređaju (F9)
- [ ] Ne šteka, izgleda kao 4K video (F9, §6)
- [x] Format pokreta spreman za snimljeni pokret balerine (F2, README) — clip.ts + import-motion.mjs (README u završetku)

**10-lik**
- [~] Ptičje oko javor, brušeni čelik, mehanika sata na svim navedenim zglobovima, 5 prstiju s 3/2 zgloba (F2) — napravljeno; QC ocjenjuje drvo i mehaniku prstiju ispod praga
- [x] Struk A i B kao prekidač (F2)
- [x] Kostim, palica, ljubičasta samo na leptir-mašni i maramici (F3)
- [x] Roboti po [ROBOT], orkestar u pozadini i izvan fokusa (F3) — bez vrućih točaka (test `hotspots.spec.ts`)
- [x] Toplo svjetlo na dirigentu, hladno na orkestru (F3)
- [ ] Provjera §4 prolazi na svakom screenshotu s likom (F2–F8)

**05-logo i 04-ime**
- [x] Logo runda 3 geometrija, jednobojno, lutka kao I; varijante naglaska ART/ME kao prekidač (F1)
- [x] Animacija loga 1–2 s + statična verzija (F1)
- [x] Favicon iz lutke, SVG + PNG 32/180/512 (F1)
- [ ] ART ME se pokazuje, nigdje se ne objašnjava; priča imena nije na stranici (F1, F4)

**03-nove-tvrdnje**
- [x] Nadnaslov, H1, manifest, svjetovi, otvaranje usluga, Why AI?, FAQ — točno iz navedenih odjeljaka, sa statusom (F1)
- [ ] Nijedna zabranjena riječ iz §13 i ništa iz §14 (F1, završni test grepom)

**Brief §5 (pravila stranice)**
- [ ] U prve 3 s jasno je što smo; navigacija s četiri linka i jednim CTA-om vidljiva od početka; nema "scroll for experience" (F0, F4)
- [ ] Zasebna `/start` stranica u 3–4 koraka (F8)
- [ ] Reelovi s filtrima Video / Web / AI tools, pravi omjeri, oznaka client / spec (F5)
- [ ] FAQ (F7) — accordion postoji od F1
- [ ] Tokeni u tri sloja, smanjeni pokret, mobitel, brzo učitavanje, efekt nikad ne usporava put do CTA-a (F1, F9)
- [ ] 4K video nikad u repou (F9)

## Dnevnik

- **8. 10. 2026.** Pročitani izvori iz §1 (brief, 10-lik, 07, 03, 05-logo, 04 §0, 01 §1/§7, 08, kanon, lutka-core, test_paritet, 09-blender, 07-web-proba, head-tracking-3d). Transkripti: u `~/.claude/projects/` jedina sesija od 4. 10. sa spomenom ključnih riječi je head-tracking-3d (bez odluka o brendu); Cowork transkripata u `~/Library/Application Support/Claude/` nema. Nastavljeno bez njih.
- F0: Next.js kostur, tokeni (tri sloja + način dark/light), `sync-brand.mjs`, `content/site.ts` (izvor + status), prekidači (`config/switches.ts`), Playwright kostur (12/12 zeleno na dev serveru).
- F0 objavljen: live 200 (drugi curl nakon 2 min).
- F1: tokeni (tri sloja + dark/light), Bodoni Moda + Jost, logo s prekidačem naglaska, animacija loga (flipbook poza iz kanona), favicon, sve sekcije s copyjem, /start forma (4 koraka), axe AA 0 prekršaja, test slijepljenih riječi.
- F2: /lab/lutka — tokareni dijelovi visoke rezolucije (analitičke normale; popravljen bug s normalama prema unutra), ptičje oko javor (proceduralni shader v3: gusta oči nasumične veličine, žila s domain warpom, chatoyance u sjaju, AA preko fwidth), brušeni čelik (anizotropija), satni mehanizam zgloba (polirani prsten s kosim rubom, skeletonizirani kotač, pinion, most, ležaj, vijci s utorom, perlage), šake s 5 prstiju (3/2 zgloba, 1,35× kanona), struk A/B, poze (7 kanonskih + dirigent iz lutka-v2.json pretvoren natrag u kutove + scenske), stupnjevani prijelazi s oprugama, disanje, IK, pogled glave ±35°. Provjere sudara i poda (TS port test_paritet) prolaze.
- QC F2 krug 1 (subagent): 5,2 — mane: ptičje oko, moiré, krom zglobovi, uzemljenje, plitka mehanika, šaka, izgorjeli rubovi, poze, kadriranje → popravljeno.
- Uvoz snimljenog pokreta: scripts/import-motion.mjs (glTF RIG_lutka → kanon-parts-frames), samoprovjera 1,5·10⁻⁵.
- F2 QC krug 2: 6,2; krug 3: 5,6 → F2 zatvoren s popisom preostalih mana (gore). Commit + deploy F2.
- F3: frak (skinned) sa skutovima i rezom u struku, gumbi, studovi, pojas, krilati ovratnik, leptir-mašna i maramica; vuna s naborima; palica u šaci; robotski orkestar (instanciran) s instrumentima; pozornica (pod, baršun, portal), tungsten snop s bojom u dimu, hladni orkestar, kontra svjetlo, odbljesak poda; jednobojno zrno; prašina samo u snopu. Pronađen i uklonjen uzrok "LED" točaka (anizotropni GGX na sitnim dijelovima) + test vrućih točaka. Svjetla se više ne gase preko `visible` (rekompajliranje usred scrolla). Razina high ubrzana (~53 → ~70–86 fps). QC 3 kruga: 5,0 / 5,0 / 5,0 (krug 2–3: nadmašuje donju granicu) → F3 zatvoren s popisom preostalih mana.
