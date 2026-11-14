export const SECTIONS = [
  { key: "inbox", label: "Inbox" },
  { key: "products", label: "Products" },
  { key: "orders", label: "Orders" },
] as const;
/** `add-product` lives under Products in the menu, so it is a section but not a top-level row. */
export type ShopSection = (typeof SECTIONS)[number]["key"] | "add-product";

export const PRODUCT_VIEWS = [
  { key: "products", label: "List product" },
  { key: "add-product", label: "Add product" },
] as const;

/** Old links used `for-sale` and `sales`; they still land on the right section. */
const ALIASES: Record<string, ShopSection> = { "for-sale": "products", sales: "orders" };

export function sectionFromQuery(search: string): ShopSection {
  const asked = new URLSearchParams(search).get("tab") ?? "";
  if (asked === "add-product") return "add-product";
  return SECTIONS.find((s) => s.key === asked)?.key ?? ALIASES[asked] ?? "products";
}

const MENU_KEY = "shop-menu-hidden";

export function readMenuHidden(): boolean {
  try {
    return localStorage.getItem(MENU_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeMenuHidden(hidden: boolean): void {
  try {
    localStorage.setItem(MENU_KEY, hidden ? "1" : "0");
  } catch {
    // Private windows can refuse storage; the menu just won't be remembered.
  }
}
