export const ESTIMATE_GAS_MAX_ATTEMPTS = 2;
export const ESTIMATE_GAS_RETRY_DELAY_MS = 2_000;
const ESTIMATE_GAS_RETRY_EXHAUSTED =
  "Could not estimate transaction gas. Please try again.";

type Wait = (delayMs: number) => Promise<void>;

const wait: Wait = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

function isEstimateGasCallException(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "CALL_EXCEPTION" &&
    "action" in error &&
    error.action === "estimateGas"
  );
}

/**
 * Retries only the pre-broadcast estimateGas failure that has been observed
 * with embedded wallets. A resolved send has a transaction response, so it is
 * never retried here and cannot create a duplicate transfer.
 */
export async function sendWithEstimateGasRetry<T>(
  send: () => Promise<T>,
  waitForRetry: Wait = wait,
): Promise<T> {
  for (let attempt = 0; attempt < ESTIMATE_GAS_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await send();
    } catch (error) {
      if (!isEstimateGasCallException(error)) {
        throw error;
      }
      if (attempt === ESTIMATE_GAS_MAX_ATTEMPTS - 1) {
        throw new Error(ESTIMATE_GAS_RETRY_EXHAUSTED);
      }
      await waitForRetry(ESTIMATE_GAS_RETRY_DELAY_MS);
    }
  }

  throw new Error(ESTIMATE_GAS_RETRY_EXHAUSTED);
}
