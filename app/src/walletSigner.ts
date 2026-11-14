import type { NearConnector, NearWalletBase } from "@hot-labs/near-connect";
import { KeyPair } from "near-api-js";
import { FULL_GAS, keySigner, type ChainConfig, type Signer } from "./signer";

/** The two wallet methods we use; a fake in tests, a real wallet (Meteor, Intear, Nightly...) in the browser. */
export type WalletLike = Pick<NearWalletBase, "getAccounts" | "signAndSendTransaction">;
type SignedIn = { accounts: { accountId: string }[] };
type Connector = {
  connect: (input: Parameters<NearConnector["connect"]>[0]) => Promise<WalletLike>;
  once: (event: "wallet:signIn", handler: (signedIn: SignedIn) => void) => void;
  off: (event: "wallet:signIn", handler: (signedIn: SignedIn) => void) => void;
};

export type WalletSession = { accountId: string; secretKey: string };

const SESSION_KEY = "blind-deal:wallet-session";
// A function-call key pays for prepaid gas out of its allowance, so its own calls ask for little: create_deal and a
// round that does not call OutLayer use a few Tgas. (A live run with 300 Tgas cost 0.30 NEAR and hit the 0.25 default.)
const KEY_CALL_GAS = 30_000_000_000_000n;
// Caps what the key may spend on gas over its life; a listing's 10 slots are 20 small calls.
const KEY_GAS_ALLOWANCE = "1000000000000000000000000"; // 1 NEAR
// A function-call key cannot attach money, so deposit is left out: it goes through the wallet.
const KEY_METHODS = ["create_deal", "submit_limit", "cancel", "confirm_received", "refund", "expire"];

/**
 * Signs in with a NEAR wallet and asks it to add a limited key (generated here) to the user's account, valid only for
 * the deal contract. That key then signs relayer requests and every call without a deposit, so the wallet only
 * opens for payments. The key never leaves this browser; the wallet only sees its public half.
 */
export async function connectWallet(
  connector: Connector,
  chain: ChainConfig,
  storage: Storage = localStorage,
): Promise<WalletSession> {
  const key = KeyPair.fromRandom("ed25519");
  // The wallet may hold several accounts; the sign-in event names the one picked in this popup, getAccounts lists them all.
  let pickedId: string | undefined;
  const onSignIn = ({ accounts }: SignedIn) => void (pickedId = accounts[0]?.accountId);
  connector.once("wallet:signIn", onSignIn);
  const wallet = await connector.connect({
    addFunctionCallKey: {
      contractId: chain.contractId,
      publicKey: key.getPublicKey().toString(),
      allowMethods: { anyMethod: false, methodNames: KEY_METHODS },
      gasAllowance: { kind: "limited", amount: KEY_GAS_ALLOWANCE },
    },
  }).finally(() => connector.off("wallet:signIn", onSignIn));
  const accountId = pickedId ?? (await wallet.getAccounts({ network: "testnet" }))[0]?.accountId;
  if (!accountId) throw new Error("the wallet returned no account");
  const session = { accountId, secretKey: key.toString() };
  storage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function loadWalletSession(storage: Storage = localStorage): WalletSession | null {
  const saved = storage.getItem(SESSION_KEY);
  return saved ? (JSON.parse(saved) as WalletSession) : null;
}

export function clearWalletSession(storage: Storage = localStorage): void {
  storage.removeItem(SESSION_KEY);
}

/** `getWallet` is called only when a payment needs the wallet, so a reload costs nothing until then. */
export function walletSigner(
  session: WalletSession,
  getWallet: () => Promise<WalletLike>,
  chain: ChainConfig,
  withKey: Signer = keySigner(session.accountId, session.secretKey, chain, KEY_CALL_GAS),
): Signer {
  const viaWallet = async (methodName: string, args: object, depositYocto: bigint) =>
    (await getWallet()).signAndSendTransaction({
      network: "testnet",
      signerId: session.accountId,
      receiverId: chain.contractId,
      actions: [{ type: "FunctionCall", params: { methodName, args, gas: FULL_GAS.toString(), deposit: depositYocto.toString() } }],
    });

  return {
    ...withKey,
    async call(methodName, args, depositYocto = 0n) {
      if (depositYocto === 0n) return withKey.call(methodName, args);
      await viaWallet(methodName, args, depositYocto);
      return null;
    },
    async send(methodName, args, depositYocto = 0n) {
      if (depositYocto === 0n) return withKey.send(methodName, args);
      return (await viaWallet(methodName, args, depositYocto)).transaction.hash;
    },
  };
}
