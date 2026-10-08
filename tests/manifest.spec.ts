import { test, expect, type Page } from "@playwright/test";
import { shotPath, watch } from "./helpers";

/**
 * F5: manifest preko baletne scene (scroll vodi kameru i pokret, radi unatrag), reelovi s lutkom koja gleda
 * aktivni slot, svjetovi; smanjeni pokret; FPS kroz manifest.
 */
const FRAMES: Array<[string, number]> = [
  ["01-manifest-iznad-lutke", 0.0],
  ["02-manifest-port-de-bras", 0.22],
  ["03-manifest-bras-bas", 0.6],
  ["04-manifest-reverence", 0.88],
  ["05-manifest-krug-svjetla", 1.0],
];

async function ready(page: Page) {
  await page.waitForFunction(() => typeof (window as unknown as { __scrollTo?: unknown }).__scrollTo === "function");
  await page.waitForFunction(() => ["ready", "frames"].includes(document.documentElement.dataset.stage3d ?? ""), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(600);
}

async function scrollManifest(page: Page, p: number) {
  await page.evaluate((p) => {
    const el = document.getElementById("manifest")!;
    const top = el.getBoundingClientRect().top + window.scrollY;
    (window as unknown as { __scrollTo: (y: number, o?: { immediate?: boolean }) => void }).__scrollTo(top + p * (el.offsetHeight - window.innerHeight), { immediate: true });
  }, p);
}

test.describe("manifest, reelovi, svjetovi (F5)", () => {
  test.beforeEach(async ({}, info) => {
    test.skip(info.project.name === "desktop-1920", "snima se na 1440 i mobitelu");
  });

  test("baletna scena: kadrovi redom i unatrag, bez grešaka", async ({ page }, info) => {
    test.setTimeout(120000);
    const errors = watch(page);
    await page.goto("./");
    await page.waitForLoadState("load");
    await ready(page);
    // manifest je visok kad je 3D spreman (scroll vodi scenu)
    const tall = await page.evaluate(() => document.getElementById("manifest")!.offsetHeight / window.innerHeight);
    expect(tall).toBeGreaterThan(3);
    for (const [name, p] of FRAMES) {
      await scrollManifest(page, p);
      await page.waitForTimeout(1600);
      await page.screenshot({ path: shotPath(info, name) });
    }
    // prvi redak je vidljiv na početku, drugi u sredini
    await scrollManifest(page, 0.22);
    await page.waitForTimeout(900);
    expect(Number(await page.locator(".manifest-a").evaluate((e) => getComputedStyle(e).opacity))).toBeGreaterThan(0.9);
    await scrollManifest(page, 0.62);
    await page.waitForTimeout(900);
    expect(Number(await page.locator(".manifest-b").evaluate((e) => getComputedStyle(e).opacity))).toBeGreaterThan(0.9);
    // unatrag
    await scrollManifest(page, 0.22);
    await page.waitForTimeout(900);
    expect(Number(await page.locator(".manifest-b").evaluate((e) => getComputedStyle(e).opacity))).toBeLessThan(0.1);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("reelovi: lutka gleda aktivni slot", async ({ page }, info) => {
    test.setTimeout(60000);
    const errors = watch(page);
    await page.goto("./");
    await page.waitForLoadState("load");
    await ready(page);
    await page.evaluate(() => {
      const el = document.getElementById("work")!;
      (window as unknown as { __scrollTo: (y: number, o?: { immediate?: boolean }) => void }).__scrollTo(el.getBoundingClientRect().top + window.scrollY - 100, { immediate: true });
    });
    await page.waitForTimeout(2500);
    await expect(page.locator(".reels-doll canvas")).toHaveCount(1);
    await expect(page.locator('[data-reel-active="1"]')).toHaveCount(1);
    await page.screenshot({ path: shotPath(info, "06-reelovi-lutka") });
    if (info.project.name !== "mobile-390") {
      const slots = page.locator("figure[data-reel]");
      await slots.first().hover();
      await page.waitForTimeout(1200);
      await expect(slots.first()).toHaveAttribute("data-reel-active", "1");
      await page.screenshot({ path: shotPath(info, "07-reelovi-lutka-gleda-prvi") });
    }
    await page.evaluate(() => {
      const el = document.getElementById("worlds")!;
      (window as unknown as { __scrollTo: (y: number, o?: { immediate?: boolean }) => void }).__scrollTo(el.getBoundingClientRect().top + window.scrollY - 60, { immediate: true });
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: shotPath(info, "08-svjetovi") });
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("smanjeni pokret: manifest je obična sekcija", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    await page.waitForLoadState("load");
    await page.waitForTimeout(800);
    const h = await page.evaluate(() => document.getElementById("manifest")!.offsetHeight / window.innerHeight);
    expect(h).toBeLessThan(1.6);
    await expect(page.locator(".manifest-a")).toBeVisible();
    await expect(page.locator(".manifest-b")).toBeVisible();
  });

  test("FPS kroz manifest", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "mjeri se na desktopu");
    test.setTimeout(90000);
    await page.goto("./?probe=1");
    await page.waitForLoadState("load");
    await ready(page);
    await scrollManifest(page, 0);
    await page.waitForTimeout(2500);
    for (let i = 0; i <= 50; i++) {
      await scrollManifest(page, i / 50);
      await page.waitForTimeout(160);
    }
    const fps = await page.evaluate(() => window.__fps);
    info.annotations.push({ type: "fps", description: JSON.stringify({ fps: Math.round(fps?.fps ?? 0), long: fps?.long, samples: fps?.samples.slice(-25) }) });
    console.log("FPS", JSON.stringify({ fps: fps?.fps, long: fps?.long, samples: fps?.samples.slice(-25) }));
    expect(fps?.frames ?? 0).toBeGreaterThan(100);
  });
});
