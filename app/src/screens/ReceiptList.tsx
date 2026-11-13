import type { Receipt } from "../../../relayer/src/types";
import { escrowUrl, txUrl } from "../explorer";
import { formatRp, rpFromYocto } from "../format";

const LABEL: Record<Receipt["kind"], string> = {
  deposit: "Paid into escrow",
  release: "Escrow paid the seller",
};

/** Each money step as a line with its transaction on the public explorer, so anyone can check it. */
export function ReceiptList({ receipts }: { receipts: Receipt[] }) {
  if (receipts.length === 0) return null;
  return (
    <div className="info-card">
      <b>Receipts</b>
      <ul>
        {receipts.map((receipt) => (
          <li key={receipt.kind} className="num">
            {LABEL[receipt.kind]} · {formatRp(rpFromYocto(receipt.amountYocto))} · {new Date(receipt.recordedAt).toLocaleDateString()} ·{" "}
            <a href={txUrl(receipt.txHash)} target="_blank" rel="noreferrer">
              View transaction
            </a>
          </li>
        ))}
      </ul>
      <p className="muted">
        Held by the{" "}
        <a href={escrowUrl()} target="_blank" rel="noreferrer">
          escrow contract
        </a>
        .
      </p>
    </div>
  );
}
