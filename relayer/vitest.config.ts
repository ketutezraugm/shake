import { defineConfig } from "vitest/config";

// Variables from relayer/.env reach the tests, so the live-model checks see NEAR_AI_API_KEY; no .env just skips them.
try {
  process.loadEnvFile();
} catch {}

// `npm run build` emits compiled tests into dist; run only the sources.
export default defineConfig({ test: { include: ["src/**/*.test.ts"] } });
