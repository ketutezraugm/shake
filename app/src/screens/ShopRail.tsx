import type { ReactNode } from "react";
import type { Shop } from "../market";
import type { ShopSection } from "../shopSection";
import { BubbleIcon, CheckIcon, ForwardIcon, GridIcon } from "./icons";

type Props = {
  shop: Shop;
  section: ShopSection;
  waiting: number;
  onSelect: (next: ShopSection) => void;
  onExpand: () => void;
};

const ITEMS: { key: ShopSection; label: string; icon: ReactNode }[] = [
  { key: "inbox", label: "Inbox", icon: <BubbleIcon /> },
  { key: "products", label: "Products", icon: <GridIcon /> },
  { key: "orders", label: "Orders", icon: <CheckIcon /> },
];

/** The collapsed shop menu: icons only, always on screen, with an arrow that opens the full menu. */
export function ShopRail({ shop, section, waiting, onSelect, onExpand }: Props) {
  const { profile } = shop;
  const current = section === "add-product" ? "products" : section;
  return (
    <aside className="shop-rail" aria-label="Shop menu">
      <button className="rail-button" aria-label="Open menu" onClick={onExpand}>
        <ForwardIcon />
      </button>
      <span className="rail-divider" aria-hidden="true" />
      {profile.avatarUrl ? <img className="avatar rail-avatar" src={profile.avatarUrl} alt="" /> : <span className="avatar rail-avatar" aria-hidden="true">{profile.displayName.charAt(0).toUpperCase()}</span>}
      <span className="rail-divider" aria-hidden="true" />
      <nav aria-label="Shop sections">
        {ITEMS.map(({ key, label, icon }) => (
          <button key={key} className="rail-button" aria-label={key === "inbox" && waiting > 0 ? `${label}, ${waiting} waiting` : label} title={label} aria-current={current === key ? "page" : undefined} onClick={() => onSelect(key)}>
            {icon}
            {key === "inbox" && waiting > 0 && <span className="convo-badge num rail-badge">{waiting}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}
