import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:4173/villaradar-app/",
    channel: "chrome",
    // Capturas deterministas: sin animaciones ni cursor parpadeante.
    reducedMotion: "reduce",
  },
  projects: [
    {
      name: "320",
      testIgnore: /dev-csp\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 320, height: 640 } },
    },
    {
      name: "390",
      testIgnore: /dev-csp\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
    {
      name: "768",
      testIgnore: /dev-csp\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } },
    },
    {
      name: "1440",
      testIgnore: /dev-csp\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      // Proyecto propio: corre SOLO contra `npm run dev` real (no vite preview),
      // que es el único sitio donde el bug de la CSP vieja se reproducía.
      name: "dev-csp",
      testMatch: /dev-csp\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:5174" },
    },
  ],
  webServer: [
    {
      command: "node mock/servidor.mjs",
      port: 8787,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run build && npx vite preview --port 4173",
      port: 4173,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { VITE_API_MOCK: "1" },
    },
    {
      command: "npx vite --port 5174",
      port: 5174,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { VITE_API_MOCK: "1" },
    },
  ],
});
