# F7 — Usluge, Why AI?, CTA, FAQ, podnožje · izvještaj

Datum: 8. 10. 2026. · Početna (`#services`, `#why-ai`, `#brief`, `#faq`, podnožje)

## Što je napravljeno
- **Poza po usluzi** (07, interakcija 2): prelazak mišem ili fokus na uslugu pomakne malu lutku u pozu koja je opisuje — Ads & Product Films: predstavlja otvorenim dlanom; Websites: šakama uokviri kadar; AI Brand Characters: karakterni kontrapost s rukom na boku; AI Tools: posegne naprijed-gore. Ostali redovi se tada priguše (aktivni red se jasno vidi). Mekani prijelazi (opruge), kratko bez praćenja kursora da se poza pročita.
- **Globalno**: kad lutka miruje (blagi kontrapost), glava mirno prati kursor (±35°, s kašnjenjem), osim u koreografiranim trenucima (poza usluge, révérence).
- **CTA**: "Tell us what you’re selling." + "Brief us"; mala lutka uz naslov gleda kursor.
- **Why AI?**: WA1 prelomljen po rečenicama (paralelizam, nikad "To / make it possible."), Possible / Fixed / Human.
- **FAQ**: pristupačan accordion (button + aria-expanded + region), duljina retka ≤ 62 znaka.
- **Podnožje**: kad korisnik stigne do dna, mala lutka napravi **révérence** (07, interakcija 5), pa se uspravi; logo s lutkom kao I, osnivač, ©, linkovi, adresa i impressum kao vidljivi placeholderi.
- Tipografija: pravi apostrofi, kerning "W" u display fontu, niži optički rez Bodonija za manje display veličine (nazivi usluga, FAQ).
- Sve male lutke dijele jedan mali prozirni canvas koji se seli u sidro sekcije na ekranu; na mobitelu su u uslugama i CTA-u izostavljene (dekoracija).

## Testovi
- `tests/sections-f7.spec.ts`: usluge (lutka mijenja pozu na hover), Why AI?, CTA (lutka postoji), FAQ (accordion otvoren), dno stranice (révérence pokrenut); desktop i mobitel; 0 grešaka konzole.
- `tests/a11y.spec.ts`: tipkovnica kroz početnu (skip link prvi, svi fokusi vidljivi), ciljevi dodira ≥ 44 px na mobitelu (popravljeni filtri reelova i linkovi podnožja).

## Kontrola kvalitete (zasebni subagent, 3 kruga)
| Krug | Materijali | Svjetlo | Pokret | Tipografija | Kompozicija | Vjernost | Prosjek | Nadmašuje donju granicu |
|---|---|---|---|---|---|---|---|---|
| 1 | 3 | 5 | 4 | 6 | 6 | 6 | 5,0 | ne |
| 2 | 4 | 5 | 4 | 7 | 6 | 6 | 5,3 | ne (djelomično) |
| 3 | 4 | 5 | 4 | 7 | 6 | 6 | 5,3 | ne |

Detalji: `qc-krug-1.md`, `qc-krug-2.md`, `qc-krug-3.md`.

Popravljeno između krugova: poze usluga (iz smjerova udova, ne pogađanjem kutova), mirovanje u kontrapostu, aktivni red usluga, apostrofi, kerning, duljina retka, prijelom Why AI, CTA uz naslov, lutka u podnožju uz lijevi rub.

Ključni screenshotovi (JPG): `desktop-1440--01-usluge.jpg`, `--02-usluge-poza.jpg`, `--03-why-ai.jpg`, `--04-cta.jpg`, `--06-podnozje-reverence.jpg`, `mobile-390--pregled.jpg`.
