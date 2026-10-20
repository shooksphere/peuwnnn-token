const { expect } = require("chai");
const { ethers } = require("hardhat");
const { impersonateAccount, setBalance } = require("@nomicfoundation/hardhat-network-helpers");

const MINTER = "0x2fb9c602fbA553313443e8B5F090E53D25eb8c3C";

async function signer(addr) {
  await impersonateAccount(addr);
  await setBalance(addr, ethers.parseEther("1"));
  return ethers.getSigner(addr);
}

describe("MurphysLawToken.mint", function () {
  let token, owner, minter, other;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    token = await (await ethers.getContractFactory("MurphysLawToken", owner)).deploy();
    minter = await signer(MINTER);
  });

  it("sets owner and minters", async function () {
    expect(await token.owner()).to.equal(owner.address);
    expect(await token.isMinter(owner.address)).to.equal(true);
    expect(await token.isMinter(MINTER)).to.equal(true);
    expect(await token.isMinter(other.address)).to.equal(false);
  });

  it("lets authorized minters mint any amount", async function () {
    const big = ethers.parseEther("1000000000");
    await token.connect(owner).mint(other.address, big);
    await token.connect(minter).mint(other.address, 5n);
    expect(await token.balanceOf(other.address)).to.equal(big + 5n);
  });

  it("reverts for unauthorized callers", async function () {
    await expect(token.connect(other).mint(other.address, 1n)).to.be.revertedWith("not minter");
  });

  it("reverts minting to the zero address", async function () {
    await expect(token.connect(owner).mint(ethers.ZeroAddress, 1n)).to.be.reverted;
  });

  it("only owner can update minters", async function () {
    await expect(token.connect(minter).setMinter(other.address, true)).to.be.reverted;
    await expect(token.connect(owner).setMinter(other.address, true))
      .to.emit(token, "MinterUpdated").withArgs(other.address, true);
    await token.connect(other).mint(other.address, 1n);
    await token.connect(owner).setMinter(other.address, false);
    await expect(token.connect(other).mint(other.address, 1n)).to.be.revertedWith("not minter");
  });
});
