import { useState, type FormEvent } from "react";
import { isValidHandle, saveAccount } from "../accounts";
import { loadIdentity } from "../keys";

// Mock chain only: the test UI skips sign-in and makes an account in this browser (real sign-in is screens/SignIn.tsx).
async function createMockAccount(name: string, storage: Storage): Promise<string> {
  if (!isValidHandle(name)) throw new Error("use 2-32 lowercase letters, digits or single dashes");
  loadIdentity(storage);
  const accountId = `${name}.blind-deal.testnet`;
  saveAccount(accountId, name, storage);
  return accountId;
}

type Props = { onReady: (accountId: string) => void; storage?: Storage };

/** Walletless sign-up: a name and a key made in this browser, nothing to remember. */
export function AccountStep({ onReady, storage = localStorage }: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onReady(await createMockAccount(name, storage));
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      <h1 className="headline">Pick a name</h1>
      <p className="muted">No wallet, no seed phrase. Your key stays in this browser.</p>

      <form className="panel" onSubmit={submit}>
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase())}
            autoComplete="off"
            autoCapitalize="none"
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy || !isValidHandle(name)}>
          Continue
        </button>
      </form>
    </main>
  );
}
