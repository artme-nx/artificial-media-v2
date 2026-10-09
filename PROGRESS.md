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
| F4 Kazališni uvod (kadrovi 1–10) | ✅ objavljeno (QC ispod praga) | QC 4,8 → 5,2 → 5,3 (tipografija 8); 10 kadrova, unatrag, skip, statično; 54–60 fps |
| F5 Manifest s baletom, reelovi, svjetovi | ✅ objavljeno (QC ispod praga) | QC 4,8 → 4,5 → 5,3; balet scrollom i unatrag, révérence, reelovi s lutkom; 60 fps |
| F6 Drvo / robot ispod kursora | ✅ (QC ispod praga; zadani kriterij DA) | QC 4,8 → 5,0 → 5,7; robot točno ispod kursora (≤ 1–3 px), 60 fps |
| F7 Usluge, Why AI?, CTA, FAQ, podnožje | ✅ (QC ispod praga) | QC 5,0 → 5,3 → 5,3; poza po usluzi, révérence na dnu |
| F8 /start: lutka bilježi | ✅ (QC ispod praga) | QC 5,2 → 5,0 → 5,7; svih 8 stanja, iskreni pregled bez endpointa |
| F9 Nizovi slika, posteri, performanse, pristupačnost | ✅ (LCP iznad cilja) | nizovi 5,6 MB, posteri; Lighthouse mobilni 91/100/100 (`/`), 94/100/100 (`/start`), TBT 0, CLS ≈ 0, LCP 3,1–3,5 s |
| Završetak (README, REVIEW.md) | ✅ gotovo | REVIEW.md, README, LINK.txt, 12 screenshotova u `qa/review/` |

**Sljedeći korak:** sve faze i završetak su gotovi (REVIEW.md za Kristiana). Otvoreno: preostale mane iz kontrole kvalitete (ispod) i LCP ≤ 2,5 s.

**Poznati problemi:**
- F2 QC (3 kruga, prosjek 5,6–6,2, prag 8 nije dostignut). Preostalo prema subagentu: (1) drvo u širokim kadrovima čita se kao mat bež, u makrou "pluto/pjegava ljuska" — kandidat: pečena 4K tekstura ptičjeg oka s mipmapama umjesto čistog proceduralnog shadera; (2) točkasti odsjaji malog reflektora na poliranim dijelovima (struk B, tjeme) — hrapaviji polirani dijelovi ili veći izvori svjetla; (3) amplituda pogleda glave se ne čita dovoljno; (4) poze en haut/dirigent/"seže" još krute; (5) mehanika prstiju i dlan; (6) mehanizam ramena "grub". Ponovna ocjena u F3–F8.
- F3 QC (3 kruga, prosjek 5,0; prag 8 nije dostignut; od kruga 2 "nadmašuje donju granicu: da"). Preostalo prema subagentu: (1) drvo — glava "glatka plastika", oči kao mjehurići, šake tamnije/porozne → kandidat i dalje pečena tekstura ptičjeg oka s mipmapama; (2) šaka i palica — dlan blok, prsti ne obuhvaćaju dršku u krupnom kadru, palica na 3/4 kadrovima zrnata; (3) zapešće i vrat čitaju se tamno umjesto svijetlog brušenog čelika; (4) snop bez jasne sjene lutke i ovala na podu u glavnom kadru, slaba kontaktna sjena; (5) aura/rub oko glave i šake (DOF/bloom); (6) pruge sjena na rukavima i leđima (PCSS na tkanini), šljokice; (7) kroj: revers bez debljine, rukavi kao cijevi, ovratnik; (8) poza stilla "ta-da", noge paralelne; (9) logika stilla (dirigent okrenut kameri — namjerno, kao kadar 10/Blender, ali QC traži 3/4 prema orkestru s podijem i pultom); (10) široki kadar slabo čita kazalište; (11) orkestar u istoj pozi, bijeli odsjaji na zglobovima; (12) šake pod toplim svjetlom djeluju zlatno.
- F4 QC (3 kruga, 4,8 / 5,2 / 5,3; tipografija 8). Preostalo: (1) drvo i metal u srednjem kadru (plastika/pozlata, zglobovi bez vidljive mehanike) — isti uteg kao F2/F3; (2) palica u kadrovima 8–9 slabo čitljiva; (3) skuti stepenasti, nazubljeni rubovi hlača; (4) mobitel: dirigent izlazi iz lijevog ruba (8–9), palica odrezana (7, 10); (5) kadrovi 6–10 bez tvrdog stošca, kruga na podu i jasne sjene; (6) orkestar: klonovi iste poze, instrumenti nečitljivi; (7) šake kao blokovi; (8) balet u 2: noge paralelne, bez relevéa, lutka tamna; (9) kadar 6 ukočen, horizont u struku; (10) kadar 8 "ruke uvis", glava u naklonu klizi kroz ovratnik; (11) "disappear." se čita kao "disappear:" (kurzivno r + točka).
- F5 QC (3 kruga, 4,8 / 4,5 / 5,3; tipografija 7). Preostalo: (1) drvo u srednjem kadru (vosak/plastika, "kapajuće" pruge na trupu); (2) révérence: uvjerljiviji duboki plié na obje noge, duga leđa, meke ruke; (3) port de bras s ravnim rukama; (4) na svijetloj pozornici konus kroz dim se slabo vidi (stara proba ga je imala jače); (5) ravno svjetlo u bliskim kadrovima; (6) stopala povremeno lebde u prijelazu, zrnat rub sjene; (7) zglobovi bez vidljive mehanike u srednjem kadru; (8) stepenasti rubovi šaka u širokom kadru; (9) palac i dlan; (10) gesta dira navigaciju u 01–02; (11) prijelom "Cameras / and sets did.", "labeled." sam u retku na mobitelu; (12) mala lutka u reelovima: okret se čita kao nagib glave.
- F6 QC (3 kruga, 4,8 / 5,0 / 5,7; zadani kriterij DA u sva tri). Preostalo: drvo bez jasnog ptičjeg oka u srednjem kadru, čelik bez jačeg anizotropnog odsjaja u sjeni, mehanika sata vidljiva samo u profilu, slaba kontaktna sjena, robotski prsti glatki.
- F7 QC (3 kruga, 5,0 / 5,3 / 5,3). Preostalo: drvo male lutke, révérence u podnožju, sjena male lutke preširoka, različiti počeci desnog stupca po sekcijama, mala lutka-I u logu navigacije čita se kao "f" na 12 px.
- F8 QC (3 kruga, 5,2 / 5,0 / 5,7). Preostalo: drvo, bilježnica i olovka kao jednostavni oblici (hvat prstiju), révérence s bilježnicom, sjena male lutke.
- F9 Lighthouse (mobilni, simulirani spori 4G + 4× CPU): LCP 3,5 s (`/`) i 3,1 s (`/start`) — cilj 2,5 s nije dostignut. LCP je H1 tekst nacrtan u prvom prikazu; ostatak vremena simulacija pripisuje fontovima (Bodoni normal + kurziv, Jost) i početnom JS-u (React, GSAP + Lenis). Prijedlog: GSAP/Lenis učitati dinamički nakon prvog prikaza, kurziv Bodonija bez preloada.
- Performanse (popravljeno 8. 10., nakon prijave "jako šteka"): na Retini (MacBook Air M5, 1470×830 @2, Chrome) 3D se crtao u punom DPR-u 2 (4,9 MP) i uvod je pri scrollu padao na **6,6 fps** — testovi su do tada mjerili samo DPR 1. Sada: proračun piksela po razini i sceni (uvod 1,15 MP, balet i "drvo / robot" 1,7×), brža dinamička rezolucija, shaderi prevedeni za stvarni cilj crtanja (ne za ekran) + jedan nevidljivi frame za sjene → **60 fps, 0 frameova > 25 ms** cijelom stranicom i pri brzom scrollu (`scripts/perf-scroll.mjs`). Ostaje jedan trzaj ~90 ms pri pokretanju 3D-a (prevođenje postprocessinga), prije prvog scrolla.

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
- [x] Baletna scena: kamera iznad → spušta se i odmiče → port de bras → révérence → lutka manja u krugu reflektora, svijetla pozadina s dimom (F5) — `?kruzenje=0|1`
- [~] Ispravljen révérence (dubok naklon, ne korak natrag) (F5) — plié, tendu straga, trup iz kukova; QC ga još čita kao "posrtaj"
- [x] Lutka bilježi: svih 8 stanja, mobitel, smanjeni pokret, pristupačnost, crtanje samo dok je forma vidljiva (F8)
- [x] Interakcija 1: namjesti pozu povlačenjem (F6)
- [x] Interakcija 2: poza po usluzi (F7)
- [x] Interakcija 3: okretanje s inercijom (F6)
- [x] Interakcija 4: lutka gleda reel (F5) — aktivni slot (miš/fokus, inače najbliži sredini)
- [x] Interakcija 5: révérence na dnu stranice (F7)
- [x] Kazališni uvod, kadrovi 1–6, titranje vezano za scroll i unatrag, skip, statična verzija, pravi tekst (F4)
- [x] Dirigent u smokingu, tri takta 4/4, kimanje na prvi udarac (F3, F4) — kostim F3; takt (IK, obje ruke) i kimanje u F4
- [x] Robotski orkestar, kadrovi 7–10 (F3, F4)
- [x] Mrak → svijetli ostatak stranice (F4)
- [x] Smoking dorađen: reveri, skut, gumbi; palica vidljiva (F3) — frak sa skutovima, 2×3 gumba, studovi, pojas; `?kroj=frak|smoking`
- [x] Drvo / robot ispod kursora, poravnato i u pokretu; mobitel prst i samostalno kretanje (F6)
- [x] Niz slika umjesto videa, `ScrollSequence`, skripta video → frameovi, rezolucija po uređaju (F9)
- [~] Ne šteka, izgleda kao 4K video (F9, §6) — 60 fps i na Retini (DPR 2), 0 frameova > 25 ms (perf-scroll), TBT 0; LCP 3,1–3,5 s; materijali ispod letvice
- [x] Format pokreta spreman za snimljeni pokret balerine (F2, README) — clip.ts + import-motion.mjs (README u završetku)

**10-lik**
- [~] Ptičje oko javor, brušeni čelik, mehanika sata na svim navedenim zglobovima, 5 prstiju s 3/2 zgloba (F2) — napravljeno; QC ocjenjuje drvo i mehaniku prstiju ispod praga
- [x] Struk A i B kao prekidač (F2)
- [x] Kostim, palica, ljubičasta samo na leptir-mašni i maramici (F3)
- [x] Roboti po [ROBOT], orkestar u pozadini i izvan fokusa (F3) — bez vrućih točaka (test `hotspots.spec.ts`)
- [x] Toplo svjetlo na dirigentu, hladno na orkestru (F3)
- [~] Provjera §4 prolazi na svakom screenshotu s likom (F2–F8) — sve osim "drvo je ptičje oko" u srednjim kadrovima

**05-logo i 04-ime**
- [x] Logo runda 3 geometrija, jednobojno, lutka kao I; varijante naglaska ART/ME kao prekidač (F1)
- [x] Animacija loga 1–2 s + statična verzija (F1)
- [x] Favicon iz lutke, SVG + PNG 32/180/512 (F1)
- [x] ART ME se pokazuje, nigdje se ne objašnjava; priča imena nije na stranici (F1, F4)

**03-nove-tvrdnje**
- [x] Nadnaslov, H1, manifest, svjetovi, otvaranje usluga, Why AI?, FAQ — točno iz navedenih odjeljaka, sa statusom (F1)
- [x] Nijedna zabranjena riječ iz §13 i ništa iz §14 (F1, završni test grepom)

**Brief §5 (pravila stranice)**
- [x] U prve 3 s jasno je što smo; navigacija s četiri linka i jednim CTA-om vidljiva od početka; nema "scroll for experience" (F0, F4)
- [x] Zasebna `/start` stranica u 3–4 koraka (F8)
- [x] Reelovi s filtrima Video / Web / AI tools, pravi omjeri, oznaka client / spec (F5)
- [x] FAQ (F7)
- [x] Tokeni u tri sloja, smanjeni pokret, mobitel, brzo učitavanje, efekt nikad ne usporava put do CTA-a (F1, F9)
- [x] 4K video nikad u repou (F9)

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
- F4: kazališni uvod na početnoj — jedan trajni canvas i redatelj (lijeno učitavanje, kompajliranje unaprijed, pauza), kadrovi 1–3 sami (CSS animacija slova od prvog prikaza, plesačica završava u pozi slova I iz loga, logo), 4–10 scrollom i unatrag (titranje ART ME, reflektor, priprema, redovi, tri takta 4/4 kroz IK, naklon), Skip intro, preskakanje scrollom, statična verzija, prijelaz u svijetlo. Testovi `intro.spec.ts` (desktop + mobitel). QC 4,8 / 5,2 / 5,3 → F4 zatvoren s popisom preostalih mana.
- F5: manifest preko baletne scene (scroll vodi kameru i port de bras → révérence → kraj u krugu svjetla; radi unatrag; sticky tekst manifesta), redatelj s više zona (uvod / balet / kursor) i kompajliranjem unaprijed, mala lutka u reelovima koja gleda aktivni slot (jedan mali canvas za sve male lutke), svjetovi; reelovi na mobitelu (masonry, container queries za oznake). Ptičje oko Worley 2×2×2 (23 → 54 fps u krupnom kadru). QC 4,8 / 4,5 / 5,3 → F5 zatvoren s popisom preostalih mana.
- F6: drvo / robot ispod kursora — dva prolaza iste poze u dva render targeta i kompozit kroz masku (prsten sa satnim oznakama, ne ispod zaglavlja), hi-tech čelik s razdjelnim linijama, port de bras u petlji, IK šake i okret s inercijom, mobitel (krug prati prst ili se sam kreće). Test mjeri čelik točno ispod kursora na glavi, ramenu i koljenu. QC 4,8 / 5,0 / 5,7.
- F7: poze po usluzi (iz smjerova udova), aktivni red usluga, globalno praćenje kursora glavom, CTA i podnožje s révérenceom na dnu; tipografija (apostrofi, kerning W, opsz za manje veličine, duljina retka, prijelom Why AI). QC 5,0 / 5,3 / 5,3.
- F8: /start — lutka bilježi (zaseban mali canvas, bilježnica i olovka, svih 8 stanja, prava sjena), mobilna vinjeta, smanjeni pokret, iskreni pregled bez endpointa; test kroz sva stanja. QC 5,2 / 5,0 / 5,7.
- F9: nizovi slika iz 3D-a (ples 24, uvod 96, balet 96 frameova; desk 1600×900, mob 720×1280; 5,6 MB), `ScrollSequence` s postupnim učitavanjem, izbor izvora (uživo / slike / posteri), `video-to-frames.mjs`, posteri (uvod, balet, drvo / robot, /start), lijeno učitavanje three.js (TBT 2,6–6,2 s → 0 ms), H1 kao jedan blok otkriven maskom (LCP u prvom prikazu), varijante loga na zahtjev (−100 KB JS-a), testovi pristupačnosti (tipkovnica, fokus, aria-hidden, ciljevi dodira ≥ 44 px), drvo: srednja skala ptičjeg oka i žile, révérence (demi-plié, ruke nisko otvorene), mobilni kadrovi uvoda (dirigent u kadru). Lighthouse 91/100/100 i 94/100/100.
- Odstupanje od vrata faze (§5): F6–F8 nisu commitane i objavljene svaka zasebno — temelji F6–F8 ušli su u commit F5, a dovršene F6–F8 objavljene su zajedno s F9 i završetkom u jednom commitu i jednom deployu (izmjene F9 diraju iste datoteke pa se naknadno ne mogu pošteno razdvojiti). Izvještaji i QC krugovi svake faze su zasebno u `qa/faza-6…8/`.
- Završetak: README (pokretanje, prekidači, Seedance videi, reelovi, endpoint forme, uvoz pokreta), REVIEW.md (kontrolna lista s mjestima, prekidači, stringovi koji čekaju odluku, poznati problemi, 12 screenshotova u `qa/review/`), LINK.txt.
- Konačni deploy (F6–F9 + završetak, commit 2da20ff): `npm run deploy` → gh-pages, live 200.
- **Štekanje (prijava 8. 10.):** izmjereno `scripts/perf-scroll.mjs` (pravi Chromium s GPU-om, 1470×830 @2, scroll kotačićem kroz Lenis): uvod **6,6 fps**, 771 frame > 50 ms. Uzroci: (1) platno u punom DPR-u 2 (4,9 MP) — dinamička rezolucija reagirala presporo (90 frameova zagrijavanja, korak 0,2 svakih 1,5 s); (2) `compileAsync` je prevodio shadere za ekran (sRGB), a scena crta u spremnik composera (linearno) → svi programi su se prevodili iznova pri prvom crtanju (9–30 shadera, 60–400 ms trzaja); (3) sjene, kontaktne sjene i teksture prvi put tek usred scrolla; (4) mala lutka prevodila shadere sinkrono (~70 ms). Popravci: proračun piksela (`PIXEL_BUDGET` × `pixelScale` scene), brza dinamička rezolucija s granicom po sceni, AO pola rezolucije i MSAA po osnovnom DPR-u (bez prevođenja pri promjeni), prevođenje za stvarni cilj + nevidljivi frame (sve vidljivo, bez odsijecanja), `compileAsync` u malim lutkama. Poslije: **60 fps, p95 16,8 ms, 0 frameova > 25 ms**, i pri brzom scrollu na 1470×956. `/start` 60 fps. Mjerni parametar `?dpr=` (stalni DPR) za usporedbe.
- Dodatno uz štekanje: u mirovanju (~0,5 s bez unosa) 3D i male lutke crtaju 30 fps umjesto 60 (isti pokret, upola manje GPU-a; izmjereno: vrh, orkestar i balet 30 fps mirno, puni ritam pri scrollu i dok pleše plesačica); mala lutka srednje gustoće mreže, pokretanje u tri koraka (kontekst 24–35 ms, lutka ~22 ms, shaderi ~12 ms; prvo crtanje 26–36 → 6–10 ms) umjesto jednog od ~150 ms; ispitne rute `/lab` bez proračuna piksela (puna rezolucija za pregled materijala). Testovi: dev 130 prolazi, prod 130 prolazi (prije zadnja dva koraka). Napomena o mjerenju: dok je u Chromeu otvorena druga kartica s 3D-om, dijeli GPU — brojke tada padnu (uvod ~37 fps u mjernom pregledniku); čisto mjerenje je bez drugih 3D kartica.
