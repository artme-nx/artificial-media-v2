import { test, expect, type Page } from "@playwright/test";
import { shotPath, watch } from "./helpers";

/**
 * Kazališni uvod (11 F4): svih 10 kadrova u ispravnom redu, unatrag, "Skip intro", preskakanje scrollom,
 * statična verzija za smanjeni pokret, FPS tijekom scrolla.
 * Kadrovi 1–3 idu sami (vrijeme); test ih zaustavlja kroz window.__intro.seek(t) da su screenshotovi ponovljivi.
 */
const SCROLL_FRAMES: Array<[string, number, string]> = [
  ["04-titranje-art-me", 0.118, "4"],
  ["05-art-me-se-gasi", 0.162, "5"],
  ["06-reflektor", 0.255, "6"],
  ["07-dirigent-podize", 0.4, "7"],
  ["08-redovi-orkestra", 0.55, "8"],
  ["09-dirigira", 0.74, "9"],
  ["10-naklon", 0.975, "10"],
];

async function introY(page: Page, p: number) {
  return page.evaluate((p) => {
    const el = document.getElementById("intro")!;
    const top = el.getBoundingClientRect().top + window.scrollY;
    return top + p * (el.offsetHeight - window.innerHeight);
  }, p);
}

async function scrollToP(page: Page, p: number) {
  await page.waitForFunction(() => typeof (window as unknown as { __scrollTo?: unknown }).__scrollTo === "function");
  const y = await introY(page, p);
  await page.evaluate((y) => (window as unknown as { __scrollTo: (y: number, o?: { immediate?: boolean }) => void }).__scrollTo(y, { immediate: true }), y);
}

async function ready3d(page: Page) {
  await page.waitForFunction(() => ["ready", "frames"].includes(document.documentElement.dataset.stage3d ?? ""), null, { timeout: 30000 }).catch(() => {});
}

test.describe("uvod (F4)", () => {
  test.beforeEach(async ({}, info) => {
    test.skip(info.project.name === "desktop-1920", "uvod se snima na 1440 i mobitelu");
  });

  test("kadrovi 1–10 redom, unatrag, bez grešaka", async ({ page }, info) => {
    test.setTimeout(120000);
    const errors = watch(page);
    await page.goto("./");
    await page.waitForLoadState("load");
    await ready3d(page);
    const seek = (t: number) => page.evaluate((t) => (window as unknown as { __intro: { seek: (t: number) => void } }).__intro.seek(t), t);
    // 1: "Where art meets intelligence,"
    await seek(1.6);
    await page.waitForTimeout(700);
    await expect(page.locator('[data-h1-part="1"]')).toHaveCSS("opacity", "1");
    await page.screenshot({ path: shotPath(info, "01-where-art") });
    // 2: "boundaries disappear." preko lutke u protusvjetlu
    await seek(3.9);
    await page.waitForTimeout(900);
    await page.screenshot({ path: shotPath(info, "02-boundaries") });
    // 3: logo
    await seek(5.0);
    await page.waitForTimeout(2200);
    await page.screenshot({ path: shotPath(info, "03-logo") });
    // 4–10: scroll
    for (const [name, p, frame] of SCROLL_FRAMES) {
      await scrollToP(page, p);
      await page.waitForTimeout(1500);
      await expect(page.locator("html")).toHaveAttribute("data-intro-frame", frame);
      await page.screenshot({ path: shotPath(info, name) });
    }
    // unatrag: natrag na kadar 7 pa na kadar 4 — stanje se vraća
    await scrollToP(page, 0.4);
    await page.waitForTimeout(1200);
    await expect(page.locator("html")).toHaveAttribute("data-intro-frame", "7");
    await page.screenshot({ path: shotPath(info, "11-unatrag-kadar-7") });
    await scrollToP(page, 0.118);
    await page.waitForTimeout(1200);
    await expect(page.locator("html")).toHaveAttribute("data-intro-frame", "4");
    // kraj uvoda: prijelaz u svijetli dio
    await page.evaluate(() => {
      const m = document.getElementById("manifest")!;
      (window as unknown as { __scrollTo: (y: number, o?: { immediate?: boolean }) => void }).__scrollTo(m.getBoundingClientRect().top + window.scrollY, { immediate: true });
    });
    await page.waitForTimeout(1500);
    await expect(page.locator("html")).toHaveAttribute("data-stage", "light");
    await page.screenshot({ path: shotPath(info, "12-prijelaz-svijetlo") });
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("Skip intro vodi na manifest; navigacija i Brief us dostupni cijelo vrijeme", async ({ page }) => {
    await page.goto("./");
    await page.waitForLoadState("load");
    await expect(page.getByRole("link", { name: "Brief us" }).first()).toBeVisible();
    await scrollToP(page, 0.55);
    await page.waitForTimeout(600);
    await expect(page.getByRole("link", { name: "Brief us" }).first()).toBeVisible();
    await page.getByRole("button", { name: /skip intro/i }).click();
    await page.waitForTimeout(1200);
    const top = await page.evaluate(() => document.getElementById("manifest")!.getBoundingClientRect().top);
    expect(Math.abs(top)).toBeLessThan(80);
  });

  test("scroll preskače automatski dio", async ({ page }) => {
    await page.goto("./");
    await page.waitForLoadState("load");
    await page.waitForTimeout(500);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(800);
    await expect(page.locator("html")).toHaveAttribute("data-intro-auto", "done");
  });

  test("smanjeni pokret: statična verzija, cijeli H1, bez 3D-a", async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    await page.waitForLoadState("load");
    await page.waitForTimeout(800);
    await expect(page.locator("html")).toHaveAttribute("data-intro", "static");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator('[data-h1-part="2"]')).toBeVisible();
    // 3D se ne učitava (canvas ostaje prazan i skriven)
    await expect(page.locator("html")).toHaveAttribute("data-stage3d", "off");
    await expect(page.locator("canvas.stage-canvas")).toHaveAttribute("data-on", "0");
    await page.screenshot({ path: shotPath(info, "13-smanjeni-pokret") });
  });

  test("FPS tijekom scrolla kroz uvod", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "mjeri se na desktopu");
    test.setTimeout(90000);
    await page.goto("./?probe=1");
    await page.waitForLoadState("load");
    await ready3d(page);
    await page.waitForTimeout(1500);
    // automatski scroll kroz kadrove 4–10 (~10 s)
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      await scrollToP(page, 0.03 + (0.97 * i) / steps);
      await page.waitForTimeout(160);
    }
    const fps = await page.evaluate(() => window.__fps);
    info.annotations.push({ type: "fps", description: JSON.stringify({ fps: Math.round(fps?.fps ?? 0), long: fps?.long, tier: fps?.tier, dpr: (fps as unknown as { dpr?: number })?.dpr, samples: fps?.samples.slice(-30) }) });
    console.log("FPS", JSON.stringify(fps));
    expect(fps?.frames ?? 0).toBeGreaterThan(100);
  });
});
