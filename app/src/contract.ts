// Wire types for the deal contract and OutLayer. Mirrors contract/src/lib.rs and docs/ARCHITECTURE.md.
// Contract JSON: [u8;32] and Vec<u8> are number arrays, u128 is a decimal string.

export type State =
  | "Created"
  | "Waiting"
  | "Computing"
  | "Retry"
  | "NoDeal"
  | "Matched"
  | "Funded"
  | "Released"
  | "Refunded";

/** 32 numbers 0..255 (sha256 link hash or limit commitment). */
export type Bytes32 = number[];

export interface Deal {
  id: number;
  seller: string;
  buyer: string | null;
  title: string;
  description: string;
  link_hash: Bytes32;
  max_rounds: number;
  round: number;
  /** One ciphertext and commitment per round. */
  seller_cts: number[][];
  buyer_cts: number[][];
  seller_commits: Bytes32[];
  buyer_commits: Bytes32[];
  state: State;
  /** yoctoNEAR, set on Matched. */
  price: string | null;
  /** u64 nanosecond timestamps; double precision is enough for display. */
  matched_at_ns: number | null;
  deadline_ns: number | null;
}

export interface ContractClient {
  createDeal(title: string, description: string, linkHash: Bytes32, maxRounds: number): Promise<number>;
  /** The call that completes a round attaches the OutLayer fee; the client decides how much. */
  submitLimit(dealId: number, ct: number[], commit: Bytes32, linkToken: string | null): Promise<void>;
  /** Attaches exactly the deal's matched price. */
  deposit(dealId: number): Promise<void>;
  confirmReceived(dealId: number): Promise<void>;
  refund(dealId: number): Promise<void>;
  cancel(dealId: number): Promise<void>;
  expire(dealId: number): Promise<void>;
  getDeal(dealId: number): Promise<Deal | null>;
  getState(dealId: number): Promise<State | null>;
}

/** `input_data` of an OutLayer execution. Ciphertexts are hex, one per round. */
export type OutLayerRequest =
  | { action: "match"; deal_id: number; round: number; seller_cts: string[]; buyer_cts: string[] }
  | { action: "get_pubkey" };

export type MatchResult =
  | { deal_id: number; matched: true; price: string }
  | { deal_id: number; matched: false }
  | { deal_id: number; error: "invalid" };

/** What the contract callback receives: the WASM's stdout, parsed as JSON (verified in the D1-08 spike). */
export type OutLayerResponse =
  | { success: true; result: MatchResult | { pubkey: string } }
  | { success: false; error: string };
