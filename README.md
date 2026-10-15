# peuwnnn-token
Token contract for Peuwnnn - converts approved WETH funds into Peuwnnn tokens


## Configuration / Secrets

1. Copy `.env.example` to `.env` and fill in your values.
2. Never commit `.env` (it is git-ignored).
3. Use a dedicated deployer wallet holding only minimal funds.

Scripts and Hardhat config read all secrets from environment variables.
