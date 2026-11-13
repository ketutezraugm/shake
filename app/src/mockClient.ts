import { decrypt } from "eciesjs";
import type { Bytes32, ContractClient, Deal, State } from "./contract";
import { commitmentFor, type Side } from "./crypto";
import type { Signer } from "./signer";

// Same demo rate as the contract's RP_PER_NEAR: 1 NEAR = Rp 100,000,000.
const YOCTO_PER_RP = 10n ** 16n;
const DAY_MS = 86_400_000;
const MAX_CT_BYTES = 512;
const U64_MAX = 2n ** 64n - 1n;

/**
 * TEST ONLY: the key behind tee/testvectors.json. The mock chain decrypts with it, so the app seals limits with
 * `sealLimit` against MOCK_TEE_PUBLIC_KEY exactly as it does against the real TEE key.
 */
export const MOCK_TEE_SECRET_KEY = "2222222222222222222222222222222222222222222222222222222222222222";
export const MOCK_TEE_PUBLIC_KEY = "02466d7fcae563e5cb09a0d1870bb580344804617879a14949cf22285f1bae3f27";

export async function sha256(text: string): Promise<Bytes32> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)];
}

const sameBytes = (a: Bytes32, b: Bytes32) => a.length === b.length && a.every((x, i) => x === b[i]);

/** A deal as the dev-server store keeps it: the public deal plus when the mock TEE answers. */
type MockDeal = Deal & { settle_at_ms?: number };

export type MockOptions = {
  now?: () => number;
  /** How long a completed round stays `Computing`, like the real OutLayer step. */
  computeMs?: number;
  /** The contract's `delivery_window_secs`, in ms (7 days on the demo contract). */
  deliveryWindowMs?: number;
};

/** In-memory stand-in for the deal contract, shared by every mock client so two sides can meet. */
export class MockChain {
  readonly now: () => number;
  readonly computeMs: number;
  readonly deliveryWindowMs: number;

  constructor(
    private deals: MockDeal[] = [],
    { now = Date.now, computeMs = 2_000, deliveryWindowMs = 7 * DAY_MS }: MockOptions = {},
  ) {
    this.now = now;
    this.computeMs = computeMs;
    this.deliveryWindowMs = deliveryWindowMs;
  }

  /** Plain copy of every deal, for persisting the chain between tabs. */
  dump(): MockDeal[] {
    return structuredClone(this.deals);
  }

  restore(deals: MockDeal[]): void {
    this.deals = deals;
  }

  find(id: number): MockDeal {
    const deal = this.deals[id];
    if (!deal) throw new Error("no such deal");
    return deal;
  }

  add(deal: Omit<Deal, "id">): number {
    const id = this.deals.length;
    this.deals.push({ ...deal, id });
    return id;
  }

  get(id: number): Deal | null {
    const deal = this.deals[id];
    if (!deal) return null;
    const copy = structuredClone(deal);
    delete copy.settle_at_ms;
    return copy;
  }

  /** The mock TEE's answer lands once its time is up, like the callback does on testnet. */
  async settleDue(): Promise<void> {
    for (const deal of this.deals) {
      if (deal.state === "Computing" && (deal.settle_at_ms ?? 0) <= this.now()) {
        delete deal.settle_at_ms;
        await settleRound(deal, this.now());
      }
    }
  }
}

/** One limit as the TEE opens it: only if it is sealed for this deal, side and round and matches its commitment. */
async function openLimit(deal: Deal, side: Side, round: number): Promise<bigint | null> {
  const ct = (side === "seller" ? deal.seller_cts : deal.buyer_cts)[round - 1];
  const commit = (side === "seller" ? deal.seller_commits : deal.buyer_commits)[round - 1];
  if (!ct || !commit) return null;
  try {
    const plain = JSON.parse(new TextDecoder().decode(decrypt(MOCK_TEE_SECRET_KEY, Uint8Array.from(ct)))) as {
      deal_id: number;
      side: string;
      round: number;
      limit: string;
      salt: string;
    };
    if (plain.deal_id !== deal.id || plain.side !== side || plain.round !== round) return null;
    if (!/^[1-9]\d*$/.test(plain.limit) || BigInt(plain.limit) > U64_MAX) return null;
    const expected = await commitmentFor(deal.id, side, round, plain.limit, plain.salt);
    return sameBytes(expected, commit) ? BigInt(plain.limit) : null;
  } catch {
    return null;
  }
}

const monotonic = (limits: bigint[], ok: (previous: bigint, next: bigint) => boolean) =>
  limits.every((limit, i) => i === 0 || ok(limits[i - 1]!, limit));

/**
 * What the WASM does: open every round, require buyer-up and seller-down, compare the latest round, and pick a
 * price inside the overlap. The price comes from the commitments, not Math.random, so two tabs that settle the
 * same deal agree.
 */
async function settleRound(deal: Deal, nowMs: number): Promise<void> {
  const rounds = Array.from({ length: deal.round }, (_, i) => i + 1);
  const sellerLimits = await Promise.all(rounds.map((r) => openLimit(deal, "seller", r)));
  const buyerLimits = await Promise.all(rounds.map((r) => openLimit(deal, "buyer", r)));
  const opened = [...sellerLimits, ...buyerLimits].every((limit) => limit !== null);

  let price: bigint | null = null;
  if (opened) {
    const sellers = sellerLimits as bigint[];
    const buyers = buyerLimits as bigint[];
    const min = sellers.at(-1)!;
    const max = buyers.at(-1)!;
    if (monotonic(sellers, (a, b) => b <= a) && monotonic(buyers, (a, b) => b >= a) && min <= max) {
      const seed = await sha256([...deal.seller_commits, ...deal.buyer_commits].flat().join(","));
      const draw = BigInt(`0x${seed.slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("")}`);
      price = min + (draw % (max - min + 1n));
    }
  }

  if (price !== null) {
    deal.state = "Matched";
    deal.price = (price * YOCTO_PER_RP).toString();
    deal.matched_at_ns = nowMs * 1e6;
  } else if (deal.round < deal.max_rounds) {
    deal.state = "Retry";
    deal.round += 1;
  } else {
    deal.state = "NoDeal";
  }
}

function require(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const bytes = (text: string) => new TextEncoder().encode(text).length;

/** The deal contract's rules and panic messages (contract/src/lib.rs), over a MockChain. */
export function mockClient(chain: MockChain, caller: string): ContractClient {
  const state = (deal: Deal, ...allowed: State[]) => allowed.includes(deal.state);
  const dealOf = async (id: number) => {
    await chain.settleDue();
    return chain.find(id);
  };

  return {
    async createDeal(title, description, linkHash, maxRounds) {
      await chain.settleDue();
      require(maxRounds >= 1 && maxRounds <= 3, "max_rounds must be 1-3");
      require(bytes(title) >= 1 && bytes(title) <= 100, "title must be 1-100 bytes");
      require(bytes(description) <= 1000, "description must be at most 1000 bytes");
      return chain.add({
        seller: caller,
        buyer: null,
        title,
        description,
        link_hash: linkHash,
        max_rounds: maxRounds,
        round: 1,
        seller_cts: [],
        buyer_cts: [],
        seller_commits: [],
        buyer_commits: [],
        state: "Created",
        price: null,
        matched_at_ns: null,
        deadline_ns: null,
        matcher_retries: 0,
      });
    },

    async submitLimit(dealId, ct, commit, linkToken) {
      require(ct.length <= MAX_CT_BYTES, "ciphertext too large");
      const deal = await dealOf(dealId);
      require(state(deal, "Created", "Waiting", "Retry"), "deal is not accepting limits");

      const isSeller = caller === deal.seller;
      let binds = false;
      if (!isSeller) {
        if (deal.buyer !== null) {
          require(deal.buyer === caller, "only the deal's buyer can submit");
        } else {
          require(deal.state === "Waiting", "the seller submits first");
          require(linkToken !== null, "link token required");
          require(sameBytes(await sha256(linkToken!), deal.link_hash), "invalid link token");
          binds = true;
        }
      }
      const cts = isSeller ? deal.seller_cts : deal.buyer_cts;
      require(cts.length < deal.round, "already submitted this round");

      if (binds) deal.buyer = caller;
      cts.push(ct);
      (isSeller ? deal.seller_commits : deal.buyer_commits).push(commit);
      if (deal.seller_cts.length === deal.round && deal.buyer_cts.length === deal.round) {
        deal.state = "Computing";
        deal.settle_at_ms = chain.now() + chain.computeMs;
      } else {
        deal.state = "Waiting";
      }
    },

    async deposit(dealId) {
      const deal = await dealOf(dealId);
      require(deal.state === "Matched", "deal is not matched");
      require(deal.buyer === caller, "only the buyer can deposit");
      require(chain.now() * 1e6 <= deal.matched_at_ns! + DAY_MS * 1e6, "the funding window has passed");
      deal.state = "Funded"; // the client attaches exactly the price, as nearClient does
      deal.deadline_ns = chain.now() * 1e6 + chain.deliveryWindowMs * 1e6;
      return null;
    },

    async confirmReceived(dealId) {
      const deal = await dealOf(dealId);
      require(deal.state === "Funded", "deal is not funded");
      require(deal.buyer === caller, "only the buyer can confirm");
      deal.state = "Released";
      return null;
    },

    async refund(dealId) {
      const deal = await dealOf(dealId);
      require(deal.state === "Funded", "deal is not funded");
      require(chain.now() * 1e6 > deal.deadline_ns!, "the deadline has not passed");
      deal.state = "Refunded";
    },

    async cancel(dealId) {
      const deal = await dealOf(dealId);
      require(caller === deal.seller, "only the seller can cancel");
      require(state(deal, "Created", "Waiting"), "too late to cancel");
      deal.state = "NoDeal";
    },

    async expire(dealId) {
      const deal = await dealOf(dealId);
      require(deal.state === "Matched", "deal is not matched");
      require(chain.now() * 1e6 > deal.matched_at_ns! + DAY_MS * 1e6, "too early to expire");
      deal.state = "NoDeal";
    },

    async getDeal(dealId) {
      await chain.settleDue();
      return chain.get(dealId);
    },

    async getState(dealId) {
      await chain.settleDue();
      return chain.get(dealId)?.state ?? null;
    },
  };
}

/** A Signer for screens in mock mode; the mock chain is reached through its ContractClient, never `call`. */
export function mockSigner(accountId: string): Signer {
  return {
    accountId,
    signRequest: async () => ({ "x-account-id": accountId }),
    call: async () => {
      throw new Error("the mock chain is used through its ContractClient, not call()");
    },
    send: async () => {
      throw new Error("the mock chain is used through its ContractClient, not send()");
    },
  };
}
