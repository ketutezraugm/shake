import { createRoot } from "react-dom/client";
import "./design/tokens.css";
import "./styles/base.css";
import { Router } from "./routes";

createRoot(document.getElementById("root")!).render(<Router />);
