import { PrivyClient, isEmbeddedWalletLinkedAccount } from "@privy-io/node";
import type { LinkedAccountEmbeddedWallet } from "@privy-io/node";

export type PrivyIdentity = { userId: string; walletAddress: string };

export class PrivyAuthError extends Error {
  readonly status: 401 | 403 | 422;
  constructor(message: string, status: 401 | 403 | 422) {
    super(message);
    this.name = "PrivyAuthError";
    this.status = status;
  }
}

// Minimal surface injected by callers; the real implementation wraps PrivyClient.
// Tests pass fakes — no network, no env vars.
export interface PrivyVerifier {
  verifyAccessToken(token: string): Promise<{ userId: string }>;
  getEmbeddedEthereumWallets(userId: string): Promise<Array<{ address: string; walletIndex: number }>>;
}

// Trust asymmetry: routes consuming PrivyIdentity must decide per-function
// whether to cross-check { userId, walletAddress } against on-chain state.
// Some contract functions enforce this themselves — e.g. Resolution.resolve
// verifies EIP-191 party signatures on-chain. Others rely on the backend
// signer as the sole gate — e.g. Resolution.registerIdea, where the contract
// trusts whatever solver address the backend supplies. Evaluate per-route in
// later tandas; do not collapse the asymmetry here.

let _defaultVerifier: PrivyVerifier | null = null;

function getDefaultVerifier(): PrivyVerifier {
  if (!_defaultVerifier) _defaultVerifier = buildPrivyVerifier();
  return _defaultVerifier;
}

function buildPrivyVerifier(): PrivyVerifier {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error(
      "Missing Privy server credentials: set NEXT_PUBLIC_PRIVY_APP_ID and PRIVY_APP_SECRET.",
    );
  }
  const client = new PrivyClient({ appId, appSecret });

  return {
    async verifyAccessToken(token) {
      const result = await client.utils().auth().verifyAccessToken(token);
      return { userId: result.user_id };
    },

    async getEmbeddedEthereumWallets(userId) {
      const user = await client.users()._get(userId);
      return user.linked_accounts
        .filter((acc): acc is LinkedAccountEmbeddedWallet => isEmbeddedWalletLinkedAccount(acc))
        .filter((acc) => acc.chain_type === "ethereum")
        .map((acc) => ({ address: acc.address, walletIndex: acc.wallet_index }));
    },
  };
}

function parseBearer(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer (.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

export async function resolvePrivyIdentity(
  authorizationHeader: string | null | undefined,
  options?: {
    requiredWalletAddress?: string;
    verifier?: PrivyVerifier;
  },
): Promise<PrivyIdentity> {
  const { requiredWalletAddress, verifier = getDefaultVerifier() } = options ?? {};

  const token = parseBearer(authorizationHeader);
  if (!token) {
    throw new PrivyAuthError("Authorization header missing or malformed", 401);
  }

  let userId: string;
  try {
    ({ userId } = await verifier.verifyAccessToken(token));
  } catch (err) {
    // Log only the SDK error message — never the token itself.
    console.error("[privy] verifyAccessToken failed:", err instanceof Error ? err.message : "unknown");
    throw new PrivyAuthError("Invalid or expired access token", 401);
  }

  const wallets = await verifier.getEmbeddedEthereumWallets(userId);

  if (wallets.length === 0) {
    throw new PrivyAuthError("User has no embedded Ethereum wallet", 422);
  }

  if (requiredWalletAddress) {
    const norm = requiredWalletAddress.toLowerCase();
    const match = wallets.find((w) => w.address.toLowerCase() === norm);
    if (!match) {
      throw new PrivyAuthError("Declared wallet address does not belong to this identity", 403);
    }
    return { userId, walletAddress: match.address };
  }

  // Pick the wallet with the smallest walletIndex regardless of the order the
  // verifier returned them. wallet_index 0 is the original embedded wallet
  // created on first login and is always the deterministic primary.
  const primary = [...wallets].sort((a, b) => a.walletIndex - b.walletIndex)[0];
  return { userId, walletAddress: primary.address };
}
