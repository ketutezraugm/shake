import { useEffect, useState, type FormEvent } from "react";
import { currentAccount, saveHandle } from "../accounts";
import { errorFromHash, googleSignInUrl, saveSession, sendEmailLink } from "../auth";
import { authConfig, chain, relayerUrl } from "../config";
import backIcon from "../design/assets/icons/back.svg";
import checkIcon from "../design/assets/icons/check.svg";
import shakeMark from "../design/assets/logo/shake-mark.svg";
import { Link, navigate } from "../routes";
import { fetchMyProfile, signInWithWallet } from "../wallet";

type WalletState = "idle" | "connecting" | "rejected";

// Without a Supabase project there is no email to send, so local work signs in with a short-lived stand-in token.
const STAND_IN_HOUR = 60 * 60 * 1000;

/** Frame "Sign in": Google, an email link, or a NEAR wallet; a new login then picks a shop handle. */
export function SignIn() {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const redirectTo = `${location.origin}/signin`;

  // main.tsx takes a returned session; a cancelled Google or an expired link comes back here with an error after the `#`.
  useEffect(() => {
    if (errorFromHash(location.hash)) {
      setError(errorFromHash(location.hash));
    } else if (currentAccount()) {
      navigate("/");
    }
  }, []);

  function standIn() {
    saveSession({ accessToken: "stand-in", expiresAt: Date.now() + STAND_IN_HOUR });
    navigate("/signup");
  }

  async function sendLink(event: FormEvent) {
    event.preventDefault();
    if (!authConfig) return standIn();
    setBusy(true);
    setError(null);
    try {
      await sendEmailLink(authConfig, email.trim(), redirectTo);
      setSentTo(email.trim());
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  function google() {
    if (!authConfig) return standIn();
    location.assign(googleSignInUrl(authConfig, redirectTo));
  }

  async function connectWallet() {
    setWallet("connecting");
    try {
      const session = await signInWithWallet();
      // A returning account keeps its shop; only a first sign-in names one.
      const shop = relayerUrl ? await fetchMyProfile(relayerUrl, session) : null;
      if (shop) saveHandle(shop.handle);
      navigate(shop ? `/@${shop.handle}` : "/signup");
    } catch {
      setWallet("rejected");
    }
  }

  return (
    <main className="page auth-page">
      <Link to="/" className="pill">
        <img src={backIcon} alt="" width={16} height={16} /> Back
      </Link>

      <div className="auth-head">
        <h1 className="headline">Sign in to Shake</h1>
        <img className="sticker" src={shakeMark} alt="" width={72} height={72} style={{ transform: "rotate(6deg)" }} />
      </div>
      <p className="muted">Make offers, open your shop, chat after a deal.</p>

      <button className="primary big" onClick={google} disabled={busy}>
        Continue with Google
      </button>

      <form className="auth-email" onSubmit={sendLink}>
        <label>
          Or use your email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required disabled={busy} />
        </label>
        <button className="outline-button" disabled={busy || !email}>
          Email me a sign-in link
        </button>
      </form>

      {sentTo && (
        <p className="status-box ok" role="status">
          <img src={checkIcon} alt="" width={20} height={20} />
          Link sent to {sentTo}. Open it on this phone.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!authConfig && <p className="hint">Local mode: no Supabase project is set, so signing in skips the email.</p>}

      <p className="auth-divider" aria-hidden="true">
        <span />
        Already use NEAR?
        <span />
      </p>

      <button className="outline-button" onClick={() => void connectWallet()} disabled={!chain.contractId || wallet === "connecting"}>
        Connect NEAR wallet
      </button>
      {!chain.contractId && <p className="hint">Wallet sign-in needs VITE_CONTRACT_ID in the app's environment.</p>}
      {wallet === "connecting" && (
        <p className="status-box" role="status">
          <b>Connecting…</b> Approve in your wallet.
        </p>
      )}
      {wallet === "rejected" && (
        <p className="status-box bad" role="alert">
          <b>Not connected.</b> You said no in the wallet. Try again?
        </p>
      )}

      <p className="hint auth-foot">No crypto needed. We set up your account behind the scenes. Testnet only.</p>
    </main>
  );
}
