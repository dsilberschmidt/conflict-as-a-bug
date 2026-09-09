import { expect } from "chai";
import { network } from "hardhat";

import { compileContract } from "./compile.ts";

const { ethers } = await network.getOrCreate();
const { abi, bytecode } = compileContract("CaseNft.sol", "CaseNft");

describe("CaseNft", () => {
  async function deploy() {
    const [admin, solverMinter, backerMinter, solver, backer, recipient] = await ethers.getSigners();
    const factory = new ethers.ContractFactory(abi, bytecode, admin);
    const nft = await factory.deploy(admin.address);
    return { nft, admin, solverMinter, backerMinter, solver, backer, recipient };
  }

  it("configures each minter once and only lets it mint its assigned kind", async () => {
    const { nft, admin, solverMinter, backerMinter, solver, backer } = await deploy();
    await nft.connect(admin).setSolverMinter(solverMinter.address);
    await nft.connect(admin).setBackerMinter(backerMinter.address);
    await expect(nft.setSolverMinter(backerMinter.address))
      .to.be.revertedWithCustomError(nft, "MinterAlreadySet");
    await expect(nft.connect(backerMinter).mintSolver(solver.address, ethers.id("case-1")))
      .to.be.revertedWithCustomError(nft, "NotSolverMinter");

    await nft.connect(solverMinter).mintSolver(solver.address, ethers.id("case-1"));
    await nft.connect(backerMinter).mintBacker(backer.address, ethers.id("case-1"));
    expect(await nft.ownerOf(1)).to.equal(solver.address);
    expect(await nft.ownerOf(2)).to.equal(backer.address);
  });

  it("allows one credential of each kind per case and only backer tokens transfer", async () => {
    const { nft, admin, solverMinter, backerMinter, solver, backer, recipient } = await deploy();
    const caseId = ethers.id("case-1");
    await nft.connect(admin).setSolverMinter(solverMinter.address);
    await nft.connect(admin).setBackerMinter(backerMinter.address);
    await nft.connect(solverMinter).mintSolver(solver.address, caseId);
    await nft.connect(backerMinter).mintBacker(backer.address, caseId);

    await expect(nft.connect(solverMinter).mintSolver(solver.address, caseId))
      .to.be.revertedWithCustomError(nft, "CredentialAlreadyMinted");
    await expect(nft.connect(solver).transferFrom(solver.address, recipient.address, 1))
      .to.be.revertedWithCustomError(nft, "SoulboundToken");
    await nft.connect(backer).transferFrom(backer.address, recipient.address, 2);
    expect(await nft.ownerOf(2)).to.equal(recipient.address);
    expect((await nft.getTokenData(1)).caseId).to.equal(caseId);
  });
});
