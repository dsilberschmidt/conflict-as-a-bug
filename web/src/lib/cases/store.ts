import { randomUUID } from "node:crypto";

import { Redis } from "@upstash/redis";

import type { EncryptedInvitationEnvelope } from "../invitations/crypto";
import type { CaseRecord, CaseStatus, Contribution } from "./types";

/**
 * Minimal subset of the Vercel KV (Upstash Redis) client this module needs.
 * Kept as an interface so tests can inject an in-memory fake instead of
 * talking to real KV.
 */
export interface KvClient {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
  sadd(key: string, member: string): Promise<unknown>;
  srem(key: string, member: string): Promise<unknown>;
  smembers(key: string): Promise<string[]>;
  rpush(key: string, value: unknown): Promise<unknown>;
  lrange<T>(key: string, start: number, stop: number): Promise<T[]>;
}

const recordKey = (caseId: string) => `case:${caseId}:record`;
const contributionsKey = (caseId: string) => `case:${caseId}:contributions`;
const statusSetKey = (status: CaseStatus) => `cases:by-status:${status}`;

/**
 * Builds the case store against a given KV client.
 *
 * This is content storage keyed by caseId, not a source of truth for which
 * cases exist or what state they're in — see CaseStatus for that caveat.
 */
export function createCaseStore(client: KvClient) {
  async function requireCase(caseId: string): Promise<CaseRecord> {
    const record = await client.get<CaseRecord>(recordKey(caseId));

    if (!record) {
      throw new Error(`Case not found: ${caseId}`);
    }

    return record;
  }

  return {
    /**
     * Creates a case record once both parties have consented to open it to
     * solvers.
     *
     * PROVISIONAL: caseId and the fact that consent happened are trusted
     * from the caller as-is. Once the Sepolia contract and Privy consent
     * signing exist, creation must instead be gated by a verified on-chain
     * "opened" event for the caseId, not invoked directly by a client.
     */
    async createCase(
      caseId: string,
      encryptedHistory: EncryptedInvitationEnvelope,
    ): Promise<CaseRecord> {
      const existing = await client.get<CaseRecord>(recordKey(caseId));

      if (existing) {
        throw new Error(`Case already exists: ${caseId}`);
      }

      const record: CaseRecord = {
        caseId,
        status: "opened",
        createdAt: new Date().toISOString(),
        encryptedHistory,
      };

      await client.set(recordKey(caseId), record);
      await client.sadd(statusSetKey("opened"), caseId);

      return record;
    },

    async getCase(caseId: string): Promise<CaseRecord | null> {
      return client.get<CaseRecord>(recordKey(caseId));
    },

    /** Sets the public summary. Intended caller: the CRE Confidential Workflow. */
    async setSummary(caseId: string, summary: string): Promise<CaseRecord> {
      const record = await requireCase(caseId);
      const updated: CaseRecord = { ...record, summary };

      await client.set(recordKey(caseId), updated);

      return updated;
    },

    /** Records an anonymous, unmoderated free-text contribution from a solver. */
    async addContribution(caseId: string, text: string): Promise<Contribution> {
      const record = await requireCase(caseId);

      if (record.status !== "opened") {
        throw new Error(`Case is not open to contributions: ${caseId}`);
      }

      const contribution: Contribution = {
        id: randomUUID(),
        text,
        createdAt: new Date().toISOString(),
      };

      await client.rpush(contributionsKey(caseId), contribution);

      return contribution;
    },

    async listContributions(caseId: string): Promise<Contribution[]> {
      return client.lrange<Contribution>(contributionsKey(caseId), 0, -1);
    },

    /**
     * Sets case status.
     *
     * PROVISIONAL and explicitly non-authoritative: once the Sepolia
     * contract exists it is the source of truth for status, and this must
     * only mirror verified on-chain transitions, never accept a
     * client-asserted status directly.
     */
    async setStatus(caseId: string, status: CaseStatus): Promise<CaseRecord> {
      const record = await requireCase(caseId);

      if (record.status === status) {
        return record;
      }

      await client.srem(statusSetKey(record.status), caseId);
      await client.sadd(statusSetKey(status), caseId);

      const updated: CaseRecord = { ...record, status };
      await client.set(recordKey(caseId), updated);

      return updated;
    },

    /** caseIds currently in a given status — backs the public showcase listing. */
    async listCasesByStatus(status: CaseStatus): Promise<string[]> {
      return client.smembers(statusSetKey(status));
    },
  };
}

export type CaseStore = ReturnType<typeof createCaseStore>;

/**
 * Builds the Redis client from env vars, without throwing at import time.
 *
 * Reads UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN. The Vercel
 * Marketplace Upstash integration also injects the legacy
 * KV_REST_API_URL / KV_REST_API_TOKEN aliases, which are accepted too.
 * (@vercel/kv itself is deprecated — Vercel KV was sunset in favor of
 * Upstash Redis via the Marketplace; see the project's persistence decision.)
 */
function createRedisClient(): KvClient {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    const missingCredentials = (): never => {
      throw new Error(
        "Missing Upstash Redis credentials: set UPSTASH_REDIS_REST_URL and " +
          "UPSTASH_REDIS_REST_TOKEN (or install the Upstash integration from the " +
          "Vercel Marketplace, which injects KV_REST_API_URL / KV_REST_API_TOKEN).",
      );
    };

    return {
      get: missingCredentials,
      set: missingCredentials,
      sadd: missingCredentials,
      srem: missingCredentials,
      smembers: missingCredentials,
      rpush: missingCredentials,
      lrange: missingCredentials,
    };
  }

  return new Redis({ url, token });
}

export const caseStore = createCaseStore(createRedisClient());
