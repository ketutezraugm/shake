import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

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

export default defineConfig({ plugins: [react(), mockChainStore()] });
