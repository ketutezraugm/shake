import { describe, expect, it } from "vitest";
import { readLimit } from "./limitWords";

describe("readLimit", () => {
  it("reads the ways people write a price", () => {
    const cases: [string, string][] = [
      ["Paling mahal 4,3 juta", "4300000"],
      ["4.3jt", "4300000"],
      ["max 4 juta", "4000000"],
      ["Rp 4.300.000", "4300000"],
      ["4,300,000", "4300000"],
      ["4300000", "4300000"],
      ["250rb aja", "250000"],
      ["up to 1.5 million", "1500000"],
      ["750k", "750000"],
      ["4.300 ribu", "4300000"],
    ];
    for (const [text, amount] of cases) expect(readLimit(text).amount, text).toBe(amount);
  });

  it("takes the highest of several amounts and says so", () => {
    const reading = readLimit("antara 4 juta sampai 4,5 juta");
    expect(reading.amount).toBe("4500000");
    expect(reading.notes[0]).toMatch(/more than one amount/);
  });

  it("flags conditions as not part of the offer", () => {
    const reading = readLimit("Paling mahal 4,3 juta, kalau lensanya bersih");
    expect(reading.amount).toBe("4300000");
    expect(reading.notes).toContain("Conditions aren't part of the offer. Ask the seller about them first.");
  });

  it("asks instead of guessing when the unit or the amount is missing", () => {
    expect(readLimit("4").amount).toBeNull();
    expect(readLimit("4").notes[0]).toMatch(/juta/);
    expect(readLimit("as cheap as possible").amount).toBeNull();
  });
});
