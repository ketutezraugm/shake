// "Say it in words" (S-02): turns a sentence like "paling mahal 4,3 juta" into a number the buyer then checks. It runs
// in the browser on purpose: sending the words to an AI service would show the buyer's limit to the server, which is the
// one thing the app promises never happens. A fixed rule in the sealed machine still decides the match.

export type WordsReading = {
  /** Whole Rupiah as digits, or null when no amount was found or it was ambiguous. */
  amount: string | null;
  /** Said back to the buyer under the number. */
  notes: string[];
};

const UNITS: Record<string, bigint> = {
  miliar: 1_000_000_000n,
  m: 1_000_000n,
  juta: 1_000_000n,
  jt: 1_000_000n,
  million: 1_000_000n,
  mio: 1_000_000n,
  ribu: 1_000n,
  rb: 1_000n,
  k: 1_000n,
  thousand: 1_000n,
};

// A number, then an optional unit right after it ("4,3 juta", "4.3jt", "250rb", "Rp 4.300.000").
const AMOUNT = /(\d+(?:[.,]\d+)*)\s*(miliar|million|thousand|juta|ribu|mio|jt|rb|m|k)?\b/g;
const CONDITION = /\b(kalau|kalo|asal|asalkan|jika|if|unless|provided|but|tapi|termasuk|including)\b/;

/** Reads "4,3" or "4.3" as a decimal and "4.300" as thousands, the way people write both in Indonesia. */
function toRupiah(number: string, unit: bigint | undefined): bigint | null {
  const parts = number.split(/[.,]/);
  const last = parts.at(-1) ?? "";
  const thousands = parts.length > 1 && parts.slice(1).every((part) => part.length === 3);
  if (unit === undefined) return thousands || parts.length === 1 ? BigInt(parts.join("")) : null;
  if (thousands || parts.length === 1) return BigInt(parts.join("")) * unit;
  if (parts.length !== 2) return null;
  // One decimal part: 4,3 juta is 4.3 million, rounded down to a whole Rupiah.
  const scale = 10n ** BigInt(last.length);
  return (BigInt(parts[0] ?? "0") * scale + BigInt(last)) * unit / scale;
}

export function readLimit(text: string): WordsReading {
  const lower = text.toLowerCase();
  const found: bigint[] = [];
  for (const match of lower.matchAll(AMOUNT)) {
    const value = toRupiah(match[1] ?? "", match[2] ? UNITS[match[2]] : undefined);
    if (value !== null && value > 0n) found.push(value);
  }

  const notes: string[] = [];
  if (CONDITION.test(lower)) notes.push("Conditions aren't part of the offer. Ask the seller about them first.");
  if (found.length === 0) return { amount: null, notes: ["Say an amount, like \"4,3 juta\" or \"Rp 4.300.000\"."] };

  const highest = found.reduce((a, b) => (b > a ? b : a));
  // A bare "4" or "450" is almost never a price in Rupiah: ask for the unit instead of guessing.
  if (highest < 1_000n) return { amount: null, notes: ["Add \"juta\" or \"ribu\" so the amount is clear.", ...notes] };
  if (new Set(found.map(String)).size > 1) notes.unshift("You named more than one amount, so this is the highest.");
  return { amount: highest.toString(), notes };
}
