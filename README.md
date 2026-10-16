# murphys-law-token
Token contract for Murphy's Law (OSHT) - converts approved WETH funds into Murphy's Law tokens


## Configuration / Secrets

1. Copy `.env.example` to `.env` and fill in your values.
2. Never commit `.env` (it is git-ignored).
3. Use a dedicated deployer wallet holding only minimal funds.

Scripts and Hardhat config read all secrets from environment variables.

## Minting

`mint(address to, uint256 amount)` has no supply cap and is restricted to authorized minters.
The contract owner is `0x7f539A791ed710ba66700Aa760635AF5446fE5A5` (OpenZeppelin `Ownable`); the owner and
`0x4F2D58cA77f6efb7154B181ca1da05E923E31fFA` are minters at deployment. The owner can add/remove minters with
`setMinter(address, bool)`. The constructor takes no arguments, so `scripts/deploy.js` is unchanged.

## Funding

`fund()` pulls 11 WETH (`0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`) from the funder
`0x3e089f564FA7118421535b227cbd851a5395Bdc3` to `0x7f539A791ed710ba66700Aa760635AF5446fE5A5`. It reverts
unless the funder has approved the contract for at least 11 WETH. The approval tx is
`0x91a53d907d6be43a5c27934852bead6d4aab004aa9fe198ac704745d8468fd84`. Check it with:

```
TOKEN_ADDRESS=<deployed address> npm run verify-approval
```

(requires `MAINNET_RPC_URL`).
