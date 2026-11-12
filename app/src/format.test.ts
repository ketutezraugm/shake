import { describe, expect, it } from "vitest";
import { digitsOnly, groupThousands, nearFromYocto } from "./format";

describe("price formatting", () => {
  it("groups typed digits with dots and strips everything else", () => {
    expect(groupThousands(digitsOnly("4000000"))).toBe("4.000.000");
    expect(groupThousands(digitsOnly("Rp 4.000.0001"))).toBe("40.000.001");
    expect(groupThousands(digitsOnly("00450"))).toBe("450");
    expect(groupThousands(digitsOnly(""))).toBe("");
  });
});

describe("nearFromYocto", () => {
  it("shows two decimals and rounds down", () => {
    expect(nearFromYocto("1250000000000000000000000")).toBe("1.25");
    expect(nearFromYocto("99999999999999999999999")).toBe("0.09");
    expect(nearFromYocto("0")).toBe("0.00");
    expect(nearFromYocto("12000000000000000000000000")).toBe("12.00");
  });
});
