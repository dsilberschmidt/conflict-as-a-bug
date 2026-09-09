import { JsonRpcProvider, Wallet, parseEther } from "ethers";
import { Redis } from "@upstash/redis";

// Uses CASE_REGISTRY_BACKEND_PRIVATE_KEY — same wallet that already signs consentToOpen
// relay txns on Sepolia. No new key is provisioned: that wallet is already funded and
// known to be on the right network. The real backing mechanism lives in Backing.sol
// (see future.md); this faucet is a PoC convenience only.
const FAUCET_AMOUNT = parseEther("0.005");

export interface FaucetKv {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
}

export interface FaucetSender {
  send(to: string): Promise<string>; // resolves to txHash after confirmation
}

const faucetKey = (addr: string) => `faucet:funded:${addr.toLowerCase()}`;

let _kv: FaucetKv | null = null;
let _sender: FaucetSender | null = null;

function getKv(): FaucetKv {
  if (!_kv) _kv = buildKv();
  return _kv;
}

function buildKv(): FaucetKv {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ??
    process.env.KV_REST_API_URL ??
    process.env.UPSTASH_REDIS_KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ??
    process.env.KV_REST_API_TOKEN ??
    process.env.UPSTASH_REDIS_KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Missing Upstash credentials for faucet: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
    );
  }
  return new Redis({ url, token });
}

function getSender(): FaucetSender {
  if (!_sender) _sender = buildSender();
  return _sender;
}

function buildSender(): FaucetSender {
  const rpcUrl = process.env.CASE_REGISTRY_RPC_URL;
  const privateKey = process.env.CASE_REGISTRY_BACKEND_PRIVATE_KEY;
  if (!rpcUrl || !privateKey) {
    throw new Error(
      "Missing chain config for faucet: set CASE_REGISTRY_RPC_URL and CASE_REGISTRY_BACKEND_PRIVATE_KEY.",
    );
  }
  const provider = new JsonRpcProvider(rpcUrl);
  const wallet = new Wallet(privateKey, provider);
  return {
    async send(to) {
      const tx = await wallet.sendTransaction({ to, value: FAUCET_AMOUNT });
      await tx.wait();
      return tx.hash;
    },
  };
}

export async function tryFundWallet(
  walletAddress: string,
  options?: { kv?: FaucetKv; sender?: FaucetSender },
): Promise<{ alreadyFunded: boolean; txHash?: string }> {
  const kv = options?.kv ?? getKv();
  const sender = options?.sender ?? getSender();
  const key = faucetKey(walletAddress);
  const existing = await kv.get<boolean>(key);
  if (existing) return { alreadyFunded: true };
  const txHash = await sender.send(walletAddress);
  await kv.set(key, true);
  return { alreadyFunded: false, txHash };
}
