import { useEffect, useState } from "react";
import { currentAccount } from "../accounts";
import { clientFor, loadLinkToken } from "../client";
import type { Deal } from "../contract";

const POLL_MS = 3000;

export function DealPage({ id }: { id: number }) {
  const account = currentAccount();
  const [deal, setDeal] = useState<Deal | null | undefined>(undefined);

  useEffect(() => {
    const client = clientFor(account ?? "");
    const load = () => void client.getDeal(id).then(setDeal);
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [id, account]);

  if (deal === undefined) return <main className="screen"><p className="muted">Loading…</p></main>;
  if (deal === null) {
    return (
      <main className="screen">
        <h1 className="headline">Deal not found</h1>
        <p className="muted">Mock deals live in this tab only and reset on reload.</p>
      </main>
    );
  }

  const token = deal.seller === account ? loadLinkToken(id) : null;
  const link = token && `${location.origin}/d/${id}/join#${token}`;

  return (
    <main className="screen">
      <h1 className="headline">{deal.title}</h1>
      <p className="muted">
        Round {deal.round} of {deal.max_rounds} · {deal.state}
      </p>

      {link && (
        <section className="panel">
          <p>Send this link to your buyer. It works once.</p>
          <code className="link">{link}</code>
          <button className="primary" onClick={() => void navigator.clipboard.writeText(link)}>
            Copy link
          </button>
        </section>
      )}
    </main>
  );
}
