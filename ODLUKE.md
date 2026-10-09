# ODLUKE — što sam odlučio sam, zašto i kako se mijenja

Pravilo (11 §0.2): kad odluka nedostaje, biram najrazumniju opciju, zapisujem je ovdje i nastavljam. Sve označeno `[ODLUKA KRISTIANA]`, `[TREBA POTVRDU]` ili `[PRETPOSTAVKA]` je prekidač u `config/switches.ts` (ili token / `?parametar`).

## Tehnika

| # | Odluka | Zašto | Kako se mijenja |
|---|---|---|---|
| T1 | **Čisti three.js u React omotaču** (ne R3F) | Jedan trajni canvas s ručnom petljom: crtanje samo kad treba, više prolaza po frameu (drvo + robot za F6), vlastiti lanac postprocessinga, maske i razine kvalitete. R3F bi dodao reconciler i otežao ručni multi-pass i render-on-demand. Tehnike iz head-tracking-3d (volumetrija, PCSS, N8AO) su vanilla three.js pa se izravno prenose. | `src/three/` je izoliran; React samo montira canvas i šalje stanje sekcija. |
| T2 | Next.js 16.2.10, React 19.2.4, three 0.186.1, postprocessing 6.39.5, n8ao 2.0.1, GSAP 3.15, Lenis 1.3 | Iste verzije kao provjereni projekti na ovom računalu (test-premium, head-tracking-3d). | `package.json` |
| T3 | `trailingSlash: true` u `next.config.ts` | GitHub Pages pouzdano poslužuje `/start/index.html`. | `next.config.ts` |
| T4 | Generator tokena je vlastiti `scripts/build-tokens.mjs` (isti JSON oblik kao skill `design-system`) | Skillov generator razrješava reference u konačne vrijednosti i stavlja tamni način pod `.dark`; ovdje semantički sloj mora ostati `var()` referenca na primitive kako bi se pozornica mijenjala jednim atributom `data-stage="dark\|light"` (uvod je taman, ostatak svijetao). | `design/tokens.json` |
| T5 | Repo `artificial-media-v2` | Ime iz 07-web-ideje; na GitHubu nije postojao (provjereno `gh repo view`, 8. 10.). | — |

## 3D, svjetlo, pokret (F2–F3)

| # | Odluka | Zašto | Kako se mijenja |
|---|---|---|---|
| R1 | Tonsko mapiranje **ACES Filmic** (ne AgX) | AgX je u testu isprao zlatni ton javora prema sivom; ACES drži med i dubinu crnih (letvica §2 dopušta oba). | `PostConfig.tone` u `src/three/core/post.ts` |
| R2 | Scenske poze (kontrapost, en haut, dirigent u radu, "seže") su dodatak kanonu u `src/motion/poses-extra.json`; kanonskih 7 + dirigent ostaju nepromijenjeni | Kanon (lutka-core) je izvor istine za logo; scena treba mekše i čitljivije geste. | `src/motion/poses-extra.json` |
| R3 | Šaka 1,35× kanonske | Kanonska šaka je u krupnom kadru premala za 5 prstiju s čeličnim zglobovima (kanon ima šaku u jednom komadu). | `HAND_SCALE` u `src/three/figure/hands.ts` |
| R4 | Dinamička rezolucija (DPR prema vremenu framea) prije pada razine kvalitete | Cilj 60 fps na M5 u `high` (§2); bolje oštrija scena s nižim DPR-om nego gubitak volumetrije i AO-a. | `src/three/core/engine.ts` |
| R5 | Instrumenti orkestra: crni lak + čelik, **bez drva i mesinga** | 10-lik [IZBJEGAVAJ]: bez zlata/mesinga; drvo pripada samo lutki (da se ne miješa s javorom). | `src/three/scenes/orchestra.ts` |
| R6 | Zavjesa gotovo crna (baršun), bez ljubičaste | Ljubičasta samo na leptir-mašni i maramici (10-lik §4); Blender probe su imale ljubičastu zavjesu. | `velvetMaterial()` u `theatre.ts` |
| R7 | Tungsten reflektor `#ffd5aa` (≈3200 K uz djelomični balans bijele prema tungstenu, kao na filmu) | S punim dnevnim balansom (`#ffc58c`) drvo je izgledalo narančasto, a bijela palica kao drvena; ovako je toplo, javor ostaje blijedo medeni, palica bijela. | `TUNGSTEN` u `src/three/scenes/theatre.ts` |
| R8 | Anizotropija čelika isključena na prstima, dlanovima i prstenovima struka B | Na sitnim zakrivljenim dijelovima anizotropni odsjaj stvara vruće točke koje izgledaju kao LED (10-lik: bez svjetla); brušenje ostaje kao varijacija hrapavosti. Veliki dijelovi robota zadržavaju anizotropiju. | `materialsFor()` (`fingers`) i struk B u `figure.ts` |
| R9 | Glavni still F3: dirigent okrenut prema kameri, orkestar iza njega izvan fokusa (50 mm, f/2) | Tako ga opisuje 10-lik [SCENA] ("orchestra behind him") i tako završava uvod (kadar 10); u kadrovima 7–9 kamera je iza/uz dirigenta okrenutog orkestru. | `STAGE_CAMS` u `stage-lab-scene.ts` |
| R10 | Maramica: ravni "predsjednički" preklop (tanka svilena traka) | Suzdržano i premium; trokutasti "kruna" preklop je u realtimeu izgledao kao šiljci. | `costume.ts` |
| R11 | Ispitne rute `/lab/lutka`, `/lab/scena`, `/lab/uvod` (noindex, izvan navigacije) | Kontrola kvalitete i Playwright snimaju točno zadane kadrove; posjetitelj ih ne vidi. | `app/(pages)/lab/` |
| R12 | Kostim je **frak** (skuti straga, rez u struku), prekidač `?kroj=frak\|smoking` | 11 F3 traži "skut" (kontrola kvalitete čita ga kao skute fraka); frak je klasika dirigenta i s leđa (kadrovi 7–9 uvoda) odmah se čita. 10-lik [SMOKING] doslovno kaže "tuxedo" — zato je smoking (sako do bokova) jedan parametar dalje. [PRETPOSTAVKA] | `DEFAULTS.cut` u `config/switches.ts` |
| R13 | Jednobojno filmsko zrno (vlastiti efekt) umjesto `NoiseEffect` | RGB šum je u kontroli kvalitete izgledao "grubo i u boji"; zrno je jače u srednjim tonovima, crna ostaje crna. | `src/three/core/grain.ts` |
| R14 | Svjetla se gase jačinom 0, ne preko `visible` | Promjena broja svjetala u three.js rekompajlira sve materijale (zastoj usred scrolla); sjena ugašenog svjetla se ne crta. | `Theatre.applyLevels()` |
| R15 | Test vrućih točaka (`tests/hotspots.spec.ts`) | Pravilo 10-lik "bez svjetla/LED-ica": male zasićene mrlje s tamnom okolinom padaju test (krupni kadrovi metala su izuzeti — tamo je širok odsjaj ispravan). | `tests/hotspots.spec.ts` |
| R16 | Koreografija uvoda: nastup → priprema (ruke gore) → tišina → takt 4/4 s obje ruke → naklon; kamera po kadru (3/4 odozgo u 6, iza u 7, široko preko ramena u 8, sa strane u 9, 3/4 sprijeda u 10) | Kontrola kvalitete: kadrovi 7–9 su se stapali, naklon sprijeda se nije čitao. | `src/three/scenes/intro-scene.ts` (`CAM`, `conductorPose`) |
| R17 | Kadar 2: plesačica završava u pozi slova I iz loga; desktop urednički (lutka desno, tekst lijevo), mobitel okomito (tekst gore) | Kadar 3 je ista lutka u logu — rima kadrova; tekst nikad preko tijela ni lokve svjetla. | `intro-scene.ts`, `components.css` |
| R18 | Animacija slova H1 je čisti CSS (inline slova, ne inline-block) + `aria-label` na H1; ručni kerning "Wh" | H1 vidljiv u prvoj sekundi bez JS-a; inline-block gubi kerning; display rez Bodonija ima širok W. | `components/sections/intro.tsx` |
| R19 | Izjave na Bodoniju s `opsz` 36 | Automatski optički rez pri 80–100 px (opsz 96) ima crte koje na ekranu nestaju. | `.statement` u `app/components.css` |
| R20 | MSAA 4 pri DPR ≤ 1,05 (inače 2, iznad 1,3 nijedan) | Pri DPR 1 stepenasti rubovi su najvidljiviji; izmjereno i dalje 54–60 fps. | `Post.setSize()` |
| R21 | Baletna scena (manifest): svijetla topla siva pozornica, protusvjetlo i dva visoka snopa kroz dim (raspršenje pojačano samo u dimu), gornji reflektor se pali na kraju (krug svjetla); kamera u cilindričnim koordinatama oko lutke, kruženje 46° (`?kruzenje=0` = fiksni 3/4 kut) | 07 (6. 10.): "pozadina svijetla, s maglom; svjetlo reflektora kroz dim; na kraju lutka manja u krugu svjetla". Na bijeloj pozadini snop se ne vidi — zato topla siva i jače raspršenje samo u dimu. | `src/three/scenes/ballet-scene.ts` |
| R22 | Révérence kao baletni naklon: dubok plié, stražnja noga iza na prstima, trup gotovo uspravan, glava se nakloni, ruka se otvara prema publici; kamera 3/4 malo odozgo | Proba 1: "izgleda kao korak natrag"; prvi pokušaj s dubokim pregibom trupa izgledao je kao posrtanje. | `b_reverence_duboka` u `poses-extra.json` |
| R23 | Male lutke u sekcijama (reelovi; F7 usluge, CTA, podnožje) dijele **jedan mali prozirni canvas** koji se seli u sidro sekcije na ekranu | Glavni canvas je preko cijelog ekrana iza sadržaja s postprocessingom (pozadina ne bi odgovarala stranici); drugi mali kontekst bez postprocessinga je jeftin i kroji se uz sadržaj. | `components/stage/doll-stage.tsx`, `src/three/doll/doll-view.ts` |
| R24 | Sekcije bez 3D scene imaju neprozirnu pozadinu | Sljedeća sekcija pri scrollu "pokrije" scenu umjesto da scena prosijava kroz nju. | `main > section:not([data-scene])` u `components.css` |
| R25 | Aktivni reel = pod mišem/fokusom, inače najbliži sredini ekrana | Radova još nema; "video koji se pušta" (07) je aktivni slot. Kad stignu videi, aktivan je onaj koji svira. | `components/sections/reels.tsx` |
| R26 | Ptičje oko: Worley u 2×2×2 ćelije + preskakanje kad su oči manje od piksela | Krupni kadar lutke preko cijelog ekrana: 23 → 54 fps na M5, bez vidljive razlike. | `src/three/materials/maple.ts` |
| R27 | Drvo / robot: dva render targeta (MSAA, HalfFloat) i vlastiti kompozit s maskom, tonom (ACES), zrnom i vinjetom — bez lanca postprocessinga | Ista poza i isti kostur u istom frameu → u piksel poravnato; bez AO/volumetrije 60 fps i na mobitelu. | `src/three/scenes/cursor-scene.ts` |
| R28 | Hi-tech robot: razdjelne linije su u shaderu (analitički AA), ne u geometriji; šav glave straga | Precizne tanke linije bez šuma; šav sprijeda u visini "očiju" čitao se kao vizir (10-lik: bez lica). | `hiTechSteel()` u `steel.ts` |
| R29 | U petlji "drvo / robot" noge stoje mirno, ruke rade port de bras | Podignuto stopalo pokazivalo je donju plohu kao svijetlu mrlju. | `CursorScene.basePose()` |
| R30 | /start: lutka s bilježnicom u zasebnom malom canvasu; stranice okrenute lutki (sadržaj se nikad ne vidi), prava meka sjena na prozirnom podu | 07: "sadržaj bilježnice se nikad ne vidi"; forma radi i bez lutke. | `src/three/doll/notebook-view.ts` |
| R31 | Izvor scena (`?izvor=auto`): uživo na desktopima razine high/medium; nizovi slika na mobitelu (dodir, < 820 px), softverskom GPU-u i `?q=low`; bez WebGL2 → nizovi (2D canvas) + poster za "drvo / robot"; smanjeni pokret → posteri | 11 §3: realtime na jakim desktopima, frames na mobitelu i slabim. Nizovi rade i bez WebGL-a. | `components/stage/stage-canvas.tsx` |
| R32 | Nizovi: uvod (kadrovi 6–10) 96 frameova, balet 96, ples (kadar 2) 24; WebP; 1600 × 900 i 720 × 1280; render 2× supersampling | Gladak scroll uz malu težinu (ukupno vidi PROGRESS); mobitel učitava postupno (svaki osmi, pa gušće). | `scripts/render-sequences.mjs` |
| R33 | Male lutke u uslugama i CTA-u na mobitelu nisu prikazane | Dekoracija; na uskom ekranu prostor ide sadržaju (lutka u reelovima i podnožju ostaje). | `services.tsx`, `cta.tsx` |
| R34 | Apostrofi u copyju su tipografski (’) | Ravni apostrof u Bodoniju izgleda kao greška (kontrola kvalitete); tekst je isti. | `content/site.ts`, `content/ui.ts` |
| R35 | Kerning slova W u display fontu (span `.kw`) | "We", "Wh", "Wo" u Bodoniju na velikim veličinama čitali su se kao dvije riječi; `textContent` ostaje isti. | `components/t.tsx` |
| R36 | three.js se ne učitava pri pokretanju: male lutke kad se sidro približi, lutka na /start na prvu interakciju ili nakon 4 s (do tada poster iste poze), u načinu "frames" 3D tek blizu sekcije "drvo / robot" | Lighthouse mobilni: TBT 2,6–6,2 s → 0 ms; "efekt nikad ne usporava put do CTA-a" (brief §5). | `doll-stage.tsx`, `notebook-stage.tsx`, `stage-canvas.tsx` |
| R37 | H1 kadra 1 je jedan tekstni blok otkriven mekom maskom (slijeva nadesno) + izoštravanjem, umjesto animacije slovo po slovo iz neprozirnosti 0 | LCP je H1 nacrtan u prvom prikazu (prije je LCP bio drugi dio naslova u 2,5. sekundi); izgled ostaje "filmsko otkrivanje". | `components.css` (`intro-reveal`), `intro.tsx` |
| R38 | Tri dodatne varijante naglaska loga učitavaju se samo kad ih `?logo=` zatraži | −100 KB početnog JS-a. | `components/logo.tsx`, `src/brand/logo-default.json` |
| R39 | Lokalni `serve-out` šalje gzip (kao GitHub Pages) | Lokalni Lighthouse inače mjeri nekomprimirane veličine i podcjenjuje stranicu. | `scripts/serve-out.mjs` |
| R40 | 3D se ne crta u punom DPR-u zaslona nego po proračunu piksela: razina high 1,15 MP × `pixelScale` scene (uvod 1, balet i "drvo / robot" 1,7); preglednik platno poveća. Dinamička rezolucija reagira u ~0,3 s (8 od 20 frameova sporije od 45 fps), pamti granicu po sceni i ne mijenja AO/MSAA usred scrolla. Ispitne rute `/lab` ostaju bez proračuna (puna rezolucija zaslona za pregled materijala izbliza) | Na Retini (DPR 2) puna rezolucija je 4,9 MP i uvod je pri scrollu išao 6,6 fps; s proračunom 60 fps bez ijednog framea > 25 ms. Uvod je taman, s dimom i dubinom polja (niža rezolucija se ne vidi); balet i "drvo / robot" su lakši i imaju krupne kadrove drva pa dobiju više piksela. | `src/three/core/engine.ts`, `post.ts`, scene (`pixelScale`), `scripts/perf-scroll.mjs` |
| R41 | Shaderi se unaprijed prevode za stvarni cilj crtanja (ulazni spremnik composera, odnosno spremnici "drvo / robot"), a nakon toga jedan nevidljivi frame svake scene u mali spremnik (svi objekti vidljivi, bez odsijecanja) | Prevođenje za ekran davalo je drukčije programe (sRGB izlaz) pa se sve prevodilo iznova usred scrolla; sjene, kontaktne sjene i teksture inače se pripremaju tek pri prvom pojavljivanju lika. | `src/three/director.ts` |
| R42 | U mirovanju (bez scrolla, pokazivača i tipkanja ~0,5 s) 3D i male lutke crtaju svaki drugi frame (30 fps); puni ritam pri svakom unosu, dok pleše plesačica (kadar 2) i dok traje koreografija male lutke. Mala lutka ima srednju gustoću mreže i pokreće se u tri kratka koraka (kontekst, lutka, shaderi) | Disanje i orkestar u 30 fps izgledaju isto, a GPU radi upola manje dok se čita (MacBook Air nema ventilator; druge kartice dijele isti GPU). Pokretanje male lutke bilo je jedan zadatak od ~150 ms usred scrolla prema reelovima. | `lib/calm.ts`, `engine.ts`, `doll-view.ts`, `notebook-view.ts`, `doll-stage.tsx`, `figure.ts` (`detail: "mid"`) |

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
