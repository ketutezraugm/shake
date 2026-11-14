import scratchCard from "../design/assets/stickers/scratch-card.svg";
import { formatRp } from "../format";
import type { Order } from "../orders";
import { Link } from "../routes";
import { tintOf } from "./ListingCard";

/** One order: the item's photo, title and quantity, the negotiated price over the asking price, and where it stands. */
export function OrderCard({ order }: { order: Order }) {
  const negotiated = order.dealRp !== order.askingRp;
  return (
    <Link to={`/l/${order.listingId}`} className={`order-card${order.tab === "new" ? " attention" : ""}`}>
      <div className={`order-photo tint-${tintOf(order.listingId)}`}>
        {order.photoUrl ? <img src={order.photoUrl} alt="" loading="lazy" /> : <img className="sticker" src={scratchCard} alt="" width={36} height={36} />}
        {order.belowAskingPct > 0 && <span className="order-off num">−{order.belowAskingPct}%</span>}
      </div>
      <div className="order-body">
        <span className="offer-row-title">{order.title}</span>
        <span className="order-meta">
          Qty 1 · Buyer {order.buyer}
        </span>
        <span className="offer-row-state">{order.state}</span>
        {order.detail && <span className="offer-row-action">{order.detail}</span>}
      </div>
      <div className="order-prices">
        <span className="order-deal num">{formatRp(order.dealRp)}</span>
        {negotiated && (
          <s className="order-asking num" aria-label={`Asking price ${formatRp(order.askingRp)}`}>
            {formatRp(order.askingRp)}
          </s>
        )}
      </div>
    </Link>
  );
}
