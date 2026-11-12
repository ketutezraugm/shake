import { describe, expect, it } from "vitest";
import { digitsOnly, groupThousands } from "./format";

describe("price formatting", () => {
  it("groups typed digits with dots and strips everything else", () => {
    expect(groupThousands(digitsOnly("4000000"))).toBe("4.000.000");
    expect(groupThousands(digitsOnly("Rp 4.000.0001"))).toBe("40.000.001");
    expect(groupThousands(digitsOnly("00450"))).toBe("450");
    expect(groupThousands(digitsOnly(""))).toBe("");
  });
});
