import { Account } from "near-api-js";
import { HttpError } from "./errors.js";
import type { Store } from "./store.js";
import type { AccountOfLoginRes, CreateAccountRes } from "./types.js";
import { parseCreateAccount } from "./validate.js";

/** Creates sub-accounts of the parent account; the real one signs with the relayer's key. */
export interface AccountCreator {
  readonly parentId: string;
  balance(): Promise<bigint>;
  create(accountId: string, publicKey: string, fundYocto: bigint): Promise<void>;
}

/** Returns the Supabase user id for an access token, or null when the token is not valid. */
export type JwtVerifier = (token: string) => Promise<string | null>;

export type AccountsDeps = { creator: AccountCreator; verifyJwt: JwtVerifier; fundYocto: bigint };

// The parent keeps this much after funding, so it can still pay for the next account's transaction.
const PARENT_RESERVE = 10n ** 23n;

export function nearToYocto(near: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,24}))?$/.exec(near);
  if (!match) throw new Error(`bad NEAR amount ${near}`);
  return BigInt(match[1] as string) * 10n ** 24n + BigInt((match[2] ?? "").padEnd(24, "0"));
}

export function nearAccountCreator(rpcUrl: string, parentId: string, privateKey: `ed25519:${string}`): AccountCreator {
  const parent = new Account(parentId, rpcUrl, privateKey);
  return {
    parentId,
    balance: () => parent.getBalance(),
    async create(accountId, publicKey, fundYocto) {
      try {
        await parent.createAccount({ newAccountId: accountId, publicKey, nearToTransfer: fundYocto });
      } catch (error) {
        if (error instanceof Error && /already exists/i.test(error.message)) throw new HttpError(409, "that handle is taken");
        throw error;
      }
    },
  };
}

async function loginOf({ verifyJwt }: AccountsDeps, authorization: string | undefined): Promise<string> {
  const token = authorization?.match(/^Bearer (.+)$/)?.[1];
  const userId = token ? await verifyJwt(token) : null;
  if (!userId) throw new HttpError(401, "sign in first");
  return userId;
}

/** The account this login already opened, so a returning user on a new device is sent to import their key. */
export async function accountOfLogin(deps: AccountsDeps, store: Store, authorization: string | undefined): Promise<AccountOfLoginRes> {
  const account = await store.accountOfUser(await loginOf(deps, authorization));
  if (!account) throw new HttpError(404, "no account yet");
  return account;
}

/** One NEAR account per Supabase login: the browser sends only its public key, the relayer pays for the account. */
export async function openAccount(
  deps: AccountsDeps,
  store: Store,
  authorization: string | undefined,
  body: unknown,
): Promise<CreateAccountRes> {
  const { creator, fundYocto } = deps;
  const userId = await loginOf(deps, authorization);

  const { handle, publicKey } = parseCreateAccount(body);
  if (await store.accountOfUser(userId)) throw new HttpError(409, "this login already has an account");
  if (await store.handleTaken(handle)) throw new HttpError(409, "that handle is taken");
  if ((await creator.balance()) < fundYocto + PARENT_RESERVE) throw new HttpError(503, "sign-ups are paused, try again later");

  const accountId = `${handle}.${creator.parentId}`;
  await creator.create(accountId, publicKey, fundYocto);
  await store.createProfile({ accountId, handle, auth: "email", supabaseUserId: userId });
  return { accountId };
}
