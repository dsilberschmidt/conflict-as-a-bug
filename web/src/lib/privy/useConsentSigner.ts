"use client";

import { BrowserProvider, getBytes, keccak256, solidityPacked, toUtf8Bytes } from "ethers";
import { getEmbeddedConnectedWallet, usePrivy, useWallets } from "@privy-io/react-auth";

import type { Consent } from "@/lib/invitations/crypto";

function consentMessageHash(caseId: string, content: string): string {
  return keccak256(
    solidityPacked(
      ["bytes32", "bytes32"],
      [keccak256(toUtf8Bytes(caseId)), keccak256(toUtf8Bytes(content))],
    ),
  );
}

export class ConsentLoginStartedError extends Error {}

export function useConsentSigner() {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  async function signConsentMessage(caseId: string, content: string): Promise<Consent> {
    if (!authenticated) {
      login();
      throw new ConsentLoginStartedError();
    }

    const wallet = getEmbeddedConnectedWallet(wallets);
    if (!wallet) {
      throw new Error("No embedded wallet found");
    }

    const eip1193Provider = await wallet.getEthereumProvider();
    const ethersProvider = new BrowserProvider(eip1193Provider);
    const signer = await ethersProvider.getSigner();
    const messageHash = consentMessageHash(caseId, content);
    const signature = await signer.signMessage(getBytes(messageHash));

    return { address: wallet.address, signature };
  }

  return { authenticated, signConsentMessage };
}
