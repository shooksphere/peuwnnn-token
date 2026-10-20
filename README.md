# murphys-law-token
Token contract for Murphy's Law (OSHT) - converts approved WETH funds into Murphy's Law tokens


## Configuration / Secrets

1. Copy `.env.example` to `.env` and fill in your values.
2. Never commit `.env` (it is git-ignored).
3. Use a dedicated deployer wallet holding only minimal funds.

Scripts and Hardhat config read all secrets from environment variables.

## Browser deployment to Ethereum mainnet

1. Run `npm run compile` to generate the contract artifact.
2. Start the browser deployer with `npm run deploy:browser` and open the local URL shown by Vite.
3. Connect with WalletConnect QR, or open the page inside a wallet browser that exposes an EIP-1193 provider and use **Connect in wallet browser**. Switch to Ethereum Mainnet and confirm the contract warnings before deploying.

For a phone's in-app browser, the page must be hosted at an HTTPS URL reachable from that phone; `localhost` only refers to the device opening it.

The project ID is public configuration; the browser flow never reads or exposes `PRIVATE_KEY`. The connected wallet must approve the deployment transaction and hold ETH for gas. The deploying wallet becomes the owner and receives the initial token supply. Calling `fund()` later requires the designated funder to approve the deployed contract to spend 11 WETH; deployment does not call `fund()`.

Build the static browser bundle with `npm run build:browser`.

## Minting

`mint(address to, uint256 amount)` has no supply cap and is restricted to authorized minters.
The deploying wallet and `0x4F2D58cA77f6efb7154B181ca1da05E923E31fFA` are minters at deployment. The owner can add/remove minters with
`setMinter(address, bool)`. The constructor takes no arguments, so `scripts/deploy.js` is unchanged.
