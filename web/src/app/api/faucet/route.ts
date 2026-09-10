import { NextRequest, NextResponse } from "next/server";

import { resolvePrivyIdentity, PrivyAuthError } from "@/lib/privy/server";
import { tryFundWallet } from "@/lib/faucet/funder";

export async function POST(request: NextRequest) {
  let walletAddress: string;
  try {
    const identity = await resolvePrivyIdentity(request.headers.get("authorization"));
    walletAddress = identity.walletAddress;
  } catch (err) {
    if (err instanceof PrivyAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }

  try {
    const result = await tryFundWallet(walletAddress);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[faucet] tryFundWallet failed:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Faucet temporarily unavailable" }, { status: 503 });
  }
}
