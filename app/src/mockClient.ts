import type { Bytes32, ContractClient, Deal, State } from "./contract";

// Same demo rate as the contract's RP_PER_NEAR: 1 NEAR = Rp 100,000,000.
const YOCTO_PER_RP = 10n ** 16n;

/** Mock only: the "ciphertext" carries the plaintext limit until M1-10 adds ECIES. */
export function encodeMockLimit(limitRp: number): number[] {
  return [...new TextEncoder().encode(String(limitRp))];
}

function decodeMockLimit(ct: number[]): number {
  return Number(new TextDecoder().decode(Uint8Array.from(ct)));
}

export async function sha256(text: string): Promise<Bytes32> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)];
}

const sameBytes = (a: Bytes32, b: Bytes32) => a.length === b.length && a.every((x, i) => x === b[i]);

function randomBetween(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** In-memory stand-in for the deal contract, shared by every mock client so two sides can meet. */
export class MockChain {
  constructor(private deals: Deal[] = []) {}

  /** Plain copy of every deal, for persisting the chain between tabs. */
  dump(): Deal[] {
    return structuredClone(this.deals);
  }

  restore(deals: Deal[]): void {
    this.deals = deals;
  }

  find(id: number): Deal {
    const deal = this.deals[id];
    if (!deal) throw new Error(`deal ${id} not found`);
    return deal;
  }

  add(deal: Omit<Deal, "id">): number {
    const id = this.deals.length;
    this.deals.push({ ...deal, id });
    return id;
  }

  get(id: number): Deal | null {
    const deal = this.deals[id];
    return deal ? structuredClone(deal) : null;
  }
}

function expectState(deal: Deal, ...allowed: State[]): void {
  if (!allowed.includes(deal.state)) throw new Error(`deal ${deal.id} is ${deal.state}`);
}

/** True if every round's limit kept moving one way: `ok(previous, next)` holds for each step. */
function monotonic(limits: number[], ok: (previous: number, next: number) => boolean): boolean {
  return limits.every((limit, i) => i === 0 || ok(limits[i - 1]!, limit));
}

/** Matching the TEE does, minus the crypto: a random price inside the overlap, else retry or no deal. */
function settleRound(deal: Deal): void {
  const sellerLimits = deal.seller_cts.map(decodeMockLimit);
  const buyerLimits = deal.buyer_cts.map(decodeMockLimit);
  const min = sellerLimits.at(-1)!;
  const max = buyerLimits.at(-1)!;
  // Like the TEE: a seller who raised or a buyer who lowered makes the round a plain no-deal.
  const conceded = monotonic(sellerLimits, (a, b) => b <= a) && monotonic(buyerLimits, (a, b) => b >= a);

  if (conceded && min <= max) {
    deal.state = "Matched";
    deal.price = (BigInt(randomBetween(min, max)) * YOCTO_PER_RP).toString();
    deal.matched_at_ns = Date.now() * 1e6;
  } else if (deal.round < deal.max_rounds) {
    deal.state = "Retry";
    deal.round += 1;
  } else {
    deal.state = "NoDeal";
  }
}

export function mockClient(chain: MockChain, caller: string): ContractClient {
  return {
    async createDeal(title, description, linkHash, maxRounds) {
      if (maxRounds < 1 || maxRounds > 3) throw new Error("max_rounds must be 1..=3");
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
      });
    },

    async submitLimit(dealId, ct, commit, linkToken) {
      const deal = chain.find(dealId);
      const i = deal.round - 1;

      if (caller === deal.seller) {
        expectState(deal, "Created", "Waiting", "Retry");
        if (deal.seller_cts.length > i) throw new Error("seller already submitted this round");
        deal.seller_cts.push(ct);
        deal.seller_commits.push(commit);
      } else {
        expectState(deal, "Waiting", "Retry");
        if (deal.buyer === null) {
          if (linkToken === null || !sameBytes(await sha256(linkToken), deal.link_hash)) {
            throw new Error("link token does not match");
          }
          deal.buyer = caller;
        } else if (caller !== deal.buyer) {
          throw new Error("link already used");
        }
        if (deal.buyer_cts.length > i) throw new Error("buyer already submitted this round");
        deal.buyer_cts.push(ct);
        deal.buyer_commits.push(commit);
      }

      if (deal.seller_cts.length > i && deal.buyer_cts.length > i) settleRound(deal);
      else deal.state = "Waiting";
    },

    async deposit(dealId) {
      const deal = chain.find(dealId);
      expectState(deal, "Matched");
      if (caller !== deal.buyer) throw new Error("only the buyer deposits");
      deal.state = "Funded";
    },

    async confirmReceived(dealId) {
      const deal = chain.find(dealId);
      expectState(deal, "Funded");
      if (caller !== deal.buyer) throw new Error("only the buyer confirms");
      deal.state = "Released";
    },

    async refund(dealId) {
      const deal = chain.find(dealId);
      expectState(deal, "Funded");
      deal.state = "Refunded";
    },

    async cancel(dealId) {
      const deal = chain.find(dealId);
      expectState(deal, "Created", "Waiting");
      if (caller !== deal.seller) throw new Error("only the seller cancels");
      deal.state = "NoDeal";
    },

    async expire(dealId) {
      const deal = chain.find(dealId);
      expectState(deal, "Matched");
      deal.state = "NoDeal";
    },

    async getDeal(dealId) {
      return chain.get(dealId);
    },

    async getState(dealId) {
      return chain.get(dealId)?.state ?? null;
    },
  };
}
