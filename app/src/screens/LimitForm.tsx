import { useState, type FormEvent } from "react";
import { digitsOnly, groupThousands } from "../format";

type Props = {
  label: string;
  /** Shown from round 2: what a no-deal means and which way the number may move. */
  retryNote: string | null;
  busy: boolean;
  onSubmit: (limitRp: number) => void;
};

export function LimitForm({ label, retryNote, busy, onSubmit }: Props) {
  const [limit, setLimit] = useState("");
  const limitRp = Number(limit);
  const valid = Number.isInteger(limitRp) && limitRp > 0;

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(limitRp);
  }

  return (
    <form className="panel" onSubmit={submit}>
      {retryNote && <p>{retryNote}</p>}
      <label>
        {label}
        <input
          className="price-input"
          value={groupThousands(limit)}
          onChange={(e) => setLimit(digitsOnly(e.target.value))}
          inputMode="numeric"
          required
        />
        <span className="hint">Only the sealed code ever sees this number.</span>
      </label>
      <button className="primary" disabled={busy || !valid}>
        Seal my number
      </button>
    </form>
  );
}
