import { test, expect, type Page } from "@playwright/test";
import { shotPath, watch } from "./helpers";

/**
 * F8: /start — "lutka bilježi". Playwright prolazi kroz svih osam stanja (07 tablica) i snimi svako:
 * Čeka, Pažnja, Piše, Razmišlja, Novo polje, Greška, Poslano (révérence + iskrena poruka bez endpointa), Odlazak.
 * Forma radi i bez lutke; lutka je aria-hidden; tekst iz forme ne odlazi nikamo zbog animacije.
 */
const stage = '[data-notebook-stage]';
async function state(page: Page) {
  return page.getAttribute(stage, "data-state");
}
async function shot(page: Page, info: Parameters<typeof shotPath>[0], name: string) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: shotPath(info, name) });
}

test.describe("/start — lutka bilježi (F8)", () => {
  test.beforeEach(async ({}, info) => {
    test.skip(info.project.name === "desktop-1920", "1440 i mobitel");
  });

  test("svih osam stanja", async ({ page }, info) => {
    test.setTimeout(120000);
    const errors = watch(page);
    const requests: string[] = [];
    // "ne šalje ništa": nijedan zahtjev s tijelom (POST/PUT/PATCH) ni s tekstom iz forme (HEAD/GET prefetch Next routera je u redu)
    page.on("request", (r) => {
      const body = r.postData() ?? "";
      if (["POST", "PUT", "PATCH"].includes(r.method()) || /Handmade|ana@/.test(body + r.url())) requests.push(`${r.method()} ${r.url()}`);
    });
    await page.goto("./start/");
    await page.waitForSelector(`${stage}[data-ready="1"]`, { timeout: 30000 });
    await expect(page.locator(stage)).toHaveAttribute("aria-hidden", "true");
    // 1 Čeka
    await page.mouse.move(5, 5);
    await page.waitForTimeout(1300);
    expect(await state(page)).toBe("idle");
    await shot(page, info, "01-ceka");
    // 2 Pažnja (pokazivač/fokus u formi)
    const form = page.locator("form").first();
    const box = (await form.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 40);
    await page.locator("form").first().focus().catch(() => {});
    await page.waitForTimeout(500);
    expect(["attention", "idle"]).toContain(await state(page));
    await shot(page, info, "02-paznja");
    // korak 1 → izbor vrste projekta, Next (5 Novo polje)
    await page.locator("form label.choice").first().click();
    await page.getByRole("button", { name: /next/i }).first().click();
    await page.waitForTimeout(250);
    expect(await state(page)).toBe("newfield");
    await shot(page, info, "05-novo-polje");
    // 3 Piše (svaki znak pomakne olovku)
    const field = page.locator("form input:not([type=radio]):visible, form textarea:visible").first();
    await field.click();
    for (const ch of "Handmade leather") {
      await page.keyboard.type(ch);
      await page.waitForTimeout(55);
    }
    expect(await state(page)).toBe("typing");
    await shot(page, info, "03-pise");
    // 4 Razmišlja (pauza > 1,5 s)
    await page.waitForTimeout(1800);
    expect(await state(page)).toBe("thinking");
    await shot(page, info, "04-razmislja");
    // 6 Greška: preskoči do zadnjeg koraka i pošalji s neispravnim e-mailom
    for (let i = 0; i < 3; i++) {
      const next = page.getByRole("button", { name: /next/i }).first();
      if (!(await next.isVisible().catch(() => false))) break;
      const req = page.locator("form input:visible, form textarea:visible").first();
      if (await req.isVisible().catch(() => false)) {
        const v = await req.inputValue().catch(() => "x");
        if (!v) await req.fill("Test");
      }
      await next.click();
      await page.waitForTimeout(300);
    }
    const email = page.locator('form input[type="email"]');
    if (await email.isVisible().catch(() => false)) {
      const name = page.locator('form input[autocomplete="name"], form input[name="name"]').first();
      if (await name.isVisible().catch(() => false)) await name.fill("Ana");
      await email.fill("ana@");
      await page.getByRole("button", { name: /send|submit/i }).first().click();
      await page.waitForTimeout(250);
      expect(await state(page)).toBe("error");
      await shot(page, info, "06-greska");
      // 7 Poslano: ispravan e-mail; bez endpointa iskrena poruka (pregled), ništa ne odlazi
      await email.fill("ana@example.com");
      await page.getByRole("button", { name: /send|submit/i }).first().click();
      await page.waitForTimeout(400);
      expect(await state(page)).toBe("sent");
      await shot(page, info, "07-poslano-reverence");
      await page.waitForTimeout(3400);
      await expect(page.getByRole("status").or(page.locator("[data-form-done]")).first()).toBeVisible();
      await shot(page, info, "07b-poslano-poruka");
    }
    expect(requests.filter((u) => !u.includes("/_next/")), "forma bez endpointa ne šalje ništa").toEqual([]);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("odlazak: pokazivač napusti formu", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "pokazivač");
    await page.goto("./start/");
    await page.waitForSelector(`${stage}[data-ready="1"]`, { timeout: 30000 });
    const form = page.locator("form").first();
    const box = (await form.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 40);
    await page.waitForTimeout(500);
    await page.mouse.move(box.x + box.width + 400, 20);
    await page.waitForTimeout(250);
    expect(await state(page)).toBe("leave");
    await shot(page, info, "08-odlazak");
  });

  test("smanjeni pokret: mirna lutka s otvorenom bilježnicom, forma radi", async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./start/");
    await page.waitForSelector(`${stage}[data-ready="1"]`, { timeout: 30000 });
    await page.waitForTimeout(600);
    await expect(page.locator("form label.choice").first()).toBeVisible();
    await shot(page, info, "09-smanjeni-pokret");
  });
});
