//SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock PayPal USD (PYUSD) for local testing
contract MockPYUSD is ERC20 {

    uint8 private constant PYUSD_DECIMALS = 6;

    constructor() ERC20("PayPal USD", "PYUSD") {
        //It mints a initial supply of 1 million PYUSD to the deployer
        _mint(msg.sender, 1_000_000_000_000_000_000 * 10 ** PYUSD_DECIMALS);
    }

    //In case of needing to mint more PYUSD for testing
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}