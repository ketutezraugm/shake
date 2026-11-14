import { currentAccount, currentHandle } from "../accounts";
import { useDropdown, useMyShop, useWaiting } from "../menuHooks";
import { Link } from "../routes";

/** Header chip for the person's own shop: hover or tap for a summary, one button into the shop where selling happens. */
export function ShopMenu() {
  const account = currentAccount();
  const handle = currentHandle();
  const { open, setOpen, root, hoverProps } = useDropdown();
  const shop = useMyShop(handle);
  const waiting = useWaiting(handle ? account : null);

  if (!account) return null;
  if (!handle) {
    return (
      <Link to="/signup?as=sell" className="pill">
        Open a shop
      </Link>
    );
  }

  const name = shop?.profile.displayName ?? handle;
  const avatar = shop?.profile.avatarUrl ? <img className="chip-avatar" src={shop.profile.avatarUrl} alt="" /> : <span className="chip-avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>;
  const close = () => setOpen(false);

  return (
    <div className="account shop-menu" ref={root} {...hoverProps}>
      <button className="pill account-chip" aria-haspopup="menu" aria-expanded={open} aria-label={waiting > 0 ? `My shop, ${waiting} waiting` : "My shop"} onClick={() => setOpen(!open)}>
        <span className="shop-chip-name">My shop</span>
        {waiting > 0 && <span className="convo-badge num">{waiting}</span>}
      </button>
      {open && (
        <div className="account-menu shop-panel" role="menu">
          <div className="shop-panel-head">
            {avatar}
            <span>
              <b>{name}</b>
              <span className="muted">@{handle}</span>
            </span>
          </div>
          <dl className="shop-panel-stats">
            <div>
              <dt>Waiting on you</dt>
              <dd className="num">{waiting}</dd>
            </div>
            <div>
              <dt>For sale</dt>
              <dd className="num">{shop?.listings.length ?? "…"}</dd>
            </div>
            <div>
              <dt>Sold</dt>
              <dd className="num">{shop?.soldCount ?? "…"}</dd>
            </div>
          </dl>
          <span onClick={close}>
            <Link to={`/@${handle}${waiting > 0 ? "?tab=inbox" : ""}`} className="primary big shop-panel-action">
              Open my shop
            </Link>
          </span>
          <span onClick={close}>
            <Link to="/sell" className="outline-button shop-panel-action">
              Sell an item
            </Link>
          </span>
        </div>
      )}
    </div>
  );
}
