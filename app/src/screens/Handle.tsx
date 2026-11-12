import { useState, type FormEvent } from "react";
import { claimHandle, currentHandle, isValidHandle } from "../accounts";
import { chain, relayerUrl } from "../config";
import { RelayerError } from "../relayer";
import { keySigner } from "../signer";
import { Link, navigate } from "../routes";
import { loadWalletSession } from "../walletSigner";
import fourFingers from "../design/assets/stickers/four-fingers.svg";

// A taken handle comes back with two dash-joined alternatives (the relayer allows dashes, not dots).
const suggestionsFor = (handle: string) => [`${handle}-preloved`, `${handle}-shop`].filter(isValidHandle);

export function Handle() {
  const [handle, setHandle] = useState("");
  const [taken, setTaken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Only wallet users open a shop; the wallet already holds the account, so this just creates the profile.
  const wallet = loadWalletSession();

  if (currentHandle()) return <Done handle={currentHandle()!} />;
  if (!relayerUrl) return <Notice>Choosing a handle needs VITE_RELAYER_URL in the app's environment.</Notice>;
  if (!wallet) {
    return (
      <Notice>
        <Link to="/signin">Connect a NEAR wallet</Link> first, then pick your handle.
      </Notice>
    );
  }
  const url = relayerUrl;
  const signer = keySigner(wallet.accountId, wallet.secretKey, chain);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setTaken(null);
    try {
      await claimHandle(url, signer, handle);
      navigate(`/@${handle}`);
    } catch (e) {
      if (e instanceof RelayerError && e.status === 409 && /taken/.test(e.message)) setTaken(handle);
      else setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      <img className="sticker" src={fourFingers} alt="" width={80} height={80} />
      <h1 className="headline">Name your shop</h1>
      <p className="muted">This is the link you put in your Instagram or marketplace bio.</p>

      <form className="panel" onSubmit={(e) => void submit(e)}>
        <label>
          Shop handle
          <span>
            @
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
              autoComplete="off"
              autoCapitalize="none"
              maxLength={32}
              disabled={busy}
              required
            />
          </span>
        </label>
        {handle && !isValidHandle(handle) && <p className="muted">Use 2-32 lowercase letters, digits or single dashes.</p>}
        {taken && (
          <div role="alert">
            <p className="error">@{taken} is taken. Try one of these:</p>
            {suggestionsFor(taken).map((option) => (
              <button type="button" key={option} className="chip" onClick={() => { setHandle(option); setTaken(null); }}>
                @{option}
              </button>
            ))}
          </div>
        )}
        {isValidHandle(handle) && <p className="muted">Your shop link: /@{handle}</p>}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" disabled={busy || !isValidHandle(handle)}>Create my shop</button>
        {busy && <p role="status">Creating your shop…</p>}
      </form>
    </main>
  );
}

function Done({ handle }: { handle: string }) {
  return (
    <Notice>
      You already have a shop. <Link to={`/@${handle}`}>Open my shop</Link>
    </Notice>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <main className="screen">
      <h1 className="headline">Name your shop</h1>
      <p className="muted">{children}</p>
    </main>
  );
}
