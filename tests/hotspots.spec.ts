import { test, expect } from "@playwright/test";
import sharp from "sharp";

/**
 * 10-lik [IZBJEGAVAJ] "glowing parts" / [ROBOT] "no lights, no LEDs": traži male, vrlo svijetle mrlje okružene mrakom
 * (vruće točke odsjaja + bloom izgledaju kao LED). Duguljasti odsjaji (palica, rub) se ne broje.
 * Krupni kadrovi metala nisu ovdje: širok odsjaj softboxa na brušenom čeliku je ispravan, a ovaj test bi ga brojao.
 */
const SHOTS = [
  "/lab/scena/?cam=still&q=high",
  "/lab/scena/?cam=siroko&q=high",
  "/lab/scena/?cam=nisko&q=high",
  "/lab/scena/?cam=still&q=high&svira=1&okret=150",
  "/lab/lutka/?pose=kontrapost_s&cam=cijela&izgled=robot&struk=B&q=high&ui=0",
  "/lab/uvod/?p=0.25&q=high",
  "/lab/uvod/?p=0.55&q=high",
  "/lab/uvod/?p=0.74&q=high",
  "/lab/uvod/?p=0.97&q=high",
];

async function hotspots(png: Buffer) {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const lum = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) lum[i] = Math.round(0.2126 * data[i * 3] + 0.7152 * data[i * 3 + 1] + 0.0722 * data[i * 3 + 2]);
  const seen = new Uint8Array(W * H);
  const found: Array<{ x: number; y: number; area: number; ring: number }> = [];
  for (let i = 0; i < W * H; i++) {
    if (seen[i] || lum[i] < 248) continue;
    // komponenta (4-susjedstvo)
    const stack = [i];
    seen[i] = 1;
    let area = 0, x0 = W, x1 = 0, y0 = H, y1 = 0;
    while (stack.length) {
      const k = stack.pop()!;
      area++;
      const x = k % W, y = (k / W) | 0;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (const n of [k - 1, k + 1, k - W, k + W]) {
        if (n < 0 || n >= W * H || seen[n] || lum[n] < 248) continue;
        if (Math.abs((n % W) - x) > 1) continue;
        seen[n] = 1;
        stack.push(n);
      }
    }
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    // < 24 px: sitni zrcalni odsjaj na poliranom rubu (ispravan za čelik); "LED" točke bile su 37–420 px
    if (area < 24 || area > 1200 || Math.max(w, h) / Math.min(w, h) > 3.5) continue;
    // prsten oko mrlje: ako je okolina tamna, to je točkasti sjaj
    let sum = 0, cnt = 0;
    const r = Math.max(14, Math.max(w, h));
    for (let y = y0 - r; y <= y1 + r; y += 2)
      for (let x = x0 - r; x <= x1 + r; x += 2) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        if (x >= x0 - 4 && x <= x1 + 4 && y >= y0 - 4 && y <= y1 + 4) continue;
        sum += lum[y * W + x];
        cnt++;
      }
    const ring = cnt ? sum / cnt : 255;
    // kompaktna zasićena mrlja čija je okolina (i s bloom haloom) jasno tamnija = točkasti sjaj
    if (process.env.HS_DEBUG || ring < 175) found.push({ x: (x0 + x1) >> 1, y: (y0 + y1) >> 1, area, ring: Math.round(ring) });
  }
  return found;
}

test.describe("vruće točke (bez LED dojma)", () => {
  test.beforeEach(async ({}, info) => {
    test.skip(info.project.name !== "desktop-1440", "jednom, na desktopu");
  });
  for (const url of SHOTS) {
    test(url, async ({ page }) => {
      test.setTimeout(60000);
      const res = await page.goto(`.${url}`);
      test.skip(res?.status() === 404, "ruta još ne postoji");
      await page.waitForFunction(() => (window as unknown as { __fps?: { frames: number } }).__fps?.frames! > 60, null, { timeout: 45000 });
      await page.waitForTimeout(1500);
      const found = await hotspots(await page.screenshot());
      expect(found, JSON.stringify(found)).toEqual([]);
    });
  }
});
