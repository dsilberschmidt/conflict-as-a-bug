export type FaucetResult = { txHash?: string };

type FaucetError = { error?: string };

type FetchLike = (
  input: string,
  init: { method: string; headers: Record<string, string> },
) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

type TransactionWaiter = {
  waitForTransaction: (hash: string, confirms?: number, timeout?: number) => Promise<unknown | null>;
};

const TRANSACTION_HASH = /^0x[0-9a-fA-F]{64}$/;
export const FAUCET_CONFIRMATION_TIMEOUT_MS = 60_000;
const FAUCET_CONFIRMATION_ERROR = "Faucet transaction was not confirmed in time. Please try again.";

export async function requestFaucet(
  accessToken: string,
  fetchImpl: FetchLike = fetch,
): Promise<FaucetResult> {
  const response = await fetchImpl("/api/faucet", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = (await response.json().catch(() => ({}))) as FaucetResult & FaucetError;

  if (!response.ok) {
    throw new Error(
      typeof body.error === "string" ? body.error : "Faucet temporarily unavailable. Please try again.",
    );
  }
  if (body.txHash !== undefined && (typeof body.txHash !== "string" || !TRANSACTION_HASH.test(body.txHash))) {
    throw new Error("Faucet returned an invalid transaction hash.");
  }
  return body;
}

export async function waitForFaucetTransaction(
  provider: TransactionWaiter,
  txHash: string,
): Promise<void> {
  let receipt: unknown | null;
  try {
    receipt = await provider.waitForTransaction(txHash, 1, FAUCET_CONFIRMATION_TIMEOUT_MS);
  } catch (err) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === "TIMEOUT") {
      throw new Error(FAUCET_CONFIRMATION_ERROR);
    }
    throw err;
  }
  if (!receipt) {
    throw new Error(FAUCET_CONFIRMATION_ERROR);
  }
}
