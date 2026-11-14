import { useEffect, useState } from "react";
import { currentAccount } from "../accounts";
import { chainFor } from "../client";
import { relayerUrl } from "../config";
import { loadMyOffers, rowText, type OfferRow } from "../myOffers";
import { Link } from "../routes";

const POLL_MS = 5000;

/** The buyer's home: every deal still in progress, with its state and the next step. Finished ones are on History. */
export function MyOffers() {
  const account = currentAccount();
  if (!account || !relayerUrl) {
    return (
      <main className="page narrow">
        <h1 className="headline">My offers</h1>
        <p className="muted">{account ? "My offers needs VITE_RELAYER_URL in the app's environment." : <><Link to="/signin">Connect a NEAR wallet</Link> to see your offers.</>}</p>
      </main>
    );
  }
  return <OfferList account={account} relayerUrl={relayerUrl} />;
}

function OfferList({ account, relayerUrl }: { account: string; relayerUrl: string }) {
  const [rows, setRows] = useState<OfferRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { signer, client } = chainFor(account);
    const load = () =>
      loadMyOffers(relayerUrl, signer, client, account)
        .then((loaded) => {
          setRows(loaded);
          setError(null);
        })
        .catch((e: Error) => setError(e.message));
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [account, relayerUrl]);

  return (
    <main className="page narrow">
      <div className="section-head">
        <h1 className="headline">My offers</h1>
        <Link to="/history">Past purchases</Link>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {rows === null && !error && <p className="muted">Loading…</p>}
      {rows?.length === 0 && (
        <p className="muted">
          No offers in progress. <Link to="/">Browse items</Link> and make a blind offer.
        </p>
      )}
      {rows?.map((row) => {
        const { state, action, yourMove } = rowText(row.view);
        return (
          <Link key={row.dealId} to={`/deals/${row.dealId}`} className={`offer-row${yourMove ? " attention" : ""}`}>
            <span className="offer-row-title">{row.title}</span>
            <span className="offer-row-state">{state}</span>
            {action && <span className="offer-row-action">{action}</span>}
          </Link>
        );
      })}
    </main>
  );
}
