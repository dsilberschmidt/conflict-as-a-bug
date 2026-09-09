import { expect } from "chai";
import { network } from "hardhat";

import { compileContract } from "./compile.ts";

const { ethers } = await network.getOrCreate();
const registryArtifact = compileContract("CaseRegistry.sol", "CaseRegistry");
const nftArtifact = compileContract("CaseNft.sol", "CaseNft");
const resolutionArtifact = compileContract("Resolution.sol", "Resolution");
const backingArtifact = compileContract("Backing.sol", "Backing");

describe("Backing", () => {
  const contribution = 10_000n;

  async function deploy(configureBackerMinter = true) {
    const [backend, partyA, partyB, solver, auditor, backer, other] = await ethers.getSigners();
    const Registry = new ethers.ContractFactory(registryArtifact.abi, registryArtifact.bytecode, backend);
    const Nft = new ethers.ContractFactory(nftArtifact.abi, nftArtifact.bytecode, backend);
    const Resolution = new ethers.ContractFactory(resolutionArtifact.abi, resolutionArtifact.bytecode, backend);
    const Backing = new ethers.ContractFactory(backingArtifact.abi, backingArtifact.bytecode, backend);
    const registry = await Registry.deploy(backend.address);
    const nft = await Nft.deploy(backend.address);
    const resolution = await Resolution.deploy(await registry.getAddress(), await nft.getAddress(), backend.address);
    await registry.setResolutionContract(await resolution.getAddress());
    const backing = await Backing.deploy(await registry.getAddress(), await resolution.getAddress(), await nft.getAddress(), auditor.address, contribution);
    await nft.setSolverMinter(await resolution.getAddress());
    if (configureBackerMinter) await nft.setBackerMinter(await backing.getAddress());
    return { registry, nft, resolution, backing, backend, partyA, partyB, solver, auditor, backer, other };
  }

  async function open(registry: any, backend: any, partyA: any, partyB: any, label = "case-1") {
    const caseId = ethers.id(label);
    const stateHash = ethers.id("state");
    const digest = ethers.keccak256(ethers.solidityPacked(["bytes32", "bytes32"], [caseId, stateHash]));
    await registry.connect(backend).consentToOpen(caseId, stateHash, await partyA.signMessage(ethers.getBytes(digest)));
    await registry.connect(backend).consentToOpen(caseId, stateHash, await partyB.signMessage(ethers.getBytes(digest)));
    return caseId;
  }

  async function resolve(resolution: any, partyA: any, partyB: any, caseId: string, ideaHash: string, solver: string) {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const digest = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "address", "bytes32", "bytes32", "address", "bytes32"],
      [chainId, await resolution.getAddress(), caseId, ideaHash, solver, ethers.id("resolved")],
    ));
    await resolution.resolve(caseId, ideaHash, solver, await partyA.signMessage(ethers.getBytes(digest)));
    await resolution.resolve(caseId, ideaHash, solver, await partyB.signMessage(ethers.getBytes(digest)));
  }

  it("stores the auditor approval for the exact idea, solver and canonical recipient", async () => {
    const { registry, resolution, backing, backend, partyA, partyB, solver, auditor, other } = await deploy();
    const caseId = await open(registry, backend, partyA, partyB);
    const ideaHash = ethers.id("idea");
    await resolution.registerIdea(caseId, ideaHash, solver.address, true);
    await expect(backing.connect(other).approve(caseId, ideaHash, solver.address))
      .to.be.revertedWithCustomError(backing, "NotAuditor");
    await backing.connect(auditor).approve(caseId, ideaHash, solver.address);

    const approval = await backing.getApproval(caseId);
    const parties = [partyA.address, partyB.address].sort((a, b) => BigInt(a) < BigInt(b) ? -1 : 1);
    expect(approval.ideaHash).to.equal(ideaHash);
    expect(approval.solver).to.equal(solver.address);
    expect(approval.recipient).to.equal((BigInt(caseId) & 1n) === 0n ? parties[0] : parties[1]);
  });

  it("transfers and mints atomically for one eligible backer", async () => {
    const { registry, nft, resolution, backing, backend, partyA, partyB, solver, auditor, backer } = await deploy();
    const caseId = await open(registry, backend, partyA, partyB);
    const ideaHash = ethers.id("idea");
    await resolution.registerIdea(caseId, ideaHash, solver.address, true);
    await backing.connect(auditor).approve(caseId, ideaHash, solver.address);
    await resolve(resolution, partyA, partyB, caseId, ideaHash, solver.address);

    await expect(backing.connect(partyA).back(caseId, { value: contribution }))
      .to.be.revertedWithCustomError(backing, "IneligibleBacker");
    await expect(backing.connect(partyB).back(caseId, { value: contribution }))
      .to.be.revertedWithCustomError(backing, "IneligibleBacker");
    await expect(backing.connect(solver).back(caseId, { value: contribution }))
      .to.be.revertedWithCustomError(backing, "IneligibleBacker");
    await expect(backing.connect(backer).back(caseId, { value: contribution - 1n }))
      .to.be.revertedWithCustomError(backing, "IncorrectContribution");
    const recipient = (await backing.getApproval(caseId)).recipient;
    const balanceBefore = await ethers.provider.getBalance(recipient);
    await backing.connect(backer).back(caseId, { value: contribution });
    expect(await ethers.provider.getBalance(recipient)).to.equal(balanceBefore + contribution);
    expect(await backing.backerOf(caseId)).to.equal(backer.address);
    expect(await nft.ownerOf(2)).to.equal(backer.address);
    await expect(backing.connect(backer).back(caseId, { value: contribution }))
      .to.be.revertedWithCustomError(backing, "BackerAlreadyExists");
  });

  it("does not reuse an approval after its idea is rejected and replaced", async () => {
    const { registry, resolution, backing, backend, partyA, partyB, solver, auditor, backer } = await deploy();
    const caseId = await open(registry, backend, partyA, partyB);
    const rejectedHash = ethers.id("rejected");
    const replacementHash = ethers.id("replacement");
    await resolution.registerIdea(caseId, rejectedHash, solver.address, true);
    await backing.connect(auditor).approve(caseId, rejectedHash, solver.address);
    await resolution.rejectIdea(caseId);

    const [, , , , , , replacementSolver] = await ethers.getSigners();
    await resolution.registerIdea(caseId, replacementHash, replacementSolver.address, true);
    await resolve(resolution, partyA, partyB, caseId, replacementHash, replacementSolver.address);
    await expect(backing.connect(backer).back(caseId, { value: contribution }))
      .to.be.revertedWithCustomError(backing, "IdeaMismatch");
  });

  it("reverts the full backing operation when backer minting is unavailable", async () => {
    const { registry, nft, resolution, backing, backend, partyA, partyB, solver, auditor, backer } = await deploy(false);
    const caseId = await open(registry, backend, partyA, partyB);
    const ideaHash = ethers.id("idea");
    await resolution.registerIdea(caseId, ideaHash, solver.address, true);
    await backing.connect(auditor).approve(caseId, ideaHash, solver.address);
    await resolve(resolution, partyA, partyB, caseId, ideaHash, solver.address);
    const recipient = (await backing.getApproval(caseId)).recipient;
    const balanceBefore = await ethers.provider.getBalance(recipient);
    await expect(backing.connect(backer).back(caseId, { value: contribution }))
      .to.be.revertedWithCustomError(nft, "NotBackerMinter");
    expect(await ethers.provider.getBalance(recipient)).to.equal(balanceBefore);
    expect(await backing.backerOf(caseId)).to.equal(ethers.ZeroAddress);
  });
});
