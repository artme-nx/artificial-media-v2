import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { site, allStrings } from "../content/site";
import { FORBIDDEN } from "./helpers";

/** Copy: svaki string iz content/site.ts koji je na stranici mora biti u tekstu točno (bez slijepljenih riječi). */
test.describe("copy i pristupačnost", () => {
  test("nijedna riječ nije slijepljena (svi stringovi točno u textContent)", async ({ page }) => {
    await page.goto("./");
    await page.waitForLoadState("load");
    const text = await page.evaluate(() => (document.body.textContent || "").replace(/\s+/g, " "));
    const skip = new Set(["meta.title", "meta.description", "start.heading", "start.alt", "start.promise", "brand.legal", "hero.h1Part1", "hero.h1Part2"]);
    const missing = allStrings()
      .filter((s) => !skip.has(s.path) && !s.path.startsWith("start.") && s.path !== "reels.empty")
      .filter((s) => !text.includes(s.text));
    expect(missing.map((m) => `${m.path}: ${m.text}`)).toEqual([]);
    // H1 je jedna rečenica u DOM-u
    const h1 = await page.locator("h1").evaluate((el) => (el.textContent || "").replace(/\s+/g, " ").trim());
    expect(h1).toBe(site.hero.h1.text);
  });

  test("/start: stringovi forme točno u tekstu", async ({ page }) => {
    await page.goto("./start/");
    await page.waitForLoadState("load");
    const text = await page.evaluate(() => (document.body.textContent || "").replace(/\s+/g, " "));
    for (const s of [site.start.heading, site.start.promise, ...site.start.projectTypes.map((p) => p.label)]) expect(text).toContain(s.text);
  });

  test("zabranjene riječi nisu nigdje u content/site.ts", async () => {
    for (const s of allStrings()) for (const re of FORBIDDEN) expect(`${s.path}: ${s.text}`).not.toMatch(re);
  });

  for (const stage of ["dark", "light"] as const) {
    test(`axe (WCAG 2 AA, kontrast) — pozornica ${stage}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`./?svjetlo=${stage === "dark" ? "0" : "1"}`);
      await page.waitForLoadState("load");
      await page.evaluate((st) => {
        document.documentElement.dataset.stage = st;
        delete document.documentElement.dataset.stageAnim;
      }, stage);
      await page.waitForTimeout(200);
      const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).exclude("[aria-hidden='true']").analyze();
      const v = res.violations.map((x) => `${x.id} (${x.impact}): ${x.nodes.slice(0, 4).map((n) => n.target.join(" ")).join(" | ")}`);
      expect(v, v.join("\n")).toEqual([]);
    });
  }

  test("axe — /start", async ({ page }) => {
    await page.goto("./start/");
    await page.waitForLoadState("load");
    const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const v = res.violations.map((x) => `${x.id} (${x.impact}): ${x.nodes.slice(0, 4).map((n) => n.target.join(" ")).join(" | ")}`);
    expect(v, v.join("\n")).toEqual([]);
  });
});
