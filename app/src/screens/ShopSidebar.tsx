import { useState } from "react";
import type { Shop } from "../market";
import { PRODUCT_VIEWS, SECTIONS, type ShopSection } from "../shopSection";

type Props = {
  shop: Shop;
  section: ShopSection;
  waiting: number;
  copied: boolean;
  onSelect: (next: ShopSection) => void;
  onHide: () => void;
  onCopy: () => void;
};

/** The owner's side menu: who the shop is, then Inbox, Products and Orders. */
export function ShopSidebar({ shop, section, waiting, copied, onSelect, onHide, onCopy }: Props) {
  const { profile, listings, soldCount } = shop;
  const counts = { inbox: waiting, products: listings.length, orders: 0 };
  const inProducts = section === "products" || section === "add-product";
  const [productsOpen, setProductsOpen] = useState(inProducts);
  return (
    <aside className="shop-sidebar" aria-label="Shop menu">
      <button className="sidebar-hide" onClick={onHide}>
        Hide menu
      </button>
      <div className="sidebar-block profile-row">
        {profile.avatarUrl ? <img className="avatar" src={profile.avatarUrl} alt="" /> : <span className="avatar" aria-hidden="true">{profile.displayName.charAt(0).toUpperCase()}</span>}
        <div>
          <h1>{profile.displayName}</h1>
          <p className="muted">@{profile.handle}</p>
        </div>
      </div>
      <dl className="sidebar-block sidebar-rows">
        <div>
          <dt>Sold</dt>
          <dd className="num">{soldCount}</dd>
        </div>
        <div>
          <dt>For sale</dt>
          <dd className="num">{listings.length}</dd>
        </div>
      </dl>
      <nav className="sidebar-block sidebar-nav" aria-label="Shop sections">
        {SECTIONS.map(({ key, label }) =>
          key === "products" ? (
            <div key={key} className="sidebar-item">
              <button className="sidebar-toggle" aria-expanded={productsOpen} aria-controls="sidebar-products" data-active={inProducts || undefined} onClick={() => setProductsOpen((open) => !open)}>
                {label}
                <span className="sidebar-chevron" aria-hidden="true" />
              </button>
              {productsOpen && (
                <div className="sidebar-sub" id="sidebar-products">
                  {PRODUCT_VIEWS.map((view) => (
                    <button key={view.key} aria-current={section === view.key ? "page" : undefined} onClick={() => onSelect(view.key)}>
                      {view.label}
                      {view.key === "products" && <span className="num sidebar-count">{counts.products}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div key={key} className="sidebar-item">
              <button aria-current={section === key ? "page" : undefined} onClick={() => onSelect(key)}>
                {label}
                {counts[key] > 0 && <span className="num sidebar-count">{counts[key]}</span>}
              </button>
            </div>
          ),
        )}
      </nav>
      <div className="sidebar-block sidebar-links">
        <button onClick={onCopy}>{copied ? "Link copied" : "Copy shop link"}</button>
      </div>
    </aside>
  );
}
