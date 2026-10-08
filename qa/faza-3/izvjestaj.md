# F3 — Kostim, palica, roboti, pozornica · izvještaj

Datum: 8. 10. 2026. · Ruta: `/lab/scena` (noindex, nije u navigaciji; `?cam=still|detalj|nisko|straga|siroko|saka|bok`, `&pose=`, `&okret=`, `&svira=0|1`, `&redovi=0..3`, ručna kamera `?cpos=&ctgt=&cfoc=&mm=&f=`)

## Što je napravljeno
- **Frak** (10-lik §3 [SMOKING], skinned na istom tijelu): krojeni sako sa satenskim špicastim reverima, sprijeda rezan u struku, **dva skuta** straga s razrezom do iznad koljena, stegnut struk, 2 × 3 satenska gumba, satenski pojas (cummerbund) s naborima, hlače sa satenskom prugom, lakirane cipele; bijela košulja s naborima, 3 crna studa, krilati ovratnik i manšete (zatvorene do zgloba); **ljubičasta svilena leptir-mašna** (leptir s naborom) i **maramica** (dva meka vrha) — jedina ljubičasta na liku. Vidi se samo drvena glava, čelični vrat i drvene šake s čeličnim zglobovima.
- **Vuna** s keperom, mekim naborima (lakat, pazuh, struk straga), melange varijacijom i sjajem vlakna (sheen); saten bez cik-cak odsjaja (gušća mreža revera).
- **Kroj kao prekidač** `?kroj=frak|smoking` (zadano frak, [PRETPOSTAVKA]): 10-lik kaže "tuxedo", 11 F3 traži "skut".
- **Palica**: tanka bijela, drška u kanalu savijenih prstiju, štap izlazi između palca i kažiprsta; minimalna debljina u pikselima (vidi se u svakom kadru), bez blooma "svjetlosnog štapa".
- **Roboti** (10-lik [ROBOT]): isti kanon, sav brušeni čelik, bez lica i svjetla; orkestar sjedi u tri reda (violine, violončela, timpani) s instrumentima od crnog laka i čelika (bez drva i mesinga), instancirano (jedan draw call po vrsti dijela), svira u ritmu.
- **Pozornica**: tamni polirani pod od dasaka, crna baršunasta zavjesa i portal, tungsten reflektor (topli snop u dimu, sjena lutke u snopu), hladna svjetla po redovima orkestra, strmo kontra svjetlo, topli odbljesak poda (bez sjene), prašina samo u toplom snopu.
- **Post**: N8AO, volumetrija (do 4 reflektora, 2 sa sjenom, boja snopa u dimu odvojena od boje na površinama), DOF (objektivi u mm), bloom (samo high), ACES, **jednobojno filmsko zrno** (novi efekt umjesto RGB šuma), vinjeta.
- **Poze dirigenta**: nova radna poza (lakat van, podlaktica gore-naprijed, prsa nagnuta i zakrenuta, glava prati slobodnu ruku, kontrapost) i "poziv" za still (palica visoko, slobodna ruka prema sekciji, elegantna šaka).

## Popravljene greške (pronađene u ovoj fazi)
- **Vruće točke koje izgledaju kao LED** (10-lik: bez svjetla): uzrok je anizotropni GGX na sitnim zakrivljenim dijelovima (članci prstiju, potkoljenice robota, prstenovi struka B, kotlovi timpana). Prsti dobivaju tangente; anizotropija isključena na prstima, dlanovima, struku B i cijelom orkestru. Novi test `tests/hotspots.spec.ts` traži takve točke na 9 kadrova (lab i uvod).
- Paljenje/gašenje reflektora preko `visible` mijenjalo je broj svjetala → three.js rekompajlira sve materijale usred scrolla. Sada je ugašeno svjetlo = jačina 0, a sjena se ne crta (`shadow.autoUpdate`).
- Satenska pruga na hlačama nije se crtala (atribut bez shadera) — sada se crta.
- Manšeta je iz krupnog kadra bila prazna cijev — zatvorena prstenom do zgloba.

## Performanse
- Razina `high` izmjerena na M5 (1440 × 900, DPR 1, puni orkestar): MSAA 4 → 2, volumetrija 0,5/44 → 0,4/36, AO 16 → 12 uzoraka: kadar s 53 na ~70–86 fps bez vidljive razlike.
- Poze se kopiraju bez JSON-a (orkestar: 14 robota po frameu).

## Testovi
- Dev: 71 prolazi (ostalo su preskočeni viewporti), produkcija pod basePathom (smoke, content, lab, vruće točke): 46 prolazi. Sudari i pod za sve poze (uključujući nove) prolaze.

## Kontrola kvalitete (zasebni subagent, 3 kruga)
| Krug | Materijali | Svjetlo | Pokret | Kompozicija | Vjernost | Prosjek | Nadmašuje donju granicu |
|---|---|---|---|---|---|---|---|
| 1 | 4 | 6 | 4 | 5 | 6 | 5,0 | ne |
| 2 | 4 | 5 | 4 | 6 | 6 | 5,0 | da |
| 3 | 4 | 6 | 4 | 5 | 6 | 5,0 | da |

Detalji krugova: `qc-krug-1.md`, `qc-krug-2.md`, `qc-krug-3.md`. Prag (≥ 8, nijedan < 7) nije dostignut u tri kruga → preostale mane su u `PROGRESS.md` ("Poznati problemi").

Popravljeno između krugova: rasvjeta (tungsten s balansom bijele, hladni orkestar, bez toplog prelijevanja na robote, topli snop u dimu, strmo kontra svjetlo), frak sa skutovima i rezom u struku, vuna s naborima, gumbi/studovi/ovratnik/pojas, leptir-mašna i maramica, palica u šaci, drvo (svjetliji satenski lak, oči bez "rupica" u srednjem kadru, kovrča srednje skale), metal (brušeni umjesto crnog kroma, slabiji AO na vratu), roboti (svjetliji čelik, mekši odsjaji), kadrovi (cijela figura s podom, detalj s cijelom glavom, palica na strani kamere, široki kadar s portalom), zrno i prašina.

Ključni screenshotovi (JPG): `desktop-1440--qc3-still.jpg`, `--qc3-detalj.jpg`, `--qc3-nisko.jpg`, `--qc3-siroko.jpg`, `--qc3-saka.jpg`, `usporedba-donja-granica.jpg`.
