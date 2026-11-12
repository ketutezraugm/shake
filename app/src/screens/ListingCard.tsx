import { formatRp } from "../format";
import type { ShopListing } from "../market";
import { Link } from "../routes";

/** One item in a grid: photo, title and the seller's asking price (the sealed minimum is never shown). */
export function ListingCard({ listing }: { listing: ShopListing }) {
  const photo = listing.photoUrls[0];
  const badge =
    listing.status === "reserved" ? "Reserved" : listing.status === "open" && listing.freeSlots === 0 ? "Offers full" : null;
  return (
    <li>
      <Link to={`/l/${listing.id}`}>
        {photo && <img src={photo} alt="" loading="lazy" />}
        <span>{listing.title}</span>
        <span> {formatRp(listing.askingPrice)}</span>
        {badge && <span className="muted"> {badge}</span>}
      </Link>
    </li>
  );
}
