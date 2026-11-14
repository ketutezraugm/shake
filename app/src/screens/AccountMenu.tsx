import { currentHandle } from "../accounts";
import { useDropdown, useLinkedShop, useMyShop } from "../menuHooks";
import { AccountMoney } from "./AccountMoney";
import { Link, navigate } from "../routes";
import { leave, viewer } from "../session";

/** Top-right of the shell: "Sign in" when signed out, otherwise the account (or Google login) chip that opens a menu with sign out. */
export function AccountMenu() {
  const { open, setOpen, root, hoverProps } = useDropdown();
  const who = viewer();
  const handle = currentHandle();
  // The chip and card show the shop's name and photo; until they load, or if they fail, the handle stands in.
  const profile = useMyShop(handle)?.profile ?? null;
  // A Google or email login that was linked to a wallet account shows that account's shop instead of a bare email.
  const linked = useLinkedShop(who?.kind === "login" ? who.token : null);

  if (!who) return <Link to="/signin" className="pill">Sign in</Link>;

  async function signOutNow() {
    setOpen(false);
    await leave();
    navigate("/signin");
  }

  const name = profile?.displayName ?? handle ?? "";
  // Wallet and linked logins both show the person's profile; an unlinked login has none, so its email stands in.
  const shown = who.kind === "wallet" ? profile : (linked?.profile ?? null);
  const shownName = shown?.displayName || shown?.handle || handle || "";

  return (
    <div className="account" ref={root} {...hoverProps}>
      <button className="pill account-chip" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        {shown ? (
          <>
            {shown.avatarUrl ? <img className="chip-avatar" src={shown.avatarUrl} alt="" /> : <span className="chip-avatar" aria-hidden="true">{shownName.charAt(0).toUpperCase()}</span>}
            {shownName}
          </>
        ) : (
          (who.kind === "login" ? who.label : name)
        )}
      </button>
      {open && (
        <div className="account-menu" role="menu">
          {who.kind === "wallet" ? (
            <span onClick={() => setOpen(false)}>
              <Link to="/offers" className="account-card">
                <b>{name}</b>
                <span className="muted">{who.account}</span>
              </Link>
            </span>
          ) : linked ? (
            <div className="account-card">
              <b>{linked.profile.displayName || linked.profile.handle}</b>
              <span className="muted">Linked to {linked.account}</span>
            </div>
          ) : (
            <p className="muted">Browsing only</p>
          )}
          <div className="account-body">
            {who.kind === "wallet" && <AccountMoney account={who.account} />}
            <div className="account-links">
              <span onClick={() => setOpen(false)}>
                {who.kind === "wallet" ? (
                  <>
                    <Link to="/offers" className="account-item">
                      My offers
                    </Link>
                    <Link to="/saved" className="account-item">
                      Saved
                    </Link>
                    <Link to="/inbox" className="account-item">
                      Inbox
                    </Link>
                    <Link to="/history" className="account-item">
                      History
                    </Link>
                  </>
                ) : (
                  <Link to="/signin" className="account-item">
                    Connect a NEAR wallet
                  </Link>
                )}
              </span>
              <button className="account-item account-signout" role="menuitem" onClick={() => void signOutNow()}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
