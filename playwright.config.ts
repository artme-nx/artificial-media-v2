import { defineConfig, devices } from "@playwright/test";

/**
 * PW_PROD=1 → produkcijski build iz out/ pod basePathom (scripts/serve-out.mjs, port 3108).
 * inače → dev server na 3107 (mora već raditi ili ga Playwright pokrene).
 * WebGL: Chromium s GPU-om (ANGLE/Metal), ne softverski renderer.
 */
const PROD = !!process.env.PW_PROD;
const BASE = PROD ? "http://localhost:3108/artificial-media-v2/" : "http://localhost:3107/";

const gpuArgs = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-webgl", "--enable-unsafe-swiftshader"];

export default defineConfig({
  testDir: "tests",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: BASE,
    trace: "off",
    launchOptions: { args: gpuArgs },
  },
  projects: [
    { name: "desktop-1440", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
    { name: "desktop-1920", use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 } },
    {
      name: "mobile-390",
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: PROD
    ? { command: "node scripts/serve-out.mjs", port: 3108, reuseExistingServer: true }
    : { command: "npm run dev", port: 3107, reuseExistingServer: true, timeout: 120_000 },
});
