import { useCallback, useEffect, useMemo, useState } from "react";
import type { Inbox, SellerListing } from "../../../relayer/src/types";
import { currentAccount } from "../accounts";
import { chainFor } from "../client";
import { relayerUrl } from "../config";
import lockIcon from "../design/assets/icons/lock.svg";
import { answerQuestion, getInbox } from "../inbox";
import type { ShopListing } from "../market";
import type { Deal } from "../contract";
import { canReopen, closeListing, myListing, reopenListing, slotsToAdd } from "../ownListing";
import { addSlots, storedMinimum } from "../slots";
import { AnswerQuestion } from "./Inbox";

type Props = { listing: ShopListing; onChanged: () => void };

/** What the status means for the seller; the buyer-facing wording ("another buyer", "the seller") would read wrong here. */
function ownNote(listing: ShopListing): string | null {
  if (listing.status === "reserved") return "A buyer has a deal in progress. Message them from your inbox. It reopens if the deal falls through.";
  if (listing.status === "sold") return "Sold.";
  if (listing.status === "closed") return "You closed this listing, so buyers can no longer make offers.";
  return null;
}

/** Frame "Your listing": what the seller sees in place of the blind-offer box on their own item. */
export function OwnListing(props: Props) {
  const account = currentAccount();
  if (!account || !relayerUrl) {
    return (
      <section className="blind-box own-listing" aria-label="Your listing">
        <span className="tag">Your listing</span>
        <p className="muted">Managing your listing needs a signed-in account and VITE_RELAYER_URL in the app's environment.</p>
      </section>
    );
  }
  return <Manage {...props} account={account} relayerUrl={relayerUrl} />;
}

function Manage({ listing, onChanged, account, relayerUrl }: Props & { account: string; relayerUrl: string }) {
  const chain = useMemo(() => chainFor(account), [account]);
  const [mine, setMine] = useState<SellerListing | null>(null);
  const [questions, setQuestions] = useState<Inbox["questions"]>([]);
  const [adding, setAdding] = useState<{ done: number; total: number } | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [holder, setHolder] = useState<Deal | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [found, inbox] = await Promise.all([myListing(relayerUrl, chain.signer, listing.id), getInbox(relayerUrl, chain.signer)]);
    setMine(found ?? null);
    setQuestions(inbox.questions.filter((q) => q.listingId === listing.id));
  }, [relayerUrl, chain, listing.id]);

  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
  }, [load]);

  // A reserved listing can be stuck on a buyer who matched and never paid; only the deal's state on chain tells.
  useEffect(() => {
    if (listing.status !== "reserved" || listing.reservedDealId === null) return setHolder(null);
    chain.client.getDeal(listing.reservedDealId).then(setHolder, () => setHolder(null));
  }, [chain, listing.status, listing.reservedDealId]);

  const open = listing.status === "open";
  const note = ownNote(listing);
  const toAdd = mine ? slotsToAdd(mine.slots.length) : 0;
  const hasMinimum = storedMinimum(listing.id) !== null;

  async function add() {
    setError(null);
    setAdding({ done: 0, total: toAdd });
    try {
      await addSlots({
        listingId: listing.id,
        count: toAdd,
        maxRounds: listing.maxRounds,
        ...chain,
        relayerUrl,
        onProgress: (done, total) => setAdding({ done, total }),
      });
    } catch (e) {
      setError((e as Error).message);
    }
    setAdding(null);
    await load().catch((e: Error) => setError(e.message));
    onChanged();
  }

  async function reopen() {
    setError(null);
    try {
      await reopenListing(chain.client, relayerUrl, listing.id, listing.reservedDealId!);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function close() {
    setError(null);
    try {
      await closeListing(relayerUrl, chain.signer, listing.id);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
      setConfirmClose(false);
    }
  }

  return (
    <section className="blind-box own-listing" aria-label="Your listing">
      <span className="tag">Your listing</span>
      <p className="own-note">
        <img src={lockIcon} alt="" width={16} height={16} />
        Your lowest price is sealed. Nobody sees it, not even us.
      </p>
      {note && <p role="status">{note}</p>}
      {canReopen(holder) && (
        <>
          <p className="hint">The buyer had 24 hours to pay and did not. Reopen the listing so others can make offers.</p>
          <button className="primary" onClick={() => void reopen()}>
            Reopen listing
          </button>
        </>
      )}

      {mine && open ? (
        <p className="num">
          <b>
            {mine.freeSlots} of {mine.slots.length}
          </b>{" "}
          offers left
          {questions.length > 0 && ` · ${questions.length} ${questions.length === 1 ? "question" : "questions"} waiting`}
        </p>
      ) : (
        open && !error && <p className="muted">Loading…</p>
      )}

      {questions.map((q) => (
        <AnswerQuestion
          key={q.id}
          title={q.listingTitle}
          question={q.question}
          onAnswer={async (text) => {
            await answerQuestion(relayerUrl, chain.signer, q.id, text);
            await load();
            onChanged();
          }}
        />
      ))}

      {open && mine && (
        <>
          <div className="actions">
            <button className="primary" disabled={adding !== null || toAdd === 0 || !hasMinimum} onClick={() => void add()}>
              {adding ? `Sealing slot ${adding.done + 1} of ${adding.total}…` : "Add offer slots"}
            </button>
            {confirmClose ? (
              <>
                <button className="outline-button" onClick={() => void close()}>
                  Yes, close it
                </button>
                <button className="link-button" onClick={() => setConfirmClose(false)}>
                  Keep it open
                </button>
              </>
            ) : (
              <button className="outline-button" disabled={adding !== null} onClick={() => setConfirmClose(true)}>
                Close listing
              </button>
            )}
          </div>
          <p className="hint">
            {!hasMinimum
              ? "Open this on the device you listed from to add slots: your lowest price is only kept there."
              : toAdd === 0
                ? "All 10 offer slots are made."
                : `Add offer slots makes ${toAdd} more, up to 10.`}
            {confirmClose && " Closing stops new offers for good."}
          </p>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
