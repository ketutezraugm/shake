import { useEffect, useState } from "react";
import { chainFor } from "../client";
import { relayerUrl } from "../config";
import { loadSales, type SalesRow } from "../sales";
import { Link } from "../routes";

const POLL_MS = 8000;

/** The seller's own listings and where each one stands, shown on their own shop. Receipts for sold ones are on History. */
export function Sales({ account }: { account: string }) {
  const [rows, setRows] = useState<SalesRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = relayerUrl;
    if (!url) return;
    const { signer, client } = chainFor(account);
    const load = () =>
      loadSales(url, signer, client)
        .then((loaded) => {
          setRows(loaded);
          setError(null);
        })
        .catch((e: Error) => setError(e.message));
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [account]);

  if (!relayerUrl || (rows?.length === 0 && !error)) return null;

  return (
    <section className="sales" aria-label="Your sales">
      <div className="section-head">
        <h2>Your sales</h2>
        <Link to="/history">Receipts</Link>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {rows?.map((row) => (
        <Link key={row.id} to={`/l/${row.id}`} className={`offer-row${row.finished ? "" : " attention"}`}>
          <span className="offer-row-title">{row.title}</span>
          <span className="offer-row-state">{row.state}</span>
          {row.detail && <span className="offer-row-action">{row.detail}</span>}
        </Link>
      ))}
    </section>
  );
}
