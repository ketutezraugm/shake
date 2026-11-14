import { useEffect, useState, type FormEvent } from "react";
import { createAccount, currentAccount, currentHandle, handleSuggestions, isHandleTaken, isValidHandle, saveHandle } from "../accounts";
import { loadSession } from "../auth";
import { authConfig, relayerUrl } from "../config";
import backIcon from "../design/assets/icons/back.svg";
import fourFingers from "../design/assets/stickers/four-fingers.svg";
import priceTag from "../design/assets/stickers/price-tag.svg";
import scratchCard from "../design/assets/stickers/scratch-card.svg";
import { Link, navigate } from "../routes";
import { createWalletProfile, fetchMyProfile, linkLoginToWallet } from "../wallet";
import { loadWalletSession } from "../walletSigner";

/** Frame "What brings you here": a new account says whether it will sell or only buy, then names itself. */
function Intent() {
  return (
    <main className="page auth-page">
      <Link to="/signin" className="pill">
        <img src={backIcon} alt="" width={16} height={16} /> Back
      </Link>
      <h1 className="headline">What brings you here?</h1>
      <p className="muted">You can always do the other later. No new sign-up.</p>
      <div className="choices">
        <Link to="/signup?as=sell" className="choice">
          <img className="sticker" src={priceTag} alt="" width={56} height={56} />
          <span>
            <b>I want to sell</b>
            <small>Open a shop and put one link in your bio.</small>
          </span>
        </Link>
        <Link to="/signup?as=buy" className="choice">
          <img className="sticker" src={scratchCard} alt="" width={56} height={56} />
          <span>
            <b>I just want to buy</b>
            <small>Make private offers. Open a shop whenever you like.</small>
          </span>
        </Link>
      </div>
    </main>
  );
}

/** Frame "Pick a handle": the name that becomes a shop link in a bio (sellers) or shows in chat (buyers); the account is made behind it. */
export function Handle({ intent }: { intent: string | null }) {
  return intent === "sell" || intent === "buy" ? <HandleForm selling={intent === "sell"} /> : <Intent />;
}

function HandleForm({ selling }: { selling: boolean }) {
  const walletSession = loadWalletSession();
  const login = loadSession();
  const signedUp = !walletSession && currentAccount();
  const [handle, setHandle] = useState("");
  const [taken, setTaken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (signedUp) navigate(`/@${currentHandle()}`);
    else if (!walletSession && !login) navigate("/signin");
  }, [signedUp, walletSession, login]);

  async function create(): Promise<string> {
    // Without a Supabase project (local work) there is no wallet either, so the shop is made on the mock chain.
    if (!walletSession) {
      await createAccount(handle);
      return handle;
    }
    if (!relayerUrl) throw new Error("Sign-up needs VITE_RELAYER_URL in the app's environment.");
    // The relayer would rewrite an existing shop's fields, so a returning account is sent to its shop instead.
    const shop = (await fetchMyProfile(relayerUrl, walletSession)) ?? (await createWalletProfile(relayerUrl, walletSession, handle));
    await linkLoginToWallet(relayerUrl, walletSession);
    return shop.handle;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setTaken(null);
    try {
      const saved = await create();
      saveHandle(saved);
      navigate(selling ? `/@${saved}` : "/");
    } catch (e) {
      if (isHandleTaken(e)) setTaken(handle);
      else setError((e as Error).message);
      setBusy(false);
    }
  }

  if (!walletSession && authConfig) {
    return (
      <main className="page auth-page">
        <Link to="/signin" className="pill">
          <img src={backIcon} alt="" width={16} height={16} /> Back
        </Link>
        <h1 className="headline">{selling ? "Open a shop" : "Make an offer"}</h1>
        <p className="muted">
          {selling ? "A shop needs a NEAR wallet: it is the account that gets paid." : "An offer is signed and paid from a NEAR wallet."}{" "}
          <Link to="/signin">Connect a NEAR wallet</Link> to continue.
        </p>
      </main>
    );
  }

  const valid = isValidHandle(handle);
  const refused = taken !== null && taken === handle;

  return (
    <main className="page auth-page">
      <Link to="/signup" className="pill">
        <img src={backIcon} alt="" width={16} height={16} /> Back
      </Link>

      <img className="sticker" src={fourFingers} alt="" width={80} height={80} style={{ transform: "rotate(-6deg)", alignSelf: "flex-start" }} />
      <h1 className="headline">{selling ? "Name your shop" : "Pick a username"}</h1>
      <p className="muted">{selling ? "This is the link you put in your Instagram or marketplace bio." : "Sellers see this name when you make an offer and when you chat."}</p>

      <form className="auth-email" onSubmit={submit}>
        <label>
          {selling ? "Shop handle" : "Username"}
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

        {selling && (
          <div className="info-card">
            <p>Your shop link</p>
            <b>/@{valid ? handle : "…"}</b>
          </div>
        )}

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
          {selling ? "Open my shop" : "Continue"}
        </button>
      </form>
    </main>
  );
}
