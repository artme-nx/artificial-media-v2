# Artificial Media v2 — probna stranica

Live: https://artme-nx.github.io/artificial-media-v2/ · Zadatak: `brand/11-stranica-v2-zadatak.md`

```bash
npm install
npm run dev        # http://localhost:3107 (prije pokreće sync-brand i tokens)
npm run build      # static export u out/
npm test           # Playwright na dev serveru
npm run build && PW_PROD=1 npx playwright test   # produkcijski build pod basePathom
npm run deploy     # gh-pages
```

Detaljan opis (prekidači, Seedance videi, reelovi, endpoint forme, uvoz snimljenog pokreta) dolazi u završnoj fazi.
