import { decrypt } from "eciesjs";
import { describe, expect, it } from "vitest";
import vectors from "../../tee/testvectors.json";
import { commitmentFor, sealLimit } from "./crypto";

const toHex = (bytes: ArrayLike<number>) => Buffer.from(Uint8Array.from(bytes)).toString("hex");

describe("commitmentFor", () => {
  it.each(vectors.vectors)("matches the TEE vector for the $side limit", async (v) => {
    const commit = await commitmentFor(v.deal_id, v.side as "seller" | "buyer", v.round, v.limit, v.salt);

    expect(toHex(commit)).toBe(v.commit);
  });
});

describe("sealLimit", () => {
  it("encrypts the exact plaintext the TEE parses, and its commitment opens", async () => {
    const sealed = await sealLimit(7, "buyer", 1, "4600000", vectors.test_public_key);

    const plain = JSON.parse(Buffer.from(decrypt(vectors.test_secret_key, Uint8Array.from(sealed.ct))).toString());
    expect(plain).toEqual({ deal_id: 7, side: "buyer", round: 1, limit: "4600000", salt: sealed.salt });
    expect(toHex(sealed.commit)).toBe(toHex(await commitmentFor(7, "buyer", 1, "4600000", sealed.salt)));
    expect(sealed.commit).toHaveLength(32);
  });

  it("uses a fresh salt each time, so two seals of one limit differ", async () => {
    const a = await sealLimit(7, "seller", 1, "4000000", vectors.test_public_key);
    const b = await sealLimit(7, "seller", 1, "4000000", vectors.test_public_key);

    expect(a.salt).not.toBe(b.salt);
    expect(toHex(a.commit)).not.toBe(toHex(b.commit));
  });

  it.each(["0", "04000000", "-5", "4.5", "4,000,000", "", "abc", "18446744073709551616"])(
    "rejects the non-canonical limit %j",
    async (limit) => {
      await expect(sealLimit(7, "seller", 1, limit, vectors.test_public_key)).rejects.toThrow(/limit/);
    },
  );

  it("accepts the largest u64 limit", async () => {
    await expect(sealLimit(7, "seller", 1, "18446744073709551615", vectors.test_public_key)).resolves.toBeDefined();
  });
});
