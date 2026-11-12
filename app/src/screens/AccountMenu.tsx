import { useEffect, useRef, useState } from "react";
import { currentAccount, currentHandle } from "../accounts";
import { Link, navigate } from "../routes";
import { leave } from "../session";

/** Top-right of the shell: "Sign in" when signed out, otherwise the account chip that opens a menu with sign out. */
export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const accountId = currentAccount();
  const handle = currentHandle();

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

  if (!accountId) return <Link to="/signin" className="pill">Sign in</Link>;

  async function signOutNow() {
    setOpen(false);
    await leave();
    navigate("/signin");
  }

  return (
    <div className="account" ref={root}>
      <button className="pill" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        @{handle}
      </button>
      {open && (
        <div className="account-menu" role="menu">
          <p className="muted">{accountId}</p>
          <span onClick={() => setOpen(false)}>
            <Link to={`/@${handle}`} className="account-item">
              My shop
            </Link>
          </span>
          <button className="account-item" role="menuitem" onClick={() => void signOutNow()}>Sign out</button>
        </div>
      )}
    </div>
  );
}
