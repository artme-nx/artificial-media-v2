import { test, expect, type Page } from "@playwright/test";
import { shotPath, watch } from "./helpers";

/**
 * F7: usluge (poza po usluzi, interakcija 2), Why AI?, CTA (lutka gleda kursor), FAQ (accordion),
 * podnožje (révérence na dnu stranice, interakcija 5).
 */
async function ready(page: Page) {
  await page.waitForFunction(() => typeof (window as unknown as { __scrollTo?: unknown }).__scrollTo === "function");
  await page.waitForFunction(() => ["ready", "frames"].includes(document.documentElement.dataset.stage3d ?? ""), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(800);
}
async function go(page: Page, id: string, off = 0) {
  await page.evaluate(
    ([id, off]) => {
      const el = document.getElementById(id as string)!;
      (window as unknown as { __scrollTo: (y: number, o?: { immediate?: boolean }) => void }).__scrollTo(el.getBoundingClientRect().top + window.scrollY + (off as number), { immediate: true });
    },
    [id, off],
  );
  await page.waitForTimeout(1800);
}

test.describe("usluge, Why AI?, CTA, FAQ, podnožje (F7)", () => {
  test.beforeEach(async ({}, info) => {
    test.skip(info.project.name === "desktop-1920", "1440 i mobitel");
  });

  test("sekcije i lutke", async ({ page }, info) => {
    test.setTimeout(120000);
    const errors = watch(page);
    const desktop = info.project.name === "desktop-1440";
    await page.goto("./");
    await page.waitForLoadState("load");
    await ready(page);
    await go(page, "services", desktop ? 120 : 0);
    await page.screenshot({ path: shotPath(info, "01-usluge") });
    if (desktop) {
      const rows = page.locator(".service-row");
      await rows.nth(1).hover();
      await page.waitForTimeout(1500);
      await expect(page.locator('[data-doll-anchor="service"] canvas')).toHaveAttribute("data-pose", /.+/);
      await page.screenshot({ path: shotPath(info, "02-usluge-poza") });
    }
    await go(page, "why-ai");
    await page.screenshot({ path: shotPath(info, "03-why-ai") });
    await go(page, "brief", -80);
    if (desktop) {
      await page.mouse.move(250, 250, { steps: 5 });
      await page.waitForTimeout(1200);
      await expect(page.locator('[data-doll-anchor="cta"] canvas')).toHaveCount(1);
    }
    await page.screenshot({ path: shotPath(info, "04-cta") });
    await go(page, "faq");
    const first = page.locator("#faq button[aria-expanded]").first();
    await first.click();
    await expect(first).toHaveAttribute("aria-expanded", "true");
    await page.waitForTimeout(600);
    await page.screenshot({ path: shotPath(info, "05-faq") });
    // dno stranice: révérence
    await page.evaluate(() => (window as unknown as { __scrollTo: (y: number, o?: { immediate?: boolean }) => void }).__scrollTo(document.documentElement.scrollHeight, { immediate: true }));
    await page.waitForTimeout(1300);
    await expect(page.locator('[data-doll-anchor="footer"] canvas')).toHaveAttribute("data-seq", "reverence");
    await page.screenshot({ path: shotPath(info, "06-podnozje-reverence") });
    expect(errors, errors.join("\n")).toEqual([]);
  });
});
