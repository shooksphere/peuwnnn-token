require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const { MAINNET_RPC_URL, PRIVATE_KEY } = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    mainnet: {
      url: MAINNET_RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};
