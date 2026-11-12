import { useEffect, useState, type FormEvent } from "react";
import { currentAccount } from "../accounts";
import { chainFor } from "../client";
import { relayerUrl } from "../config";
import type { Deal } from "../contract";
import { digitsOnly, formatRp, groupThousands, rpFromYocto } from "../format";
import { market } from "../marketSource";
import { lastOffer, loadNegotiation, offerView, submitOffer, syncListing, type Negotiation, type OfferView } from "../offer";
import { Link } from "../routes";

const POLL_MS = 3000;

export function Offer({ dealId }: { dealId: number }) {
  const account = currentAccount();
  const negotiation = loadNegotiation(dealId);
  if (!account) {
    return (
      <main className="screen">
        <h1 className="headline">Your offer</h1>
        <p className="muted"><Link to="/signin">Sign in</Link> to see your offer.</p>
      </main>
    );
  }
  if (!negotiation) {
    return (
      <main className="screen">
        <h1 className="headline">Your offer</h1>
        <p className="muted">Open the listing and tap "Make a blind offer" to start one on this device.</p>
        <p><Link to="/">Back to browse</Link></p>
      </main>
    );
  }
  return <OfferDeal dealId={dealId} account={account} negotiation={negotiation} />;
}

function OfferDeal({ dealId, account, negotiation }: { dealId: number; account: string; negotiation: Negotiation }) {
  const [deal, setDeal] = useState<Deal | null | undefined>(undefined);
  const [reservedDealId, setReservedDealId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const chain = chainFor(account);

  async function reload() {
    const [loaded, listing] = await Promise.all([chain.client.getDeal(dealId), market.listing(negotiation.listingId)]);
    setDeal(loaded);
    setReservedDealId(listing?.reservedDealId ?? null);
  }

  useEffect(() => {
    const load = () => reload().catch((e: Error) => setError(e.message));
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [dealId, account]);

  async function act(action: () => Promise<void>, syncAfter = false) {
    setBusy(true);
    setError(null);
    try {
      await action();
      if (syncAfter && relayerUrl) await syncListing(relayerUrl, negotiation.listingId);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error && deal === undefined) return <main className="screen"><p className="error" role="alert">{error}</p></main>;
  if (deal === undefined) return <main className="screen"><p className="muted">Loading…</p></main>;
  if (deal === null) return <main className="screen"><h1 className="headline">Offer not found</h1><p><Link to="/">Back to browse</Link></p></main>;

  const view = offerView(deal, account, { reservedDealId });

  return (
    <main className="screen">
      <h1 className="headline">{negotiation.title}</h1>
      <p className="muted">Asking {formatRp(negotiation.askingPrice)}</p>

      <OfferStep
        view={view}
        deal={deal}
        negotiation={negotiation}
        busy={busy}
        onOffer={(limit) =>
          act(() => submitOffer({ deal, limit, askingPrice: negotiation.askingPrice, linkToken: negotiation.linkToken, client: chain.client, teePubkey: chain.teePubkey }))
        }
        onPay={() => act(() => chain.client.deposit(dealId), true)}
        onReceived={() => act(() => chain.client.confirmReceived(dealId), true)}
      />

      {error && <p className="error" role="alert">{error}</p>}
    </main>
  );
}

type StepProps = {
  view: OfferView;
  deal: Deal;
  negotiation: Negotiation;
  busy: boolean;
  onOffer: (limit: string) => void;
  onPay: () => void;
  onReceived: () => void;
};

function OfferStep({ view, deal, negotiation, busy, onOffer, onPay, onReceived }: StepProps) {
  const more = <p><Link to="/">See similar items</Link> · <Link to={`/l/${negotiation.listingId}`}>Back to the listing</Link></p>;

  switch (view.kind) {
    case "enter":
    case "retry":
      return (
        <OfferForm
          round={view.round}
          rounds={view.rounds}
          retry={view.kind === "retry"}
          askingPrice={negotiation.askingPrice}
          floor={view.kind === "retry" ? lastOffer(deal.id) : null}
          busy={busy}
          onLock={onOffer}
        />
      );
    case "computing":
      return (
        <section className="panel" role="status">
          <p>Sealed on your phone.</p>
          <p>Comparing in the sealed machine…</p>
          <p className="muted">This can take a few dozen seconds. You can leave; the result will be here when you come back.</p>
        </section>
      );
    case "waitingSeller":
      return (
        <section className="panel" role="status">
          <h2>Waiting for the seller</h2>
          <p>
            Your offer is sealed. The seller needs to open round {view.round} before it's compared. Your offer: {formatRp(lastOffer(deal.id) ?? "0")}{" "}
            <span className="muted">· only you see this</span>
          </p>
          {more}
        </section>
      );
    case "noDeal":
      return (
        <section className="panel">
          <h2>No deal</h2>
          <p>That was your last round on this item. Neither of you learns more than that.</p>
          {more}
        </section>
      );
    case "expired":
      return (
        <section className="panel">
          <p>The deal ran out before payment. The item is open again.</p>
          {more}
        </section>
      );
    case "beaten":
      return (
        <section className="panel" role="status">
          <h2>Another buyer got there first</h2>
          <p>
            Your offer met the seller's price, but another buyer's deal reserved the item a moment earlier. You pay nothing, and your number stays
            private.
          </p>
          <p className="muted">If their payment doesn't arrive in time, the item opens again.</p>
          {more}
        </section>
      );
    case "matched":
      return (
        <section className="panel">
          <p>Cocok!</p>
          <h2>It's a deal</h2>
          <p className="price-input">Rp {rpFromYocto(view.price)}</p>
          <p className="muted">Neither of you will see the other's number. The item is reserved for you. Pay within 24 hours to keep it.</p>
          <button className="primary" disabled={busy} onClick={onPay}>
            Pay Rp {rpFromYocto(view.price)}
          </button>
        </section>
      );
    case "funded":
      return (
        <section className="panel">
          <h2>Payment is held</h2>
          <p>Rp {rpFromYocto(view.price)} goes to the seller when you tap Received.</p>
          <p className="muted">
            Got the item? Tap Received once it's in your hands. If it never arrives, you get your money back after the deadline
            {view.deadlineNs !== null && `: ${new Date(view.deadlineNs / 1e6).toLocaleDateString()}`}.
          </p>
          <button className="primary" disabled={busy} onClick={onReceived}>
            Received
          </button>
        </section>
      );
    case "released":
      return <section className="panel"><p>Rp {rpFromYocto(view.price)} sent to the seller. Enjoy it.</p>{more}</section>;
    case "refunded":
      return <section className="panel"><p>Your payment came back to you.</p>{more}</section>;
    case "notYours":
      return <section className="panel"><p>This offer belongs to another account.</p></section>;
  }
}

type FormProps = {
  round: number;
  rounds: number;
  retry: boolean;
  askingPrice: string;
  floor: string | null;
  busy: boolean;
  onLock: (limit: string) => void;
};

function OfferForm({ round, rounds, retry, askingPrice, floor, busy, onLock }: FormProps) {
  const [limit, setLimit] = useState("");
  const [confirming, setConfirming] = useState(false);
  const valid = limit !== "" && BigInt(limit) <= BigInt(askingPrice) && (floor === null || BigInt(limit) >= BigInt(floor));
  const tooHigh = limit !== "" && BigInt(limit) > BigInt(askingPrice);

  function review(event: FormEvent) {
    event.preventDefault();
    if (valid) setConfirming(true);
  }

  if (confirming) {
    return (
      <section className="panel">
        <h2>Lock this offer?</h2>
        <p className="price-input">{formatRp(limit)}</p>
        <p className="muted">You can't change it this round. If there's a deal, you pay this or less.</p>
        <button className="primary" disabled={busy} onClick={() => onLock(limit)}>
          Lock {formatRp(limit)}
        </button>
        <button disabled={busy} onClick={() => setConfirming(false)}>Change the amount</button>
      </section>
    );
  }

  return (
    <form className="panel" onSubmit={review}>
      {retry && (
        <>
          <h2>No deal this round</h2>
          <p>Your numbers didn't meet. Neither of you learns more than that. You can raise your offer.</p>
        </>
      )}
      <p className="muted">Round {round} of {rounds}</p>
      <label>
        The most you'd pay (Rp)
        <input
          className="price-input"
          value={groupThousands(limit)}
          onChange={(e) => setLimit(digitsOnly(e.target.value))}
          inputMode="numeric"
          required
        />
        <span className="hint">
          Only you will ever see this number. Up to {formatRp(askingPrice)}, the asking price.
          {floor !== null && ` Round ${round} can only go up from ${formatRp(floor)}.`}
        </span>
      </label>
      <button type="button" onClick={() => setLimit(askingPrice)}>Offer the asking price</button>
      <p className="muted">Offer the asking price and you'll pay it or less. Offer less and the seller never learns your number.</p>
      {tooHigh && (
        <p className="error" role="alert">
          That's above the asking price. The most you can offer is {formatRp(askingPrice)}.
        </p>
      )}
      <button className="primary" disabled={!valid}>Review my offer</button>
    </form>
  );
}
