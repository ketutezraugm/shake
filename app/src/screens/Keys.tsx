import { useState, type FormEvent } from "react";
import { currentAccount, exportBackup, importBackup } from "../accounts";
import backIcon from "../design/assets/icons/back.svg";
import checkIcon from "../design/assets/icons/check.svg";
import { Link } from "../routes";
import { loadWalletSession } from "../walletSigner";

/** Frame "Keys": move this account to another device. A wallet user has no key here to move. */
export function Keys() {
  const account = currentAccount();
  const [backup, setBackup] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean | null>(null);
  const [pasted, setPasted] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [imported, setImported] = useState<string | null>(null);

  if (!account) {
    return (
      <main className="page auth-page">
        <h1 className="headline">Use Shake on another device</h1>
        <p className="muted">
          <Link to="/signin">Sign in</Link> first, or paste a backup key below to bring an account to this device.
        </p>
        <ImportForm pasted={pasted} setPasted={setPasted} error={importError} onImport={doImport} />
        {imported && <Welcome account={imported} />}
      </main>
    );
  }

  if (loadWalletSession()) {
    return (
      <main className="page auth-page">
        <Back />
        <h1 className="headline">Use Shake on another device</h1>
        <p className="muted">You sign in with your NEAR wallet, so there is no key to move. Connect the same wallet on the other device.</p>
      </main>
    );
  }

  async function show() {
    const text = exportBackup();
    setBackup(text);
    setCopied(await navigator.clipboard.writeText(text).then(() => true, () => false));
  }

  function download() {
    const url = URL.createObjectURL(new Blob([exportBackup()], { type: "text/plain" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: "shake-backup-key.txt" });
    link.click();
    URL.revokeObjectURL(url);
  }

  function doImport(event: FormEvent) {
    event.preventDefault();
    setImportError(null);
    try {
      setImported(importBackup(pasted));
    } catch (e) {
      setImportError((e as Error).message);
    }
  }

  return (
    <main className="page auth-page">
      <Back />
      <h1 className="headline">Use Shake on another device</h1>
      <p className="muted">Your account key lives on this device. Move it to sign in somewhere else.</p>

      <section className="flow-card">
        <h2>Export key</h2>
        <p className="muted">Anyone with this key can use your account. Keep it private.</p>
        <code className="key-box">{backup ?? "ed25519:••••••••••••••••••••••••"}</code>
        <div className="actions">
          <button className="primary" onClick={() => void show()}>
            Show and copy
          </button>
          <button className="outline-button" onClick={download}>
            Download file
          </button>
        </div>
        {copied !== null && (
          <p className="status-box ok" role="status">
            <img src={checkIcon} alt="" width={16} height={16} />
            {copied ? "Exported. Copied to your clipboard." : "Exported. Select the key above and copy it."}
          </p>
        )}
      </section>

      <section className="flow-card">
        <h2>Import key</h2>
        <p className="muted">This replaces the key on this device with the one you paste.</p>
        <ImportForm pasted={pasted} setPasted={setPasted} error={importError} onImport={doImport} />
        {imported && <Welcome account={imported} />}
      </section>
    </main>
  );
}

function Back() {
  return (
    <Link to="/" className="pill">
      <img src={backIcon} alt="" width={16} height={16} /> Back
    </Link>
  );
}

type ImportProps = { pasted: string; setPasted: (value: string) => void; error: string | null; onImport: (event: FormEvent) => void };

function ImportForm({ pasted, setPasted, error, onImport }: ImportProps) {
  return (
    <form className="auth-email" onSubmit={onImport}>
      <label>
        Paste a backup key from your other device
        <input value={pasted} onChange={(e) => setPasted(e.target.value)} autoComplete="off" spellCheck={false} aria-invalid={error !== null} aria-describedby="import-error" required />
      </label>
      {error && (
        <p id="import-error" className="error" role="alert">
          That key doesn't look right. Check you copied all of it.
        </p>
      )}
      <button className="primary" disabled={!pasted.trim()}>
        Import
      </button>
    </form>
  );
}

function Welcome({ account }: { account: string }) {
  const handle = account.split(".")[0];
  return (
    <p className="status-box ok" role="status">
      <img src={checkIcon} alt="" width={16} height={16} />
      <span>
        Welcome back, @{handle}. <Link to={`/@${handle}`}>Open my shop</Link>
      </span>
    </p>
  );
}
