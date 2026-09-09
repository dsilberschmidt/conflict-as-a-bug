import { expect } from "chai";
import { network } from "hardhat";

import { compileContract } from "./compile.ts";

const { ethers } = await network.getOrCreate();
const registryArtifact = compileContract("CaseRegistry.sol", "CaseRegistry");
const nftArtifact = compileContract("CaseNft.sol", "CaseNft");
const resolutionArtifact = compileContract("Resolution.sol", "Resolution");

describe("Resolution", () => {
  async function deploy(configureSolverMinter = true, configureRegistry = true) {
    const [backend, partyA, partyB, solver, other] = await ethers.getSigners();
    const Registry = new ethers.ContractFactory(registryArtifact.abi, registryArtifact.bytecode, backend);
    const Nft = new ethers.ContractFactory(nftArtifact.abi, nftArtifact.bytecode, backend);
    const Resolution = new ethers.ContractFactory(resolutionArtifact.abi, resolutionArtifact.bytecode, backend);
    const registry = await Registry.deploy(backend.address);
    const nft = await Nft.deploy(backend.address);
    const resolution = await Resolution.deploy(await registry.getAddress(), await nft.getAddress(), backend.address);
    if (configureRegistry) await registry.setResolutionContract(await resolution.getAddress());
    if (configureSolverMinter) await nft.setSolverMinter(await resolution.getAddress());
    return { registry, nft, resolution, backend, partyA, partyB, solver, other };
  }

  async function open(registry: any, backend: any, partyA: any, partyB: any, label = "case-1") {
    const caseId = ethers.id(label);
    const stateHash = ethers.id("state");
    const digest = ethers.keccak256(ethers.solidityPacked(["bytes32", "bytes32"], [caseId, stateHash]));
    await registry.connect(backend).consentToOpen(caseId, stateHash, await partyA.signMessage(ethers.getBytes(digest)));
    await registry.connect(backend).consentToOpen(caseId, stateHash, await partyB.signMessage(ethers.getBytes(digest)));
    return caseId;
  }

  async function resolutionSignature(resolution: any, signer: any, caseId: string, ideaHash: string, solver: string) {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const digest = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address", "bytes32", "bytes32", "address", "bytes32"],
        [chainId, await resolution.getAddress(), caseId, ideaHash, solver, ethers.id("resolved")],
      ),
    );
    return signer.signMessage(ethers.getBytes(digest));
  }

  it("registers the fixed idea and rejects parties or previously rejected solvers", async () => {
    const { registry, resolution, backend, partyA, partyB, solver } = await deploy();
    const caseId = await open(registry, backend, partyA, partyB);
    const ideaHash = ethers.id("idea");

    await expect(resolution.registerIdea(caseId, ideaHash, partyA.address, true))
      .to.be.revertedWithCustomError(resolution, "SolverIsParty");
    await resolution.registerIdea(caseId, ideaHash, solver.address, true);
    const idea = await resolution.getIdea(caseId);
    expect(idea.ideaHash).to.equal(ideaHash);
    expect(idea.solver).to.equal(solver.address);
    expect(idea.seeksBackers).to.equal(true);
    await resolution.rejectIdea(caseId);
    await expect(resolution.registerIdea(caseId, ethers.id("again"), solver.address, false))
      .to.be.revertedWithCustomError(resolution, "SolverRejected");
  });

  it("allows only the backend to register, reject, or relay a resolution", async () => {
    const { registry, resolution, backend, partyA, partyB, solver, other } = await deploy();
    const caseId = await open(registry, backend, partyA, partyB);
    const ideaHash = ethers.id("idea");
    await expect(resolution.connect(other).registerIdea(caseId, ideaHash, solver.address, false))
      .to.be.revertedWithCustomError(resolution, "NotBackendSigner");
    await resolution.registerIdea(caseId, ideaHash, solver.address, false);
    await expect(resolution.connect(other).rejectIdea(caseId))
      .to.be.revertedWithCustomError(resolution, "NotBackendSigner");
    await expect(resolution.connect(other).resolve(caseId, ideaHash, solver.address, await resolutionSignature(resolution, partyA, caseId, ideaHash, solver.address)))
      .to.be.revertedWithCustomError(resolution, "NotBackendSigner");
  });

  it("rejects duplicate ideas and mismatched payloads or signatures", async () => {
    const { registry, resolution, backend, partyA, partyB, solver, other } = await deploy();
    const caseId = await open(registry, backend, partyA, partyB);
    const ideaHash = ethers.id("idea");
    await resolution.registerIdea(caseId, ideaHash, solver.address, false);
    await expect(resolution.registerIdea(caseId, ethers.id("other"), other.address, false))
      .to.be.revertedWithCustomError(resolution, "IdeaAlreadyActive");
    await expect(resolution.resolve(caseId, ethers.id("wrong"), solver.address, await resolutionSignature(resolution, partyA, caseId, ideaHash, solver.address)))
      .to.be.revertedWithCustomError(resolution, "IdeaMismatch");
    await expect(resolution.resolve(caseId, ideaHash, solver.address, await resolutionSignature(resolution, partyA, caseId, ideaHash, other.address)))
      .to.be.revertedWithCustomError(resolution, "NotCaseParty");
  });

  it("locks rejection after the first valid EIP-191 resolution signature", async () => {
    const { registry, resolution, backend, partyA, partyB, solver } = await deploy();
    const caseId = await open(registry, backend, partyA, partyB);
    const ideaHash = ethers.id("idea");
    await resolution.registerIdea(caseId, ideaHash, solver.address, false);
    await resolution.resolve(caseId, ideaHash, solver.address, await resolutionSignature(resolution, partyA, caseId, ideaHash, solver.address));

    await expect(resolution.rejectIdea(caseId))
      .to.be.revertedWithCustomError(resolution, "ResolutionAlreadyStarted");
  });

  it("requires the other opening party and resolves registry plus solver NFT atomically", async () => {
    const { registry, nft, resolution, backend, partyA, partyB, solver, other } = await deploy();
    const caseId = await open(registry, backend, partyA, partyB);
    const ideaHash = ethers.id("idea");
    await resolution.registerIdea(caseId, ideaHash, solver.address, true);

    await expect(resolution.resolve(caseId, ideaHash, solver.address, await resolutionSignature(resolution, other, caseId, ideaHash, solver.address)))
      .to.be.revertedWithCustomError(resolution, "NotCaseParty");
    const sigA = await resolutionSignature(resolution, partyA, caseId, ideaHash, solver.address);
    await resolution.resolve(caseId, ideaHash, solver.address, sigA);
    await expect(resolution.resolve(caseId, ideaHash, solver.address, sigA))
      .to.be.revertedWithCustomError(resolution, "DuplicateResolutionSigner");

    await resolution.resolve(caseId, ideaHash, solver.address, await resolutionSignature(resolution, partyB, caseId, ideaHash, solver.address));
    expect(await resolution.isResolved(caseId)).to.equal(true);
    expect((await registry.getCase(caseId)).status).to.equal(4n);
    expect(await nft.ownerOf(1)).to.equal(solver.address);
  });

  it("rolls back the second signature when solver NFT minting is not authorized", async () => {
    const { registry, resolution, backend, partyA, partyB, solver } = await deploy(false);
    const caseId = await open(registry, backend, partyA, partyB);
    const ideaHash = ethers.id("idea");
    await resolution.registerIdea(caseId, ideaHash, solver.address, false);
    await resolution.resolve(caseId, ideaHash, solver.address, await resolutionSignature(resolution, partyA, caseId, ideaHash, solver.address));

    await expect(resolution.resolve(caseId, ideaHash, solver.address, await resolutionSignature(resolution, partyB, caseId, ideaHash, solver.address)))
      .to.be.revertedWithCustomError(await ethers.getContractAt(nftArtifact.abi, await resolution.caseNft()), "NotSolverMinter");
    expect(await resolution.isResolved(caseId)).to.equal(false);
    expect((await registry.getCase(caseId)).status).to.equal(2n);
  });

  it("rolls back the second signature when CaseRegistry rejects Resolution", async () => {
    const { registry, nft, resolution, backend, partyA, partyB, solver, other } = await deploy(true, false);
    const caseId = await open(registry, backend, partyA, partyB);
    const ideaHash = ethers.id("idea");
    await resolution.registerIdea(caseId, ideaHash, solver.address, false);
    await resolution.resolve(caseId, ideaHash, solver.address, await resolutionSignature(resolution, partyA, caseId, ideaHash, solver.address));
    await registry.setResolutionContract(other.address);
    await expect(resolution.resolve(caseId, ideaHash, solver.address, await resolutionSignature(resolution, partyB, caseId, ideaHash, solver.address)))
      .to.be.revertedWithCustomError(registry, "NotResolutionContract");
    expect(await resolution.isResolved(caseId)).to.equal(false);
    expect((await registry.getCase(caseId)).status).to.equal(2n);
    await expect(nft.ownerOf(1)).to.revert(ethers);
  });

  it("rejects a repeated completed resolution", async () => {
    const { registry, resolution, backend, partyA, partyB, solver } = await deploy();
    const caseId = await open(registry, backend, partyA, partyB);
    const ideaHash = ethers.id("idea");
    await resolution.registerIdea(caseId, ideaHash, solver.address, false);
    await resolution.resolve(caseId, ideaHash, solver.address, await resolutionSignature(resolution, partyA, caseId, ideaHash, solver.address));
    await resolution.resolve(caseId, ideaHash, solver.address, await resolutionSignature(resolution, partyB, caseId, ideaHash, solver.address));
    await expect(resolution.resolve(caseId, ideaHash, solver.address, await resolutionSignature(resolution, partyA, caseId, ideaHash, solver.address)))
      .to.be.revertedWithCustomError(resolution, "ResolutionAlreadyComplete");
  });
});
