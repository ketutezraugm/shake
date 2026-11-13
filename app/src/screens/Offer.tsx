import { useEffect, useRef, useState, type FormEvent } from "react";
import { currentAccount } from "../accounts";
import { chainFor } from "../client";
import { relayerUrl } from "../config";
import type { Receipt, ReceiptKind } from "../../../relayer/src/types";
import type { Deal } from "../contract";
import chatIcon from "../design/assets/icons/chat.svg";
import clippedTags from "../design/assets/stickers/clipped-tags.svg";
import escrowBox from "../design/assets/stickers/escrow-box.svg";
import handUnderCloth from "../design/assets/stickers/hand-under-cloth.svg";
import sealedMachine from "../design/assets/stickers/sealed-machine.svg";
import { digitsOnly, formatRp, groupThousands, rpFromYocto } from "../format";
import { market } from "../marketSource";
import { lastOffer, loadNegotiation, offerView, submitOffer, syncListing, type Negotiation, type OfferView } from "../offer";
import { getHistory, postReceipt } from "../receipts";
import { Link } from "../routes";
import { ReceiptList } from "./ReceiptList";
import { ProofPanel } from "./Proof";

const POLL_MS = 3000;

export function Offer({ dealId }: { dealId: number }) {
  const account = currentAccount();
  const negotiation = loadNegotiation(dealId);
  if (!account) {
    return (
      <main className="page">
        <h1 className="headline">Your offer</h1>
        <p className="muted"><Link to="/signin">Connect a NEAR wallet</Link> to see your offer.</p>
      </main>
    );
  }
  if (!negotiation) {
    return (
      <main className="page">
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
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const chain = chainFor(account);
  const syncedMatch = useRef(false);

  async function reload() {
    const [loaded, listing] = await Promise.all([chain.client.getDeal(dealId), market.listing(negotiation.listingId)]);
    // A match reserves the item for this buyer, so tell the relayer once as soon as it is seen: browse and the seller's
    // list then show it reserved, and a second buyer's match sees "Another buyer got there first".
    if (loaded?.state === "Matched" && relayerUrl && !syncedMatch.current) {
      syncedMatch.current = true;
      // A failed call is tried again on the next poll.
      syncListing(relayerUrl, negotiation.listingId).catch(() => {
        syncedMatch.current = false;
      });
    }
    setDeal(loaded);
    setReservedDealId(listing?.reservedDealId ?? null);
  }

  useEffect(() => {
    const load = () => reload().catch((e: Error) => setError(e.message));
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [dealId, account]);

  // Receipts only exist once money has moved, so look for them when the deal reaches Funded, Released or Refunded.
  useEffect(() => {
    if (!relayerUrl || !deal || !["Funded", "Released", "Refunded"].includes(deal.state)) return;
    getHistory(relayerUrl, chain.signer)
      .then((history) => setReceipts(history.find((item) => item.dealId === dealId)?.receipts ?? []))
      .catch((e: Error) => setError(e.message));
  }, [deal?.state]);

  // The money has moved by now, so a receipt that fails to save is reported without calling the payment failed.
  async function withReceipt(kind: ReceiptKind, money: () => Promise<string | null>) {
    const txHash = await money();
    if (!txHash || !relayerUrl) return;
    await postReceipt(relayerUrl, chain.signer, dealId, { kind, txHash }).catch((e: Error) => setError(`Done, but the receipt was not saved. ${e.message}`));
  }

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

  if (error && deal === undefined) return <main className="page"><p className="error" role="alert">{error}</p></main>;
  if (deal === undefined) return <main className="page"><p className="muted">Loading…</p></main>;
  if (deal === null) return <main className="page"><h1 className="headline">Offer not found</h1><p><Link to="/">Back to browse</Link></p></main>;

  const view = offerView(deal, account, { reservedDealId });

  return (
    <main className="page offer-layout">
      <div className="item-line">
        <div className="thumb-box" aria-hidden="true" />
        <div>
          <strong>{negotiation.title}</strong>
          <p>Asking {formatRp(negotiation.askingPrice)}</p>
        </div>
      </div>

      <OfferStep
        view={view}
        deal={deal}
        negotiation={negotiation}
        busy={busy}
        onOffer={(limit) =>
          act(() => submitOffer({ deal, limit, askingPrice: negotiation.askingPrice, linkToken: negotiation.linkToken, client: chain.client, teePubkey: chain.teePubkey }))
        }
        onPay={() => act(() => withReceipt("deposit", () => chain.client.deposit(dealId)), true)}
        onReceived={() => act(() => withReceipt("release", () => chain.client.confirmReceived(dealId)), true)}
        onRefund={() => act(() => chain.client.refund(dealId), true)}
      />

      <ReceiptList receipts={receipts} />

      {error && <p className="error" role="alert">{error}</p>}
      {deal.buyer_commits.length > 0 && <ProofPanel deal={deal} />}
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
  onRefund: () => void;
};

const Amount = ({ rp }: { rp: string }) => (
  <>
    <small>Rp</small> {rp}
  </>
);

function OfferStep({ view, deal, negotiation, busy, onOffer, onPay, onReceived, onRefund }: StepProps) {
  const more = (
    <p>
      <Link to="/">See similar items</Link> · <Link to={`/l/${negotiation.listingId}`}>Back to the listing</Link>
    </p>
  );
  const message = (
    <Link to={`/chat/${deal.id}`} className="link-button">
      <img src={chatIcon} alt="" width={20} height={20} /> Message the seller
    </Link>
  );

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
        <section className="flow-card" role="status">
          <img className="sticker" src={sealedMachine} alt="" style={{ alignSelf: "center" }} />
          <p>Sealed on your phone.</p>
          <h2>Comparing in the sealed machine…</h2>
          <p className="muted">This can take a few dozen seconds. You can leave; the result will be here when you come back.</p>
        </section>
      );
    case "waitingSeller":
      return (
        <section className="flow-card" role="status">
          <img className="sticker" src={handUnderCloth} alt="" style={{ alignSelf: "center" }} />
          <span className="eyebrow">Round {view.round} of {view.rounds}</span>
          <h2>Waiting for the seller</h2>
          <p>Your offer is sealed. The seller needs to open round {view.round} before it's compared.</p>
          <p>
            Your offer: <strong className="num">{formatRp(lastOffer(deal.id) ?? "0")}</strong> <span className="muted">· only you see this</span>
          </p>
          {more}
        </section>
      );
    case "noDeal":
      return (
        <section className="flow-card">
          <h2>No deal</h2>
          <p>That was your last round on this item. Neither of you learns more than that.</p>
          {more}
        </section>
      );
    case "expired":
      return (
        <section className="flow-card">
          <p>The deal ran out before payment. The item is open again.</p>
          {more}
        </section>
      );
    case "beaten":
      return (
        <section className="flow-card" role="status">
          <span className="eyebrow">Reserved by someone else</span>
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
        <>
          <section className="reveal reveal-card" aria-live="polite">
            <span className="confetti a" aria-hidden="true" />
            <span className="confetti b" aria-hidden="true" />
            <span className="confetti c" aria-hidden="true" />
            <span className="confetti d" aria-hidden="true" />
            <img className="reveal-sticker" src={clippedTags} alt="" />
            <p className="cocok">Cocok!</p>
            <h1>It's a deal</h1>
            <p className="big-amount deal-price num">
              <Amount rp={rpFromYocto(view.price)} />
            </p>
            <p className="note muted">Neither of you will see the other's number. The item is reserved for you. Pay within 24 hours to keep it.</p>
          </section>
          <button className="primary big" disabled={busy} onClick={onPay}>
            {busy ? "Paying…" : `Pay ${formatRp(rpFromYocto(view.price))}`}
          </button>
          {message}
        </>
      );
    case "funded":
      return (
        <>
          <section className="flow-card">
            <img className="sticker corner-sticker" src={escrowBox} alt="" />
            <span className="eyebrow">Deal price</span>
            <p className="big-amount deal-price num">
              <Amount rp={rpFromYocto(view.price)} />
            </p>
            <p>Payment is held. It goes to the seller when you tap Received.</p>
          </section>
          <ol className="steps-row" aria-label="Payment steps">
            <li className="done">Paid</li>
            <li className="now">Held</li>
            <li>Received</li>
          </ol>
          <div className="info-card">
            <b>Got the item?</b>
            <p>Tap Received once it's in your hands. If it never arrives, you get your money back after the deadline.</p>
            {view.deadlineNs !== null && <p className="num">Deadline: {new Date(view.deadlineNs / 1e6).toLocaleDateString()}</p>}
          </div>
          <button className="primary big" disabled={busy} onClick={onReceived}>
            Received
          </button>
          {message}
        </>
      );
    case "refundable":
      return (
        <>
          <section className="flow-card">
            <span className="eyebrow">Held in escrow</span>
            <p className="big-amount deal-price num">
              <Amount rp={rpFromYocto(view.price)} />
            </p>
            <p>The delivery deadline has passed.</p>
          </section>
          <div className="info-card">
            <b>Didn't get the item?</b>
            <p>You can take your money back now. If the item did arrive, tap Received instead.</p>
          </div>
          <button className="primary big" disabled={busy} onClick={onRefund}>
            Get my money back
          </button>
          <button className="outline-button" disabled={busy} onClick={onReceived}>
            Received
          </button>
          {message}
        </>
      );
    case "released":
      return (
        <section className="flow-card">
          <h2>Paid out</h2>
          <p>{formatRp(rpFromYocto(view.price))} sent to the seller. Enjoy it.</p>
          {more}
        </section>
      );
    case "refunded":
      return (
        <section className="flow-card">
          <p>Your payment came back to you.</p>
          {more}
        </section>
      );
    case "notYours":
      return <section className="flow-card"><p>This offer belongs to another account.</p></section>;
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
  const tooLow = limit !== "" && floor !== null && BigInt(limit) < BigInt(floor);

  function review(event: FormEvent) {
    event.preventDefault();
    if (valid) setConfirming(true);
  }

  if (confirming) {
    return (
      <section className="flow-card">
        <span className="eyebrow">Round {round} of {rounds}</span>
        <h2>Lock this offer?</h2>
        <p className="big-amount num">
          <Amount rp={groupThousands(limit)} />
        </p>
        <p className="muted">You can't change it this round. If there's a deal, you pay this or less.</p>
        <button className="primary big" disabled={busy} onClick={() => onLock(limit)}>
          {busy ? "Sealing…" : `Lock ${formatRp(limit)}`}
        </button>
        <button className="link-button" disabled={busy} onClick={() => setConfirming(false)}>
          Change the amount
        </button>
      </section>
    );
  }

  return (
    <form className="flow-card" onSubmit={review}>
      {retry && (
        <>
          <h2>No deal this round</h2>
          <p>Your numbers didn't meet. Neither of you learns more than that. You can raise your offer.</p>
        </>
      )}
      <span className="eyebrow">Round {round} of {rounds}</span>
      <label>
        The most you'd pay
        <span className="amount-field">
          <span aria-hidden="true">Rp</span>
          <input value={groupThousands(limit)} onChange={(e) => setLimit(digitsOnly(e.target.value))} inputMode="numeric" aria-label="Your offer in Rupiah" required />
        </span>
        <span className="hint">
          Only you will ever see this number. Up to {formatRp(askingPrice)}, the asking price.
          {floor !== null && ` Round ${round} can only go up from ${formatRp(floor)}.`}
        </span>
      </label>
      <div className="chips">
        <button type="button" className="chip" onClick={() => setLimit(askingPrice)}>
          Offer the asking price
        </button>
      </div>
      <p className="muted">Offer the asking price and you'll pay it or less. Offer less and the seller never learns your number.</p>
      {tooHigh && (
        <p className="error" role="alert">
          That's above the asking price. The most you can offer is {formatRp(askingPrice)}.
        </p>
      )}
      {tooLow && floor !== null && (
        <p className="error" role="alert">
          You can only raise your offer. Your last offer was {formatRp(floor)}.
        </p>
      )}
      <button className="primary big" disabled={!valid}>
        Review my offer
      </button>
    </form>
  );
}
