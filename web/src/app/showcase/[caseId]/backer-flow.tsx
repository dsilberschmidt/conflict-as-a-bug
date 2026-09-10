"use client";

import { useState } from "react";
import { BrowserProvider, parseEther } from "ethers";
import { getEmbeddedConnectedWallet, usePrivy, useWallets } from "@privy-io/react-auth";

const TRANSFER_AMOUNT = parseEther("0.001");

export function BackerFlow({ recipientAddress }: { recipientAddress: string }) {
  const [auditDone, setAuditDone] = useState(false);
  const [loginStarted, setLoginStarted] = useState(false);
  const [phase, setPhase] = useState<"idle" | "working" | "done" | "error">("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const { authenticated, login, getAccessToken } = usePrivy();
  const { wallets } = useWallets();

  if (!auditDone) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5">
        <p className="text-sm font-medium text-amber-900">A solver is seeking backers</p>
        <p className="text-xs text-amber-700">
          Simulated PoC audit — approves automatically, no human review.
        </p>
        <button
          onClick={() => setAuditDone(true)}
          className="inline-flex w-fit rounded-full border border-amber-700 bg-white px-5 py-2.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
        >
          Audit
        </button>
      </div>
    );
  }

  async function handleFund() {
    if (!authenticated) {
      setLoginStarted(true);
      login();
      return;
    }
    setLoginStarted(false);
    setPhase("working");
    setErrorMsg("");
    try {
      // Step 1: ensure embedded wallet has gas (faucet — no-op if already funded)
      const token = await getAccessToken();
      if (!token) throw new Error("Could not get access token");
      await fetch("/api/faucet", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      // Step 2: switch to Sepolia, then send transfer from embedded wallet.
      // switchChain must come before getEthereumProvider() — existing provider
      // instances are not updated by the switch (Privy types, switchChain note).
      const wallet = getEmbeddedConnectedWallet(wallets);
      if (!wallet) throw new Error("No embedded wallet found. Try logging in again.");
      try {
        await wallet.switchChain(11155111);
      } catch (switchErr) {
        throw new Error(
          switchErr instanceof Error && switchErr.message
            ? `Could not switch wallet to Sepolia: ${switchErr.message}`
            : "Could not switch wallet to Sepolia. Please try again.",
        );
      }
      const provider = new BrowserProvider(await wallet.getEthereumProvider());
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: recipientAddress,
        value: TRANSFER_AMOUNT,
      });
      await tx.wait();
      setTxHash(tx.hash);
      setPhase("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Transaction failed. Please try again.");
      setPhase("error");
    }
  }

  if (phase === "done" && txHash) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white px-6 py-5">
        <p className="text-sm font-medium text-stone-900">Funded</p>
        <a
          href={`https://sepolia.etherscan.io/tx/${txHash}`}
          target="_blank"
          rel="noreferrer"
          className="mt-1 break-all text-xs text-stone-500 underline hover:text-stone-800"
        >
          {txHash}
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white px-6 py-5">
      <p className="text-sm font-medium text-stone-900">Audit passed</p>
      {loginStarted && !authenticated ? (
        <p className="text-sm text-stone-500">
          After signing in, click Fund this project again.
        </p>
      ) : null}
      {errorMsg ? (
        <p role="alert" className="text-sm text-stone-600">
          {errorMsg}
        </p>
      ) : null}
      <button
        onClick={handleFund}
        disabled={phase === "working"}
        className="inline-flex w-fit rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {phase === "working" ? "Sending…" : "Fund this project"}
      </button>
    </div>
  );
}
