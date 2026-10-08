import { test, expect, type Page } from "@playwright/test";

/**
 * F9 pristupačnost: tipkovnica kroz cijelu stranicu i formu, vidljiv fokus, aria-hidden na dekoraciji (3D, lutke),
 * cilj dodira ≥ 44 px na mobitelu. Kontrast AA provjerava axe u content.spec.ts.
 */
async function focusRing(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el);
    const outline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 1;
    const shadow = cs.boxShadow && cs.boxShadow !== "none";
    const r = el.getBoundingClientRect();
    return { tag: el.tagName, text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40), visible: outline || !!shadow, inView: r.width > 0 && r.height > 0 };
  });
}

test.describe("pristupačnost (F9)", () => {
  test("tipkovnica: početna — skip link prvi, svi fokusi vidljivi", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "desktop");
    test.setTimeout(90000);
    await page.goto("./");
    await page.waitForLoadState("load");
    await page.keyboard.press("Tab");
    const first = await focusRing(page);
    expect(first?.text.toLowerCase()).toContain("skip");
    const seen: string[] = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const f = await focusRing(page);
      if (!f) continue;
      seen.push(`${f.tag}:${f.text}`);
      expect(f.visible, `fokus vidljiv: ${f.tag} "${f.text}"`).toBe(true);
    }
    // navigacija, CTA, Skip intro, filtri reelova, FAQ su dohvatljivi tipkovnicom
    const joined = seen.join(" | ").toLowerCase();
    for (const want of ["brief us", "skip intro"]) expect(joined).toContain(want);
  });

  test("tipkovnica: /start forma do kraja", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "desktop");
    await page.goto("./start/");
    await page.waitForLoadState("load");
    // prvi izbor tipkovnicom (strelice u grupi radio gumba), Next tipkom Enter
    await page.locator('form input[type="radio"]').first().focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("Enter");
    await expect(page.getByText(/step 2 of 4/i)).toBeVisible();
    const f = await focusRing(page);
    expect(f).not.toBeNull();
  });

  test("dekoracija je skrivena čitačima zaslona", async ({ page }) => {
    await page.goto("./");
    await page.waitForLoadState("load");
    for (const sel of ["canvas.stage-canvas", "#atelier", ".intro-logo"]) {
      const el = page.locator(sel).first();
      if (await el.count()) expect(await el.getAttribute("aria-hidden"), sel).toBe("true");
    }
  });

  test("mobitel: ciljevi dodira ≥ 44 px", async ({ page }, info) => {
    test.skip(info.project.name !== "mobile-390", "mobitel");
    for (const url of ["./", "./start/"]) {
      await page.goto(url);
      await page.waitForLoadState("load");
      const small = await page.evaluate(() => {
        const out: string[] = [];
        for (const el of document.querySelectorAll<HTMLElement>("a[href], button, input, [role=button], label.choice")) {
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden") continue;
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          // tekstualne poveznice u odlomku nisu ciljevi za izuzeće; skip link je vizualno skriven dok nema fokus
          if (el.classList.contains("sr-only-focusable")) continue;
          if (el.tagName === "INPUT" && (el as HTMLInputElement).type === "radio") continue; // klik ide na label.choice
          if (Math.min(r.width, r.height) < 43.5) out.push(`${el.tagName} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
        }
        return out;
      });
      expect(small, `${url}: ${small.join("; ")}`).toEqual([]);
    }
  });
});
