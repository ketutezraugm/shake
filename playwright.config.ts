import { defineConfig } from "@playwright/test";

// Runs the README's local mode: the stand-in relayer plus the app on the simulated chain, no keys needed.
export default defineConfig({
  testDir: "e2e",
  timeout: 4 * 60 * 1000,
  use: {
    baseURL: "http://localhost:5173",
    browserName: "chromium",
    // Set PLAYWRIGHT_CHROMIUM_PATH to use an already installed Chromium when the browser download is blocked.
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH },
  },
  webServer: [
    // An empty CONTRACT_ID wins over relayer/.env, so a machine with real testnet settings still runs on the simulated chain.
    { command: "npm run dev:relayer", url: "http://localhost:8787/health", reuseExistingServer: true, env: { CONTRACT_ID: "" } },
    {
      command: "npm run dev -w app",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      env: { VITE_RELAYER_URL: "http://localhost:8787", VITE_CONTRACT_ID: "" },
    },
  ],
});
