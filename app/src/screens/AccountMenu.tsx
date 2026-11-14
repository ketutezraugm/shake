import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { currentHandle } from "../accounts";
import { canHover, hoverIntent } from "../hoverIntent";
import type { Profile } from "../market";
import { market } from "../marketSource";
import { currentRole, setRole } from "../role";
import { AccountMoney } from "./AccountMoney";
import { Link, navigate } from "../routes";
import { leave, viewer } from "../session";

/** Top-right of the shell: "Sign in" when signed out, otherwise the account (or Google login) chip that opens a menu with sign out. */
export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const who = viewer();
  const handle = currentHandle();
  const [profile, setProfile] = useState<Profile | null>(null);

  // The chip and card show the shop's name and photo; until they load, or if they fail, the handle stands in.
  useEffect(() => {
    if (!handle) return;
    let current = true;
    market
      .profile(handle)
      .then((shop) => current && setProfile(shop?.profile ?? null))
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [handle]);

  const hover = useMemo(() => hoverIntent(() => setOpen(true), () => setOpen(false)), []);
  useEffect(() => hover.cancel, [hover]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    addEventListener("pointerdown", onPointer);
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("pointerdown", onPointer);
      removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!who) return <Link to="/signin" className="pill">Sign in</Link>;

  async function signOutNow() {
    setOpen(false);
    await leave();
    navigate("/signin");
  }

  // The role only picks the tabs; send the person to where that role starts.
  function switchTo(role: "buyer" | "seller") {
    setRole(role);
    setOpen(false);
    navigate(role === "seller" ? "/sell" : "/");
  }

  const name = profile?.displayName ?? handle ?? "";
  const seller = currentRole() === "seller";
  // Mouse only: touch and pen open by tap, and a tap would otherwise also fire a pointerenter.
  const onHover = (act: () => void) => (event: ReactPointerEvent) => event.pointerType === "mouse" && canHover() && act();

  return (
    <div className="account" ref={root} onPointerEnter={onHover(hover.enter)} onPointerLeave={onHover(hover.leave)}>
      <button className="pill account-chip" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        {who.kind === "wallet" ? (
          <>
            {profile?.avatarUrl ? <img className="chip-avatar" src={profile.avatarUrl} alt="" /> : <span className="chip-avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>}
            {name}
          </>
        ) : (
          who.label
        )}
      </button>
      {open && (
        <div className="account-menu" role="menu">
          {who.kind === "wallet" ? (
            <span onClick={() => setOpen(false)}>
              <Link to={seller ? `/@${handle}` : "/offers"} className="account-card">
                <b>{name}</b>
                <span className="muted">{who.account}</span>
              </Link>
            </span>
          ) : (
            <p className="muted">Browsing only</p>
          )}
          <div className="account-body">
            {who.kind === "wallet" && <AccountMoney account={who.account} />}
            <div className="account-links">
              <span onClick={() => setOpen(false)}>
                {who.kind === "wallet" ? (
                  <>
                    {seller && (
                      <Link to={`/@${handle}`} className="account-item">
                        My shop
                      </Link>
                    )}
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
              {who.kind === "wallet" && (
                <button className="account-item" role="menuitem" onClick={() => switchTo(seller ? "buyer" : "seller")}>
                  {seller ? "Switch to buying" : "Switch to selling"}
                </button>
              )}
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
