import { useEffect, useState } from "react";
import { currentAccount } from "../accounts";
import { clientFor, loadLinkToken } from "../client";
import type { Deal } from "../contract";
import { rpFromYocto } from "../format";
import { encodeMockLimit } from "../mockClient";
import { LimitForm } from "./LimitForm";

const POLL_MS = 3000;
const NO_COMMIT = Array<number>(32).fill(0);

export function DealPage({ id }: { id: number }) {
  const account = currentAccount();
  const [deal, setDeal] = useState<Deal | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const client = clientFor(account ?? "");
  const reload = () => client.getDeal(id).then(setDeal);

  useEffect(() => {
    void reload();
    const timer = setInterval(() => void reload(), POLL_MS);
    return () => clearInterval(timer);
  }, [id, account]);

  async function resubmit(limitRp: number) {
    setBusy(true);
    setError(null);
    try {
      await client.submitLimit(id, encodeMockLimit(limitRp), NO_COMMIT, null);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (deal === undefined) return <main className="screen"><p className="muted">Loading…</p></main>;
  if (deal === null) {
    return (
      <main className="screen">
        <h1 className="headline">Deal not found</h1>
        <p className="muted">Mock deals live on the dev server and reset when it restarts.</p>
      </main>
    );
  }

  const isSeller = deal.seller === account;
  const token = isSeller ? loadLinkToken(id) : null;
  const link = token && deal.buyer === null && `${location.origin}/d/${id}/join#${token}`;

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

      {isSeller && <SellerStep deal={deal} busy={busy} onLimit={(limitRp) => void resubmit(limitRp)} />}
      {error && <p className="error">{error}</p>}
    </main>
  );
}

type StepProps = { deal: Deal; busy: boolean; onLimit: (limitRp: number) => void };

function SellerStep({ deal, busy, onLimit }: StepProps) {
  switch (deal.state) {
    case "Created":
    case "Waiting":
    case "Retry": {
      if (deal.seller_cts.length < deal.round) {
        return (
          <LimitForm
            label="Lowest price you'd take (Rp)"
            retryNote={deal.round > 1 ? "No match last round. You can try again, but only with a lower number." : null}
            busy={busy}
            onSubmit={onLimit}
          />
        );
      }
      return deal.buyer === null ? null : <p className="panel">Your number is sealed. Waiting for the buyer…</p>;
    }
    case "Computing":
      return <p className="panel">Comparing in sealed code…</p>;
    case "NoDeal":
      return <p className="panel">No deal.</p>;
    case "Matched":
      return <p className="panel">Deal at Rp {rpFromYocto(deal.price!)}. Waiting for the buyer to pay into escrow…</p>;
    case "Funded":
      return <p className="panel">Rp {rpFromYocto(deal.price!)} is in escrow. Hand over the item; it's paid when the buyer confirms.</p>;
    case "Released":
      return <p className="panel">Paid. Rp {rpFromYocto(deal.price!)} is yours.</p>;
    case "Refunded":
      return <p className="panel">The buyer never confirmed, so the deposit went back to them.</p>;
  }
}
