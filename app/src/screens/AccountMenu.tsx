import { useEffect, useRef, useState } from "react";
import { currentAccess, currentAccount, currentHandle } from "../accounts";
import { walletBalance } from "../balance";
import { chain } from "../config";
import { nearFromYocto } from "../format";
import { Link, navigate } from "../routes";
import { leave } from "../session";

/** The signed-in wallet's NEAR balance ("…" while loading, "?" if the RPC fails); null on the mock chain or without a wallet. */
function useBalance(accountId: string | null): string | null {
  const [balance, setBalance] = useState("…");

  useEffect(() => {
    if (!accountId || !chain.contractId) return;
    let current = true;
    walletBalance(chain.rpcUrl, accountId).then(
      (yocto) => current && setBalance(nearFromYocto(yocto)),
      () => current && setBalance("?"),
    );
    return () => {
      current = false;
    };
  }, [accountId]);

  return accountId && chain.contractId ? balance : null;
}

/** Top-right of the shell: "Sign in" when signed out, otherwise the account chip that opens a menu with sign out. */
export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const access = currentAccess();
  const handle = currentHandle();
  const accountId = currentAccount();
  const balance = useBalance(accountId);

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

  if (access === "none") return <Link to="/signin" className="pill">Sign in</Link>;

  async function signOutNow() {
    setOpen(false);
    await leave();
    navigate("/signin");
  }

  return (
    <div className="account" ref={root}>
      <button className="pill" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        {handle ? `@${handle}` : "Account"}
        {balance && ` · ${balance} NEAR`}
      </button>
      {open && (
        <div className="account-menu" role="menu">
          <p className="muted">{handle ? `Signed in as @${handle}` : "Signed in to browse"}</p>
          {accountId && <p className="muted">Wallet: {accountId}</p>}
          {handle && (
            <Link to={`/@${handle}`} className="account-item">
              <span onClick={() => setOpen(false)}>My shop</span>
            </Link>
          )}
          <button className="account-item" role="menuitem" onClick={() => void signOutNow()}>Sign out</button>
        </div>
      )}
    </div>
  );
}
