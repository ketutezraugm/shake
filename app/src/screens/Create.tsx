import { useState, type FormEvent } from "react";
import { currentAccount } from "../accounts";
import { clientFor, newLinkToken, saveLinkToken } from "../client";
import { digitsOnly, groupThousands } from "../format";
import { encodeMockLimit, sha256 } from "../mockClient";
import { navigate } from "../routes";
import { AccountStep } from "./AccountStep";

const NO_COMMIT = Array<number>(32).fill(0);

export function Create() {
  const [account, setAccount] = useState(currentAccount);
  if (!account) return <AccountStep onReady={setAccount} />;
  return <DealForm seller={account} />;
}

function DealForm({ seller }: { seller: string }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rounds, setRounds] = useState(2);
  const [minimum, setMinimum] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const minimumRp = Number(minimum);
  const valid = title.trim() !== "" && Number.isInteger(minimumRp) && minimumRp > 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const client = clientFor(seller);
      const token = newLinkToken();
      const id = await client.createDeal(title.trim(), description.trim(), await sha256(token), rounds);
      await client.submitLimit(id, encodeMockLimit(minimumRp), NO_COMMIT, null);
      saveLinkToken(id, token);
      navigate(`/d/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      <h1 className="headline">Sell something</h1>
      <p className="muted">Signed in as {seller}</p>

      <form className="panel" onSubmit={submit}>
        <label>
          What are you selling?
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} required />
        </label>

        <label>
          Details (optional)
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={3} />
        </label>

        <label>
          Rounds
          <select value={rounds} onChange={(e) => setRounds(Number(e.target.value))}>
            <option value={1}>1: one shot</option>
            <option value={2}>2 rounds (default)</option>
            <option value={3}>3 rounds</option>
          </select>
        </label>

        <label>
          Lowest price you'd take (Rp)
          <input
            className="price-input"
            value={groupThousands(minimum)}
            onChange={(e) => setMinimum(digitsOnly(e.target.value))}
            inputMode="numeric"
            required
          />
          <span className="hint">Only the sealed code ever sees this number.</span>
        </label>

        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy || !valid}>
          Create deal link
        </button>
      </form>
    </main>
  );
}
