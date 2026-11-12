import { useEffect, useState } from "react";
import type { Question } from "../../../relayer/src/types";
import { currentAccount } from "../accounts";
import { chainFor } from "../client";
import { relayerUrl } from "../config";
import { formatRp } from "../format";
import type { ShopListing } from "../market";
import { market } from "../marketSource";
import { claimSlot } from "../offer";
import { Link, navigate } from "../routes";
import { Assistant } from "./Assistant";
import { Questions } from "./Questions";

type Loaded = { listing: ShopListing; questions: Question[] };

/** What the status means for a buyer; `null` when the listing takes offers. */
function statusNote(listing: ShopListing): string | null {
  if (listing.status === "reserved") return "Reserved: another buyer has a deal in progress. It reopens if that deal falls through.";
  if (listing.status === "sold") return "Sold.";
  if (listing.status === "closed") return "The seller has closed this listing.";
  if (listing.freeSlots === 0) return "Offers full for now. Try again later.";
  return null;
}

/** Claims one of the listing's slots, then opens the buyer's offer screen on that deal. */
function OfferButton({ listing }: { listing: ShopListing }) {
  const account = currentAccount();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!account) return <p className="muted"><Link to="/signin">Sign in</Link> to make an offer.</p>;
  if (!relayerUrl) return <p className="muted">Offers need VITE_RELAYER_URL in the app's environment.</p>;
  const url = relayerUrl;

  async function start() {
    if (!account) return;
    setBusy(true);
    setError(null);
    try {
      const { dealId } = await claimSlot(url, chainFor(account).signer, listing);
      navigate(`/deals/${dealId}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <button className="primary" disabled={busy} onClick={() => void start()}>
        Make a blind offer
      </button>
      {error && <p className="error" role="alert">{error}</p>}
    </>
  );
}

export function Listing({ id }: { id: string }) {
  const [loaded, setLoaded] = useState<Loaded | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    setLoaded(undefined);
    setError(null);
    Promise.all([market.listing(id), market.questions(id)])
      .then(([listing, questions]) => current && setLoaded(listing ? { listing, questions } : null))
      .catch((e: Error) => current && setError(e.message));
    return () => {
      current = false;
    };
  }, [id]);

  if (error) return <main className="screen"><p className="error" role="alert">{error}</p></main>;
  if (loaded === undefined) return <main className="screen"><p className="muted">Loading…</p></main>;
  if (loaded === null) {
    return (
      <main className="screen">
        <h1 className="headline">Listing not found</h1>
        <p><Link to="/">Back to browse</Link></p>
      </main>
    );
  }

  const { listing, questions } = loaded;
  const handle = listing.sellerAccount.split(".")[0];
  const isOwn = currentAccount() === listing.sellerAccount;
  const note = statusNote(listing);

  return (
    <main className="screen">
      <p><Link to="/">Back</Link></p>
      {listing.photoUrls.map((url) => (
        <img key={url} src={url} alt="" />
      ))}
      <h1 className="headline">{listing.title}</h1>
      <p><span className="muted">Asking price</span> {formatRp(listing.askingPrice)}</p>
      {listing.description && <p>{listing.description}</p>}
      <p className="muted">
        {listing.category} · up to {listing.maxRounds} {listing.maxRounds === 1 ? "round" : "rounds"}
      </p>
      <p>
        Sold by <Link to={`/@${handle}`}>@{handle}</Link>
      </p>

      <section className="panel" aria-label="How offers work">
        <p>Make a blind offer, up to the asking price.</p>
        <p className="muted">
          The seller has a secret lowest price. If your offer meets it, you both get one fair price in between. Offering the full ask always
          matches. Chat opens once you have a deal.
        </p>
        {note && <p role="status">{note}</p>}
        {!note && !isOwn && <OfferButton listing={listing} />}
        {isOwn && <p className="muted">This is your listing.</p>}
      </section>

      {!isOwn && <Assistant listingId={listing.id} />}
      <Questions questions={questions} />
    </main>
  );
}
