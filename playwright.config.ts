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
    { name: "320", use: { ...devices["Desktop Chrome"], viewport: { width: 320, height: 640 } } },
    { name: "390", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
    { name: "768", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
    { name: "1440", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
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
  ],
});
