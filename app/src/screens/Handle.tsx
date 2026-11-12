import { useEffect, useState, type FormEvent } from "react";
import { createAccount, currentAccount, handleSuggestions, isHandleTaken, isValidHandle, openAccount } from "../accounts";
import { loadSession } from "../auth";
import { authConfig, relayerUrl } from "../config";
import backIcon from "../design/assets/icons/back.svg";
import fourFingers from "../design/assets/stickers/four-fingers.svg";
import { Link, navigate } from "../routes";
import { createWalletProfile } from "../wallet";
import { loadWalletSession } from "../walletSigner";

/** Frame "Pick a handle": the shop name that becomes the link in a bio; the account is made behind it. */
export function Handle() {
  const walletSession = loadWalletSession();
  const login = loadSession();
  const signedUp = !walletSession && currentAccount();
  const [handle, setHandle] = useState("");
  const [taken, setTaken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (signedUp) navigate(`/@${signedUp.split(".")[0]}`);
    else if (!walletSession && !login) navigate("/signin");
  }, [signedUp, walletSession, login]);

  async function create(): Promise<string> {
    if (!walletSession && !authConfig) {
      await createAccount(handle);
      return handle;
    }
    if (!relayerUrl) throw new Error("Sign-up needs VITE_RELAYER_URL in the app's environment.");
    if (walletSession) return (await createWalletProfile(relayerUrl, walletSession, handle)).handle;
    await openAccount(relayerUrl, login!.accessToken, handle);
    return handle;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setTaken(null);
    try {
      navigate(`/@${await create()}`);
    } catch (e) {
      if (isHandleTaken(e)) setTaken(handle);
      else setError((e as Error).message);
      setBusy(false);
    }
  }

  const valid = isValidHandle(handle);
  const refused = taken !== null && taken === handle;

  return (
    <main className="page auth-page">
      <Link to="/signin" className="pill">
        <img src={backIcon} alt="" width={16} height={16} /> Back
      </Link>

      <img className="sticker" src={fourFingers} alt="" width={80} height={80} style={{ transform: "rotate(-6deg)", alignSelf: "flex-start" }} />
      <h1 className="headline">Name your shop</h1>
      <p className="muted">This is the link you put in your Instagram or marketplace bio.</p>

      <form className="auth-email" onSubmit={submit}>
        <label>
          Shop handle
          <span className={`handle-field${refused ? " bad" : ""}`}>
            <span aria-hidden="true">@</span>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={32}
              aria-invalid={refused || (handle !== "" && !valid)}
              aria-describedby="handle-help"
              required
              disabled={busy}
            />
          </span>
        </label>
        <p id="handle-help" className={handle !== "" && !valid ? "error" : "hint"}>
          {handle !== "" && !valid ? "Use 2 to 32 lowercase letters or digits. A single dash is fine inside." : "Letters, digits and single dashes."}
        </p>

        {refused && (
          <div role="alert">
            <p className="error">@{handle} is taken. Try one of these:</p>
            <div className="suggestions">
              {handleSuggestions(handle).map((suggestion) => (
                <button type="button" key={suggestion} className="chip" onClick={() => setHandle(suggestion)}>
                  @{suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="info-card">
          <p>Your shop link</p>
          <b>/@{valid ? handle : "…"}</b>
        </div>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {busy && (
          <p className="hint" role="status">
            Creating your account… this takes a few seconds.
          </p>
        )}
        <button className="primary big" disabled={busy || !valid || refused}>
          Open my shop
        </button>
      </form>
    </main>
  );
}
