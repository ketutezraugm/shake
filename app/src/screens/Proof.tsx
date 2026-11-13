import { useEffect, useState } from "react";
import { chain } from "../config";
import type { Deal } from "../contract";
import lockIcon from "../design/assets/icons/lock.svg";
import { checkOwnOffer, shortHash, TEE_CODE_HASH, toHex, type RoundProof } from "../proof";

const ROUND_TEXT: Record<RoundProof["status"], string> = {
  matches: "the number on the chain is exactly the one you sent.",
  differs: "the number on the chain does NOT match what you sent. Do not pay, and tell the team.",
  unavailable: "can't be checked here. Your offer is only saved in the browser you made it in.",
};

/** Frame "Proof panel": why an offer stays private, and the one claim this browser can check for itself. */
export function ProofPanel({ deal }: { deal: Deal }) {
  const [rounds, setRounds] = useState<RoundProof[] | null>(null);
  const sellerCommit = deal.seller_commits.at(-1);

  useEffect(() => {
    let current = true;
    void checkOwnOffer(deal).then((result) => current && setRounds(result));
    return () => {
      current = false;
    };
  }, [deal]);

  return (
    <details className="proof">
      <summary>
        <img src={lockIcon} alt="" width={20} height={20} /> How is this private?
      </summary>

      <div className="proof-body">
        <section>
          <h3>Your offer</h3>
          {rounds === null && <p className="hint">Checking…</p>}
          {rounds?.length === 0 && <p className="muted">You have not sent an offer yet.</p>}
          {rounds?.map(({ round, status }) => (
            <p key={round} className={`proof-row ${status}`} role={status === "differs" ? "alert" : undefined}>
              <b>Round {round}:</b> {ROUND_TEXT[status]}
            </p>
          ))}
        </section>

        <section>
          <h3>The seller's number</h3>
          <p>
            Sealed. Only a fingerprint is on the chain
            {sellerCommit && <> (<code title={toHex(sellerCommit)}>{shortHash(toHex(sellerCommit))}</code>)</>}. Nobody can read the number behind it, including you.
          </p>
        </section>

        <section>
          <h3>What the sealed machine says</h3>
          <p>Only "deal" or "no deal", and a price when there is a deal. Never either number.</p>
        </section>

        <section>
          <h3>The code it runs</h3>
          <p>
            Public and pinned. The key that opens offers only works for this exact build:
          </p>
          <p>
            <code title={TEE_CODE_HASH}>{shortHash(TEE_CODE_HASH)}</code>
          </p>
          {chain.contractId && (
            <p>
              <a href={`https://testnet.nearblocks.io/address/${chain.contractId}`} target="_blank" rel="noreferrer">
                See the deal contract on the chain
              </a>
            </p>
          )}
        </section>

        <p className="hint">
          One honest limit: OutLayer runs the machine and is operated centrally today, so you trust it to run this code as published.
        </p>
      </div>
    </details>
  );
}
