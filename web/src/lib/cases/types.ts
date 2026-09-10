import type { EncryptedInvitationEnvelope } from "../invitations/crypto";

/**
 * Status tracked by the backend, for the showcase and contribution gating.
 *
 * NOT the source of truth. Once the Sepolia contract exists, on-chain state
 * transitions are authoritative for which cases exist and their status; this
 * field must be kept in sync with the contract, not trusted on its own.
 * Until the contract lands, writes to this field are unauthenticated and
 * provisional — see the status API route for the same caveat.
 */
export type CaseStatus = "opened" | "closed" | "solved";

export interface CaseRecord {
  caseId: string;
  status: CaseStatus;
  createdAt: string;
  /**
   * Ethereum address that receives any backing transfer for this case.
   * Set at creation time to consents[0].address — an arbitrary demo
   * simplification; the real selection mechanism lives in Backing.sol (see future.md).
   */
  recipientAddress?: string;
  /** Public, plaintext. Produced by the Chainlink CRE Confidential Workflow. */
  summary?: string;
  /**
   * Encrypted invitation history (perspectives + paraphrase iterations),
   * same AES-256-GCM envelope produced by lib/invitations/crypto.ts.
   *
   * The decryption key is never stored here. It only reaches the server
   * transiently, at summary-generation time — the documented PoC exposure
   * tradeoff (the TEE protects transit and credentials, not the AI call
   * itself; see the project's Chainlink CRE decision).
   */
  encryptedHistory: EncryptedInvitationEnvelope;
}

export interface Contribution {
  id: string;
  text: string;
  createdAt: string;
  seekingBackers?: boolean;
}
