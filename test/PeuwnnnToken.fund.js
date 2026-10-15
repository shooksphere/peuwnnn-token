const { expect } = require("chai");
const { ethers, network, artifacts } = require("hardhat");
const { takeSnapshot } = require("@nomicfoundation/hardhat-network-helpers");

const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

describe("PeuwnnnToken.fund", function () {
  let token, weth, funder, other, recipient, amount, snapshot;

  beforeEach(async function () {
    snapshot = await takeSnapshot();
    [, funder, other] = await ethers.getSigners();

    // Place a mock ERC20 at the hard-coded mainnet WETH address.
    const artifact = await artifacts.readArtifact("MockWETH");
    await network.provider.send("hardhat_setCode", [WETH_ADDRESS, artifact.deployedBytecode]);
    weth = await ethers.getContractAt("MockWETH", WETH_ADDRESS);

    token = await (await ethers.getContractFactory("PeuwnnnToken")).deploy(funder.address);
    recipient = await token.FUNDS_RECIPIENT();
    amount = await token.FUNDING_AMOUNT();

    await weth.mint(funder.address, amount);
  });

  afterEach(async function () {
    await snapshot.restore();
  });

  it("reverts before approval", async function () {
    await expect(token.fund()).to.be.revertedWith("no approval");
    expect(await token.funded()).to.equal(false);
    expect(await weth.balanceOf(recipient)).to.equal(0);
  });

  it("reverts when approval is less than 11 WETH", async function () {
    await weth.connect(funder).approve(await token.getAddress(), amount - 1n);
    await expect(token.fund()).to.be.revertedWith("no approval");
  });

  it("succeeds after approval and transfers 11 WETH to the recipient", async function () {
    await weth.connect(funder).approve(await token.getAddress(), amount);

    await expect(token.connect(other).fund())
      .to.emit(token, "Funded")
      .withArgs(funder.address, recipient, amount, await token.FUNDING_TX_HASH());

    expect(await token.funded()).to.equal(true);
    expect(await weth.balanceOf(recipient)).to.equal(ethers.parseEther("11"));
    expect(await weth.balanceOf(funder.address)).to.equal(0);
  });

  it("prevents double funding", async function () {
    await weth.mint(funder.address, amount);
    await weth.connect(funder).approve(await token.getAddress(), amount * 2n);
    await token.fund();

    await expect(token.fund()).to.be.revertedWith("already funded");
    expect(await weth.balanceOf(recipient)).to.equal(amount);
  });
});
