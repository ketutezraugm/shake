/** Keeps only digits, without leading zeros: what a price field stores. */
export function digitsOnly(text: string): string {
  return text.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

/** Groups a digit string with commas ("4000000" -> "4,000,000"); string-based so long numbers stay exact. */
export function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
