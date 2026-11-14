import { useEffect, useState } from "react";
import type { HistoryItem } from "../../../relayer/src/types";
import { currentAccount } from "../accounts";
import { chainFor } from "../client";
import { relayerUrl } from "../config";
import { formatRp, rpFromYocto } from "../format";
import { getHistory } from "../receipts";
import { Link } from "../routes";
import { ReceiptList } from "./ReceiptList";

const STATE_TEXT: Record<string, string> = {
  Matched: "Waiting for payment",
  Funded: "Paid, held in escrow",
  Released: "Complete",
  Refunded: "Refunded",
  NoDeal: "Expired",
};

/** What the signed-in person bought and sold, with proof of each payment. */
export function History() {
  const account = currentAccount();
  if (!account || !relayerUrl) {
    return (
      <main className="page narrow">
        <h1 className="headline">History</h1>
        <p className="muted">{account ? "History needs VITE_RELAYER_URL in the app's environment." : <><Link to="/signin">Connect a NEAR wallet</Link> to see your history.</>}</p>
      </main>
    );
  }
  return <HistoryList account={account} relayerUrl={relayerUrl} />;
}

function HistoryList({ account, relayerUrl }: { account: string; relayerUrl: string }) {
  const [items, setItems] = useState<HistoryItem[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHistory(relayerUrl, chainFor(account).signer).then(setItems).catch((e: Error) => setError(e.message));
  }, [account]);

  if (error) return <main className="page narrow"><p className="error" role="alert">{error}</p></main>;
  if (!items) return <main className="page narrow"><p className="muted">Loading…</p></main>;

  return (
    <main className="page narrow">
      <h1 className="headline">History</h1>
      <Section title="Purchases" items={items.filter((item) => item.role === "buyer")} />
      <Section title="Sales" items={items.filter((item) => item.role === "seller")} />
    </main>
  );
}

function Section({ title, items }: { title: string; items: HistoryItem[] }) {
  return (
    <section>
      <h2>{title}</h2>
      {items.length === 0 && <p className="muted">Nothing here yet.</p>}
      {items.map((item) => (
        <article key={item.dealId} className="flow-card">
          <div className="item-line">
            <div className="thumb-box">{item.photoUrl && <img src={item.photoUrl} alt="" loading="lazy" />}</div>
            <div>
              <strong>{item.title}</strong>
              <p className="num">
                {item.role === "buyer" ? "Seller" : "Buyer"} {item.counterparty}
                {item.priceYocto ? ` · ${formatRp(rpFromYocto(item.priceYocto))}` : ""} · {STATE_TEXT[item.state] ?? item.state}
              </p>
            </div>
          </div>
          <ReceiptList receipts={item.receipts} />
          <Link to={`/chat/${item.dealId}`}>Open chat</Link>
        </article>
      ))}
    </section>
  );
}
