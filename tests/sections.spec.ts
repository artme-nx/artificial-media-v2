import { test } from "@playwright/test";
import { shotPath } from "./helpers";

/** Screenshotovi ključnih točaka svake sekcije u qa/faza-N/. */
const SECTIONS = ["intro", "manifest", "work", "worlds", "atelier", "services", "why-ai", "brief", "faq"];

test.describe("sekcije (screenshotovi u qa/faza-N/)", () => {
  test("početna po sekcijama", async ({ page }, info) => {
    await page.goto("./");
    await page.waitForLoadState("load");
    await page.waitForTimeout(1500);
    for (const [i, id] of SECTIONS.entries()) {
      await page.evaluate((id) => {
        const el = document.getElementById(id)!;
        const y = el.getBoundingClientRect().top + window.scrollY;
        const w = window as unknown as { __scrollTo?: (y: number) => void };
        if (w.__scrollTo) w.__scrollTo(y);
        else window.scrollTo(0, y);
      }, id);
      await page.waitForTimeout(1400);
      await page.screenshot({ path: shotPath(info, `${String(i + 1).padStart(2, "0")}-${id}`) });
    }
    await page.evaluate(() => {
      const w = window as unknown as { __scrollTo?: (y: number) => void };
      const y = document.documentElement.scrollHeight;
      if (w.__scrollTo) w.__scrollTo(y);
      else window.scrollTo(0, y);
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: shotPath(info, "10-footer") });
  });

  test("cijela stranica", async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    await page.waitForLoadState("load");
    await page.waitForTimeout(800);
    await page.evaluate(() => (document.documentElement.dataset.stage = "light"));
    await page.waitForTimeout(100);
    await page.screenshot({ path: shotPath(info, "00-cijela"), fullPage: true, scale: "css" });
  });

  test("/start", async ({ page }, info) => {
    await page.goto("./start/");
    await page.waitForLoadState("load");
    await page.waitForTimeout(800);
    await page.screenshot({ path: shotPath(info, "20-start") });
  });
});
