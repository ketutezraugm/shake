import { defineConfig } from "vitest/config";

// `npm run build` emits compiled tests into dist; run only the sources.
export default defineConfig({ test: { include: ["src/**/*.test.ts"] } });
