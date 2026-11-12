import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Message } from "../../../relayer/src/types";
import { currentAccount } from "../accounts";
import { chainFor } from "../client";
import { relayerUrl } from "../config";
import type { Deal } from "../contract";
import { getMessages, sendMessage } from "../inbox";
import { Link } from "../routes";

const POLL_MS = 3000;
const CHAT_OPEN = new Set(["Matched", "Funded", "Released", "Refunded"]);

/** The buyer-and-seller chat for one deal; it only exists after a match. */
export function Chat({ dealId }: { dealId: number }) {
  const account = currentAccount();
  if (!account) {
    return (
      <main className="screen">
        <h1 className="headline">Chat</h1>
        <p className="muted"><Link to="/signin">Sign in</Link> to open your chat.</p>
      </main>
    );
  }
  if (!relayerUrl) {
    return (
      <main className="screen">
        <h1 className="headline">Chat</h1>
        <p className="muted">Chat needs VITE_RELAYER_URL in the app's environment.</p>
      </main>
    );
  }
  return <DealChat dealId={dealId} account={account} relayerUrl={relayerUrl} />;
}

function DealChat({ dealId, account, relayerUrl }: { dealId: number; account: string; relayerUrl: string }) {
  const chain = useRef(chainFor(account)).current;
  const [deal, setDeal] = useState<Deal | null | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastId = useRef<number | undefined>(undefined);

  useEffect(() => {
    let current = true;
    async function load() {
      try {
        const loaded = await chain.client.getDeal(dealId);
        if (!current) return;
        setDeal(loaded);
        if (!loaded || !CHAT_OPEN.has(loaded.state)) return;
        const fresh = await getMessages(relayerUrl, chain.signer, dealId, lastId.current);
        if (!current || fresh.length === 0) return;
        lastId.current = fresh[fresh.length - 1]?.id;
        setMessages((shown) => [...shown, ...fresh]);
      } catch (e) {
        if (current) setError((e as Error).message);
      }
    }
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, [dealId]);

  async function send(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const sent = await sendMessage(relayerUrl, chain.signer, dealId, draft);
      lastId.current = Math.max(lastId.current ?? 0, sent.id);
      setMessages((shown) => [...shown, sent]);
      setDraft("");
    } catch (e) {
      setError(`Not sent. ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  if (deal === undefined) return <main className="screen"><p className="muted">Loading…</p></main>;
  if (deal === null || (deal.buyer !== account && deal.seller !== account)) {
    return <main className="screen"><h1 className="headline">Chat</h1><p className="muted">This chat isn't yours.</p></main>;
  }
  const other = deal.seller === account ? (deal.buyer ?? "the buyer") : deal.seller;

  if (!CHAT_OPEN.has(deal.state)) {
    return (
      <main className="screen">
        <h1 className="headline">Chat</h1>
        <p className="panel">Chat opens once you have a deal.</p>
        <p><Link to="/inbox">Back to inbox</Link></p>
      </main>
    );
  }

  return (
    <main className="screen">
      <h1 className="headline">{other}</h1>
      <p className="muted">You have a deal. Chat is open.</p>

      <ul aria-label="Messages">
        {messages.map((m) => (
          <li key={m.id}>
            <span className="muted">{m.senderAccount === account ? "You" : other}</span> {m.body}
          </li>
        ))}
      </ul>

      {error && <p className="error" role="alert">{error}</p>}
      <form onSubmit={send}>
        <label>
          Message
          <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000} disabled={busy} />
        </label>
        <button className="primary" disabled={busy || draft.trim() === ""}>
          {busy ? "Sending…" : "Send"}
        </button>
      </form>
    </main>
  );
}
