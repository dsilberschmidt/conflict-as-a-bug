import { Contract, JsonRpcProvider, Wallet, keccak256, toUtf8Bytes } from "ethers";

import caseRegistryAbi from "./CaseRegistry.abi.json";

export enum ChainCaseStatus {
  None = 0,
  Opened = 1,
  Closed = 2,
  Solved = 3,
}

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
 * CaseRegistry client, signing with a single backend-held key.
 *
 * PROVISIONAL: every write (openCase/closeCase/solveCase) is signed by one
 * server-side key standing in for both A and B. The real design has each
 * party sign their own consent via a Privy wallet — deferred to the bonus
 * phase (see the project's Desarrollo 004 build order). Until then, this
 * client is the only thing allowed to call state-changing functions on the
 * deployed contract; the contract's own `backendSigner` guard enforces that
 * on-chain too.
 */
export class CaseRegistryClient {
  private readonly contract: Contract;

  constructor(rpcUrl: string, backendSignerPrivateKey: string, contractAddress: string) {
    const provider = new JsonRpcProvider(rpcUrl);
    const wallet = new Wallet(backendSignerPrivateKey, provider);
    this.contract = new Contract(contractAddress, caseRegistryAbi, wallet);
  }

  async openCase(caseId: string, content: string): Promise<void> {
    const tx = await this.contract.openCase(caseIdHash(caseId), stateHash(content));
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
 * CASE_REGISTRY_CONTRACT_ADDRESS. None of these exist yet: the contract
 * hasn't been deployed to Sepolia. Calling any method before deployment (and
 * before these env vars are set) throws with a clear message instead of
 * silently no-opping.
 */
export function getCaseRegistryClient(): CaseRegistryClient {
  const rpcUrl = process.env.CASE_REGISTRY_RPC_URL;
  const privateKey = process.env.CASE_REGISTRY_BACKEND_PRIVATE_KEY;
  const contractAddress = process.env.CASE_REGISTRY_CONTRACT_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddress) {
    throw new Error(
      "Missing CaseRegistry config: set CASE_REGISTRY_RPC_URL, " +
        "CASE_REGISTRY_BACKEND_PRIVATE_KEY, and CASE_REGISTRY_CONTRACT_ADDRESS " +
        "(the contract isn't deployed to Sepolia yet).",
    );
  }

  return new CaseRegistryClient(rpcUrl, privateKey, contractAddress);
}
