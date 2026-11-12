/** Keeps only digits, without leading zeros: what a price field stores. */
export function digitsOnly(text: string): string {
  return text.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

/** Groups a digit string with commas ("4000000" -> "4,000,000"); string-based so long numbers stay exact. */
export function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Same demo rate as the contract's RP_PER_NEAR: 1 NEAR = Rp 100,000,000.
const YOCTO_PER_RP = 10n ** 16n;

/** A contract price (yoctoNEAR string) as grouped Rupiah digits. */
export function rpFromYocto(yocto: string): string {
  return groupThousands((BigInt(yocto) / YOCTO_PER_RP).toString());
}
