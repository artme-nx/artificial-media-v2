import { test, expect } from "@playwright/test";
import { watch, FORBIDDEN } from "./helpers";

test.describe("smoke", () => {
  test("početna: H1, navigacija i CTA vidljivi u prvoj sekundi; bez grešaka", async ({ page }) => {
    const errors = watch(page);
    const t0 = Date.now();
    await page.goto("./", { waitUntil: "commit" });
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible({ timeout: 1000 + 1500 }); // 1 s nakon prvog prikaza + rezerva za cold start
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Brief us" }).first()).toBeVisible();
    const tVisible = Date.now() - t0;
    test.info().annotations.push({ type: "h1-visible-ms", description: String(tVisible) });
    await expect(h1).toHaveText("Where art meets intelligence, boundaries disappear.");
    await page.waitForLoadState("load");
    await page.waitForTimeout(1500);
    // bez vodoravnog scrolla
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    // noindex
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("/start se učitava bez grešaka", async ({ page }) => {
    const errors = watch(page);
    await page.goto("./start/");
    await expect(page.locator("h1")).toBeVisible();
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("copy: nijedna zabranjena riječ (03 §13, §14)", async ({ page }) => {
    for (const url of ["./", "./start/"]) {
      await page.goto(url);
      await page.waitForLoadState("load");
      const text = await page.evaluate(() => document.body.innerText + "\n" + document.title + "\n" + (document.querySelector('meta[name="description"]')?.getAttribute("content") ?? ""));
      for (const re of FORBIDDEN) expect(text, `${url}: ${re}`).not.toMatch(re);
    }
  });
});

test("prekidač ?logo=sjena|tonski mijenja naglasak ART/ME", async ({ page }) => {
  await page.goto("./?logo=sjena");
  await expect(page.locator("footer svg[data-logo] [data-shadow]")).toHaveCount(1);
  await page.goto("./?logo=tonski");
  await expect(page.locator('footer svg[data-logo] [data-word="IFICIAL"]')).toHaveAttribute("opacity", "0.55");
  await page.goto("./");
  await expect(page.locator("footer svg[data-logo] [data-shadow]")).toHaveCount(0);
});
