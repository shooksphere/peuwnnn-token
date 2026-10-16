const hre = require("hardhat");

const APPROVAL_TX = "0x91a53d907d6be43a5c27934852bead6d4aab004aa9fe198ac704745d8468fd84";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const FUNDER = "0x3e089f564FA7118421535b227cbd851a5395Bdc3";
const MIN_AMOUNT = hre.ethers.parseEther("11");

async function main() {
  const { ethers } = hre;
  const spender = process.env.TOKEN_ADDRESS || process.argv[2];
  if (!spender || !ethers.isAddress(spender)) {
    throw new Error("Set TOKEN_ADDRESS to the deployed MurphysLawToken address");
  }

  const receipt = await ethers.provider.getTransactionReceipt(APPROVAL_TX);
  if (!receipt) throw new Error("Approval tx not found: " + APPROVAL_TX);
  if (receipt.status !== 1) throw new Error("Approval tx failed");
  if (receipt.from.toLowerCase() !== FUNDER.toLowerCase()) throw new Error("Approval tx not sent by funder");

  const iface = new ethers.Interface([
    "event Approval(address indexed owner, address indexed spender, uint256 value)",
    "function allowance(address owner, address spender) view returns (uint256)",
  ]);
  const approval = receipt.logs
    .filter((l) => l.address.toLowerCase() === WETH.toLowerCase())
    .map((l) => { try { return iface.parseLog(l); } catch { return null; } })
    .find((p) => p && p.name === "Approval" && p.args.owner.toLowerCase() === FUNDER.toLowerCase()
      && p.args.spender.toLowerCase() === spender.toLowerCase());
  if (!approval) throw new Error("No WETH Approval(funder -> token) log in tx");
  if (approval.args.value < MIN_AMOUNT) throw new Error("Approved amount below 11 WETH");

  const weth = new ethers.Contract(WETH, iface, ethers.provider);
  const allowance = await weth.allowance(FUNDER, spender);
  if (allowance < MIN_AMOUNT) throw new Error("Current allowance below 11 WETH: " + ethers.formatEther(allowance));

  console.log("OK: approval tx", APPROVAL_TX);
  console.log("Current allowance (WETH):", ethers.formatEther(allowance));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
