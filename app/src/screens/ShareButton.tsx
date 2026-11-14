import { useState } from "react";
import { shareLink } from "../share";

/** Frame "4 Listing": the Share pill in the top bar, so a seller can paste the item's link into a Facebook or Instagram post. */
export function ShareButton({ path, title }: { path: string; title: string }) {
  const [label, setLabel] = useState("Share");

  async function share() {
    try {
      const result = await shareLink(`${location.origin}${path}`, title);
      if (result === "copied") setLabel("Link copied");
    } catch {
      setLabel("Couldn't share");
    }
  }

  return (
    <button type="button" className="pill" onClick={() => void share()}>
      <span aria-live="polite">{label}</span>
    </button>
  );
}
