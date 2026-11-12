import { useState, type FormEvent } from "react";
import { CATEGORIES, type Category } from "../../../relayer/src/types";
import { currentAccount } from "../accounts";
import { chain, relayerUrl, SLOTS_AT_PUBLISH, teePubkey } from "../config";
import { digitsOnly, groupThousands } from "../format";
import { exportSecretKey } from "../keys";
import { nearClient } from "../nearClient";
import { publishListing, type PublishStep } from "../publish";
import { Link, navigate } from "../routes";
import { keySigner } from "../signer";

const CATEGORY_LABELS: Record<Category, string> = {
  electronics: "Electronics",
  fashion: "Fashion",
  home: "Home",
  vehicles: "Vehicles",
  hobbies: "Hobbies",
  other: "Other",
};

function progressText(step: PublishStep | null): string {
  if (!step) return "";
  if (step.stage === "listing") return "Creating your listing…";
  if (step.stage === "photos") return `Uploading photos (${step.done} of ${step.total})…`;
  return `Sealing your minimum into offer slots (${step.done} of ${step.total})…`;
}

export function Sell() {
  const account = currentAccount();
  if (!account) {
    return (
      <main className="screen">
        <h1 className="headline">Sell something</h1>
        <p className="muted">
          <Link to="/signin">Sign in</Link> first so your listing has a seller account.
        </p>
      </main>
    );
  }
  if (!relayerUrl || !teePubkey || !chain.contractId) {
    return (
      <main className="screen">
        <h1 className="headline">Sell something</h1>
        <p className="error" role="alert">
          Selling needs VITE_RELAYER_URL, VITE_TEE_PUBKEY and VITE_CONTRACT_ID in the app's environment.
        </p>
      </main>
    );
  }
  return <SellForm account={account} relayerUrl={relayerUrl} teePubkey={teePubkey} />;
}

type FormProps = { account: string; relayerUrl: string; teePubkey: string };

function SellForm({ account, relayerUrl, teePubkey }: FormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("other");
  const [maxRounds, setMaxRounds] = useState(2);
  const [minimum, setMinimum] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [step, setStep] = useState<PublishStep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = step !== null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setStep({ stage: "listing" });
    try {
      const signer = keySigner(account, exportSecretKey(), chain);
      const id = await publishListing({
        title,
        description,
        category,
        maxRounds,
        minimum,
        photos,
        slotCount: SLOTS_AT_PUBLISH,
        signer,
        client: nearClient(signer, chain),
        teePubkey,
        relayerUrl,
        onProgress: setStep,
      });
      navigate(`/l/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setStep(null);
    }
  }

  return (
    <main className="screen">
      <h1 className="headline">Sell something</h1>
      <p className="muted">Signed in as {account}</p>

      <form className="panel" onSubmit={submit}>
        <label>
          What are you selling?
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} required disabled={busy} />
        </label>

        <label>
          Details (optional)
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={3} disabled={busy} />
        </label>

        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)} disabled={busy}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>

        <label>
          Photos (up to 4, JPEG, PNG or WebP, 2 MB each)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={busy}
            onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
          />
        </label>

        <label>
          Rounds
          <select value={maxRounds} onChange={(e) => setMaxRounds(Number(e.target.value))} disabled={busy}>
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
            disabled={busy}
          />
          <span className="hint">Buyers never see it. Only the sealed code compares it, and it stays in this browser.</span>
        </label>

        {error && <p className="error" role="alert">{error}</p>}
        {busy && <p className="muted" role="status">{progressText(step)}</p>}
        <button className="primary" disabled={busy || title.trim() === "" || minimum === ""}>
          Publish listing
        </button>
      </form>
    </main>
  );
}
