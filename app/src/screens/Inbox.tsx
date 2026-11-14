import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { Inbox as InboxData } from "../../../relayer/src/types";
import { currentAccount } from "../accounts";
import { chainFor } from "../client";
import { relayerUrl } from "../config";
import { digitsOnly, formatRp, groupThousands } from "../format";
import { currentHandle } from "../accounts";
import { answerQuestion, badgeCount, getInbox, resubmitRound, splitInbox, type InboxSide } from "../inbox";
import { Link } from "../routes";
import { storedMinimum } from "../slots";
import { ChatThread } from "./Chat";

const POLL_MS = 10_000;

/**
 * Conversations on the left, the open one on the right; on a phone the list and the chat take turns.
 * `/inbox` is the buying side; the shop's Inbox tab passes `side="selling"` and `embedded`.
 */
export function Inbox({ dealId, side = "buying", embedded = false }: { dealId?: number; side?: InboxSide; embedded?: boolean }) {
  const account = currentAccount();
  if (!account) {
    return (
      <main className="page narrow">
        <h1 className="headline">Inbox</h1>
        <p className="muted"><Link to="/signin">Connect a NEAR wallet</Link> to see your inbox.</p>
      </main>
    );
  }
  if (!relayerUrl) {
    return (
      <main className="page narrow">
        <h1 className="headline">Inbox</h1>
        <p className="muted">The inbox needs VITE_RELAYER_URL in the app's environment.</p>
      </main>
    );
  }
  return <InboxFor account={account} relayerUrl={relayerUrl} dealId={dealId} side={side} embedded={embedded} />;
}

type ForProps = { account: string; relayerUrl: string; dealId?: number; side: InboxSide; embedded: boolean };

function InboxFor({ account, relayerUrl, dealId, side: wanted, embedded }: ForProps) {
  const chain = useRef(chainFor(account)).current;
  const [everything, setInbox] = useState<InboxData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    try {
      setInbox(await getInbox(relayerUrl, chain.signer));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    void reload();
    const timer = setInterval(() => void reload(), POLL_MS);
    return () => clearInterval(timer);
  }, []);

  if (!everything) {
    return (
      <main className="page narrow">
        <h1 className="headline">Inbox</h1>
        {error ? <p className="error" role="alert">{error}</p> : <p className="muted">Loading…</p>}
      </main>
    );
  }

  // A chat link carries only a deal number, so the open deal says which side of the inbox it belongs to.
  const side: InboxSide = dealId === undefined ? wanted : everything.matches.find((m) => m.dealId === dealId)?.role === "seller" ? "selling" : "buying";
  const inbox = splitInbox(everything, side);
  const home = side === "selling" ? `/@${currentHandle()}?tab=inbox` : "/inbox";
  const count = badgeCount(inbox);
  const tasks = inbox.roundsWaiting.length + inbox.questions.length;
  const unread = (id: number) => inbox.newMessages.filter((m) => m.dealId === id);

  return (
    <Root embedded={embedded} className={`${embedded ? "inbox embedded" : "page inbox"}${dealId === undefined ? "" : " chat-open"}`}>
      <aside className="inbox-list" aria-label="Conversations">
        <div className="section-head">
          {embedded ? <h2 className="headline">Inbox</h2> : <h1 className="headline">{side === "selling" ? "Shop inbox" : "Inbox"}</h1>}
          <span className="num muted">{count > 0 ? `${count} new` : "All caught up"}</span>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        {tasks > 0 && (
          <Link to={home} className="convo" current={dealId === undefined}>
            <span className="avatar" aria-hidden="true">!</span>
            <span className="convo-text">
              <strong>Needs you</strong>
              <span className="muted">{tasks === 1 ? "1 thing to answer" : `${tasks} things to answer`}</span>
            </span>
          </Link>
        )}
        {inbox.matches.map((m) => {
          const fresh = unread(m.dealId);
          return (
            <Link key={m.dealId} to={`/chat/${m.dealId}`} className="convo" current={m.dealId === dealId}>
              <span className="avatar" aria-hidden="true">{m.counterparty.charAt(0).toUpperCase()}</span>
              <span className="convo-text">
                <strong>{m.counterparty}</strong>
                <span className="muted">{fresh.at(-1)?.body ?? m.title}</span>
              </span>
              {fresh.length > 0 && <span className="convo-badge num">{fresh.length}</span>}
            </Link>
          );
        })}
        {tasks === 0 && inbox.matches.length === 0 && <p className="muted">Nothing yet. Questions, offers and deals land here.</p>}
      </aside>

      <section className="inbox-pane" aria-label={dealId === undefined ? "Needs you" : "Chat"}>
        {dealId !== undefined ? (
          <>
            <Link to={home} className="mobile-only">← All conversations</Link>
            <ChatThread key={dealId} dealId={dealId} account={account} relayerUrl={relayerUrl} chain={chain} />
            {inbox.matches.some((m) => m.dealId === dealId && m.role === "buyer") && <Link to={`/deals/${dealId}`}>Open the deal</Link>}
          </>
        ) : tasks === 0 ? (
          <p className="inbox-empty muted">Pick a conversation to read it here.</p>
        ) : (
          <>
            {inbox.roundsWaiting.map((r) => (
              <RoundRequest
                key={r.dealId}
                request={r}
                onOpen={async (limit) => {
                  await resubmitRound({ listingId: r.listingId, dealId: r.dealId, round: r.round, limit, client: chain.client, teePubkey: chain.teePubkey });
                  await reload();
                }}
              />
            ))}
            {inbox.questions.map((q) => (
              <AnswerQuestion
                key={q.id}
                title={q.listingTitle}
                question={q.question}
                onAnswer={async (text) => {
                  await answerQuestion(relayerUrl, chain.signer, q.id, text);
                  await reload();
                }}
              />
            ))}
          </>
        )}
      </section>
    </Root>
  );
}

/** Inside the shop the inbox sits in the page's own `<main>`, so it is a plain block there. */
function Root({ embedded, className, children }: { embedded: boolean; className: string; children: ReactNode }) {
  return embedded ? <div className={className}>{children}</div> : <main className={className}>{children}</main>;
}

type RoundProps = { request: InboxData["roundsWaiting"][number]; onOpen: (limit?: string) => Promise<void> };

function RoundRequest({ request, onOpen }: RoundProps) {
  const minimum = storedMinimum(request.listingId);
  const [lowering, setLowering] = useState(false);
  const [limit, setLimit] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(value?: string) {
    setBusy(true);
    setError(null);
    try {
      await onOpen(value);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  function lower(event: FormEvent) {
    event.preventDefault();
    void run(limit);
  }

  return (
    <section className="inbox-card attention">
      <span className="tag">Round {request.round} requested</span>
      <h2>A buyer raised their offer on {request.title}</h2>
      <p>Open round {request.round} to compare it.</p>
      <p className="muted">
        {minimum ? `Your lowest price stays ${formatRp(minimum)}, or you can lower it.` : "Open this on the device you listed from to answer."}
      </p>
      {error && <p className="error" role="alert">{error}</p>}
      {lowering ? (
        <form className="stack" onSubmit={lower}>
          <label>
            New lowest price
            <span className="amount-field">
              <span aria-hidden="true">Rp</span>
              <input value={groupThousands(limit)} onChange={(e) => setLimit(digitsOnly(e.target.value))} inputMode="numeric" aria-label="New lowest price in Rupiah" />
            </span>
          </label>
          <button className="primary" disabled={busy || limit === ""}>
            Open round {request.round} at this price
          </button>
        </form>
      ) : (
        <div className="actions">
          <button className="primary" disabled={busy || !minimum} onClick={() => void run()}>
            Open round {request.round}
          </button>
          <button className="outline-button" disabled={busy || !minimum} onClick={() => setLowering(true)}>
            Lower price
          </button>
        </div>
      )}
    </section>
  );
}

type AnswerProps = { title: string; question: string; onAnswer: (text: string) => Promise<void> };

export function AnswerQuestion({ title, question, onAnswer }: AnswerProps) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onAnswer(text);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <form className="inbox-card" onSubmit={submit}>
      <span className="tag">New question</span>
      <h2>"{question}"</h2>
      <p className="muted">{title} · your answer shows to everyone</p>
      <label>
        Your answer
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} disabled={busy} />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" disabled={busy || text.trim() === ""}>
        Answer
      </button>
    </form>
  );
}
