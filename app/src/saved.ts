// Saved items: a list of listing ids kept in this browser only. Syncing them across devices needs storage on the server
// and stays in S-11. A change is announced on `window` so every heart on the page updates together.

const KEY = "blind-deal:saved";
export const SAVED_EVENT = "blind-deal:saved-changed";

export function savedIds(storage: Storage = localStorage): string[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export const isSaved = (id: string, storage: Storage = localStorage) => savedIds(storage).includes(id);

/** Saves the listing, or removes it when it was already saved. Returns whether it is saved now. */
export function toggleSaved(id: string, storage: Storage = localStorage): boolean {
  const ids = savedIds(storage);
  const saved = !ids.includes(id);
  // Newest first, so what was saved last is at the top of the Saved page.
  storage.setItem(KEY, JSON.stringify(saved ? [id, ...ids] : ids.filter((other) => other !== id)));
  dispatchEvent(new Event(SAVED_EVENT));
  return saved;
}
