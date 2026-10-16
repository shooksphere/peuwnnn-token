const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Token = await hre.ethers.getContractFactory("MurphysLawToken");
  const token = await Token.deploy();
  await token.waitForDeployment();

  console.log("MurphysLawToken deployed to:", await token.getAddress());
  console.log("Next: funder must approve this address for >= 11 WETH, then call fund().");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
