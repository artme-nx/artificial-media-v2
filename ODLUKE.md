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
