import { expect } from "chai";
import { network } from "hardhat";

import { compileContract } from "./compile.ts";

const { ethers } = await network.getOrCreate();

const { abi, bytecode } = compileContract("CaseRegistry.sol", "CaseRegistry");

function caseIdOf(value: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(value));
}

function stateHashOf(value: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(value));
}

async function signConsent(signer: any, caseId: string, stateHash: string): Promise<string> {
  const messageHash = ethers.keccak256(
    ethers.solidityPacked(["bytes32", "bytes32"], [caseId, stateHash]),
  );
  return signer.signMessage(ethers.getBytes(messageHash));
}

describe("CaseRegistry", () => {
  async function deploy() {
    const [backendSigner, partyA, partyB, otherAccount] = await ethers.getSigners();
    const CaseRegistry = new ethers.ContractFactory(abi, bytecode, backendSigner);
    const registry = await CaseRegistry.deploy(backendSigner.address);
    return { registry, backendSigner, partyA, partyB, otherAccount };
  }

  // Opens a case through the full two-consent flow. Helper for tests that
  // need an already-opened case to exercise closeCase / solveCase.
  async function fullyOpen(registry: any, caseId: string, stateHash: string, partyA: any, partyB: any) {
    await registry.consentToOpen(caseId, stateHash, await signConsent(partyA, caseId, stateHash));
    await registry.consentToOpen(caseId, stateHash, await signConsent(partyB, caseId, stateHash));
  }

  it("sets the deployer-provided address as the initial backend signer", async () => {
    const { registry, backendSigner } = await deploy();
    expect(await registry.backendSigner()).to.equal(backendSigner.address);
  });

  it("rejects the zero address as the initial backend signer", async () => {
    const [backendSigner] = await ethers.getSigners();
    const CaseRegistry = new ethers.ContractFactory(abi, bytecode, backendSigner);
    await expect(CaseRegistry.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(
      CaseRegistry,
      "ZeroAddress",
    );
  });

  // consentToOpen

  it("first consent moves case to PendingConsent and emits CasePendingConsent", async () => {
    const { registry, partyA } = await deploy();
    const caseId = caseIdOf("case-1");
    const stateHash = stateHashOf("v1");

    await expect(registry.consentToOpen(caseId, stateHash, await signConsent(partyA, caseId, stateHash)))
      .to.emit(registry, "CasePendingConsent")
      .withArgs(caseId, stateHash, partyA.address, (await ethers.provider.getBlock("latest"))!.timestamp + 1);

    const state = await registry.getCase(caseId);
    expect(state.status).to.equal(1n); // PendingConsent
    expect(state.stateHash).to.equal(stateHash);
  });

  it("second valid consent from a distinct signer opens the case and emits CaseOpened", async () => {
    const { registry, partyA, partyB } = await deploy();
    const caseId = caseIdOf("case-1");
    const stateHash = stateHashOf("v1");

    await registry.consentToOpen(caseId, stateHash, await signConsent(partyA, caseId, stateHash));

    await expect(registry.consentToOpen(caseId, stateHash, await signConsent(partyB, caseId, stateHash)))
      .to.emit(registry, "CaseOpened")
      .withArgs(caseId, stateHash, (await ethers.provider.getBlock("latest"))!.timestamp + 1);

    const state = await registry.getCase(caseId);
    expect(state.status).to.equal(2n); // Opened
    expect(state.stateHash).to.equal(stateHash);
  });

  it("second consent from the same signer reverts with DuplicateConsentSigner", async () => {
    const { registry, partyA } = await deploy();
    const caseId = caseIdOf("case-1");
    const stateHash = stateHashOf("v1");
    const sig = await signConsent(partyA, caseId, stateHash);

    await registry.consentToOpen(caseId, stateHash, sig);
    await expect(registry.consentToOpen(caseId, stateHash, sig)).to.be.revertedWithCustomError(
      registry,
      "DuplicateConsentSigner",
    );
  });

  it("second consent with a different stateHash reverts with ConsentHashMismatch", async () => {
    const { registry, partyA, partyB } = await deploy();
    const caseId = caseIdOf("case-1");
    const hashA = stateHashOf("v1");
    const hashB = stateHashOf("v2");

    await registry.consentToOpen(caseId, hashA, await signConsent(partyA, caseId, hashA));
    await expect(
      registry.consentToOpen(caseId, hashB, await signConsent(partyB, caseId, hashB)),
    ).to.be.revertedWithCustomError(registry, "ConsentHashMismatch");
  });

  it("an invalid signature reverts", async () => {
    const { registry } = await deploy();
    const caseId = caseIdOf("case-1");
    const stateHash = stateHashOf("v1");
    const invalidSig = "0x" + "00".repeat(65);

    await expect(
      registry.consentToOpen(caseId, stateHash, invalidSig),
    ).to.revert(ethers);
  });

  it("only the backend signer can call consentToOpen", async () => {
    const { registry, partyA, otherAccount } = await deploy();
    const caseId = caseIdOf("case-1");
    const sig = await signConsent(partyA, caseId, stateHashOf("v1"));

    await expect(
      registry.connect(otherAccount).consentToOpen(caseId, stateHashOf("v1"), sig),
    ).to.be.revertedWithCustomError(registry, "NotBackendSigner");
  });

  it("rejects a third consentToOpen once a case is already Opened", async () => {
    const { registry, partyA, partyB } = await deploy();
    const caseId = caseIdOf("case-1");
    const stateHash = stateHashOf("v1");

    await fullyOpen(registry, caseId, stateHash, partyA, partyB);
    await expect(
      registry.consentToOpen(caseId, stateHash, await signConsent(partyA, caseId, stateHash)),
    ).to.be.revertedWithCustomError(registry, "CaseAlreadyExists");
  });

  // closeCase

  it("closes an opened case and rejects closing it again", async () => {
    const { registry, partyA, partyB } = await deploy();
    const caseId = caseIdOf("case-1");

    await fullyOpen(registry, caseId, stateHashOf("v1"), partyA, partyB);
    await expect(registry.closeCase(caseId)).to.emit(registry, "CaseClosed");

    const state = await registry.getCase(caseId);
    expect(state.status).to.equal(3n); // Closed

    await expect(registry.closeCase(caseId)).to.be.revertedWithCustomError(
      registry,
      "InvalidTransition",
    );
  });

  it("rejects closing a case that was never opened", async () => {
    const { registry } = await deploy();
    await expect(registry.closeCase(caseIdOf("missing"))).to.be.revertedWithCustomError(
      registry,
      "CaseNotFound",
    );
  });

  it("rejects closing a case in PendingConsent", async () => {
    const { registry, partyA } = await deploy();
    const caseId = caseIdOf("case-1");
    const stateHash = stateHashOf("v1");

    await registry.consentToOpen(caseId, stateHash, await signConsent(partyA, caseId, stateHash));
    await expect(registry.closeCase(caseId)).to.be.revertedWithCustomError(
      registry,
      "CaseNotFound",
    );
  });

  // solveCase

  it("solves a case that is still open", async () => {
    const { registry, partyA, partyB } = await deploy();
    const caseId = caseIdOf("case-1");

    await fullyOpen(registry, caseId, stateHashOf("v1"), partyA, partyB);
    await expect(registry.solveCase(caseId)).to.emit(registry, "CaseSolved");

    const state = await registry.getCase(caseId);
    expect(state.status).to.equal(4n); // Solved
  });

  it("solves a case that was already closed", async () => {
    const { registry, partyA, partyB } = await deploy();
    const caseId = caseIdOf("case-1");

    await fullyOpen(registry, caseId, stateHashOf("v1"), partyA, partyB);
    await registry.closeCase(caseId);
    await expect(registry.solveCase(caseId)).to.emit(registry, "CaseSolved");
  });

  it("rejects solving an already-solved case", async () => {
    const { registry, partyA, partyB } = await deploy();
    const caseId = caseIdOf("case-1");

    await fullyOpen(registry, caseId, stateHashOf("v1"), partyA, partyB);
    await registry.solveCase(caseId);

    await expect(registry.solveCase(caseId)).to.be.revertedWithCustomError(
      registry,
      "InvalidTransition",
    );
  });

  it("rejects solving a case in PendingConsent", async () => {
    const { registry, partyA } = await deploy();
    const caseId = caseIdOf("case-1");
    const stateHash = stateHashOf("v1");

    await registry.consentToOpen(caseId, stateHash, await signConsent(partyA, caseId, stateHash));
    await expect(registry.solveCase(caseId)).to.be.revertedWithCustomError(
      registry,
      "CaseNotFound",
    );
  });

  // setBackendSigner

  it("lets the backend signer rotate itself, emitting BackendSignerUpdated", async () => {
    const { registry, backendSigner, otherAccount } = await deploy();

    await expect(registry.setBackendSigner(otherAccount.address))
      .to.emit(registry, "BackendSignerUpdated")
      .withArgs(backendSigner.address, otherAccount.address);

    expect(await registry.backendSigner()).to.equal(otherAccount.address);
  });

  it("rejects a non-signer trying to rotate the backend signer", async () => {
    const { registry, otherAccount } = await deploy();

    await expect(
      registry.connect(otherAccount).setBackendSigner(otherAccount.address),
    ).to.be.revertedWithCustomError(registry, "NotBackendSigner");
  });

  // getCase

  it("reports status None for a caseId that was never seen", async () => {
    const { registry } = await deploy();
    const state = await registry.getCase(caseIdOf("never-opened"));
    expect(state.status).to.equal(0n); // None
  });
});
