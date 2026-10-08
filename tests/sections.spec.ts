import { test } from "@playwright/test";
import { shotPath } from "./helpers";

test.describe("sekcije (screenshotovi u qa/faza-N/)", () => {
  test("vrh početne i /start", async ({ page }, info) => {
    await page.goto("./");
    await page.waitForLoadState("load");
    await page.waitForTimeout(1200);
    await page.screenshot({ path: shotPath(info, "01-vrh") });
    await page.goto("./start/");
    await page.waitForLoadState("load");
    await page.waitForTimeout(800);
    await page.screenshot({ path: shotPath(info, "02-start") });
  });
});
