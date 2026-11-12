import { useEffect, useState, type FormEvent } from "react";
import { currentAccess, currentHandle, finishWalletSignIn, markViewer } from "../accounts";
import { accessToken, authConfigured, sendEmailLink, signInWithGoogle } from "../auth";
import { chain, relayerUrl } from "../config";
import { Link, navigate } from "../routes";
import { leave } from "../session";
import { disconnectWallet, nearConnector } from "../wallet";
import { connectWallet, WrongNetworkError } from "../walletSigner";
import backIcon from "../design/assets/icons/back.svg";
import handUnderCloth from "../design/assets/stickers/hand-under-cloth.svg";

async function leaveAndReturn() {
  await leave();
  navigate("/signin");
}

export function SignIn() {
  const handle = currentHandle();
  if (handle) return <SignedIn handle={handle} />;
  if (!relayerUrl || !authConfigured) {
    return (
      <main className="screen">
        <h1 className="headline">Sign in to Shake</h1>
        <p className="error" role="alert">
          Sign-in needs VITE_RELAYER_URL, VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the app's environment.
        </p>
      </main>
    );
  }
  if (currentAccess() === "viewer") return <Viewer relayerUrl={relayerUrl} />;
  return <SignInForm relayerUrl={relayerUrl} />;
}

function SignedIn({ handle }: { handle: string }) {
  return (
    <main className="screen">
      <h1 className="headline">You are signed in</h1>
      <p className="muted">
        As <Link to={`/@${handle}`}>@{handle}</Link>.
      </p>
      <button className="outline-button" onClick={() => void leaveAndReturn()}>Sign out</button>
    </main>
  );
}

/** A Google/email login can browse; this is where it is sent to connect a wallet before buying or selling. */
function Viewer({ relayerUrl }: { relayerUrl: string }) {
  return (
    <main className="screen">
      <img className="sticker" src={handUnderCloth} alt="" width={72} height={72} />
      <h1 className="headline">Connect a NEAR wallet to buy or sell</h1>
      <p className="muted">Your Google or email sign-in lets you browse. Offers, payments and your shop run on NEAR, so they need a wallet.</p>
      <ConnectWallet relayerUrl={relayerUrl} />
      <Link to="/" className="outline-button">Keep browsing</Link>
      <button className="outline-button" onClick={() => void leaveAndReturn()}>Sign out</button>
    </main>
  );
}

type Wallet = "idle" | "connecting" | "declined";

function ConnectWallet({ relayerUrl }: { relayerUrl: string }) {
  const [wallet, setWallet] = useState<Wallet>("idle");
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setError(null);
    setWallet("connecting");
    let session;
    try {
      session = await connectWallet(await nearConnector(), chain);
    } catch (e) {
      if (e instanceof WrongNetworkError) {
        // Drop the mainnet login so the next attempt opens the wallet fresh instead of reusing it.
        await disconnectWallet();
        setError(e.message);
        setWallet("idle");
        return;
      }
      // A closed or refused popup is a choice, not a failure worth an error message.
      setWallet("declined");
      return;
    }
    try {
      const handle = await finishWalletSignIn(relayerUrl, session);
      navigate(handle ? `/@${handle}` : "/handle");
    } catch (e) {
      setError((e as Error).message);
      setWallet("idle");
    }
  }

  return (
    <>
      <button className="outline-button" disabled={wallet === "connecting"} onClick={() => void connect()}>
        Connect NEAR wallet
      </button>
      {wallet === "connecting" && <p role="status">Connecting… Approve in your wallet.</p>}
      {wallet === "declined" && <p role="status">Not connected. You said no in the wallet. Try again?</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </>
  );
}

function SignInForm({ relayerUrl }: { relayerUrl: string }) {
  const [email, setEmail] = useState("");
  const [linkSentTo, setLinkSentTo] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google and the email link both land back here with a Supabase login, which only unlocks browsing.
  useEffect(() => {
    let live = true;
    void accessToken().then((token) => {
      if (!token || !live) return;
      setFinishing(true);
      markViewer();
      navigate("/");
    });
    return () => {
      live = false;
    };
  }, []);

  async function google() {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function emailLink(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await sendEmailLink(email.trim());
      setLinkSentTo(email.trim());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (finishing) {
    return (
      <main className="screen">
        <h1 className="headline">Signing you in…</h1>
        <p className="muted" role="status">This takes a few seconds.</p>
      </main>
    );
  }

  return (
    <main className="screen">
      <Link to="/" className="pill">
        <img src={backIcon} alt="" width={16} height={16} /> Back
      </Link>
      <img className="sticker" src={handUnderCloth} alt="" width={72} height={72} />
      <h1 className="headline">Sign in to Shake</h1>
      <p className="muted">Browse with Google or email. Make offers, open your shop and chat with a NEAR wallet.</p>

      <button className="primary" onClick={() => void google()}>Continue with Google</button>

      <form className="panel" onSubmit={(e) => void emailLink(e)}>
        <label>
          Or use your email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <button className="outline-button" disabled={!email}>Email me a sign-in link</button>
        {linkSentTo && <p role="status">Link sent to {linkSentTo}. Open it on this device.</p>}
      </form>

      <p className="muted">To buy or sell</p>
      <ConnectWallet relayerUrl={relayerUrl} />

      {error && <p className="error" role="alert">{error}</p>}
      <p className="muted">Testnet only.</p>
    </main>
  );
}
