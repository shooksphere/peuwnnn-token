const { expect } = require("chai");
const { ethers, network, artifacts } = require("hardhat");
const { takeSnapshot, impersonateAccount, setBalance } = require("@nomicfoundation/hardhat-network-helpers");

const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

describe("MurphysLawToken.fund", function () {
  let token, weth, funder, other, recipient, amount, snapshot;

  beforeEach(async function () {
    snapshot = await takeSnapshot();
    [, other] = await ethers.getSigners();

    // Place a mock ERC20 at the hard-coded mainnet WETH address.
    const artifact = await artifacts.readArtifact("MockWETH");
    await network.provider.send("hardhat_setCode", [WETH_ADDRESS, artifact.deployedBytecode]);
    weth = await ethers.getContractAt("MockWETH", WETH_ADDRESS);

    token = await (await ethers.getContractFactory("MurphysLawToken")).deploy();

    // The funder is hard-coded in the contract, so impersonate it.
    const funderAddress = await token.funder();
    await impersonateAccount(funderAddress);
    await setBalance(funderAddress, ethers.parseEther("1"));
    funder = await ethers.getSigner(funderAddress);
    recipient = await token.fundsRecipient();
    amount = await token.FUNDING_AMOUNT();

    await weth.mint(funder.address, amount);
  });

  afterEach(async function () {
    await snapshot.restore();
  });

  it("uses the configured funder and approval tx hash", async function () {
    expect(await token.funder()).to.equal("0x3e089f564FA7118421535b227cbd851a5395Bdc3");
    expect(await token.FUNDING_TX_HASH()).to.equal("0x91a53d907d6be43a5c27934852bead6d4aab004aa9fe198ac704745d8468fd84");
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
