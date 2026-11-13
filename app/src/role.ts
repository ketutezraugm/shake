// Whether this browser is using the app to buy or to sell. It only decides which tabs show: the account, its handle and
// its wallet are the same either way (DECISIONS.md, buyer and seller roles), so nothing is stored on the server.

export type Role = "buyer" | "seller";
export type TabKey = "browse" | "saved" | "offers" | "inbox" | "sell" | "shop";

const ROLE_KEY = "blind-deal:role";

/** An account that never picked a role (made before the choice existed, or on a new device) keeps the seller's tabs. */
export function currentRole(storage: Storage = localStorage): Role {
  return storage.getItem(ROLE_KEY) === "buyer" ? "buyer" : "seller";
}

export function setRole(role: Role, storage: Storage = localStorage): void {
  storage.setItem(ROLE_KEY, role);
}

/** The tabs in order. A buyer has no Sell or My shop; a seller's My shop needs a handle. */
export function tabsFor(role: Role, hasShop: boolean): TabKey[] {
  if (role === "buyer") return ["browse", "saved", "offers", "inbox"];
  return hasShop ? ["browse", "sell", "inbox", "shop"] : ["browse", "sell", "inbox"];
}
