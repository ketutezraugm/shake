import react from "@vitejs/plugin-react";
import { type Plugin } from "vite";
import { defineConfig } from "vitest/config";

/** Dev-only shared mock chain, so a seller and a buyer in different browsers see the same deals until M1-11. */
// The two request members used below; the repo has no current @types/node.
type BodyRequest = { method?: string; on(event: "data" | "end", listener: (chunk?: { toString(): string }) => void): void };

function mockChainStore(): Plugin {
  let deals = "[]";
  return {
    name: "mock-chain-store",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__mock-chain", (incoming, res) => {
        const req = incoming as unknown as BodyRequest;
        if (req.method === "PUT") {
          let body = "";
          req.on("data", (chunk) => (body += chunk?.toString() ?? ""));
          req.on("end", () => {
            deals = body;
            res.end();
          });
          return;
        }
        res.setHeader("Content-Type", "application/json");
        res.end(deals);
      });
    },
  };
}

// The one .env sits at the repo root beside .env.example; only VITE_-prefixed names reach the browser.
// Tests ignore the developer's .env: the app's own variables are pinned empty so they run on the mock chain.
const unset = ["VITE_CONTRACT_ID", "VITE_RELAYER_URL", "VITE_TEE_PUBKEY", "VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];

export default defineConfig({
  envDir: "..",
  plugins: [react(), mockChainStore()],
  test: { env: Object.fromEntries(unset.map((name) => [name, ""])) },
});
