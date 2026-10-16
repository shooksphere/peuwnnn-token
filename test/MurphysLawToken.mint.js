const { expect } = require("chai");
const { ethers } = require("hardhat");
const { impersonateAccount, setBalance } = require("@nomicfoundation/hardhat-network-helpers");

const OWNER = "0x32e894c4baa2206e571e3920009163a09B9cb35E";
const MINTER = "0x4F2D58cA77f6efb7154B181ca1da05E923E31fFA";

async function signer(addr) {
  await impersonateAccount(addr);
  await setBalance(addr, ethers.parseEther("1"));
  return ethers.getSigner(addr);
}

describe("MurphysLawToken.mint", function () {
  let token, owner, minter, other;

  beforeEach(async function () {
    [, other] = await ethers.getSigners();
    token = await (await ethers.getContractFactory("MurphysLawToken")).deploy();
    owner = await signer(OWNER);
    minter = await signer(MINTER);
  });

  it("sets owner and minters", async function () {
    expect(await token.owner()).to.equal(OWNER);
    expect(await token.isMinter(OWNER)).to.equal(true);
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
