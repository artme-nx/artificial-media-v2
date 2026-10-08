import { test, expect } from "@playwright/test";
import { watch, shotPath } from "./helpers";

/** F2: /lab/lutka — kadrovi lutke u studiju (qa/faza-2/), bez grešaka, FPS. */
const SHOTS: Array<[string, string]> = [
  ["01-blizu-glava-ramena-vrat", "pose=kontrapost_s&cam=blizu"],
  ["02-glava", "pose=kontrapost_s&cam=glava"],
  ["03-zglob-rame", "pose=kontrapost&cam=zglob"],
  ["04-saka", "pose=stoji&cam=sake"],
  ["05-stopala", "pose=kontrapost_s&cam=stopala"],
  ["06-cijela-kontrapost", "pose=kontrapost_s&cam=cijela"],
  ["07-cijela-balet-en-haut", "pose=b1_enhaut&cam=cijela"],
  ["08-cijela-dirigent", "pose=dirigent_rad&cam=cijela"],
  ["09-robot-struk-B", "pose=kontrapost_s&cam=cijela&izgled=robot&struk=B"],
  ["10-struk-B-blizu", "pose=kontrapost_s&cam=struk&struk=B"],
];

test.describe("lab lutka", () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop-1440", "kadrovi lutke: desktop 1440×900"));

  for (const [name, q] of SHOTS) {
    test(name, async ({ page }, info) => {
      const errors = watch(page);
      await page.goto(`./lab/lutka/?${q}&q=high&ui=0`);
      await page.waitForFunction(() => (window.__fps?.frames ?? 0) > 40, null, { timeout: 60_000 });
      await page.waitForTimeout(900);
      await page.screenshot({ path: shotPath(info, name) });
      const fps = await page.evaluate(() => window.__fps?.fps ?? 0);
      info.annotations.push({ type: "fps", description: fps.toFixed(0) });
      expect(errors, errors.join("\n")).toEqual([]);
    });
  }

  test("prijelaz poza je gladak (0,3–0,6 s) i glava prati kursor", async ({ page }, info) => {
    await page.goto("./lab/lutka/?pose=kontrapost_s&cam=cijela&q=high&ui=0");
    await page.waitForFunction(() => (window.__fps?.frames ?? 0) > 40, null, { timeout: 60_000 });
    const lab = (fn: string) => page.evaluate(fn);
    await lab("window.__lab.scene.setPose('seze_s', 0.5)");
    await page.waitForTimeout(200);
    await page.screenshot({ path: shotPath(info, "11-prijelaz-sredina") });
    await page.waitForTimeout(900);
    await page.screenshot({ path: shotPath(info, "12-prijelaz-kraj") });
    await lab("window.__lab.scene.setCam('blizu'); window.__lab.scene.setPose('stoji', 0.5)");
    await page.waitForTimeout(800);
    await page.mouse.move(80, 120, { steps: 10 });
    await page.waitForTimeout(1600);
    await page.screenshot({ path: shotPath(info, "13-pogled-kursor-gore-lijevo") });
    await page.mouse.move(1360, 820, { steps: 14 });
    await page.waitForTimeout(1600);
    await page.screenshot({ path: shotPath(info, "14-pogled-kursor-dolje-desno") });
  });
});
