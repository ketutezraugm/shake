import { createRoot } from "react-dom/client";
import "./design/tokens.css";
import "./styles/base.css";
import "./styles/market.css";
import "./styles/flow.css";
import "./styles/account.css";
import "./styles/stickers.css";
import "./styles/press.css";
import { Router } from "./routes";
import { watchStickers } from "./stickerPop";

createRoot(document.getElementById("root")!).render(<Router />);
watchStickers();
