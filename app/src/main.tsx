import { createRoot } from "react-dom/client";
import "./design/tokens.css";
import "./styles/base.css";
import "./styles/market.css";
import "./styles/flow.css";
import "./styles/account.css";
import "./styles/stickers.css";
import "./styles/press.css";
import { saveSession, sessionFromHash } from "./auth";
import { Router } from "./routes";
import { watchStickers } from "./stickerPop";

// Supabase falls back to its Site URL when the redirect is not allow-listed, so a returned session is taken on any page.
const returned = sessionFromHash(location.hash);
if (returned) {
  saveSession(returned);
  history.replaceState(null, "", "/");
}

createRoot(document.getElementById("root")!).render(<Router />);
watchStickers();
