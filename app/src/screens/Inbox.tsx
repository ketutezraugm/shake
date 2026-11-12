import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Inbox as InboxData } from "../../../relayer/src/types";
import { currentAccount } from "../accounts";
import { chainFor } from "../client";
import { relayerUrl } from "../config";
import { digitsOnly, formatRp, groupThousands } from "../format";
import { answerQuestion, badgeCount, getInbox, resubmitRound } from "../inbox";
import { Link } from "../routes";
import { storedMinimum } from "../slots";

const POLL_MS = 10_000;

export function Inbox() {
  const account = currentAccount();
  if (!account) {
    return (
      <main className="page narrow">
        <h1 className="headline">Inbox</h1>
        <p className="muted"><Link to="/signin">Sign in</Link> to see your inbox.</p>
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
  return <InboxFor account={account} relayerUrl={relayerUrl} />;
}

function InboxFor({ account, relayerUrl }: { account: string; relayerUrl: string }) {
  const chain = useRef(chainFor(account)).current;
  const [inbox, setInbox] = useState<InboxData | null>(null);
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

  if (!inbox) {
    return (
      <main className="page narrow">
        <h1 className="headline">Inbox</h1>
        {error ? <p className="error" role="alert">{error}</p> : <p className="muted">Loading…</p>}
      </main>
    );
  }

  const count = badgeCount(inbox);
  const empty = inbox.questions.length + inbox.roundsWaiting.length + inbox.matches.length + inbox.newMessages.length === 0;

  return (
    <main className="page narrow">
      <div className="section-head">
        <h1 className="headline">Inbox</h1>
        <span className="num muted">{count > 0 ? `${count} new` : "All caught up"}</span>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {empty && <p className="muted">Nothing yet. Questions, offers and deals land here.</p>}

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

      {inbox.matches.map((m) => (
        <section className="inbox-card" key={m.dealId}>
          <span className="tag">Deal · {m.state}</span>
          <h2>{m.title}</h2>
          <p className="muted">
            {m.role === "seller" ? "Buyer" : "Seller"}: {m.counterparty}
          </p>
          <p>
            <Link to={`/chat/${m.dealId}`}>Message</Link>
            {m.role === "buyer" && <> · <Link to={`/deals/${m.dealId}`}>Open the deal</Link></>}
          </p>
        </section>
      ))}

      {inbox.newMessages.length > 0 && (
        <section className="stack" aria-label="New messages">
          <h2 className="section-title">New messages</h2>
          {inbox.newMessages.map((m) => (
            <Link key={m.id} to={`/chat/${m.dealId}`} className="inbox-card">
              <strong>{m.senderAccount}</strong>
              <span>{m.body}</span>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
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
