import { CATEGORY_LABELS } from "../categories";
import scratchCard from "../design/assets/stickers/scratch-card.svg";
import { formatRp } from "../format";
import type { ShopListing } from "../market";
import { Link } from "../routes";

/** The four soft photo-box colours from the design, picked by id so a card keeps its colour. */
const tintOf = (id: string) => [...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 4;

function badgeOf(listing: ShopListing): { text: string; muted: boolean } {
  if (listing.status === "reserved") return { text: "Reserved", muted: true };
  if (listing.status === "open" && listing.freeSlots === 0) return { text: "Offers full", muted: true };
  return { text: "Blind offer", muted: false };
}

/** One item in a grid: photo, title, the seller's asking price and its state. The sealed minimum is never shown. */
export function ListingCard({ listing }: { listing: ShopListing }) {
  const photo = listing.photoUrls[0];
  const badge = badgeOf(listing);
  return (
    <li>
      <Link to={`/l/${listing.id}`} className="card">
        <div className={`card-photo tint-${tintOf(listing.id)}`}>{photo ? (
            <img src={photo} alt="" loading="lazy" />
          ) : (
            <span className="no-photo">
              <img className="sticker" src={scratchCard} alt="" width={52} height={52} style={{ transform: "rotate(-6deg)" }} />
              No photo
            </span>
          )}</div>
        <div className="card-body">
          <span className="card-title">{listing.title}</span>
          <span className="card-price">{formatRp(listing.askingPrice)}</span>
          <span className="card-meta">{CATEGORY_LABELS[listing.category]}</span>
          <span className={badge.muted ? "badge muted-badge" : "badge"}>{badge.text}</span>
        </div>
      </Link>
    </li>
  );
}
