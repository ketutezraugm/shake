import { useEffect, useState } from "react";
import { isSaved, SAVED_EVENT, toggleSaved } from "../saved";

/** The heart on a card and on the listing page. It lives next to a link, never inside it, so a tap saves without opening. */
export function SaveButton({ id, title, className = "" }: { id: string; title: string; className?: string }) {
  const [saved, setSaved] = useState(() => isSaved(id));

  // Another heart for the same item (card and page) changed the list.
  useEffect(() => {
    const sync = () => setSaved(isSaved(id));
    addEventListener(SAVED_EVENT, sync);
    return () => removeEventListener(SAVED_EVENT, sync);
  }, [id]);

  return (
    <button type="button" className={`heart ${className}`} aria-pressed={saved} aria-label={saved ? `Remove ${title} from saved` : `Save ${title}`} onClick={() => toggleSaved(id)}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
      </svg>
    </button>
  );
}
