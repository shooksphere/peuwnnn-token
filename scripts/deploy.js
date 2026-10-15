const hre = require("hardhat");

// Spender/funder wallet that approved the WETH
const FUNDER = process.env.FUNDER_ADDRESS || "0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8";
// Recipient of the 11 WETH
const RECIPIENT = process.env.FUNDS_RECIPIENT || "0x7f539a791ed710ba66700aa760635af5446fe5a5";

async function main() {
  // getAddress throws if the address is malformed or has a bad checksum
  const funder = hre.ethers.getAddress(FUNDER.toLowerCase());
  const recipient = hre.ethers.getAddress(RECIPIENT.toLowerCase());

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Funder (spender):", funder);
  console.log("Recipient:", recipient);

  const Token = await hre.ethers.getContractFactory("PeuwnnnToken");
  const token = await Token.deploy(funder, recipient);
  await token.waitForDeployment();

  console.log("PeuwnnnToken deployed to:", await token.getAddress());
  console.log("Next: funder must approve this address for >= 11 WETH, then call fund().");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
