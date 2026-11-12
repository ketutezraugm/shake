import { useEffect, useState, type ReactNode } from "react";
import pricePin from "../design/assets/stickers/price-pin.svg";
import "../styles/states.css";
import { Link } from "../routes";

/** Frame "404": a page, shop or listing that is not there. */
export function NotFound({ title = "Nothing here", children = "This page moved or never existed." }: { title?: string; children?: ReactNode }) {
  return (
    <main className="page">
      <section className="state-card">
        <img className="sticker" src={pricePin} alt="" width={88} height={88} style={{ transform: "rotate(8deg)" }} />
        <h1 className="headline">{title}</h1>
        <p className="muted">{children}</p>
        <Link to="/" className="primary">
          Browse listings
        </Link>
      </section>
    </main>
  );
}

/** Frame "Something went wrong": a load that failed. Nothing was sent, so trying again is always safe. */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="state-card left" role="alert">
      <p className="error state-title">That didn't work</p>
      <p className="muted">Nothing was charged or sent. Try again in a moment.</p>
      <p className="hint">{message}</p>
      <button className="outline-button" onClick={onRetry}>
        Try again
      </button>
    </section>
  );
}

/** Frame "Offline": shown above every screen while the browser has no connection. */
export function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    addEventListener("online", up);
    addEventListener("offline", down);
    return () => {
      removeEventListener("online", up);
      removeEventListener("offline", down);
    };
  }, []);
  if (online) return null;
  return (
    <div className="offline-banner" role="status">
      <span>You're offline. Some things won't load until you're back.</span>
      <button onClick={() => location.reload()}>Retry</button>
    </div>
  );
}

/** Frame "Loading": static blocks in the cards' shape, no shimmer, so reduced motion needs no special case. */
export function CardSkeletons({ count = 4 }: { count?: number }) {
  return (
    <ul className="grid" aria-busy="true" aria-label="Loading listings">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="card skeleton">
          <div className="skeleton-photo" />
          <div className="card-body">
            <span className="skeleton-line" style={{ width: "90%" }} />
            <span className="skeleton-line" style={{ width: "55%" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Frame "Home: no results". */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <p className="state-title">{title}</p>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}
