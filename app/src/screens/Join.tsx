import { useEffect, useState } from "react";
import { currentAccount } from "../accounts";
import { clientFor } from "../client";
import type { Deal } from "../contract";
import { rpFromYocto } from "../format";
import { MOCK_TEE_PUBLIC_KEY } from "../mockClient";
import { AccountStep } from "./AccountStep";
import { LimitForm } from "./LimitForm";
import { sealLimit } from "../crypto";

const POLL_MS = 3000;

export function Join({ id }: { id: number }) {
  // Mock only: the buyer's account is per tab so one browser can play seller and buyer side by side.
  const buyerStorage = sessionStorage;
  const [account, setAccount] = useState(() => currentAccount(buyerStorage));
  if (!account) return <AccountStep onReady={setAccount} storage={buyerStorage} />;
  return <BuyerDeal id={id} buyer={account} token={location.hash.slice(1)} />;
}

function useDeal(id: number, account: string) {
  const [deal, setDeal] = useState<Deal | null | undefined>(undefined);
  const reload = () => clientFor(account).getDeal(id).then(setDeal);

  useEffect(() => {
    void reload();
    const timer = setInterval(() => void reload(), POLL_MS);
    return () => clearInterval(timer);
  }, [id, account]);

  return { deal, reload };
}

function BuyerDeal({ id, buyer, token }: { id: number; buyer: string; token: string }) {
  const { deal, reload } = useDeal(id, buyer);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function act(call: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await call();
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
        <p className="muted">Mock deals live on the dev server and reset when it restarts. Create the deal again.</p>
      </main>
    );
  }

  const client = clientFor(buyer);

  return (
    <main className="screen">
      <h1 className="headline">{deal.title}</h1>
      {deal.description && <p>{deal.description}</p>}
      <p className="muted">
        Round {deal.round} of {deal.max_rounds} · {deal.state} · you are {buyer}
      </p>

      <BuyerStep
        deal={deal}
        buyer={buyer}
        busy={busy}
        onLimit={(limitRp) =>
          act(async () => {
            const sealed = await sealLimit(id, "buyer", deal.round, String(limitRp), MOCK_TEE_PUBLIC_KEY);
            await client.submitLimit(id, sealed.ct, sealed.commit, deal.buyer ? null : token);
          })
        }
        onDeposit={() => act(() => client.deposit(id))}
        onReceived={() => act(() => client.confirmReceived(id))}
      />

      {error && <p className="error">{error}</p>}
    </main>
  );
}

type StepProps = {
  deal: Deal;
  buyer: string;
  busy: boolean;
  onLimit: (limitRp: number) => void;
  onDeposit: () => void;
  onReceived: () => void;
};

function BuyerStep({ deal, buyer, busy, onLimit, onDeposit, onReceived }: StepProps) {
  if (deal.seller === buyer) return <p className="panel">This is your own deal. Open the link as someone else.</p>;
  if (deal.buyer !== null && deal.buyer !== buyer) return <p className="panel">This link was already used.</p>;

  switch (deal.state) {
    case "Created":
    case "Waiting":
    case "Retry": {
      const submitted = deal.buyer === buyer && deal.buyer_cts.length >= deal.round;
      if (submitted) return <p className="panel">Your number is sealed. Waiting for the seller…</p>;
      return (
        <LimitForm
          label="Most you'd pay (Rp)"
          retryNote={deal.round > 1 ? "No match last round. You can try again, but only with a higher number." : null}
          busy={busy}
          onSubmit={onLimit}
        />
      );
    }
    case "Computing":
      return <p className="panel">Comparing in sealed code…</p>;
    case "NoDeal":
      return <p className="panel">No deal.</p>;
    case "Matched":
      return (
        <section className="panel">
          <p>Deal at</p>
          <p className="price-input">Rp {rpFromYocto(deal.price!)}</p>
          <button className="primary" disabled={busy} onClick={onDeposit}>
            Pay into escrow
          </button>
        </section>
      );
    case "Funded":
      return (
        <section className="panel">
          <p>Rp {rpFromYocto(deal.price!)} is held in escrow. Confirm once you have the item.</p>
          <button className="primary" disabled={busy} onClick={onReceived}>
            Received
          </button>
        </section>
      );
    case "Released":
      return <p className="panel">Done. Rp {rpFromYocto(deal.price!)} went to the seller.</p>;
    case "Refunded":
      return <p className="panel">Refunded to you.</p>;
  }
}
