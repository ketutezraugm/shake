import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Message } from "../../../relayer/src/types";
import { chainFor } from "../client";
import type { Deal } from "../contract";
import { rpFromYocto } from "../format";
import { getMessages, sendMessage } from "../inbox";

const POLL_MS = 3000;
const CHAT_OPEN = new Set(["Matched", "Funded", "Released", "Refunded"]);

const HELD: Record<string, string> = {
  Matched: "payment pending",
  Funded: "payment held",
  Released: "paid out",
  Refunded: "refunded",
};

type Chain = ReturnType<typeof chainFor>;

/** The buyer-and-seller chat for one deal, shown in the inbox's right pane; it only exists after a match. */
export function ChatThread({ dealId, account, relayerUrl, chain }: { dealId: number; account: string; relayerUrl: string; chain: Chain }) {
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

  if (deal === undefined) return <p className="muted">Loading…</p>;
  if (deal === null || (deal.buyer !== account && deal.seller !== account)) {
    return <p className="muted">This chat isn't yours.</p>;
  }
  const other = deal.seller === account ? (deal.buyer ?? "the buyer") : deal.seller;

  if (!CHAT_OPEN.has(deal.state)) {
    return <p className="flow-card">Chat opens once you have a deal.</p>;
  }

  return (
    <>
      <div className="chat-head">
        <span className="avatar" aria-hidden="true">{other.charAt(0).toUpperCase()}</span>
        <div>
          <strong>{other}</strong>
          <p className="muted num">
            {deal.price ? `Deal Rp ${rpFromYocto(deal.price)} · ` : ""}
            {HELD[deal.state]}
          </p>
        </div>
      </div>
      <p className="note">You have a deal. Chat is open.</p>

      <ul className="bubbles" aria-label="Messages">
        {messages.map((m) => (
          <li key={m.id} className={m.senderAccount === account ? "bubble mine" : "bubble"}>
            {m.body}
          </li>
        ))}
      </ul>

      {error && <p className="error" role="alert">{error}</p>}
      <form className="composer" onSubmit={send}>
        <label className="sr-only" htmlFor="chat-message">Message</label>
        <input id="chat-message" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000} disabled={busy} placeholder="Message" />
        <button className="primary" disabled={busy || draft.trim() === ""}>
          {busy ? "Sending…" : "Send"}
        </button>
      </form>
    </>
  );
}
