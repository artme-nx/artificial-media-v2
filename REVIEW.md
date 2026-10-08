# REVIEW — Artificial Media v2 (probna stranica)

**Live:** https://artme-nx.github.io/artificial-media-v2/
**Repo:** https://github.com/artme-nx/artificial-media-v2 · Zadatak: `brand/11-stranica-v2-zadatak.md` · Odluke: `ODLUKE.md` · Dnevnik i preostale mane: `PROGRESS.md`

Kako gledati:
- **Desktop** (Chrome/Safari, jači Mac): uvod i baletna scena su 3D uživo. **Mobitel**: uvod i balet su unaprijed renderirani nizovi slika (scroll ih pomiče naprijed-natrag), "drvo / robot" je uživo.
- `?status=1` na kraju adrese obrubi svaki tekst njegovim statusom (approved / proposal / needs-confirmation / placeholder) i izvorom.
- Uključi "smanjeni pokret" u sustavu: stranica je statična (cijeli H1, logo, posteri umjesto 3D-a).
- Ispitne rute (nisu u navigaciji, noindex): `/lab/lutka`, `/lab/scena`, `/lab/uvod`, `/lab/balet`, `/lab/kursor`.

## 1. Kontrolna lista (11 §7)

Oznake: **gotovo** · **djelomično** · **nije**. Uz svaku stavku: gdje se vidi.

**07-web-ideje**

| Stavka | Stanje | Gdje se vidi |
|---|---|---|
| Baletna scena: kamera iznad → spušta se i odmiče → port de bras → révérence → lutka manja u krugu reflektora, svijetla pozadina s dimom | **gotovo** | Početna, sekcija ispod uvoda (manifest): scroll vodi scenu i radi unatrag; `/lab/balet?p=0..1`; kruženje kamere `?kruzenje=0|1` |
| Ispravljen révérence (dubok naklon, ne korak natrag) | **djelomično** | Manifest pri kraju; podnožje (mala lutka); /start nakon slanja. Više nije "korak natrag" (plié, stražnja noga iza na prstima, trup iz kukova, glava se pokloni zadnja), ali kontrola kvalitete ga još čita kao nedovoljno dubok/gracilan |
| Lutka bilježi: svih 8 stanja, mobitel, smanjeni pokret, pristupačnost, crtanje samo dok je forma vidljiva | **gotovo** | `/start`: Čeka, Pažnja, Piše (olovka se pomakne na svaki znak), Razmišlja (> 1,5 s), Novo polje (okretanje lista), Greška, Poslano (zatvori bilježnicu + révérence + iskrena poruka), Odlazak. Mobitel: mala vinjeta gore. Lutka `aria-hidden`, forma radi i bez nje; crta se samo dok je vidljiva |
| Interakcija 1: namjesti pozu povlačenjem | **gotovo** | Sekcija "drvo / robot": povuci šaku (IK, tijelo prati, pušteno se vraća) |
| Interakcija 2: poza po usluzi | **gotovo** | Usluge (desktop): prijeđi mišem preko usluge — mala lutka predstavlja / uokviri kadar / kontrapost / posegne |
| Interakcija 3: okretanje s inercijom | **gotovo** | Sekcija "drvo / robot": povuci prazan prostor vodoravno |
| Interakcija 4: lutka gleda reel | **gotovo** | Reelovi: mala lutka u zaglavlju okreće tijelo i glavu prema aktivnom slotu (miš/fokus, inače najbliži sredini) |
| Interakcija 5: révérence na dnu stranice | **gotovo** | Scroll do samog dna: mala lutka u podnožju se nakloni |
| Kazališni uvod, kadrovi 1–6, titranje vezano za scroll i unatrag, skip, statična verzija, pravi tekst | **gotovo** | Vrh početne; "Skip intro" dolje desno; H1 je u DOM-u jedna rečenica |
| Dirigent u smokingu, tri takta 4/4, kimanje na prvi udarac | **gotovo** | Uvod, kadar 9 (palica crta dolje–unutra–van–gore, kimanje na 1); kostim je zadano frak (`?kroj=smoking` za sako) |
| Robotski orkestar, kadrovi 7–10 | **gotovo** | Uvod, kadrovi 7–10 (redovi se pale jedan za drugim, sviranje, spuštanje, naklon) |
| Mrak → svijetli ostatak stranice | **gotovo** | Kraj uvoda (`?svjetlo=0` isključuje) |
| Smoking dorađen: reveri, skut, gumbi; palica vidljiva | **gotovo** | Uvod 6–10, `/lab/scena?cam=detalj` (špicasti satenski reveri, skuti, 2×3 gumba, studovi, pojas, leptir-mašna, maramica) |
| Drvo / robot ispod kursora, poravnato i u pokretu; mobitel prst i samostalno kretanje | **gotovo** | Sekcija ispod "We build worlds."; test mjeri čelik točno ispod kursora na glavi, ramenu i koljenu; mobitel `?krug=` |
| Niz slika umjesto videa, `ScrollSequence`, skripta video → frameovi, rezolucija po uređaju | **gotovo** | Mobitel (ili `?izvor=frames` na desktopu); `scripts/video-to-frames.mjs`, `scripts/render-sequences.mjs`; desk 1600×900, mob 720×1280 |
| Ne šteka, izgleda kao 4K video | **djelomično** | Desktop M5: uvod 54–60 fps, manifest 60, "drvo / robot" 60, bez dugih zadataka tijekom scrolla; Lighthouse mobilni: Performance 91 (`/`) i 94 (`/start`), TBT 0 ms, CLS ≈ 0, ali LCP 3,1–3,5 s (cilj 2,5 s). Kontrola kvalitete: materijali još ne izgledaju kao 4K video |
| Format pokreta spreman za snimljeni pokret balerine | **gotovo** | `scripts/import-motion.mjs` + `src/motion/clip.ts` (README) |

**10-lik**

| Stavka | Stanje | Gdje se vidi |
|---|---|---|
| Ptičje oko javor, brušeni čelik, mehanika sata na svim navedenim zglobovima, 5 prstiju s 3/2 zgloba | **djelomično** | `/lab/lutka?cam=blizu|zglob|sake`. Mehanika, prsti i čelik su modelirani; ptičje oko se u krupnom kadru vidi, ali kontrola kvalitete u srednjem kadru drvo i dalje čita kao "plastiku" — najveća preostala mana |
| Struk A i B kao prekidač | **gotovo** | `?struk=B` (i `/lab/lutka?struk=B`) |
| Kostim, palica, ljubičasta samo na leptir-mašni i maramici | **gotovo** | Uvod 6–10; test "vruće točke" i kontrola kvalitete potvrdili |
| Roboti po [ROBOT], orkestar u pozadini i izvan fokusa | **gotovo** | Uvod 8–10, `/lab/scena` |
| Toplo svjetlo na dirigentu, hladno na orkestru | **gotovo** | Uvod 8–10 |
| Provjera §4 prolazi na svakom screenshotu s likom | **djelomično** | Glava, metal, prsti, čelik bez zlata, roboti, ljubičasta: prolaze; "drvo je ptičje oko" kontrola kvalitete nije potvrdila u srednjim kadrovima |

**05-logo i 04-ime**

| Stavka | Stanje | Gdje se vidi |
|---|---|---|
| Logo runda 3 geometrija, jednobojno, lutka kao I; varijante naglaska ART/ME kao prekidač | **gotovo** | Navigacija, uvod (kadar 3), podnožje; `?logo=tonski|sjena|podebljano-tonski` |
| Animacija loga 1–2 s + statična verzija | **gotovo** | Uvod kadar 3 i podnožje (lutka-I se namjesti dok slova dođu); smanjeni pokret: statično |
| Favicon iz lutke, SVG + PNG 32/180/512 | **gotovo** | Kartica preglednika; `public/favicon.svg`, `icon-32.png`, `apple-touch-icon.png`, `icon-512.png` |
| ART ME se pokazuje, nigdje se ne objašnjava; priča imena nije na stranici | **gotovo** | Uvod kadrovi 4–5 (titranje: ostane ART ME, pa se ugasi) |

**03-nove-tvrdnje**

| Stavka | Stanje | Gdje se vidi |
|---|---|---|
| Nadnaslov, H1, manifest, svjetovi, otvaranje usluga, Why AI?, FAQ — točno iz navedenih odjeljaka, sa statusom | **gotovo** | Cijela stranica; `?status=1`; popis ispod |
| Nijedna zabranjena riječ iz §13 i ništa iz §14 | **gotovo** | Test `smoke.spec.ts` / `content.spec.ts` (grep nad stranicom i `content/site.ts`) |

**Brief §5 (pravila stranice)**

| Stavka | Stanje | Gdje se vidi |
|---|---|---|
| U prve 3 s jasno je što smo; navigacija s četiri linka i jednim CTA-om vidljiva od početka; nema "scroll for experience" | **gotovo** | Prvi ekran: nadnaslov "AI production studio", H1 u prvoj sekundi (test), navigacija + "Brief us" cijelo vrijeme |
| Zasebna `/start` stranica u 3–4 koraka | **gotovo** | `/start` (4 koraka) |
| Reelovi s filtrima Video / Web / AI tools, pravi omjeri, oznaka client / spec | **gotovo** | Sekcija "Reels" (prazni slotovi su `placeholder`, nikad izmišljen rad; spremno za Bunny/Cloudflare) |
| FAQ | **gotovo** | Sekcija FAQ (accordion, tipkovnica) |
| Tokeni u tri sloja, smanjeni pokret, mobitel, brzo učitavanje, efekt nikad ne usporava put do CTA-a | **gotovo** | `design/tokens.json` → `app/tokens.css`; 3D se učitava tek nakon prvog prikaza; Lighthouse u `PROGRESS.md` |
| 4K video nikad u repou | **gotovo** | U repou su samo smanjeni WebP frameovi (`public/seq`) i posteri |

## 2. Prekidači i zadane vrijednosti

Zadano je u `config/switches.ts` (jedan redak po prekidaču); za probu bez promjene koda dodaje se parametar u adresu.

| Prekidač | Zadano | Ostale vrijednosti | Oznaka u dokumentima |
|---|---|---|---|
| `?logo=` naglasak ART/ME | **podebljano** (jedina jednobojna) | tonski · sjena · podebljano-tonski | [ODLUKA KRISTIANA] |
| `?struk=` struk lutke | **A** (kuglasti zglob) | B (stup s tri prstena) | [ODLUKA KRISTIANA] |
| `?kroj=` kostim dirigenta | **frak** (skuti) | smoking (sako do bokova) | [PRETPOSTAVKA] (10-lik "tuxedo", 11 F3 "skut") |
| `?svjetlo=` mrak → svijetli dio | **1** (da) | 0 | [ODLUKA KRISTIANA] |
| `?kruzenje=` kamera baleta kruži | **1** (da) | 0 | [PRETPOSTAVKA] / [TREBA POTVRDU] |
| `?autouvod=` kadrovi 1–3 sami | **1** (da) | 0 | [PRETPOSTAVKA] |
| `?krug=` mobitel, drvo / robot | **oboje** | prst · samo | [ODLUKA KRISTIANA] |
| `?prsten=` satni prsten na maski | **1** | 0 | 11 F6 ("ako izgleda jeftino, samo mek rub") |
| `?q=` kvaliteta 3D-a | **auto** | high · medium · low | 11 §3 |
| `?izvor=` uvod i balet | **auto** (uživo na jakim desktopima, slike na mobitelu i slabim) | realtime · frames | 11 §3 |
| Endpoint forme `NEXT_PUBLIC_FORM_ENDPOINT` | **prazno** (forma iskreno kaže da je pregled) | URL Formspree / Web3Forms… | [ODLUKA KRISTIANA] |
| Boja palice `BATON_COLOR` | **#E6E1D6** (tanka bijela) | — | [PRIJEDLOG] 10-lik |
| Ljubičasta `primitive.color.violet` | **#5B2A86** (mašna, maramica, fokus, rijetki naglasci) | — | [TREBA POTVRDU] nijansa |

## 3. Tekstovi koji čekaju odluku (iz `content/site.ts`)

Svaki tekst na stranici ima izvor i status. Ispod su svi koji **nisu** `approved`.

### `needs-confirmation` (treba potvrdu) — 5

| Gdje (ključ u `content/site.ts`) | Tekst | Izvor | Napomena |
|---|---|---|---|
| `services.items[2].body` | One face for your brand, built once and directed in every campaign. | 03 §8 U3 | Lik Sofia kao dokaz [TREBA POTVRDU javno]. |
| `faq.items[1].a` | Watch the reel and judge for yourself. Where the law requires AI content to be labeled, we label it. | 03 §32 F2 (dorada) | Pitanje 8, pravnik (čl. 50 AI Acta). |
| `faq.items[2].a` | Your product is the one thing we never reinvent. We build every world around your real product, from your p… | 03 §30 F3 | Što klijent šalje [TREBA POTVRDU]. |
| `faq.items[4].a` | Kristian Vajda directs every project, from the first idea to the final cut. | 03 §30 F5 | Vrijedi li za svaki projekt [TREBA POTVRDU]. |
| `faq.items[5].a` | A short brief, your product and your brand guidelines, if you have them. | 03 §30 F6 | Kristianov popis [TREBA POTVRDU]. |

### `placeholder` (prazni slotovi, vidljivo označeni) — 5

| Gdje (ključ u `content/site.ts`) | Tekst | Izvor | Napomena |
|---|---|---|---|
| `reels.empty` | Reel slot | brief §4 pitanje 5 (koji radovi smiju biti javni) — radova još nema | Prazni slotovi; nikad izmišljeni rad. Vidi content/reels.ts. |
| `services.items[0].body` | Description to come. | 03 §8 U1 — opis nosi stvarno snimanje, odbačeno u §16 | Opis čeka Kristiana. |
| `services.items[3].body` | Description to come. | 03 §8 U4 — brief §4 pitanje 6 (što su alati i za koga) |  |
| `footer.address` | Registered address | 11 §4 red 11 | [TREBA POTVRDU Northwest] — adresa registriranog agenta (Wyoming). |
| `footer.impressum` | Legal notice | 11 §4 red 11 | [TREBA POTVRDU Northwest] — impressum za LLC, bez d.o.o. i OIB-a (01 G4). |

### `proposal` (prijedlog iz dokumenata, nije odlučen) — 49

| Gdje (ključ u `content/site.ts`) | Tekst | Izvor | Napomena |
|---|---|---|---|
| `nav.links[0].label` | Work | 11 §4 red 0; brief §5 (četiri linka, jedan CTA) |  |
| `nav.links[1].label` | Services | 11 §4 red 0 |  |
| `nav.links[2].label` | Why AI? | 11 §4 red 0; 03 §33 (naslov sekcije) | 03 §33: pretpostavka o Droppableovoj sekciji [TREBA POTVRDU] |
| `nav.links[3].label` | FAQ | 11 §4 red 0; 03 §31 |  |
| `nav.cta` | Brief us | 03 §5 C1 (★ primarni); 03 §23, §31: tekst CTA gumba još nije odlučen |  |
| `reels.label` | Reels | 03 §26 (reelovi odmah ispod manifesta) | Naslov sekcije; 03 R1 'The work carries the argument.' je kandidat, nije odluka. |
| `reels.note` | Client work and spec work, always labeled. | 03 §7 R3 (★ oznaka uz filtre) |  |
| `reels.filters[0].label` | All | UI |  |
| `reels.filters[1].label` | Video | brief §5 (filtri Video / Web / AI alati) |  |
| `reels.filters[2].label` | Web | brief §5 |  |
| `reels.filters[3].label` | AI tools | brief §5; 11 §4 red 4 |  |
| `services.items[0].name` | Ads & Product Films | 03 §8 U1 (naziv) |  |
| `services.items[1].name` | Websites | 03 §8 U2 (naziv) |  |
| `services.items[2].name` | AI Brand Characters | 03 §8 U3 (naziv) |  |
| `services.items[3].name` | AI Tools for Business | 03 §8 U4 (naziv); brief §1 |  |
| `whyAi.heading` | Why AI? | 03 §33 |  |
| `whyAi.lead` | Not to make it cheaper. To make it possible. | 03 §33 WA1 (★) |  |
| `whyAi.rows[0].label` | Possible | 03 §33 |  |
| `whyAi.rows[0].text` | Any place, any light, any season, built around your product. | 03 §33 (svjetovi oko proizvoda) |  |
| `whyAi.rows[1].label` | Fixed | 03 §33 |  |
| `whyAi.rows[1].text` | A fixed quote and a fixed deadline before any work starts. | 03 §33; §16 (potvrđena obećanja) |  |
| `whyAi.rows[2].label` | Human | 03 §33 |  |
| `whyAi.rows[2].text` | The idea, the direction and the final cut stay human. | 03 §33 |  |
| `cta.line` | Tell us what you’re selling. | 03 §10 B1 bez broja (11 §4 red 12) |  |
| `cta.button` | Brief us | 03 §5 C1 |  |
| `faq.heading` | FAQ | 03 §30, §31 |  |
| `faq.items[0].q` | Is everything made with AI? | 03 §30 F1 |  |
| `faq.items[0].a` | The worlds are built with AI. The ideas, the direction and the final cut are human. When a project needs a … | 03 §30 F1 (potvrđeno: ponekad se snima) |  |
| `faq.items[1].q` | Will it look like AI? | 03 §30 F2 / §32 dorada |  |
| `faq.items[2].q` | Will my product look like my product? | 03 §30 F3 |  |
| `faq.items[3].q` | We’re a small brand. Is this for us? | 03 §30 F4 |  |
| `faq.items[3].a` | Yes. If you have a product to show, we can build its world. | 03 §30 F4 (odluka 2) |  |
| `faq.items[4].q` | Who will I be working with? | 03 §30 F5 |  |
| `faq.items[5].q` | What do you need from us to start? | 03 §30 F6 |  |
| `faq.items[6].q` | How much does it cost? | 03 §30 F7 |  |
| `faq.items[6].a` | Every project gets a fixed quote before any work starts. | 03 §30 F7 (bez iznosa) | Fiksna cijena potvrđena (03 §16); iznos opcionalno (pitanje 2). |
| `faq.items[7].q` | How long does it take? | 03 §30 F8 |  |
| `faq.items[7].a` | Every project gets a fixed deadline, agreed before any work starts. | 03 §30 F8 (bez broja dana) | Fiksni rok potvrđen (03 §16); broj dana opcionalno (pitanje 3). |
| `faq.items[8].q` | Can you build the website too? | 03 §30 F11 |  |
| `faq.items[8].a` | Yes. The site your ad leads to, built in-house. You are looking at one. | 03 §30 F11 | Stranica mora zaslužiti tvrdnju. |
| `faq.items[9].q` | Where are you based? | 03 §30 F13 |  |
| `faq.items[9].a` | We work with brands worldwide, remotely. | 03 §30 F13 (bez lokacije u copyju) |  |
| `start.heading` | Tell us what you’re selling. | 03 §10 B1 bez broja (11 §4 red 12) |  |
| `start.alt` | Tell us what you’re building. | 01-inventura G1 bez 'Same-day reply' (alternativa) |  |
| `start.projectTypes[0].label` | Ads & Product Films | 03 §8 U1 |  |
| `start.projectTypes[1].label` | Websites | 03 §8 U2 |  |
| `start.projectTypes[2].label` | AI Brand Characters | 03 §8 U3 |  |
| `start.projectTypes[3].label` | AI Tools for Business | 03 §8 U4 |  |
| `start.promise` | Every project gets a fixed quote and a fixed deadline before any work starts. | 03 §16 (potvrđena obećanja); §30 F7, F8 |  |

## 4. Poznati problemi

Kontrola kvalitete (zasebni subagent, samo screenshotovi + letvica §2 + 10-lik §4, najviše 3 kruga po fazi) ni u jednoj vizualnoj fazi nije dostigla prag (prosjek ≥ 8, nijedan kriterij < 7). Konačni prosjeci: F2 5,6 · F3 5,0 · F4 5,3 · F5 5,3 · F6 5,7 · F7 5,3 · F8 5,7. Najjače ocijenjena je tipografija (7–8), zadani kriterij F6 (robot točno ispod kursora) potvrđen je u sva tri kruga. Glavni preostali problemi (detalji po fazi u `PROGRESS.md`):

1. **Drvo** — ptičje oko se vidi u krupnom kadru, a u srednjem kadru je dodana krupnija "pjegavost" i žila; kontrola kvalitete ga i dalje čita kao "vosak / plastiku". Prijedlog: pečena (unaprijed izračunata) 4K tekstura ptičjeg oka s mipmapama ili fotoskenirana CC0 tekstura javora kao osnovica, proceduralni sloj samo za chatoyance.
2. **Mehanika sata na zglobovima** modelirana je (prsten s kosim rubom, kotač s 30 zubaca, most, vijci), ali se u srednjem kadru vidi samo u profilu.
3. **Révérence** više nije korak natrag, ali se ne čita kao dubok, gracilan naklon; pomogao bi snimljeni pokret balerine (lanac je spreman, README).
4. **Svjetlo na svijetloj pozornici** (balet): snop kroz dim slabije se vidi nego u staroj probi na tamnoj; na tamnoj pozornici (uvod) je jasan.
5. **Performanse**: na M5 60 fps uz dinamičku rezoluciju; na DPR 2 bez nje scena bi bila preteška. Mobitel koristi nizove slika. Lighthouse (mobilni): Performance 91 / 94, Accessibility 100, Best Practices 100, TBT 0 ms, CLS ≈ 0 — **LCP 3,1–3,5 s nije ispod 2,5 s** (H1 se crta odmah, ali simulacija sporog 4G-a broji i fontove i početni JS; sljedeći korak: manje početnog JS-a ili kasnije učitavanje GSAP-a).
6. Šake i palica u krupnom kadru (hvat), kostim straga (nabori), orkestar u istoj pozi — vidi `PROGRESS.md`.

## 5. Screenshotovi

U `qa/review/` (JPG, do 300 KB):

| Datoteka | Što |
|---|---|
| `qa/review/01-uvod-h1.jpg` | uvod, kadar 1: H1 |
| `qa/review/02-uvod-plesacica.jpg` | kadar 2: "boundaries disappear." i plesačica u protusvjetlu |
| `qa/review/03-uvod-logo.jpg` | kadar 3: logo, lutka kao I |
| `qa/review/04-uvod-dirigent-orkestar.jpg` | kadar 9: dirigent vodi takt, orkestar svira |
| `qa/review/05-uvod-naklon.jpg` | kadar 10: naklon |
| `qa/review/06-manifest-balet.jpg` | manifest: port de bras izbliza |
| `qa/review/12-manifest-krug-svjetla.jpg` | kraj manifesta: lutka u krugu svjetla |
| `qa/review/07-reelovi-lutka.jpg` | reelovi: mala lutka gleda aktivni slot |
| `qa/review/08-drvo-robot.jpg` | drvo / robot ispod kursora |
| `qa/review/09-usluge-poza.jpg` | usluge: poza po usluzi (Websites) |
| `qa/review/10-start-lutka-pise.jpg` | /start: lutka bilježi (piše) |
| `qa/review/11-mobitel-uvod.jpg` | mobitel: uvod (nizovi slika) |

