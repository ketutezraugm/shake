import { useEffect, useState } from "react";
import { chainFor } from "../client";
import { relayerUrl } from "../config";
import { inTab, loadOrders, ORDER_TABS, tabOf, type Order, type OrderTab } from "../orders";
import { Link } from "../routes";
import { OrderCard } from "./OrderCard";

const POLL_MS = 8000;

const EMPTY: Record<OrderTab, string> = {
  all: "No orders yet. A deal shows up here once a buyer's offer matches your minimum.",
  new: "No new orders.",
  done: "No finished orders yet.",
  cancelled: "No cancelled orders.",
};

/** The seller's orders: every deal that found a price, split by where it stands. */
export function Orders({ account }: { account: string }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<OrderTab>(() => tabOf(location.search));

  useEffect(() => {
    const url = relayerUrl;
    if (!url) return;
    const { signer, client } = chainFor(account);
    const load = () =>
      loadOrders(url, signer, client)
        .then((loaded) => {
          setOrders(loaded);
          setError(null);
        })
        .catch((e: Error) => setError(e.message));
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [account]);

  if (!relayerUrl) return <p className="muted">Orders need VITE_RELAYER_URL in the app's environment.</p>;

  function select(next: OrderTab) {
    setTab(next);
    // replaceState so switching tabs doesn't fill the back button; a refresh keeps the tab.
    history.replaceState(null, "", `?tab=orders&status=${next}`);
  }

  const shown = orders ? inTab(orders, tab) : [];
  return (
    <section className="sales" aria-label="Orders">
      <div className="section-head">
        <h2>Orders</h2>
        <Link to="/history">Receipts</Link>
      </div>
      <div className="order-tabs" role="group" aria-label="Order status">
        {ORDER_TABS.map(({ key, label }) => (
          <button key={key} aria-pressed={tab === key} onClick={() => select(key)}>
            {label}
            {orders && <span className="num order-count">{inTab(orders, key).length}</span>}
          </button>
        ))}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {orders && shown.length === 0 && !error && <p className="muted">{EMPTY[tab]}</p>}
      {shown.map((order) => (
        <OrderCard key={order.dealId} order={order} />
      ))}
    </section>
  );
}
