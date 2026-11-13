import { useState, type FormEvent } from "react";
import { chainFor } from "../client";
import { relayerUrl } from "../config";
import { askAssistant, askSeller, type Auth, type AssistantReply } from "../qa";
import { Link } from "../routes";
import { viewer } from "../session";

type Turn = { question: string; reply: AssistantReply };

/** Asks the assistant about the item; when it doesn't know, the buyer can put the question to the seller. */
export function Assistant({ listingId }: { listingId: string }) {
  const who = viewer();
  const [draft, setDraft] = useState("");
  const [turn, setTurn] = useState<Turn | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!relayerUrl) return <p className="muted">The assistant needs VITE_RELAYER_URL in the app's environment.</p>;
  if (!who) {
    return (
      <p className="muted">
        <Link to="/signin">Sign in</Link> to ask the assistant or the seller.
      </p>
    );
  }
  const url = relayerUrl;
  const auth = (): Auth => (who.kind === "wallet" ? { signer: chainFor(who.account).signer } : { token: who.token });

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function ask(event: FormEvent) {
    event.preventDefault();
    const question = draft.trim();
    if (!question) return;
    setSent(false);
    void run(async () => {
      setTurn({ question, reply: await askAssistant(url, auth(), listingId, question) });
      setDraft("");
    });
  }

  function passToSeller() {
    if (!turn) return;
    void run(async () => {
      await askSeller(url, auth(), listingId, turn.question);
      setSent(true);
    });
  }

  return (
    <section aria-labelledby="assistant-title" className="stack">
      <h2 id="assistant-title" className="section-title">Ask about this item</h2>
      <form className="panel" onSubmit={ask}>
        <label>
          Your question
          <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={500} disabled={busy} />
        </label>
        <button disabled={busy || draft.trim() === ""}>Ask</button>
      </form>

      {busy && <p className="muted" role="status">Thinking…</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {turn && (
        <div role="status">
          <p className="muted">{turn.question}</p>
          {"answer" in turn.reply ? (
            <p className="answer-bubble">{turn.reply.answer}</p>
          ) : (
            <div className="panel">
              <p>The seller didn't mention that. Ask them? Their answer will show here for everyone.</p>
              {sent ? (
                <p className="muted">Sent. The seller's answer will show on this page.</p>
              ) : (
                <button disabled={busy} onClick={passToSeller}>
                  Ask the seller
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
