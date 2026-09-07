import { getCaseRegistryClient } from "./registry.ts";

export interface ChainWriteClient {
  openCase(caseId: string, content: string): Promise<void>;
  closeCase(caseId: string): Promise<void>;
  solveCase(caseId: string): Promise<void>;
}

/**
 * PROVISIONAL: si alguna de estas llamadas falla después de que Upstash ya fue
 * actualizado, los dos stores quedan desincronizados. La reconciliación entre
 * Upstash y el contrato ante una falla on-chain no está implementada.
 */

export async function tryOpenOnChain(
  caseId: string,
  ciphertext: string,
  getClient: () => ChainWriteClient = getCaseRegistryClient,
): Promise<void> {
  try {
    await getClient().openCase(caseId, ciphertext);
  } catch (err) {
    console.error(`[chain] openCase failed for caseId "${caseId}":`, err);
  }
}

export async function tryCloseOnChain(
  caseId: string,
  getClient: () => ChainWriteClient = getCaseRegistryClient,
): Promise<void> {
  try {
    await getClient().closeCase(caseId);
  } catch (err) {
    console.error(`[chain] closeCase failed for caseId "${caseId}":`, err);
  }
}

export async function trySolveOnChain(
  caseId: string,
  getClient: () => ChainWriteClient = getCaseRegistryClient,
): Promise<void> {
  try {
    await getClient().solveCase(caseId);
  } catch (err) {
    console.error(`[chain] solveCase failed for caseId "${caseId}":`, err);
  }
}
