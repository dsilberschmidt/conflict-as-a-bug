import { Contract, JsonRpcProvider, Wallet, keccak256, toUtf8Bytes } from "ethers";

import caseRegistryAbi from "./CaseRegistry.abi.json" with { type: "json" };

export const ChainCaseStatus = {
  None: 0,
  PendingConsent: 1,
  Opened: 2,
  Closed: 3,
  Solved: 4,
} as const;

export type ChainCaseStatus = (typeof ChainCaseStatus)[keyof typeof ChainCaseStatus];

export interface ChainCaseState {
  stateHash: string;
  status: ChainCaseStatus;
  lastUpdatedAt: number;
}

/** keccak256 hash used as the contract's mapping key for a caseId. */
export function caseIdHash(caseId: string): string {
  return keccak256(toUtf8Bytes(caseId));
}

/**
 * keccak256 hash of the off-chain content this transition corresponds to
 * (e.g. the encrypted history envelope's ciphertext, or the summary text).
 * Links the on-chain record to specific Upstash content without putting
 * that content on-chain.
 */
export function stateHash(content: string): string {
  return keccak256(toUtf8Bytes(content));
}

/**
 * CaseRegistry client.
 *
 * Opening a case requires two calls to consentToOpen — one per party. Each
 * call relays that party's off-chain ECDSA signature (personal_sign over
 * keccak256(caseId ++ stateHash)) as a meta-transaction: the backend signs
 * the Ethereum tx, but the consent is verified on-chain against the party's
 * key. The contract moves None → PendingConsent on the first call, and
 * PendingConsent → Opened on the second.
 *
 * PROVISIONAL: closeCase and solveCase are still signed by a single
 * server-side key standing in for both parties — deferred to the bonus phase.
 * The contract's `backendSigner` guard enforces this on-chain.
 */
export class CaseRegistryClient {
  private readonly contract: Contract;

  constructor(rpcUrl: string, backendSignerPrivateKey: string, contractAddress: string) {
    const provider = new JsonRpcProvider(rpcUrl);
    const wallet = new Wallet(backendSignerPrivateKey, provider);
    this.contract = new Contract(contractAddress, caseRegistryAbi, wallet);
  }

  async consentToOpen(caseId: string, content: string, signature: string): Promise<void> {
    const tx = await this.contract.consentToOpen(
      caseIdHash(caseId),
      stateHash(content),
      signature,
    );
    await tx.wait();
  }

  async closeCase(caseId: string): Promise<void> {
    const tx = await this.contract.closeCase(caseIdHash(caseId));
    await tx.wait();
  }

  async solveCase(caseId: string): Promise<void> {
    const tx = await this.contract.solveCase(caseIdHash(caseId));
    await tx.wait();
  }

  async getCase(caseId: string): Promise<ChainCaseState> {
    const result = await this.contract.getCase(caseIdHash(caseId));
    return {
      stateHash: result.stateHash,
      status: Number(result.status) as ChainCaseStatus,
      lastUpdatedAt: Number(result.lastUpdatedAt),
    };
  }
}

/**
 * Builds the client from env vars, without throwing at import time — mirrors
 * the pattern used for the Upstash client in lib/cases/store.ts. Reads
 * CASE_REGISTRY_RPC_URL, CASE_REGISTRY_BACKEND_PRIVATE_KEY, and
 * CASE_REGISTRY_CONTRACT_ADDRESS. If any are missing, throws with a clear
 * message instead of silently no-opping.
 */
export function getCaseRegistryClient(): CaseRegistryClient {
  const rpcUrl = process.env.CASE_REGISTRY_RPC_URL;
  const privateKey = process.env.CASE_REGISTRY_BACKEND_PRIVATE_KEY;
  const contractAddress = process.env.CASE_REGISTRY_CONTRACT_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddress) {
    throw new Error(
      "Missing CaseRegistry config: set CASE_REGISTRY_RPC_URL, " +
        "CASE_REGISTRY_BACKEND_PRIVATE_KEY, and CASE_REGISTRY_CONTRACT_ADDRESS.",
    );
  }

  return new CaseRegistryClient(rpcUrl, privateKey, contractAddress);
}
