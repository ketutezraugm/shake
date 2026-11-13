import { chain } from "./config";

const EXPLORER = "https://testnet.nearblocks.io";

export const txUrl = (txHash: string) => `${EXPLORER}/txns/${txHash}`;
export const escrowUrl = () => `${EXPLORER}/address/${chain.contractId}`;
