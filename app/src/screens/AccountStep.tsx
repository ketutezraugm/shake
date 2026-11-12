import { useState, type FormEvent } from "react";
import { createAccount, isValidName } from "../accounts";

/** Walletless sign-up: a name and a key made in this browser, nothing to remember. */
export function AccountStep({ onReady }: { onReady: (accountId: string) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onReady(await createAccount(name));
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
        <button className="primary" disabled={busy || !isValidName(name)}>
          Continue
        </button>
      </form>
    </main>
  );
}
