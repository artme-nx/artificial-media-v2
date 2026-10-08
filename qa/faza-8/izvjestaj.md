# F8 — /start: lutka bilježi · izvještaj

Datum: 8. 10. 2026. · `/start`

## Što je napravljeno
- **Forma lijevo, lutka desno iz profila** pod reflektorom (`src/three/doll/notebook-view.ts`, zaseban mali canvas): bilježnica (kožne korice, krem blok stranica) i olovka pričvršćene za šake; **sadržaj bilježnice se nikad ne vidi** (stranice su okrenute lutki) i ne crta se rukopis. Prava meka sjena lutke, ruku i bilježnice na podu.
- **Svih osam stanja** (07 tablica, `lib/notebook.ts` — forma šalje samo vrstu događaja i ime polja, nikad tekst):
  Čeka (drži bilježnicu, gleda u nju) · Pažnja (glava prema formi) · Piše (svaki znak pomakne olovku duž retka, novi red na kraju) · Razmišlja (pauza > 1,5 s: olovka uz bradu, glava gore i u stranu) · Novo polje (okretanje lista, olovka na prvi redak) · Greška (glava dolje prema polju, odmahivanje, olovka spuštena) · Poslano (zatvori bilježnicu, révérence kao zahvala, potvrda) · Odlazak (zatvori bilježnicu, okrene se prema gledatelju).
- **Bez endpointa forma ne glumi slanje**: nakon révérencea piše "This is a preview." i da ništa nije poslano (test provjerava da nema nijednog POST zahtjeva).
- **Mobitel**: lutka je mala vinjeta koja ostaje gore (sticky) dok se forma ispunjava; zaglavlje s punom pozadinom. **Smanjeni pokret**: mirna lutka s otvorenom bilježnicom. Lutka `aria-hidden`; forma radi potpuno i bez nje; crta se samo dok je vidljiva.
- Forma: e-mail i ime u sansu (Bodoni lomi "@"), stanje slanja s punim kontrastom (`aria-busy`), "Next" uvijek u prvom ekranu na 1440 × 900.

## Testovi
- `tests/start.spec.ts`: prolazi kroz svih osam stanja i snima svako (desktop 1440 i mobitel 390), provjerava `aria-hidden`, iskrenu poruku i da forma bez endpointa ne šalje ništa; odlazak (pokazivač napusti formu); smanjeni pokret. 0 grešaka konzole.
- `tests/a11y.spec.ts`: forma tipkovnicom (izbor, Enter → korak 2).

## Kontrola kvalitete (zasebni subagent, 3 kruga)
| Krug | Materijali | Svjetlo | Pokret | Tipografija | Kompozicija | Vjernost | Prosjek | Nadmašuje donju granicu |
|---|---|---|---|---|---|---|---|---|
| 1 | 4 | 5 | 4 | 7 | 5 | 6 | 5,2 | da |
| 2 | 4 | 3 | 4 | 7 | 6 | 6 | 5,0 | ne (ne jasno) |
| 3 | 4 | 6 | 5 | 7 | 6 | 6 | 5,7 | da |

Detalji: `qc-krug-1.md`, `qc-krug-2.md`, `qc-krug-3.md`.

Popravljeno između krugova: razmišlja (olovka uz bradu), greška (vlastita poza, glava dolje), odlazak (okret, zatvorena bilježnica), novo polje (vidljivo okretanje lista), prava bačena sjena, bilježnica (veća, kožne korice, blok stranica), pozornica fiksne veličine bez tvrdog ruba, "Next" u prvom ekranu, mobilna vinjeta, zaglavlje, polja u sansu, kontrast stanja slanja, apostrofi.

Ključni screenshotovi (JPG): `desktop-1440--01-ceka.jpg`, `--03-pise.jpg`, `--06-greska.jpg`, `--07-poslano-reverence.jpg`, `--08-odlazak.jpg`, `mobile-390--pregled-stanja.jpg`.
