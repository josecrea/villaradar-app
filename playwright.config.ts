import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:4173/villaradar-app/",
    channel: "chrome",
  },
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
