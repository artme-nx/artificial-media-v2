import { test, expect, type Page } from "@playwright/test";
import sharp from "sharp";
import { shotPath, watch } from "./helpers";

/**
 * F6: drvo / robot ispod kursora. "Gotovo kad": s kursorom na glavi, ramenu i koljenu robot je točno na mjestu
 * kursora, bez pomaka između slojeva, i dok se lutka miče; 60 fps na desktopu.
 * Provjera piksela: čelik je nezasićen (sivi), javor zasićen (medeni) — mjeri se na točki kursora i daleko od nje.
 */
type St = { cursor: { partScreen: (n: string) => { x: number; y: number } | null } };

async function ready(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.stage3d === "ready", null, { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const el = document.getElementById("atelier")!;
    (window as unknown as { __scrollTo: (y: number, o?: { immediate?: boolean }) => void }).__scrollTo(el.getBoundingClientRect().top + window.scrollY, { immediate: true });
  });
  await page.waitForTimeout(2500);
}

async function sat(png: Buffer, x: number, y: number) {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let s = 0, n = 0;
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      const i = ((Math.round(y) + dy) * info.width + Math.round(x) + dx) * 3;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      s += mx ? (mx - mn) / mx : 0;
      n++;
    }
  return s / n;
}

test.describe("drvo / robot ispod kursora (F6)", () => {
  test.beforeEach(async ({}, info) => {
    test.skip(info.project.name === "desktop-1920", "kursor: desktop 1440 i mobitel");
  });

  test("mobitel: krug se bez dodira sam kreće", async ({ page }, info) => {
    test.skip(info.project.name !== "mobile-390", "samo mobitel");
    test.setTimeout(60000);
    const errors = watch(page);
    await page.goto("./?probe=1");
    await ready(page);
    await page.screenshot({ path: shotPath(info, "kursor-mobitel-a") });
    const c1 = await page.evaluate(() => (window as unknown as { __stage: { cursor: { maskCenter: () => number[] } } }).__stage.cursor.maskCenter());
    await page.waitForTimeout(1800);
    await page.screenshot({ path: shotPath(info, "kursor-mobitel-b") });
    const c2 = await page.evaluate(() => (window as unknown as { __stage: { cursor: { maskCenter: () => number[] } } }).__stage.cursor.maskCenter());
    expect(Math.hypot(c2[0] - c1[0], c2[1] - c1[1]), "maska se pomiče sama").toBeGreaterThan(10);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("robot je točno ispod kursora (glava, rame, koljeno), i dok se lutka miče", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "desktop");
    test.setTimeout(90000);
    const errors = watch(page);
    await page.goto("./?probe=1");
    await ready(page);
    // [kursor na dijelu, drveni dio uz njega (unutar maske), drveni dio daleko (izvan maske)] — zglobovi su čelični
    // u oba prolaza, pa se boja mjeri na drvenim segmentima
    for (const [name, near, far] of [["head", "head", "shinL"], ["shoulderR", "upperR", "shinL"], ["kneeL", "shinL", "head"]] as const) {
      // dvaput: lutka se stalno polako miče (port de bras u petlji); maska prati kursor s malim kašnjenjem
      for (let k = 0; k < 2; k++) {
        const s = await page.evaluate((n) => (window as unknown as { __stage: St }).__stage.cursor.partScreen(n), name);
        await page.mouse.move(s!.x, s!.y, { steps: 5 });
        await page.waitForTimeout(900);
      }
      const s = await page.evaluate((n) => (window as unknown as { __stage: St }).__stage.cursor.partScreen(n), name);
      await page.mouse.move(s!.x, s!.y);
      await page.waitForTimeout(450);
      const png = await page.screenshot({ path: shotPath(info, `kursor-${name}`) });
      const p2 = await page.evaluate((n) => (window as unknown as { __stage: St }).__stage.cursor.partScreen(n), near);
      const f = await page.evaluate((n) => (window as unknown as { __stage: St }).__stage.cursor.partScreen(n), far);
      const under = await sat(png, p2!.x, p2!.y);
      const away = await sat(png, f!.x, f!.y);
      info.annotations.push({ type: name, description: `zasićenost ispod kursora ${under.toFixed(2)}, daleko ${away.toFixed(2)}` });
      expect(under, `${name}: ispod kursora treba biti čelik`).toBeLessThan(0.16);
      expect(away, `${far}: izvan maske treba biti drvo`).toBeGreaterThan(0.25);
    }
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("povlačenje šake namješta pozu, povlačenje praznog prostora okreće lutku", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "desktop");
    test.setTimeout(60000);
    await page.goto("./?probe=1");
    await ready(page);
    const hand0 = await page.evaluate(() => (window as unknown as { __stage: St }).__stage.cursor.partScreen("handR"));
    await page.mouse.move(hand0!.x, hand0!.y);
    await page.mouse.down();
    await page.mouse.move(hand0!.x + 40, hand0!.y - 160, { steps: 12 });
    await page.waitForTimeout(700);
    const hand1 = await page.evaluate(() => (window as unknown as { __stage: St }).__stage.cursor.partScreen("handR"));
    await page.screenshot({ path: shotPath(info, "kursor-sake-povucena") });
    await page.mouse.up();
    expect(hand0!.y - hand1!.y, "šaka se podigla za kursorom").toBeGreaterThan(60);
    await page.waitForTimeout(1600);
    const hand2 = await page.evaluate(() => (window as unknown as { __stage: St }).__stage.cursor.partScreen("handR"));
    expect(Math.abs(hand2!.y - hand0!.y), "pušteno se mekano vraća").toBeLessThan(Math.abs(hand1!.y - hand0!.y));
    // okretanje: povuci prazan prostor vodoravno
    const head0 = await page.evaluate(() => (window as unknown as { __stage: St }).__stage.cursor.partScreen("shoulderR"));
    await page.mouse.move(200, 600);
    await page.mouse.down();
    await page.mouse.move(600, 600, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(250);
    const head1 = await page.evaluate(() => (window as unknown as { __stage: St }).__stage.cursor.partScreen("shoulderR"));
    expect(Math.abs(head1!.x - head0!.x), "lutka se okrenula").toBeGreaterThan(8);
    await page.screenshot({ path: shotPath(info, "kursor-okret") });
  });

  test("FPS u sekciji", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "desktop");
    test.setTimeout(60000);
    await page.goto("./?probe=1");
    await ready(page);
    for (let i = 0; i < 40; i++) {
      await page.mouse.move(400 + Math.sin(i / 4) * 300, 450 + Math.cos(i / 5) * 200);
      await page.waitForTimeout(100);
    }
    const fps = await page.evaluate(() => window.__fps);
    info.annotations.push({ type: "fps", description: JSON.stringify({ fps: Math.round(fps?.fps ?? 0), long: fps?.long }) });
    console.log("FPS", JSON.stringify({ fps: fps?.fps, long: fps?.long, samples: fps?.samples.slice(-12) }));
    expect(fps?.frames ?? 0).toBeGreaterThan(60);
  });
});
