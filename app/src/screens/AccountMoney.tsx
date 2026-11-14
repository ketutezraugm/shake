import { useEffect, useState } from "react";
import { nearBalance, offerTotals, type OfferTotals } from "../accountSummary";
import { chainFor } from "../client";
import { chain, relayerUrl } from "../config";
import { loadMyOffers } from "../myOffers";
import { Link } from "../routes";

/** A figure that loads on its own: "…" while waiting, "—" when it could not be read, so one failure never hides the rest. */
type Loaded<T> = { status: "loading" } | { status: "failed" } | { status: "ready"; value: T };
const shown = <T,>(figure: Loaded<T>, text: (value: T) => string) => (figure.status === "ready" ? text(figure.value) : figure.status === "loading" ? "…" : "—");

function useFigure<T>(load: (() => Promise<T>) | null): Loaded<T> {
  const [figure, setFigure] = useState<Loaded<T>>(load ? { status: "loading" } : { status: "failed" });
  useEffect(() => {
    if (!load) return;
    let current = true;
    load().then(
      (value) => current && setFigure({ status: "ready", value }),
      () => current && setFigure({ status: "failed" }),
    );
    return () => {
      current = false;
    };
    // The menu mounts this on open, so the figures are read once per opening.
  }, []);
  return figure;
}

/** The left column of the account menu: NEAR balance, money held in escrow, and offers in progress. */
export function AccountMoney({ account }: { account: string }) {
  // Without a deployed contract the app runs on a mock chain, which has no balances or relayer to read.
  const live = chain.contractId !== "";
  const balance = useFigure(live ? () => nearBalance(chain, account) : null);
  const url = relayerUrl;
  const totals = useFigure<OfferTotals>(
    live && url
      ? () => {
          const { signer, client } = chainFor(account);
          return loadMyOffers(url, signer, client, account).then(offerTotals);
        }
      : null,
  );

  return (
    <div className="account-money">
      <p className="money-row">
        <span>Wallet</span>
        <b className="num">{shown(balance, (near) => near)}</b>
      </p>
      <p className="money-row">
        <span>Held in escrow</span>
        <b className="num">{shown(totals, ({ lockedRp }) => `Rp ${lockedRp}`)}</b>
      </p>
      <Link to="/offers" className="money-row">
        <span>Offers in progress</span>
        <b className="num">{shown(totals, ({ open, needYou }) => (needYou > 0 ? `${open} · ${needYou} for you` : String(open)))}</b>
      </Link>
    </div>
  );
}
