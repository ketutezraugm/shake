import { useEffect, useState } from "react";
import type { Question } from "../../../relayer/src/types";
import { currentAccount } from "../accounts";
import { CATEGORY_LABELS } from "../categories";
import { chainFor } from "../client";
import { relayerUrl } from "../config";
import backIcon from "../design/assets/icons/back.svg";
import priceTag from "../design/assets/stickers/price-tag.svg";
import { formatRp } from "../format";
import type { ShopListing } from "../market";
import { market } from "../marketSource";
import { claimSlot } from "../offer";
import { Link, navigate } from "../routes";
import { Assistant } from "./Assistant";
import { OwnListing } from "./OwnListing";
import { Questions } from "./Questions";
import { ErrorState, NotFound } from "./States";

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

  if (!account) return <p className="muted"><Link to="/signin">Connect a NEAR wallet</Link> to make an offer.</p>;
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

function Gallery({ photos, title }: { photos: string[]; title: string }) {
  const [shown, setShown] = useState(0);
  const photo = photos[shown];
  return (
    <div className="gallery-wrap">
      <div className="gallery" role="img" aria-label={photo ? `Photo ${shown + 1} of ${photos.length} of ${title}` : `No photo yet for ${title}`}>
        {photo ? <img src={photo} alt="" /> : "Photo"}
      </div>
      {photos.length > 1 && (
        <div className="thumbs">
          {photos.map((url, i) => (
            <button key={url} className="thumb" aria-label={`Show photo ${i + 1}`} aria-current={i === shown} onClick={() => setShown(i)}>
              <img src={url} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Listing({ id }: { id: string }) {
  const [loaded, setLoaded] = useState<Loaded | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  // Bumped after the seller changes the listing (an answer, more slots, closing) or taps "Try again".
  const [version, setVersion] = useState(0);

  useEffect(() => setLoaded(undefined), [id]);

  useEffect(() => {
    let current = true;
    setError(null);
    Promise.all([market.listing(id), market.questions(id)])
      .then(([listing, questions]) => current && setLoaded(listing ? { listing, questions } : null))
      .catch((e: Error) => current && setError(e.message));
    return () => {
      current = false;
    };
  }, [id, version]);

  if (error) return <main className="page"><ErrorState message={error} onRetry={() => setVersion((v) => v + 1)} /></main>;
  if (loaded === undefined) return <main className="page"><p className="muted">Loading…</p></main>;
  if (loaded === null) return <NotFound title="Listing not found">It may have been removed by the seller.</NotFound>;

  const { listing, questions } = loaded;
  const handle = listing.sellerHandle;
  const isOwn = currentAccount() === listing.sellerAccount;
  const note = statusNote(listing);

  return (
    <main className="page">
      <Link to="/" className="pill">
        <img src={backIcon} alt="" width={16} height={16} /> Back
      </Link>

      <div className="listing-layout">
        <div className="listing-media">
          <Gallery photos={listing.photoUrls} title={listing.title} />
        </div>
        <div className="listing-info">
      <h1 className="title">{listing.title}</h1>
      <p className="price-block">
        <span className="label">Asking price</span>
        <span className="value">{formatRp(listing.askingPrice)}</span>
      </p>
      <div className="facts">
        <span className="fact">{CATEGORY_LABELS[listing.category]}</span>
        <span className="fact">
          Up to {listing.maxRounds} {listing.maxRounds === 1 ? "round" : "rounds"}
        </span>
        {listing.status === "open" && listing.freeSlots > 0 && <span className="fact">{listing.freeSlots} offers left</span>}
      </div>
      {listing.description && <p>{listing.description}</p>}

      {handle ? (
        <Link to={`/@${handle}`} className="seller-card">
          <span className="avatar" aria-hidden="true">{handle.charAt(0).toUpperCase()}</span>
          <span>
            <strong>@{handle}</strong>
            <span className="muted"> · visit shop</span>
          </span>
        </Link>
      ) : (
        <p className="seller-card muted">{listing.sellerAccount}</p>
      )}

      {isOwn ? (
        <OwnListing listing={listing} onChanged={() => setVersion((v) => v + 1)} />
      ) : (
      <section className="blind-box" aria-label="How offers work">
        <div className="blind-box-top">
          <img className="sticker" src={priceTag} alt="" />
          <div>
            <h2>Make a blind offer, up to the asking price.</h2>
            <p>
              The seller has a secret lowest price. If your offer meets it, you both get one fair price in between. Offering the full ask
              always matches. Chat opens once you have a deal.
            </p>
          </div>
        </div>
        {note && <p role="status">{note}</p>}
        {!note && <OfferButton listing={listing} />}
      </section>
      )}

      {!isOwn && <Assistant listingId={listing.id} />}
      <Questions questions={questions} />
        </div>
      </div>
    </main>
  );
}
