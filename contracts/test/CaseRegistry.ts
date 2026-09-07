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

describe("CaseRegistry", () => {
  async function deploy() {
    const [backendSigner, otherAccount] = await ethers.getSigners();
    const CaseRegistry = new ethers.ContractFactory(abi, bytecode, backendSigner);
    const registry = await CaseRegistry.deploy(backendSigner.address);
    return { registry, backendSigner, otherAccount };
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

  it("opens a case and emits CaseOpened", async () => {
    const { registry } = await deploy();
    const caseId = caseIdOf("case-1");
    const stateHash = stateHashOf("perspectives+paraphrases v1");

    await expect(registry.openCase(caseId, stateHash))
      .to.emit(registry, "CaseOpened")
      .withArgs(caseId, stateHash, (await ethers.provider.getBlock("latest"))!.timestamp + 1);

    const state = await registry.getCase(caseId);
    expect(state.status).to.equal(1n); // Opened
    expect(state.stateHash).to.equal(stateHash);
  });

  it("rejects opening the same caseId twice", async () => {
    const { registry } = await deploy();
    const caseId = caseIdOf("case-1");
    const stateHash = stateHashOf("v1");

    await registry.openCase(caseId, stateHash);
    await expect(registry.openCase(caseId, stateHash)).to.be.revertedWithCustomError(
      registry,
      "CaseAlreadyExists",
    );
  });

  it("only the backend signer can open a case", async () => {
    const { registry, otherAccount } = await deploy();
    const caseId = caseIdOf("case-1");

    await expect(
      registry.connect(otherAccount).openCase(caseId, stateHashOf("v1")),
    ).to.be.revertedWithCustomError(registry, "NotBackendSigner");
  });

  it("closes an opened case and rejects closing it again", async () => {
    const { registry } = await deploy();
    const caseId = caseIdOf("case-1");

    await registry.openCase(caseId, stateHashOf("v1"));
    await expect(registry.closeCase(caseId)).to.emit(registry, "CaseClosed");

    const state = await registry.getCase(caseId);
    expect(state.status).to.equal(2n); // Closed

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

  it("solves a case that is still open", async () => {
    const { registry } = await deploy();
    const caseId = caseIdOf("case-1");

    await registry.openCase(caseId, stateHashOf("v1"));
    await expect(registry.solveCase(caseId)).to.emit(registry, "CaseSolved");

    const state = await registry.getCase(caseId);
    expect(state.status).to.equal(3n); // Solved
  });

  it("solves a case that was already closed", async () => {
    const { registry } = await deploy();
    const caseId = caseIdOf("case-1");

    await registry.openCase(caseId, stateHashOf("v1"));
    await registry.closeCase(caseId);
    await expect(registry.solveCase(caseId)).to.emit(registry, "CaseSolved");
  });

  it("rejects solving an already-solved case", async () => {
    const { registry } = await deploy();
    const caseId = caseIdOf("case-1");

    await registry.openCase(caseId, stateHashOf("v1"));
    await registry.solveCase(caseId);

    await expect(registry.solveCase(caseId)).to.be.revertedWithCustomError(
      registry,
      "InvalidTransition",
    );
  });

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

  it("reports status None for a caseId that was never opened", async () => {
    const { registry } = await deploy();
    const state = await registry.getCase(caseIdOf("never-opened"));
    expect(state.status).to.equal(0n); // None
  });
});
